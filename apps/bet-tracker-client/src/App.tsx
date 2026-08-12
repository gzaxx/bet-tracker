import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  MantineProvider,
  Loader,
  Alert,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Menu,
  Modal,
  NativeSelect,
  NavLink,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconAdjustments,
  IconArrowUpRight,
  IconChartDonut,
  IconChevronRight,
  IconFolders,
  IconLayoutDashboard,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconTrash,
  IconWallet
} from '@tabler/icons-react'
import { ProfileProvider, useProfiles } from './features/profiles/ProfileContext'
import { PriceManager } from './features/prices/PriceManager'
import { SummaryManager } from './features/summary/SummaryManager'
import { TradeManager } from './features/trades/TradeManager'
import type { Portfolio } from './types/domain'
import './App.css'

type DeleteTarget = { kind: 'profile' | 'portfolio'; id: number; label: string }

const ErrorBanner = () => {
  const { error, clearError, refresh } = useProfiles()

  if (!error) {
    return null
  }

  return (
    <Alert color="red" variant="light" title="Something needs attention" withCloseButton onClose={clearError} mb="lg">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Text size="sm">{error}</Text>
        <Button size="xs" variant="light" color="red" leftSection={<IconRefresh size={14} />} onClick={() => void refresh()}>
          Retry
        </Button>
      </Group>
    </Alert>
  )
}

const WorkspaceShell = ({ children }: { children: ReactNode }) => {
  const [opened, { toggle, close }] = useDisclosure(false)

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Burger hiddenFrom="sm" opened={opened} onClick={toggle} size="sm" />
            <ThemeIcon size={38} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan', deg: 135 }}>
              <IconChartDonut size={21} />
            </ThemeIcon>
            <div>
              <Text fw={800} size="lg" lh={1}>Ledgerline</Text>
              <Text size="xs" c="dimmed">Personal investment workspace</Text>
            </div>
          </Group>
          <Badge visibleFrom="sm" variant="light" color="indigo" leftSection={<IconAdjustments size={13} />}>
            Local workspace
          </Badge>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">Workspace</Text>
          <Stack gap={4}>
            <NavLink component="a" href="#portfolio-dashboard" label="Overview" leftSection={<IconLayoutDashboard size={17} />} onClick={close} />
            <NavLink component="a" href="#trades" label="Trades" leftSection={<IconArrowUpRight size={17} />} onClick={close} />
            <NavLink component="a" href="#prices" label="Prices" leftSection={<IconChartDonut size={17} />} onClick={close} />
          </Stack>
          <Divider my="lg" />
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">Manage</Text>
          <NavLink component="a" href="#profile-settings" label="Profile settings" leftSection={<IconSettings size={17} />} onClick={close} />
        </AppShell.Section>
        <Paper p="sm" radius="md" withBorder bg="gray.0">
          <Group gap="xs" wrap="nowrap">
            <Avatar color="indigo" radius="xl" size="sm">LL</Avatar>
            <div>
              <Text size="xs" fw={700}>Ledgerline</Text>
              <Text size="xs" c="dimmed">Private by default</Text>
            </div>
          </Group>
        </Paper>
      </AppShell.Navbar>
      <AppShell.Main>
        <Container size="xl" py={{ base: 'sm', sm: 'xl' }}>
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

const Onboarding = () => {
  const { createProfileAndPortfolio, error, refresh } = useProfiles()
  const [profileName, setProfileName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [portfolioName, setPortfolioName] = useState('Main portfolio')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    await createProfileAndPortfolio({ name: profileName, defaultCurrency: currency }, portfolioName)
    setSubmitting(false)
  }

  return (
    <Container size="sm" py={{ base: 48, sm: 100 }}>
      <Stack gap="xl">
        <div>
          <Badge variant="light" color="indigo" mb="md">Welcome to Ledgerline</Badge>
          <Title order={1} size="h1" mb="sm">A calmer way to track your portfolio.</Title>
          <Text size="lg" c="dimmed">Create a profile and your first portfolio. Keep trades, prices, and performance together in one focused workspace.</Text>
        </div>
        {error && <Alert color="red" title="Unable to create workspace"><Group justify="space-between"><Text size="sm">{error}</Text><Button size="xs" variant="light" color="red" onClick={() => void refresh()}>Retry</Button></Group></Alert>}
        <Card withBorder shadow="sm" radius="lg" padding="xl">
          <form onSubmit={submit}>
            <Stack gap="md">
              <Group justify="space-between">
                <div><Text size="sm" fw={700} c="indigo">First steps</Text><Title order={2} size="h3">Set up your workspace</Title></div>
                <Badge variant="light">1 of 1</Badge>
              </Group>
              <TextInput label="Profile name" placeholder="Personal" value={profileName} onChange={(event) => setProfileName(event.currentTarget.value)} required maxLength={100} />
              <NativeSelect label="Default currency" data={['USD', 'EUR', 'GBP', 'CAD', 'AUD']} value={currency} onChange={(event) => setCurrency(event.currentTarget.value.toUpperCase())} required />
              <TextInput label="First portfolio" placeholder="Long term" value={portfolioName} onChange={(event) => setPortfolioName(event.currentTarget.value)} required maxLength={100} />
              <Button type="submit" size="md" loading={submitting} leftSection={!submitting && <IconPlus size={17} />}>Create profile and portfolio</Button>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  )
}

const ProfileSettings = () => {
  const { activeProfile, updateProfile } = useProfiles()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(activeProfile?.name ?? '')
  const [currency, setCurrency] = useState(activeProfile?.defaultCurrency ?? '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (activeProfile) {
      setName(activeProfile.name)
      setCurrency(activeProfile.defaultCurrency)
    }
  }, [activeProfile])

  if (!activeProfile) {
    return null
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const updated = await updateProfile(activeProfile.id, { name, defaultCurrency: currency })
    setSubmitting(false)
    if (updated) {
      setEditing(false)
    }
  }

  return (
    <Card id="profile-settings" withBorder radius="lg" padding="lg" mb="xl">
      {!editing ? (
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <ThemeIcon variant="light" color="indigo" size={42} radius="md"><IconSettings size={20} /></ThemeIcon>
            <div><Text size="xs" fw={700} c="dimmed" tt="uppercase">Active profile</Text><Text fw={700}>{activeProfile.name}</Text><Text size="sm" c="dimmed">Default currency: {activeProfile.defaultCurrency}</Text></div>
          </Group>
          <Button variant="subtle" onClick={() => setEditing(true)}>Edit profile</Button>
        </Group>
      ) : (
        <form onSubmit={submit}>
          <Stack gap="md">
            <Group justify="space-between"><Title order={3} size="h4">Edit profile</Title><Button type="button" variant="subtle" onClick={() => setEditing(false)}>Cancel</Button></Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Profile name" value={name} onChange={(event) => setName(event.currentTarget.value)} required maxLength={100} />
              <NativeSelect label="Default currency" data={['USD', 'EUR', 'GBP', 'CAD', 'AUD']} value={currency} onChange={(event) => setCurrency(event.currentTarget.value.toUpperCase())} required />
            </SimpleGrid>
            <Group justify="flex-end"><Button type="submit" loading={submitting}>Save profile</Button></Group>
          </Stack>
        </form>
      )}
    </Card>
  )
}

