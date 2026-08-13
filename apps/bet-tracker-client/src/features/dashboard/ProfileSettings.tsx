import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card, Group, NativeSelect, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import { useProfiles } from '../profiles/ProfileContext'

export const ProfileSettings = () => {
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
