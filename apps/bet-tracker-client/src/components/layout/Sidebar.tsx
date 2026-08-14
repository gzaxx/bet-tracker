import {
  AppShell,
  Avatar,
  Group,
  NavLink,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconLayoutDashboard,
  IconSettings,
} from "@tabler/icons-react";

type SidebarProps = {
  onNavigate: () => void;
};

export const Sidebar = ({ onNavigate }: SidebarProps) => (
  <AppShell.Navbar p="md">
    <AppShell.Section grow>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
        Workspace
      </Text>
      <Stack gap={4}>
        <NavLink
          component="a"
          href="#overview"
          label="Overview"
          leftSection={<IconLayoutDashboard size={17} />}
          onClick={onNavigate}
        />
        <NavLink
          component="a"
          href="#portfolios"
          label="Portfolios"
          leftSection={<IconSettings size={17} />}
          onClick={onNavigate}
        />
      </Stack>
    </AppShell.Section>
    <Paper p="sm" radius="md" withBorder bg="gray.0">
      <Group gap="xs" wrap="nowrap">
        <Avatar color="indigo" radius="xl" size="sm">
          BT
        </Avatar>
        <div>
          <Text size="xs" fw={700}>
            Bet Tracker
          </Text>
        </div>
      </Group>
    </Paper>
  </AppShell.Navbar>
);
