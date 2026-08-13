import { useState } from "react";
import {
  AppShell,
  ActionIcon,
  Badge,
  Burger,
  Group,
  Select,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAdjustments,
  IconChartDonut,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { useProfiles } from "../../features/profiles/ProfileContext";
import {
  ProfileModal,
  type ProfileModalMode,
} from "../../features/profiles/ProfileModal";

type TopBarProps = {
  opened: boolean;
  onToggle: () => void;
};

export const TopBar = ({ opened, onToggle }: TopBarProps) => {
  const { profiles, activeProfile, activeProfileId, selectProfile } =
    useProfiles();
  const [profileModalMode, setProfileModalMode] =
    useState<ProfileModalMode>(null);

  return (
    <>
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              hiddenFrom="sm"
              opened={opened}
              onClick={onToggle}
              size="sm"
            />
            <ThemeIcon
              size={38}
              radius="md"
              variant="gradient"
              gradient={{ from: "indigo", to: "cyan", deg: 135 }}
            >
              <IconChartDonut size={21} />
            </ThemeIcon>
            <div>
              <Text fw={800} size="lg" lh={1}>
                Bet Tracker
              </Text>
            </div>
          </Group>
          {activeProfile && profiles.length > 0 ? (
            <Group gap="xs" wrap="nowrap">
              <Select
                aria-label="Active profile"
                value={
                  activeProfileId === null ? null : String(activeProfileId)
                }
                onChange={(value) => {
                  if (value) {
                    selectProfile(Number(value));
                  }
                }}
                data={profiles.map((profile) => ({
                  value: String(profile.id),
                  label: `${profile.name} · ${profile.defaultCurrency}`,
                }))}
                w={{ base: 150, sm: 240 }}
                size="sm"
              />
              <Tooltip label="Edit profile">
                <ActionIcon
                  aria-label="Edit profile"
                  variant="light"
                  color="indigo"
                  size="lg"
                  onClick={() => setProfileModalMode("edit")}
                >
                  <IconSettings size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Add profile">
                <ActionIcon
                  aria-label="Add profile"
                  variant="light"
                  color="cyan"
                  size="lg"
                  onClick={() => setProfileModalMode("add")}
                >
                  <IconPlus size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ) : null}
        </Group>
      </AppShell.Header>
      <ProfileModal
        mode={profileModalMode}
        onClose={() => setProfileModalMode(null)}
      />
    </>
  );
};
