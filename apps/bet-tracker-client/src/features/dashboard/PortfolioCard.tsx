import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  Group,
  Menu,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { IconSettings, IconTrash, IconWallet } from "@tabler/icons-react";
import { useProfiles } from "../profiles/ProfileContext";
import type { Portfolio } from "../../types/domain";

type PortfolioCardProps = {
  portfolio: Portfolio;
  onDelete: (portfolio: Portfolio) => void;
  onSelect: (portfolio: Portfolio) => void;
  selected: boolean;
};

export const PortfolioCard = ({
  portfolio,
  onDelete,
  onSelect,
  selected,
}: PortfolioCardProps) => {
  const { updatePortfolio } = useProfiles();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(portfolio.name);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const updated = await updatePortfolio(portfolio.id, { name });
    setSubmitting(false);
    if (updated) {
      setEditing(false);
    }
  };

  return (
    <Card
      withBorder
      radius="lg"
      padding="lg"
      shadow={selected ? "md" : "xs"}
      className={selected ? "portfolio-card-active" : undefined}
    >
      {editing ? (
        <form onSubmit={submit}>
          <Stack gap="sm">
            <TextInput
              label="Portfolio name"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              maxLength={100}
            />
            <Group justify="flex-end">
              <Button
                type="button"
                variant="subtle"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <Stack gap="lg">
          <UnstyledButton
            onClick={() => onSelect(portfolio)}
            aria-pressed={selected}
          >
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon
                  size={42}
                  radius="md"
                  variant={selected ? "filled" : "light"}
                  color="indigo"
                >
                  <IconWallet size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={700}>{portfolio.name}</Text>
                  <Text size="sm" c="dimmed">
                    Portfolio · {portfolio.currency}
                  </Text>
                </div>
              </Group>
            </Group>
          </UnstyledButton>
          <Group grow>
            <Button
              variant={selected ? "filled" : "light"}
              onClick={() => onSelect(portfolio)}
            >
              {selected ? "Selected" : "View portfolio"}
            </Button>
            <Menu shadow="md" width={150} position="bottom-end">
              <Menu.Target>
                <Button
                  variant="default"
                  aria-label={`Manage ${portfolio.name}`}
                >
                  More
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconSettings size={15} />}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={15} />}
                  onClick={() => onDelete(portfolio)}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Stack>
      )}
    </Card>
  );
};
