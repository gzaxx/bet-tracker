import { Loader, MantineProvider, Stack, Text, Title } from '@mantine/core'
import { ProfileProvider, useProfiles } from './features/profiles/ProfileContext'
import { Dashboard } from './features/dashboard/Dashboard'
import { Onboarding } from './features/dashboard/Onboarding'
import { WorkspaceShell } from './components/layout/WorkspaceShell'
import './App.css'

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
