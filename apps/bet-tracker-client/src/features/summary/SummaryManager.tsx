import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Badge, Button, Card, Group, Paper, SimpleGrid, Skeleton, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core'
import { IconAlertTriangle, IconArrowUpRight, IconChartDonut, IconRefresh, IconTrendingDown, IconTrendingUp, IconWallet } from '@tabler/icons-react'
import { ApiError, summaryApi } from '../../services/api'
import type { Portfolio, PortfolioSummary } from '../../types/domain'

const formatMoney = (value: number, currency: string) => value.toLocaleString(undefined, { style: 'currency', currency })

const errorMessage = (caught: unknown): string => {
  if (caught instanceof ApiError && caught.details) {
    const fields = Object.values(caught.details).flat()
    if (fields.length > 0) {
      return fields.join(' ')
    }
  }

  return caught instanceof Error ? caught.message : 'The summary could not be loaded.'
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

export const SummaryManager = ({ portfolio, refreshKey }: { portfolio: Portfolio; refreshKey: number }) => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await summaryApi.get(portfolio.id))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [portfolio.id, refreshKey])

  return (
    <Card id={`portfolio-summary-${portfolio.id}`} withBorder radius="lg" padding="xl" aria-labelledby={`summary-${portfolio.id}`}>
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap">
        <div>
          <Group gap="xs" mb={4}><Badge variant="light" color="indigo">Portfolio summary</Badge><Badge variant="outline" color="gray">{portfolio.currency}</Badge></Group>
          <Title order={2} size="h3" id={`summary-${portfolio.id}`}>{portfolio.name} performance</Title>
          <Text size="sm" c="dimmed">FIFO holdings and manual prices in {portfolio.currency}.</Text>
        </div>
        <Group gap="xs">
          <Button component="a" href="#portfolio-dashboard" variant="subtle" size="sm">Overview</Button>
          <Button component="a" href="#trades" variant="subtle" size="sm">Trades</Button>
          <Button variant="light" size="sm" leftSection={<IconRefresh size={15} />} onClick={() => void refresh()} loading={loading}>Refresh</Button>
        </Group>
      </Group>
      {error && <Alert color="red" title="Summary unavailable" mb="lg" withCloseButton onClose={() => setError(null)}>{error}</Alert>}
      {loading ? (
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
          {Array.from({ length: 4 }, (_, index) => <Skeleton height={100} radius="md" key={index} />)}
        </SimpleGrid>
      ) : summary && summary.holdings.length === 0 ? (
        <Paper withBorder p="xl" radius="md" ta="center"><ThemeIcon variant="light" color="indigo" size={46} radius="xl" mb="sm"><IconArrowUpRight size={21} /></ThemeIcon><Title order={3} size="h4">No holdings yet</Title><Text size="sm" c="dimmed">Add a buy trade to see holdings and P&amp;L here.</Text></Paper>
      ) : summary && (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
            <SummaryStat label="Cost basis" value={formatMoney(summary.totalCostBasis, summary.currency)} icon={<IconWallet size={14} />} />
            <SummaryStat label="Current value" value={formatMoney(summary.totalMarketValue, summary.currency)} icon={<IconChartDonut size={14} />} />
            <SummaryStat label="Realized P&L" value={formatMoney(summary.realizedProfitLoss, summary.currency)} tone={summary.realizedProfitLoss >= 0 ? 'positive' : 'negative'} icon={summary.realizedProfitLoss >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />} />
            <SummaryStat label="Unrealized P&L" value={formatMoney(summary.unrealizedProfitLoss, summary.currency)} tone={summary.unrealizedProfitLoss >= 0 ? 'positive' : 'negative'} icon={summary.unrealizedProfitLoss >= 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />} />
          </SimpleGrid>
          {summary.missingPriceTickers.length > 0 && <Alert color="yellow" variant="light" title="Some prices are missing" icon={<IconAlertTriangle size={18} />}><Group justify="space-between" align="center"><Text size="sm">Missing current prices for {summary.missingPriceTickers.join(', ')}. These holdings are excluded from current value and unrealized P&amp;L.</Text><Button component="a" href="#prices" size="xs" variant="light" color="yellow">Add prices</Button></Group></Alert>}
          <Table.ScrollContainer minWidth={760}>
            <Table striped highlightOnHover withTableBorder={false} verticalSpacing="sm">
              <Table.Thead><Table.Tr><Table.Th>Ticker</Table.Th><Table.Th>Shares</Table.Th><Table.Th>Average cost</Table.Th><Table.Th>Cost basis</Table.Th><Table.Th>Current price</Table.Th><Table.Th>Value</Table.Th><Table.Th>Unrealized P&amp;L</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>{summary.holdings.map((holding) => <Table.Tr key={holding.ticker}><Table.Td><Text fw={700}>{holding.ticker}</Text></Table.Td><Table.Td>{holding.shares}</Table.Td><Table.Td>{formatMoney(holding.averageCost, summary.currency)}</Table.Td><Table.Td>{formatMoney(holding.costBasis, summary.currency)}</Table.Td><Table.Td>{holding.currentPrice === null ? <Text span c="dimmed" fs="italic">Missing</Text> : formatMoney(holding.currentPrice, summary.currency)}</Table.Td><Table.Td>{holding.currentValue === null ? <Text span c="dimmed">—</Text> : formatMoney(holding.currentValue, summary.currency)}</Table.Td><Table.Td><Text span c={holding.unrealizedProfitLoss === null ? 'dimmed' : holding.unrealizedProfitLoss >= 0 ? 'teal.7' : 'red.7'} fw={holding.unrealizedProfitLoss === null ? undefined : 700}>{holding.unrealizedProfitLoss === null ? '—' : formatMoney(holding.unrealizedProfitLoss, summary.currency)}</Text></Table.Td></Table.Tr>)}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}
    </Card>
  )
}
