import { useDisclosure } from '@mantine/hooks'
import { AppShell } from '@mantine/core'
import type { ReactNode } from 'react'
import { Content } from './Content'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type WorkspaceShellProps = {
  children: ReactNode
}

export const WorkspaceShell = ({ children }: WorkspaceShellProps) => {
  const [opened, { toggle, close }] = useDisclosure(false)

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <TopBar opened={opened} onToggle={toggle} />
      <Sidebar onNavigate={close} />
      <Content>{children}</Content>
    </AppShell>
  )
}
