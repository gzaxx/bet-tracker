import { useEffect, useState, type FormEvent } from 'react'
import { Badge, Button, Card, Group, Paper, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { IconChartDonut, IconPlus, IconTrash, IconWallet } from '@tabler/icons-react'
import { PriceManager } from '../prices/PriceManager'
import { useProfiles } from '../profiles/ProfileContext'
import { SummaryManager } from '../summary/SummaryManager'
import { TradeManager } from '../trades/TradeManager'
import { Confirmation } from './Confirmation'
import { ErrorBanner } from './ErrorBanner'
import { PortfolioCard } from './PortfolioCard'
import type { DeleteTarget } from './types'

export const Dashboard = () => {
  const { activeProfile, activeProfileId, portfolios, createPortfolio, deleteProfile, deletePortfolio } = useProfiles()
  const [portfolioName, setPortfolioName] = useState('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null)
  const [creatingPortfolio, setCreatingPortfolio] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0)

  const activePortfolios = activeProfile ? portfolios.filter((portfolio) => portfolio.profileId === activeProfile.id) : []
  const selectedPortfolio = activePortfolios.find((portfolio) => portfolio.id === selectedPortfolioId)

  useEffect(() => {
    if (activePortfolios.length === 0) {
      setSelectedPortfolioId(null)
    } else if (!activePortfolios.some((portfolio) => portfolio.id === selectedPortfolioId)) {
      setSelectedPortfolioId(activePortfolios[0].id)
    }
  }, [activeProfileId, activePortfolios, selectedPortfolioId])

  if (!activeProfile || activeProfileId === null) {
    return null
  }

  const submitPortfolio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreatingPortfolio(true)
    const created = await createPortfolio({ profileId: activeProfile.id, name: portfolioName })
    setCreatingPortfolio(false)
    if (created) {
      setPortfolioName('')
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return
    }
    setDeleting(true)
    const deleted = pendingDelete.kind === 'profile' ? await deleteProfile(pendingDelete.id) : await deletePortfolio(pendingDelete.id)
    setDeleting(false)
    if (deleted) {
      if (pendingDelete.kind === 'portfolio' && pendingDelete.id === selectedPortfolioId) {
        setSelectedPortfolioId(null)
      }
      setPendingDelete(null)
    }
  }

  return (
    <>
      <div>
        <Text size="sm" fw={700} c="indigo" tt="uppercase">Portfolio management</Text>
        <Title order={1} size="h1" mt={4}>Manage your investing workspace</Title>
        <Text c="dimmed">Create portfolios, review positions, record trades, and keep market prices current.</Text>
      </div>
      <ErrorBanner />
      <Card withBorder radius="lg" padding="xl" mb="xl" className="hero-card">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div><Badge color="cyan" variant="light" mb="sm">{activeProfile.defaultCurrency} workspace</Badge><Title order={2} size="h2">Stay close to the numbers.</Title><Text c="dimmed" maw={560} mt="xs">Select a portfolio to review your holdings, record a trade, or keep market prices current.</Text></div>
          <ThemeIcon visibleFrom="sm" size={64} radius="xl" variant="gradient" gradient={{ from: 'indigo', to: 'cyan', deg: 135 }}><IconChartDonut size={32} /></ThemeIcon>
        </Group>
      </Card>

      <Group id="portfolio-management" justify="space-between" align="flex-end" mb="md">
        <div><Text size="sm" fw={700} c="indigo" tt="uppercase">Portfolio management</Text><Title order={2} size="h2">Your portfolios</Title><Text size="sm" c="dimmed">Every portfolio reports in {activeProfile.defaultCurrency}.</Text></div>
        <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={() => setPendingDelete({ kind: 'profile', id: activeProfile.id, label: `profile “${activeProfile.name}”` })}>Delete profile</Button>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="md">
        {activePortfolios.map((portfolio) => <PortfolioCard portfolio={portfolio} selected={portfolio.id === selectedPortfolioId} onSelect={(candidate) => setSelectedPortfolioId(candidate.id)} onDelete={(candidate) => setPendingDelete({ kind: 'portfolio', id: candidate.id, label: `portfolio “${candidate.name}”` })} key={portfolio.id} />)}
        <Card withBorder radius="lg" padding="lg" bg="gray.0">
          <form onSubmit={submitPortfolio}>
            <Stack gap="sm">
              <Group gap="sm"><ThemeIcon variant="light" color="cyan"><IconPlus size={17} /></ThemeIcon><div><Text size="xs" fw={700} c="dimmed" tt="uppercase">New portfolio</Text><Text fw={700}>Create a portfolio</Text></div></Group>
              <TextInput aria-label="Portfolio name" placeholder="Long term" value={portfolioName} onChange={(event) => setPortfolioName(event.currentTarget.value)} required maxLength={100} />
              <Group justify="space-between" align="center"><Text size="xs" c="dimmed">Currency: {activeProfile.defaultCurrency}</Text><Button type="submit" size="sm" loading={creatingPortfolio} leftSection={<IconPlus size={15} />}>Create</Button></Group>
            </Stack>
          </form>
        </Card>
      </SimpleGrid>
      {activePortfolios.length === 0 && <Paper withBorder radius="lg" p="xl" ta="center" mb="md"><ThemeIcon variant="light" color="indigo" size={48} radius="xl" mb="sm"><IconWallet size={22} /></ThemeIcon><Title order={3} size="h4">No portfolios yet</Title><Text size="sm" c="dimmed">Use the card above to create a portfolio and start recording trades.</Text></Paper>}
      {selectedPortfolio && <Stack gap="lg"><SummaryManager portfolio={selectedPortfolio} refreshKey={summaryRefreshKey} /><TradeManager portfolio={selectedPortfolio} onChanged={() => setSummaryRefreshKey((current) => current + 1)} /><PriceManager portfolio={selectedPortfolio} onChanged={() => setSummaryRefreshKey((current) => current + 1)} /></Stack>}

      <Confirmation target={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={() => void confirmDelete()} submitting={deleting} />
    </>
  )
}
