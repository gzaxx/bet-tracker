import { Alert, Button, Group, Text } from '@mantine/core'
import { IconRefresh } from '@tabler/icons-react'
import { useProfiles } from '../profiles/ProfileContext'

export const ErrorBanner = () => {
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
