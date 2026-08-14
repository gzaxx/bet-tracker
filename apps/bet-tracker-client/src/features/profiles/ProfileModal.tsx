import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Group, Modal, NativeSelect, Stack, Text, TextInput } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useProfiles } from './ProfileContext'

export type ProfileModalMode = 'add' | 'edit' | null

type ProfileModalProps = {
  mode: ProfileModalMode
  onClose: () => void
}

export const ProfileModal = ({ mode, onClose }: ProfileModalProps) => {
  const { activeProfile, createProfile, updateProfile, deleteProfile, error, clearError } = useProfiles()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('PLN')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const editing = mode === 'edit'
  useEffect(() => {
    if (mode !== 'edit') {
      setConfirmingDelete(false)
    }

    if (mode !== null) {
      clearError()
    }

    if (editing && activeProfile) {
      setName(activeProfile.name)
      setCurrency(activeProfile.defaultCurrency)
    } else if (!editing) {
      setName('')
      setCurrency('PLN')
    }
  }, [activeProfile, clearError, editing, mode])

  const cancelDelete = () => {
    setConfirmingDelete(false)
    clearError()
  }

  const confirmDelete = async () => {
    if (!activeProfile) {
      return
    }

    clearError()
    setDeleting(true)
    const deleted = await deleteProfile(activeProfile.id)
    setDeleting(false)

    if (deleted) {
      setConfirmingDelete(false)
      onClose()
    }
  }

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
    <>
      <Modal opened={mode !== null} onClose={onClose} title={editing ? 'Edit profile' : 'Add profile'} centered>
        <form onSubmit={submit}>
          <Stack gap="md">
            {error && !confirmingDelete && <Alert color="red" title="Unable to save profile" withCloseButton onClose={clearError}>{error}</Alert>}
            <TextInput label="Profile name" placeholder="Personal" value={name} onChange={(event) => setName(event.currentTarget.value)} required maxLength={100} />
            <NativeSelect label="Default currency" data={['PLN', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']} value={currency} onChange={(event) => setCurrency(event.currentTarget.value.toUpperCase())} required />
            <Group justify="space-between">
              {editing && <Button type="button" variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={() => { clearError(); setConfirmingDelete(true) }}>Delete profile</Button>}
              <Group justify="flex-end" ml="auto">
                <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
                <Button type="submit" loading={submitting}>{editing ? 'Save profile' : 'Add profile'}</Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal opened={confirmingDelete} onClose={cancelDelete} title="Confirm profile deletion" centered>
        <Stack gap="md">
          {error && <Alert color="red" title="Unable to delete profile" withCloseButton onClose={clearError}>{error}</Alert>}
          <Text>Delete <Text span fw={700}>{activeProfile?.name}</Text>?</Text>
          <Text size="sm" c="dimmed">This permanently deletes the profile and all portfolios belonging to it.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={cancelDelete}>Cancel</Button>
            <Button color="red" leftSection={<IconTrash size={16} />} loading={deleting} onClick={() => void confirmDelete()}>Delete permanently</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
