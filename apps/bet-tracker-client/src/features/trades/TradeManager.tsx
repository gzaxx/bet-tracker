import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, Divider, Grid, Group, NativeSelect, NumberInput, Paper, SimpleGrid, Skeleton, Stack, Table, Text, TextInput, Textarea, Title } from '@mantine/core'
import { IconArrowDownRight, IconArrowUpRight, IconRefresh, IconTrash } from '@tabler/icons-react'
import { ApiError, tradeApi } from '../../services/api'
import { TradeType, type CreateTradeRequest, type Portfolio, type Trade, type UpdateTradeRequest } from '../../types/domain'

const toLocalInputValue = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const defaultExecutedAt = () => toLocalInputValue(new Date(Date.now() - 60_000).toISOString())

const errorMessage = (caught: unknown): string => {
  if (caught instanceof ApiError) {
    const fields = caught.details
      ? Object.entries(caught.details).map(([field, messages]) => `${field}: ${messages.join(', ')}`).join(' ')
      : ''
    return fields ? `${caught.message} ${fields}` : caught.message
  }

  return caught instanceof Error ? caught.message : 'The request could not be completed.'
}

type TradeFormState = {
  ticker: string
  tradeType: TradeType
  shares: string
  price: string
  commission: string
  executedAt: string
  notes: string
  isin: string
}

const newForm = (): TradeFormState => ({
  ticker: '',
  tradeType: TradeType.Buy,
  shares: '',
  price: '',
  commission: '0',
  executedAt: defaultExecutedAt(),
  notes: '',
  isin: ''
})

const formFromTrade = (trade: Trade): TradeFormState => ({
  ticker: trade.ticker,
  tradeType: trade.tradeType,
  shares: String(trade.shares),
  price: String(trade.price),
  commission: String(trade.commission),
  executedAt: toLocalInputValue(trade.executedAt),
  notes: trade.notes ?? '',
  isin: trade.isin ?? ''
})

const formatMoney = (value: number, currency: string) => value.toLocaleString(undefined, { style: 'currency', currency })