const NewProfileForm = () => {
  const { createProfile } = useProfiles()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const created = await createProfile({ name, defaultCurrency: currency })
    setSubmitting(false)
    if (created) {
      setName('')
      setCurrency('USD')
    }
  }

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group gap="sm" mb="md"><ThemeIcon variant="light" color="cyan"><IconPlus size={17} /></ThemeIcon><div><Text size="xs" fw={700} c="dimmed" tt="uppercase">Profiles</Text><Title order={3} size="h4">Add another profile</Title></div></Group>
      <form onSubmit={submit}>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" style={{ alignItems: 'end' }}>
          <TextInput label="Profile name" placeholder="Retirement" value={name} onChange={(event) => setName(event.currentTarget.value)} required maxLength={100} />
          <NativeSelect label="Currency" data={['USD', 'EUR', 'GBP', 'CAD', 'AUD']} value={currency} onChange={(event) => setCurrency(event.currentTarget.value.toUpperCase())} required />
          <Button type="submit" variant="light" loading={submitting}>Add profile</Button>
        </SimpleGrid>
      </form>
    </Card>
  )
}

const PortfolioCard = ({ portfolio, onDelete, onSelect, selected }: { portfolio: Portfolio; onDelete: (portfolio: Portfolio) => void; onSelect: (portfolio: Portfolio) => void; selected: boolean }) => {
  const { updatePortfolio } = useProfiles()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(portfolio.name)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const updated = await updatePortfolio(portfolio.id, { name })
    setSubmitting(false)
    if (updated) {
      setEditing(false)
    }
  }

  return (
    <Card withBorder radius="lg" padding="lg" shadow={selected ? 'md' : 'xs'} className={selected ? 'portfolio-card-active' : undefined}>
      {editing ? (
        <form onSubmit={submit}>
          <Stack gap="sm">
            <TextInput label="Portfolio name" value={name} onChange={(event) => setName(event.currentTarget.value)} required maxLength={100} />
            <Group justify="flex-end"><Button type="button" variant="subtle" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" loading={submitting}>Save</Button></Group>
          </Stack>
        </form>
      ) : (
        <Stack gap="lg">
          <UnstyledButton onClick={() => onSelect(portfolio)} aria-pressed={selected}>
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon size={42} radius="md" variant={selected ? 'filled' : 'light'} color="indigo"><IconWallet size={20} /></ThemeIcon>
                <div><Text fw={700}>{portfolio.name}</Text><Text size="sm" c="dimmed">Portfolio · {portfolio.currency}</Text></div>
              </Group>
              <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />
            </Group>
          </UnstyledButton>
          <Group grow>
            <Button variant={selected ? 'filled' : 'light'} onClick={() => onSelect(portfolio)}>{selected ? 'Selected' : 'View portfolio'}</Button>
            <Menu shadow="md" width={150} position="bottom-end">
              <Menu.Target><Button variant="default" aria-label={`Manage ${portfolio.name}`}>More</Button></Menu.Target>
              <Menu.Dropdown><Menu.Item leftSection={<IconSettings size={15} />} onClick={() => setEditing(true)}>Edit</Menu.Item><Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => onDelete(portfolio)}>Delete</Menu.Item></Menu.Dropdown>
            </Menu>
          </Group>
        </Stack>
      )}
    </Card>
  )
}

