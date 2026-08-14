import { useEffect, useState } from 'react'
import { Loader, MantineProvider, Stack, Text, Title } from '@mantine/core'
import { ProfileProvider, useProfiles } from './features/profiles/ProfileContext'
import { Dashboard } from './features/dashboard/Dashboard'
import { Onboarding } from './features/dashboard/Onboarding'
import { Overview } from './features/dashboard/Overview'
import { WorkspaceShell } from './components/layout/WorkspaceShell'
import './App.css'

const useLocationHash = () => {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return hash
}

const AppContent = () => {
  const { activeProfile, activeProfileId, portfolios, loading } = useProfiles()
  const hash = useLocationHash()

  if (loading) {
    return <WorkspaceShell><Stack align="center" justify="center" mih="60vh" gap="md"><Loader color="indigo" size="lg" /><Title order={2}>Loading your workspace</Title><Text c="dimmed">Preparing your portfolios…</Text></Stack></WorkspaceShell>
  }


  if (!activeProfile || activeProfileId === null) {
    return <Onboarding />
  }

  const showOverview = hash === '' || hash === '#overview'
  return <WorkspaceShell>{showOverview ? <Overview activeProfileId={activeProfileId} profileName={activeProfile.name} currency={activeProfile.defaultCurrency} portfolios={portfolios} /> : <Dashboard />}</WorkspaceShell>
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
