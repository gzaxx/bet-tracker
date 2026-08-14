import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, Badge, Button, Card, Group, Paper, SimpleGrid, Skeleton, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core'
import { IconAlertTriangle, IconChartDonut, IconRefresh, IconTrendingDown, IconTrendingUp, IconWallet } from '@tabler/icons-react'
import { ApiError, summaryApi } from '../../services/api'
import type { Portfolio, PortfolioSummary } from '../../types/domain'
import { ErrorBanner } from './ErrorBanner'

type OverviewProps = {
  activeProfileId: number
  profileName: string
  currency: string
  portfolios: Portfolio[]
}

type OverviewHolding = PortfolioSummary['holdings'][number] & {
  portfolioId: number
  portfolioName: string
  currency: string
}

const formatMoney = (value: number, currency: string) => value.toLocaleString(undefined, { style: 'currency', currency })

const errorMessage = (caught: unknown): string => {
  if (caught instanceof ApiError && caught.details) {
    const fields = Object.values(caught.details).flat()
    if (fields.length > 0) {
      return fields.join(' ')
    }
  }

  return caught instanceof Error ? caught.message : 'The overview could not be loaded.'
}

const SummaryStat = ({ label, value, tone, icon }: { label: string; value: string; tone?: 'positive' | 'negative'; icon: ReactNode }) => (
  <Paper withBorder p="md" radius="md" className="metric-card">
    <Group justify="space-between" mb="sm">
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">{label}</Text>
      <ThemeIcon size="sm" radius="xl" variant="light" color={tone === 'negative' ? 'red' : tone === 'positive' ? 'teal' : 'indigo'}>{icon}</ThemeIcon>
    </Group>
    <Text fw={800} size="xl" c={tone === 'negative' ? 'red.7' : tone === 'positive' ? 'teal.7' : undefined}>{value}</Text>
  </Paper>
)