export const TradeManager = ({ portfolio, onChanged }: { portfolio: Portfolio; onChanged?: () => void }) => {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TradeFormState>(newForm)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setTrades(await tradeApi.list(portfolio.id))
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setEditingId(null)
    setForm(newForm())
    void refresh()
  }, [portfolio.id])

  const totals = useMemo(() => trades.reduce((summary, trade) => {
    if (trade.tradeType === TradeType.Buy) {
      summary.invested += trade.shares * trade.price + trade.commission
      summary.position += trade.shares
    } else {
      summary.proceeds += trade.shares * trade.price - trade.commission
      summary.position -= trade.shares
    }
    return summary
  }, { invested: 0, proceeds: 0, position: 0 }), [trades])

  const updateField = <K extends keyof TradeFormState>(field: K, value: TradeFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const common = {
      ticker: form.ticker,
      tradeType: form.tradeType,
      shares: Number(form.shares),
      price: Number(form.price),
      commission: Number(form.commission),
      executedAt: new Date(form.executedAt).toISOString(),
      currency: portfolio.currency,
      notes: form.notes || null,
      isin: form.isin || null
    }

    try {
      const saved = editingId === null
        ? await tradeApi.create(portfolio.id, { portfolioId: portfolio.id, ...common } satisfies CreateTradeRequest)
        : await tradeApi.update(portfolio.id, editingId, common satisfies UpdateTradeRequest)
      setTrades((current) => editingId === null ? [...current, saved].sort((left, right) => left.executedAt.localeCompare(right.executedAt) || left.id - right.id) : current.map((trade) => trade.id === saved.id ? saved : trade).sort((left, right) => left.executedAt.localeCompare(right.executedAt) || left.id - right.id))
      onChanged?.()
      setEditingId(null)
      setForm(newForm())
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('Delete this trade? Later positions will be recalculated.')) {
      return
    }

    setDeletingId(id)
    setError(null)
    try {
      await tradeApi.remove(portfolio.id, id)
      setTrades((current) => current.filter((trade) => trade.id !== id))
      onChanged?.()
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card id="trades" withBorder radius="lg" padding="xl" aria-labelledby={`trades-${portfolio.id}`}>
      <Group justify="space-between" align="flex-start" mb="lg">
        <div><Group gap="xs" mb={4}><Badge variant="light" color="cyan">{portfolio.name}</Badge><Badge variant="outline" color="gray">{portfolio.currency}</Badge></Group><Title order={2} size="h3" id={`trades-${portfolio.id}`}>Trades</Title><Text size="sm" c="dimmed">FIFO inventory and transaction history.</Text></div>
        <Button variant="light" size="sm" leftSection={<IconRefresh size={15} />} onClick={() => void refresh()} loading={loading}>Refresh</Button>
      </Group>
      {error && <Alert color="red" title="Trade action failed" mb="lg" withCloseButton onClose={() => setError(null)}>{error}</Alert>}
      <SimpleGrid cols={{ base: 1, xs: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md"><Text size="xs" fw={700} c="dimmed" tt="uppercase">Invested</Text><Text size="lg" fw={800} mt={5}>{formatMoney(totals.invested, portfolio.currency)}</Text></Paper>
        <Paper withBorder p="md" radius="md"><Text size="xs" fw={700} c="dimmed" tt="uppercase">Proceeds</Text><Text size="lg" fw={800} mt={5}>{formatMoney(totals.proceeds, portfolio.currency)}</Text></Paper>
        <Paper withBorder p="md" radius="md"><Text size="xs" fw={700} c="dimmed" tt="uppercase">Open shares</Text><Text size="lg" fw={800} mt={5}>{totals.position.toLocaleString()}</Text></Paper>
      </SimpleGrid>
      {loading ? <Stack gap="xs"><Skeleton height={42} /><Skeleton height={42} /><Skeleton height={42} /></Stack> : trades.length === 0 ? <Paper withBorder p="xl" radius="md" ta="center" mb="xl"><Title order={3} size="h4">No trades yet</Title><Text size="sm" c="dimmed">Add a buy below to start a FIFO position.</Text></Paper> : <Table.ScrollContainer minWidth={720} mb="xl"><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Date</Table.Th><Table.Th>Ticker</Table.Th><Table.Th>Type</Table.Th><Table.Th>Shares</Table.Th><Table.Th>Price</Table.Th><Table.Th>Commission</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{trades.map((trade) => <Table.Tr key={trade.id}><Table.Td>{new Date(trade.executedAt).toLocaleString()}</Table.Td><Table.Td><Text fw={700}>{trade.ticker}</Text></Table.Td><Table.Td><Badge color={trade.tradeType === TradeType.Buy ? 'teal' : 'red'} variant="light" leftSection={trade.tradeType === TradeType.Buy ? <IconArrowUpRight size={12} /> : <IconArrowDownRight size={12} />}>{trade.tradeType === TradeType.Buy ? 'Buy' : 'Sell'}</Badge></Table.Td><Table.Td>{trade.shares}</Table.Td><Table.Td>{formatMoney(trade.price, trade.currency)}</Table.Td><Table.Td>{formatMoney(trade.commission, trade.currency)}</Table.Td><Table.Td><Group gap={4} justify="flex-end" wrap="nowrap"><Button size="xs" variant="subtle" onClick={() => { setEditingId(trade.id); setForm(formFromTrade(trade)) }}>Edit</Button><Button size="xs" variant="subtle" color="red" loading={deletingId === trade.id} aria-label={`Delete trade ${trade.ticker}`} onClick={() => void remove(trade.id)}><IconTrash size={15} /></Button></Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}
      <Divider mb="lg" />
      <form onSubmit={submit}>
        <Group justify="space-between" mb="md"><div><Text size="sm" fw={700} c="indigo" tt="uppercase">{editingId === null ? 'New trade' : 'Edit trade'}</Text><Title order={3} size="h4">{editingId === null ? 'Record a trade' : `Edit trade #${editingId}`}</Title></div>{editingId !== null && <Button type="button" variant="subtle" onClick={() => { setEditingId(null); setForm(newForm()) }}>Cancel</Button>}</Group>
        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><TextInput label="Ticker" value={form.ticker} onChange={(event) => updateField('ticker', event.currentTarget.value.toUpperCase())} required maxLength={20} placeholder="MSFT" /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><NativeSelect label="Type" data={[{ value: String(TradeType.Buy), label: 'Buy' }, { value: String(TradeType.Sell), label: 'Sell' }]} value={String(form.tradeType)} onChange={(event) => updateField('tradeType', Number(event.currentTarget.value) as TradeType)} /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><NumberInput label="Shares" min={0.00000001} step={1} decimalScale={8} value={form.shares} onChange={(value) => updateField('shares', String(value))} required /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><NumberInput label={`Price (${portfolio.currency})`} min={0.0001} step={0.01} decimalScale={4} value={form.price} onChange={(value) => updateField('price', String(value))} required /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><NumberInput label={`Commission (${portfolio.currency})`} min={0} step={0.01} decimalScale={4} value={form.commission} onChange={(value) => updateField('commission', String(value))} required /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><TextInput type="datetime-local" label="Executed at" value={form.executedAt} onChange={(event) => updateField('executedAt', event.currentTarget.value)} required /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><TextInput label="ISIN (optional)" value={form.isin} onChange={(event) => updateField('isin', event.currentTarget.value.toUpperCase())} maxLength={12} /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}><Textarea label="Notes (optional)" autosize minRows={1} maxRows={2} value={form.notes} onChange={(event) => updateField('notes', event.currentTarget.value)} maxLength={2000} /></Grid.Col>
        </Grid>
        <Group justify="flex-end" mt="md"><Button type="submit" loading={submitting}>{editingId === null ? 'Add trade' : 'Save trade'}</Button></Group>
      </form>
    </Card>
  )
}
