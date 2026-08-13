import { AppShell, Badge, Burger, Group, Text, ThemeIcon } from '@mantine/core'
import { IconAdjustments, IconChartDonut } from '@tabler/icons-react'

type TopBarProps = {
  opened: boolean
  onToggle: () => void
}

export const TopBar = ({ opened, onToggle }: TopBarProps) => (
  <AppShell.Header>
    <Group h="100%" px="lg" justify="space-between">
      <Group gap="sm">
        <Burger hiddenFrom="sm" opened={opened} onClick={onToggle} size="sm" />
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
)