export const Overview = ({ activeProfileId, profileName, currency, portfolios }: OverviewProps) => {
  const [summaries, setSummaries] = useState<PortfolioSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const activePortfolios = useMemo(() => portfolios.filter((portfolio) => portfolio.profileId === activeProfileId), [activeProfileId, portfolios])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const nextSummaries = await Promise.all(activePortfolios.map((portfolio) => summaryApi.get(portfolio.id)))
        if (!cancelled) {
          setSummaries(nextSummaries)
        }
      } catch (caught) {
        if (!cancelled) {
          setSummaries([])
          setError(errorMessage(caught))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activePortfolios, refreshKey])

  const totals = useMemo(() => summaries.reduce((current, summary) => ({
    invested: current.invested + summary.totalCostBasis,
    currentValue: current.currentValue + summary.totalMarketValue,
    profitLoss: current.profitLoss + summary.realizedProfitLoss + summary.unrealizedProfitLoss,
  }), { invested: 0, currentValue: 0, profitLoss: 0 }), [summaries])
  const returnPercent = totals.invested > 0 ? totals.profitLoss / totals.invested * 100 : null
  const pAndLPercent = returnPercent === null ? '—' : `${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(2)}%`
  const holdings = useMemo<OverviewHolding[]>(() => summaries.flatMap((summary) => {
    const portfolio = activePortfolios.find((candidate) => candidate.id === summary.portfolioId)
    return portfolio
      ? summary.holdings.map((holding) => ({ ...holding, portfolioId: portfolio.id, portfolioName: portfolio.name, currency: summary.currency }))
      : []
  }), [activePortfolios, summaries])
  const missingPriceTickers = useMemo(() => summaries.flatMap((summary) => summary.missingPriceTickers), [summaries])
  const hasHoldings = holdings.length > 0
  const profitLossTone = totals.profitLoss >= 0 ? 'positive' : 'negative'

  return (
    <Stack gap="lg">
      <ErrorBanner />
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Text size="sm" fw={700} c="indigo" tt="uppercase">Overview</Text>
          <Title order={1} size="h1" mt={4}>{profileName} at a glance</Title>
          <Text c="dimmed">A read-only snapshot of every portfolio in this profile.</Text>
        </div>
        <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => setRefreshKey((current) => current + 1)} loading={loading}>Refresh</Button>
      </Group>

      {error && <Alert color="red" title="Overview unavailable" withCloseButton onClose={() => setError(null)}>{error}</Alert>}

      <Card withBorder radius="lg" padding="xl" aria-labelledby="overview-summary-heading">
        <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap">
          <div>
            <Group gap="xs" mb={4}><Badge variant="light" color="indigo">All portfolios</Badge><Badge variant="outline" color="gray">{currency}</Badge></Group>
            <Title order={2} size="h3" id="overview-summary-heading">Portfolio performance</Title>
            <Text size="sm" c="dimmed">Totals across {activePortfolios.length} {activePortfolios.length === 1 ? 'portfolio' : 'portfolios'}.</Text>
          </div>
          <ThemeIcon visibleFrom="sm" size={48} radius="xl" variant="light" color="indigo"><IconChartDonut size={24} /></ThemeIcon>
        </Group>
        {loading ? (
          <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
            {Array.from({ length: 4 }, (_, index) => <Skeleton height={100} radius="md" key={index} />)}
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
            <SummaryStat label="Total invested" value={formatMoney(totals.invested, currency)} icon={<IconWallet size={14} />} />
            <SummaryStat label="Current value" value={formatMoney(totals.currentValue, currency)} icon={<IconChartDonut size={14} />} />
            <SummaryStat label="Total P&L" value={formatMoney(totals.profitLoss, currency)} tone={profitLossTone} icon={totals.profitLoss >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />} />
            <SummaryStat label="P&L %" value={pAndLPercent} tone={returnPercent === null ? undefined : returnPercent >= 0 ? 'positive' : 'negative'} icon={returnPercent === null || returnPercent >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />} />
          </SimpleGrid>
        )}
      </Card>

      {missingPriceTickers.length > 0 && <Alert color="yellow" variant="light" title="Some prices are missing" icon={<IconAlertTriangle size={18} />}><Text size="sm">Missing current prices for {missingPriceTickers.join(', ')}. Those holdings are excluded from current value and P&amp;L totals.</Text></Alert>}

      <Card withBorder radius="lg" padding="xl" aria-labelledby="overview-holdings-heading">
        <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
          <div>
            <Text size="sm" fw={700} c="indigo" tt="uppercase">Holdings</Text>
            <Title order={2} size="h3" id="overview-holdings-heading">All portfolio positions</Title>
          </div>
          <Text size="sm" c="dimmed">{holdings.length} {holdings.length === 1 ? 'position' : 'positions'}</Text>
        </Group>
        {loading ? <Skeleton height={180} radius="md" /> : !hasHoldings ? (
          <Paper withBorder p="xl" radius="md" ta="center"><ThemeIcon variant="light" color="indigo" size={46} radius="xl" mb="sm"><IconWallet size={21} /></ThemeIcon><Title order={3} size="h4">No holdings yet</Title><Text size="sm" c="dimmed">Add a buy trade from Portfolio management to see positions here.</Text></Paper>
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table striped highlightOnHover withTableBorder={false} verticalSpacing="sm">
              <Table.Thead><Table.Tr><Table.Th>Portfolio</Table.Th><Table.Th>Ticker</Table.Th><Table.Th>Shares</Table.Th><Table.Th>Avg buy price</Table.Th><Table.Th>Current price</Table.Th><Table.Th>P&amp;L</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>{holdings.map((holding) => <Table.Tr key={`${holding.portfolioId}-${holding.ticker}`}><Table.Td><Text fw={700}>{holding.portfolioName}</Text></Table.Td><Table.Td>{holding.ticker}</Table.Td><Table.Td>{holding.shares}</Table.Td><Table.Td>{formatMoney(holding.averageCost, holding.currency)}</Table.Td><Table.Td>{holding.currentPrice === null ? <Text span c="dimmed" fs="italic">Missing</Text> : formatMoney(holding.currentPrice, holding.currency)}</Table.Td><Table.Td><Text span c={holding.unrealizedProfitLoss === null ? 'dimmed' : holding.unrealizedProfitLoss >= 0 ? 'teal.7' : 'red.7'} fw={700}>{holding.unrealizedProfitLoss === null ? '—' : formatMoney(holding.unrealizedProfitLoss, holding.currency)}</Text></Table.Td></Table.Tr>)}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  )
}
