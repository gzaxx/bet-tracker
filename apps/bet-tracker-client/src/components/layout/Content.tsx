import type { ReactNode } from 'react'
import { AppShell, Container } from '@mantine/core'

type ContentProps = {
  children: ReactNode
}

export const Content = ({ children }: ContentProps) => (
  <AppShell.Main>
    <Container size="xl" py={{ base: 'sm', sm: 'xl' }}>
      {children}
    </Container>
  </AppShell.Main>
)
