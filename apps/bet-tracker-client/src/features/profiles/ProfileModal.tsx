import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Group, Modal, NativeSelect, Stack, TextInput } from '@mantine/core'
import { useProfiles } from './ProfileContext'

export type ProfileModalMode = 'add' | 'edit' | null

type ProfileModalProps = {
  mode: ProfileModalMode
  onClose: () => void
}

export const ProfileModal = ({ mode, onClose }: ProfileModalProps) => {
  const { activeProfile, createProfile, updateProfile, error, clearError } = useProfiles()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [submitting, setSubmitting] = useState(false)
  const editing = mode === 'edit'
  useEffect(() => {
    if (mode !== null) {
      clearError()
    }

    if (editing && activeProfile) {
      setName(activeProfile.name)
      setCurrency(activeProfile.defaultCurrency)
    } else if (!editing) {
      setName('')
      setCurrency('USD')
    }
  }, [activeProfile, clearError, editing, mode])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearError()
    setSubmitting(true)

    const saved = editing
      ? activeProfile
        ? await updateProfile(activeProfile.id, { name, defaultCurrency: currency })
        : false
      : await createProfile({ name, defaultCurrency: currency })

    setSubmitting(false)
    if (saved) {
      onClose()
    }
  }

  return (
    <Modal opened={mode !== null} onClose={onClose} title={editing ? 'Edit profile' : 'Add profile'} centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          {error && <Alert color="red" title="Unable to save profile" withCloseButton onClose={clearError}>{error}</Alert>}
          <TextInput label="Profile name" placeholder="Personal" value={name} onChange={(event) => setName(event.currentTarget.value)} required maxLength={100} />
          <NativeSelect label="Default currency" data={['USD', 'EUR', 'GBP', 'CAD', 'AUD']} value={currency} onChange={(event) => setCurrency(event.currentTarget.value.toUpperCase())} required />
          <Group justify="flex-end">
            <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editing ? 'Save profile' : 'Add profile'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
