import { useState, type FormEvent } from 'react'
import { Button, Card, Group, NativeSelect, SimpleGrid, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useProfiles } from '../profiles/ProfileContext'

export const NewProfileForm = () => {
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
