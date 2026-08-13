import { useMemo, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, Divider, Grid, Group, NumberInput, Paper, Skeleton, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { IconClock, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react'
import { ApiError, priceApi } from '../../services/api'
import type { PriceObservation, Portfolio } from '../../types/domain'

type PriceFormState = {
  ticker: string
  price: string
  effectiveAt: string
  providerSymbol: string
}

const toLocalInputValue = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const defaultEffectiveAt = () => toLocalInputValue(new Date(Date.now() - 60_000).toISOString())

const newForm = (): PriceFormState => ({
  ticker: '',
  price: '',
  effectiveAt: defaultEffectiveAt(),
  providerSymbol: ''
})

const formFromObservation = (observation: PriceObservation): PriceFormState => ({
  ticker: observation.ticker,
  price: String(observation.price),
  effectiveAt: toLocalInputValue(observation.effectiveAt),
  providerSymbol: observation.providerSymbol ?? ''
})

const errorMessage = (caught: unknown): string => {
  if (caught instanceof ApiError && caught.details) {
    const fields = Object.values(caught.details).flat()
    if (fields.length > 0) {
      return fields.join(' ')
    }
  }

  return caught instanceof Error ? caught.message : 'The request could not be completed.'
}

const formatMoney = (value: number, currency: string) => value.toLocaleString(undefined, { style: 'currency', currency })
const formatDate = (value: string) => new Date(value).toLocaleString()

export const PriceManager = ({ portfolio, onChanged }: { portfolio: Portfolio; onChanged?: () => void }) => {
  const [ticker, setTicker] = useState('')
  const [current, setCurrent] = useState<PriceObservation | null>(null)
  const [history, setHistory] = useState<PriceObservation[]>([])
  const [form, setForm] = useState<PriceFormState>(newForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizedTicker = ticker.trim().toUpperCase()
  const isStale = useMemo(() => current !== null && Date.now() - new Date(current.effectiveAt).getTime() > 24 * 60 * 60 * 1000, [current])

  const loadPrices = async (requestedTicker = normalizedTicker) => {
    const normalized = requestedTicker.trim().toUpperCase()
    if (!normalized) {
      setError('Ticker is required to load price history.')
      return
    }

    setTicker(normalized)
    setLoading(true)
    setError(null)
    try {
      const [latest, observations] = await Promise.all([
        priceApi.current(normalized, portfolio.currency),
        priceApi.history(normalized, portfolio.currency)
      ])
      setCurrent(latest)
      setHistory(observations)
    } catch (caught) {
      setError(errorMessage(caught))
      setCurrent(null)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ticker: form.ticker.trim().toUpperCase(),
        currency: portfolio.currency,
        price: Number(form.price),
        effectiveAt: new Date(form.effectiveAt).toISOString(),
        source: 'Manual',
        providerSymbol: form.providerSymbol.trim() || null
      }
      if (editingId === null) {
        await priceApi.create(body)
      } else {
        await priceApi.update(editingId, body)
      }
      onChanged?.()
      setForm(newForm())
      setEditingId(null)
      await loadPrices(body.ticker)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const edit = (observation: PriceObservation) => {
    setEditingId(observation.id)
    setForm(formFromObservation(observation))
    setError(null)
  }

  const remove = async (observation: PriceObservation) => {
    if (!window.confirm(`Delete the ${formatDate(observation.effectiveAt)} price for ${observation.ticker}?`)) {
      return
    }

    setDeletingId(observation.id)
    setError(null)
    try {
      await priceApi.remove(observation.id)
      onChanged?.()
      await loadPrices(observation.ticker)
      if (editingId === observation.id) {
        setEditingId(null)
        setForm(newForm())
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card id="prices" withBorder radius="lg" padding="xl" aria-labelledby={`prices-${portfolio.id}`}>
      <Group justify="space-between" align="flex-start" mb="lg">
        <div><Group gap="xs" mb={4}><Badge variant="light" color="violet">Market data</Badge><Badge variant="outline" color="gray">{portfolio.currency}</Badge></Group><Title order={2} size="h3" id={`prices-${portfolio.id}`}>Price history</Title><Text size="sm" c="dimmed">Enter prices manually and keep every observation for a clear audit trail.</Text></div>
        <IconClock size={28} color="var(--mantine-color-violet-5)" />
      </Group>
      {error && <Alert color="red" title="Price action failed" mb="lg" withCloseButton onClose={() => setError(null)}>{error}</Alert>}
      <form onSubmit={submit}>
        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><TextInput label="Ticker" value={form.ticker} onChange={(event) => setForm({ ...form, ticker: event.currentTarget.value.toUpperCase() })} placeholder="MSFT" required maxLength={20} /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><NumberInput label={`Price (${portfolio.currency})`} min={0.0001} step={0.01} decimalScale={4} value={form.price} onChange={(value) => setForm({ ...form, price: String(value) })} placeholder="100.00" required /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><TextInput type="datetime-local" label="Effective at" value={form.effectiveAt} onChange={(event) => setForm({ ...form, effectiveAt: event.currentTarget.value })} required /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><TextInput label="Provider symbol (optional)" value={form.providerSymbol} onChange={(event) => setForm({ ...form, providerSymbol: event.currentTarget.value })} placeholder="NASDAQ:MSFT" maxLength={64} /></Grid.Col>
        </Grid>
        <Group justify="flex-end" mt="md"><Button type="submit" loading={saving}>{editingId === null ? 'Add price' : 'Save price'}</Button>{editingId !== null && <Button type="button" variant="subtle" onClick={() => { setEditingId(null); setForm(newForm()) }}>Cancel edit</Button>}</Group>
      </form>
      <Divider my="xl" />
      <Group align="flex-end" gap="sm" mb="lg">
        <TextInput label="View ticker history" value={ticker} onChange={(event) => setTicker(event.currentTarget.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void loadPrices() } }} placeholder="MSFT" leftSection={<IconSearch size={16} />} style={{ flex: 1 }} />
        <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void loadPrices()} loading={loading}>Load history</Button>
      </Group>
      {loading ? <Stack gap="xs"><Skeleton height={80} /><Skeleton height={42} /><Skeleton height={42} /></Stack> : normalizedTicker ? <Stack gap="lg">
        <Paper withBorder p="lg" radius="md" className="price-highlight">
          <Group justify="space-between" align="center"><div><Text size="xs" fw={700} c="dimmed" tt="uppercase">Current price · {normalizedTicker}</Text><Text size="xl" fw={800} mt={4}>{current ? formatMoney(current.price, portfolio.currency) : 'Not available'}</Text></div>{current && <Badge color={isStale ? 'yellow' : 'teal'} variant="light">{isStale ? `Stale · ${formatDate(current.effectiveAt)}` : `As of ${formatDate(current.effectiveAt)}`}</Badge>}</Group>
        </Paper>
        {history.length === 0 ? <Paper withBorder p="xl" radius="md" ta="center"><Title order={3} size="h4">No observations yet</Title><Text size="sm" c="dimmed">Add a manual price above to start this ticker’s history.</Text></Paper> : <Table.ScrollContainer minWidth={560}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Effective at</Table.Th><Table.Th>Price</Table.Th><Table.Th>Source</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{history.map((observation) => <Table.Tr key={observation.id}><Table.Td>{formatDate(observation.effectiveAt)}</Table.Td><Table.Td><Text fw={700}>{formatMoney(observation.price, observation.currency)}</Text></Table.Td><Table.Td><Badge variant="light" color="gray">{observation.source}</Badge></Table.Td><Table.Td><Group gap={4} justify="flex-end" wrap="nowrap"><Button size="xs" variant="subtle" onClick={() => edit(observation)}>Edit</Button><Button size="xs" variant="subtle" color="red" loading={deletingId === observation.id} aria-label={`Delete price for ${observation.ticker}`} onClick={() => void remove(observation)}><IconTrash size={15} /></Button></Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}
      </Stack> : <Paper withBorder p="xl" radius="md" ta="center"><Title order={3} size="h4">Choose a ticker</Title><Text size="sm" c="dimmed">Load a ticker to see its current price and retained observations.</Text></Paper>}
    </Card>
  )
}