const Confirmation = ({ target, onCancel, onConfirm, submitting }: { target: DeleteTarget | null; onCancel: () => void; onConfirm: () => void; submitting: boolean }) => (
  <Modal opened={target !== null} onClose={onCancel} title="Confirm deletion" centered>
    {target && <Stack gap="md">
      <Text>Delete <Text span fw={700}>{target.label}</Text>?</Text>
      <Text size="sm" c="dimmed">{target.kind === 'profile' ? 'This permanently deletes the profile and all portfolios belonging to it.' : 'This permanently deletes the portfolio and its trades.'}</Text>
      <Group justify="flex-end"><Button variant="default" onClick={onCancel}>Cancel</Button><Button color="red" leftSection={<IconTrash size={16} />} loading={submitting} onClick={onConfirm}>Delete permanently</Button></Group>
    </Stack>}
  </Modal>
)

const Dashboard = () => {
  const { profiles, activeProfile, activeProfileId, portfolios, selectProfile, createPortfolio, deleteProfile, deletePortfolio } = useProfiles()
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
      <Group justify="space-between" align="flex-end" mb="xl" className="dashboard-heading">
        <div>
          <Text size="sm" fw={700} c="indigo" tt="uppercase">Overview</Text>
          <Title order={1} size="h1" mt={4}>Your investing workspace</Title>
          <Text c="dimmed">Track decisions, positions, and performance without the spreadsheet sprawl.</Text>
        </div>
        <Select aria-label="Active profile" value={String(activeProfile.id)} onChange={(value) => { if (value) { setSelectedPortfolioId(null); selectProfile(Number(value)) } }} data={profiles.map((profile) => ({ value: String(profile.id), label: `${profile.name} · ${profile.defaultCurrency}` }))} leftSection={<IconFolders size={16} />} w={{ base: '100%', sm: 240 }} />
      </Group>
      <ErrorBanner />
      <Card withBorder radius="lg" padding="xl" mb="xl" className="hero-card">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div><Badge color="cyan" variant="light" mb="sm">{activeProfile.defaultCurrency} workspace</Badge><Title order={2} size="h2">Stay close to the numbers.</Title><Text c="dimmed" maw={560} mt="xs">Select a portfolio to review your holdings, record a trade, or keep market prices current.</Text></div>
          <ThemeIcon visibleFrom="sm" size={64} radius="xl" variant="gradient" gradient={{ from: 'indigo', to: 'cyan', deg: 135 }}><IconChartDonut size={32} /></ThemeIcon>
        </Group>
      </Card>
      <ProfileSettings />
      <Group id="portfolio-dashboard" justify="space-between" align="flex-end" mb="md">
        <div><Text size="sm" fw={700} c="indigo" tt="uppercase">Your space</Text><Title order={2} size="h2">Portfolios</Title><Text size="sm" c="dimmed">Every portfolio reports in {activeProfile.defaultCurrency}.</Text></div>
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
      <NewProfileForm />
      <Confirmation target={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={() => void confirmDelete()} submitting={deleting} />
    </>
  )
}

const AppContent = () => {
  const { profiles, loading } = useProfiles()

  if (loading) {
    return <WorkspaceShell><Stack align="center" justify="center" mih="60vh" gap="md"><Loader color="indigo" size="lg" /><Title order={2}>Loading your workspace</Title><Text c="dimmed">Preparing your portfolios…</Text></Stack></WorkspaceShell>
  }

  return profiles.length === 0 ? <Onboarding /> : <WorkspaceShell><Dashboard /></WorkspaceShell>
}

const App = () => (
  <MantineProvider
    defaultColorScheme="light"
    theme={{
      primaryColor: 'indigo',
      defaultRadius: 'md',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }
    }}
  >
    <ProfileProvider><AppContent /></ProfileProvider>
  </MantineProvider>
)

export default App
