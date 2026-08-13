import { useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, Container, Group, NativeSelect, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useProfiles } from '../profiles/ProfileContext'

export const Onboarding = () => {
  const { createProfileAndPortfolio, error, refresh } = useProfiles()
  const [profileName, setProfileName] = useState('')
  const [currency, setCurrency] = useState('PLN')
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
              <NativeSelect label="Default currency" data={['PLN', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']} value={currency} onChange={(event) => setCurrency(event.currentTarget.value.toUpperCase())} required />
              <TextInput label="First portfolio" placeholder="Long term" value={portfolioName} onChange={(event) => setPortfolioName(event.currentTarget.value)} required maxLength={100} />
              <Button type="submit" size="md" loading={submitting} leftSection={!submitting && <IconPlus size={17} />}>Create profile and portfolio</Button>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  )
}
