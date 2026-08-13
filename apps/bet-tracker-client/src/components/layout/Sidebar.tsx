import { AppShell, Avatar, Divider, NavLink, Paper, Stack, Text, Group } from '@mantine/core'
import {
  IconArrowUpRight,
  IconChartDonut,
  IconLayoutDashboard,
  IconSettings
} from '@tabler/icons-react'

type SidebarProps = {
  onNavigate: () => void
}

export const Sidebar = ({ onNavigate }: SidebarProps) => (
  <AppShell.Navbar p="md">
    <AppShell.Section grow>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">Workspace</Text>
      <Stack gap={4}>
        <NavLink component="a" href="#portfolio-dashboard" label="Overview" leftSection={<IconLayoutDashboard size={17} />} onClick={onNavigate} />
        <NavLink component="a" href="#trades" label="Trades" leftSection={<IconArrowUpRight size={17} />} onClick={onNavigate} />
        <NavLink component="a" href="#prices" label="Prices" leftSection={<IconChartDonut size={17} />} onClick={onNavigate} />
      </Stack>
      <Divider my="lg" />
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">Manage</Text>
      <NavLink component="a" href="#profile-settings" label="Profile settings" leftSection={<IconSettings size={17} />} onClick={onNavigate} />
    </AppShell.Section>
    <Paper p="sm" radius="md" withBorder bg="gray.0">
      <Group gap="xs" wrap="nowrap">
        <Avatar color="indigo" radius="xl" size="sm">LL</Avatar>
        <div>
          <Text size="xs" fw={700}>Ledgerline</Text>
          <Text size="xs" c="dimmed">Private by default</Text>
        </div>
      </Group>
    </Paper>
  </AppShell.Navbar>
)
