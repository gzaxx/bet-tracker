import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import type { DeleteTarget } from './types'

type ConfirmationProps = {
  target: DeleteTarget | null
  onCancel: () => void
  onConfirm: () => void
  submitting: boolean
}

export const Confirmation = ({ target, onCancel, onConfirm, submitting }: ConfirmationProps) => (
  <Modal opened={target !== null} onClose={onCancel} title="Confirm deletion" centered>
    {target && <Stack gap="md">
      <Text>Delete <Text span fw={700}>{target.label}</Text>?</Text>
      <Text size="sm" c="dimmed">{target.kind === 'profile' ? 'This permanently deletes the profile and all portfolios belonging to it.' : 'This permanently deletes the portfolio and its trades.'}</Text>
      <Group justify="flex-end"><Button variant="default" onClick={onCancel}>Cancel</Button><Button color="red" leftSection={<IconTrash size={16} />} loading={submitting} onClick={onConfirm}>Delete permanently</Button></Group>
    </Stack>}
  </Modal>
)
