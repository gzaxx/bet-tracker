# Frontend Implementation Plan — Bet Tracker

> This plan is written for an AI coding agent. Each phase is self-contained and builds on the previous one. Follow the execution order.

---

## Phase 0: Project Scaffolding

### Goal
Create the React + TypeScript + Vite project with base configuration, routing, and API layer.

### Steps

#### 0.1 Create Project

```bash
cd bet-tracker
npm create vite@latest apps/bet-tracker-client -- --template react-ts
cd apps/bet-tracker-client
npm install
```

#### 0.2 Add Dependencies

```bash
npm install react-router-dom
npm install @mantine/core @mantine/hooks @mantine/dates @mantine/form @mantine/modals
npm install @tabler/icons-react
npm install -D @mantine/vite-plugin
```

#### 0.3 Configure Tailwind CSS

**`vite.config.ts`**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mantine } from '@mantine/vite-plugin'

export default defineConfig({
  plugins: [react(), mantine()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:17796',
        changeOrigin: true,
      }
    }
  }
})
```

**`src/index.css`**
```css
@import '@mantine/core/styles.css';
```

Add to `index.html` head:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

#### 0.4 Create API Client

**`src/services/api.ts`**
```typescript
const API_BASE = '/api/v1';

interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  method: string,
  url: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    opts.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${url}`, opts);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      error: errorBody.detail || errorBody.title || `HTTP ${response.status}`,
    };
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
}

const api = {
  get: <T>(url: string) => fetchApi<T>('GET', url),
  post: <T>(url: string, body?: unknown) => fetchApi<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => fetchApi<T>('PUT', url, body),
  delete: <T>(url: string) => fetchApi<T>('DELETE', url),
};

export default api;
```

#### 0.5 Create TypeScript Types

**`src/types/index.ts`**
```typescript
export interface Profile {
  id: number;
  name: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: number;
  profileId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type TradeType = 'Buy' | 'Sell';

export interface Trade {
  id: number;
  portfolioId: number;
  ticker: string;
  tradeType: TradeType;
  shares: number;
  price: number;
  commission: number;
  tradeDate: string;
  notes?: string;
  isin?: string;
  currency: string;
}

export interface TradeDetail extends Trade {
  portfolioName: string;
  profileName: string;
}

export interface ETF {
  id: number;
  ticker: string;
  name: string;
  exchange?: string;
  type: 'Accumulating' | 'Distributing';
  expenseRatio?: number;
  currency?: string;
  isin?: string;
  createdAt: string;
}

export interface Price {
  ticker: string;
  currency: string;
  price: number;
  fetchedAt: string;
}

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice?: number;
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  realizedGainLoss: number;
  currency: string;
}

export interface PortfolioSummary {
  portfolioId: number;
  portfolioName: string;
  totalInvested: number;
  currentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalRealizedGainLoss: number;
  holdings: Holding[];
}
```

#### 0.6 Create App Shell with Router

**`src/App.tsx`**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import WizardPage from './pages/WizardPage';
import DashboardPage from './pages/DashboardPage';
import TradesPage from './pages/TradesPage';
import ETFsPage from './pages/ETFsPage';
import PortfolioSummaryPage from './pages/PortfolioSummaryPage';

function AppRoutes() {
  const { profile } = useProfile();

  // Redirect to wizard if no profile selected
  if (!profile) {
    return <Routes><Route path="*" element={<WizardPage />} /></Routes>;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/etfs" element={<ETFsPage />} />
        <Route path="/summary/:portfolioId" element={<PortfolioSummaryPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ProfileProvider>
  );
}

export default App;
```

#### 0.7 Create `main.tsx`

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## Phase 1: Profile Wizard & Layout

### Goal
Create the onboarding wizard and the main app layout with navigation.

### 1.1 Profile Context

**`src/context/ProfileContext.tsx`**
```typescript
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { Profile } from '../types';

interface ProfileContextType {
  profile: Profile | null;
  profiles: Profile[];
  setProfile: (profile: Profile) => void;
  loadProfiles: () => Promise<void>;
  switchProfile: (id: number) => Promise<void>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('activeProfileId');
    return saved ? null : null; // Will be loaded on first API call
  });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<Profile[]>('/profiles');
      setProfiles(data.profiles || data);
    } catch {
      // Silently fail — wizard will handle it
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    localStorage.setItem('activeProfileId', String(p.id));
  }, []);

  const switchProfile = useCallback(async (id: number) => {
    const { data } = await api.get(`/profiles/${id}`);
    setProfile(data.profile || data);
  }, [setProfile]);

  return (
    <ProfileContext.Provider value={{ profile, profiles, setProfile, loadProfiles, switchProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
```

### 1.2 Wizard Page

**`src/pages/WizardPage.tsx`**
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import api from '../services/api';
import {
  Container, Paper, Title, Text, TextInput, Select, Button, Group, Box,
  Center, Stack, Progress, Alert, ThemeIcon,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

type WizardStep = 'profile' | 'portfolio' | 'done';

export default function WizardPage() {
  const navigate = useNavigate();
  const { setProfile } = useProfile();
  const [step, setStep] = useState<WizardStep>('profile');
  const [profileName, setProfileName] = useState('');
  const [profileCurrency, setProfileCurrency] = useState('PLN');
  const [portfolioName, setPortfolioName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.post('/profiles', {
        name: profileName,
        defaultCurrency: profileCurrency,
      });
      if (result.ok) {
        const profile = result.data;
        setProfile(profile);
        setStep('portfolio');
      } else {
        setError(result.error || 'Failed to create profile');
      }
    } catch {
      setError('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profileId = localStorage.getItem('activeProfileId');
      const result = await api.post('/portfolios', {
        profileId: Number(profileId),
        name: portfolioName,
      });
      if (result.ok) {
        setStep('done');
        setTimeout(() => navigate('/'), 1500);
      } else {
        setError(result.error || 'Failed to create portfolio');
      }
    } catch {
      setError('Failed to create portfolio');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = ['profile', 'portfolio', 'done'].indexOf(step);

  return (
    <Container size={480} py="xl">
      <Paper withBorder padding="xl" radius="md">
        <Title order={2} ta="center" mb="xs">Bet Tracker</Title>
        <Text c="dimmed" ta="center" mb="xl">
          {step === 'profile' && 'Create your first profile to get started'}
          {step === 'portfolio' && 'Create your first portfolio'}
          {step === 'done' && 'Ready! Redirecting...'}
        </Text>

        <Progress value={(currentStepIndex / 2) * 100} mb="xl" radius="xl" />

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg" closeable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {step === 'profile' && (
          <Stack>
            <TextInput
              label="Profile Name"
              placeholder="My Portfolio"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              required
            />
            <Select
              label="Default Currency"
              value={profileCurrency}
              onChange={setProfileCurrency}
              data={[
                { value: 'PLN', label: 'PLN - Polish Zloty' },
                { value: 'USD', label: 'USD - US Dollar' },
                { value: 'EUR', label: 'EUR - Euro' },
                { value: 'GBP', label: 'GBP - British Pound' },
              ]}
            />
            <Button size="md" onClick={handleCreateProfile} loading={loading}>
              Create Profile
            </Button>
          </Stack>
        )}

        {step === 'portfolio' && (
          <Stack>
            <TextInput
              label="Portfolio Name"
              placeholder="ETF Portfolio"
              value={portfolioName}
              onChange={e => setPortfolioName(e.target.value)}
              required
            />
            <Button size="md" onClick={handleCreatePortfolio} loading={loading}>
              Create Portfolio
            </Button>
          </Stack>
        )}

        {step === 'done' && (
          <Center>
            <Stack align="center">
              <ThemeIcon color="green" size="xl" radius="xl">
                <IconCheck size={24} />
              </ThemeIcon>
              <Text c="dimmed">Setup complete!</Text>
            </Stack>
          </Center>
        )}
      </Paper>
    </Container>
  );
}
```

### 1.3 Main Layout

**`src/components/Layout.tsx`**
```typescript
import { NavLink } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import {
  Header, Container, Group, Text, Select, Navbar,
} from '@mantine/core';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, profiles, switchProfile } = useProfile();

  return (
    <>
      <Header height={56} px="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%">
            <Group gap="md">
              <NavLink to="/" style={{ textDecoration: 'none' }}>
                <Text fw={700} c="blue" size="xl">Bet Tracker</Text>
              </NavLink>
              <Group gap="xs">
                <NavLink to="/" style={{ textDecoration: 'none' }}>
                  <Text
                    size="sm"
                    c="blue"
                    fw={500}
                    px="sm"
                    py="xs"
                    style={{ borderRadius: 'var(--mantine-radius-default)' }}
                  >
                    Dashboard
                  </Text>
                </NavLink>
                <NavLink to="/trades" style={{ textDecoration: 'none' }}>
                  <Text size="sm" c="dark" fw={500} px="sm" py="xs">Trades</Text>
                </NavLink>
                <NavLink to="/etfs" style={{ textDecoration: 'none' }}>
                  <Text size="sm" c="dark" fw={500} px="sm" py="xs">ETFs</Text>
                </NavLink>
              </Group>
            </Group>

            <Group gap="md">
              {profiles.length > 1 && (
                <Select
                  value={String(profile?.id)}
                  onChange={e => e && switchProfile(Number(e))}
                  data={profiles.map(p => ({ value: String(p.id), label: p.name }))}
                  size="sm"
                  w={180}
                />
              )}
              <Text size="sm" c="dimmed">
                {profile?.name} · {profile?.defaultCurrency}
              </Text>
            </Group>
          </Group>
        </Container>
      </Header>

      <Container size="xl" py="lg">
        {children}
      </Container>
    </>
  );
}
```

Update `App.tsx` to wrap routes with `<Layout>`:
```typescript
function AppRoutes() {
  // ... existing code
  return (
    <Layout>
      <Routes>
        {/* ... existing routes */}
      </Routes>
    </Layout>
  );
}
```

---

## Phase 2: Dashboard & Portfolio Selection

### Goal
Dashboard page showing profiles, portfolios, and quick links to trade entry and summary.

### 2.1 Dashboard Page

**`src/pages/DashboardPage.tsx`**
```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import api from '../services/api';
import { Portfolio } from '../types';
import { Center, Text, Grid, Card, Title, Button, Stack } from '@mantine/core';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const { data } = await api.get(`/profiles/${profile.id}/portfolios`);
        setPortfolios(data.portfolios || data);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading) return <Center h={200}><Text c="dimmed">Loading...</Text></Center>;

  return (
    <Stack>
      <Title order={2}>Dashboard</Title>

      {/* Stats cards */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Portfolios</Text>
            <Text size="h1" fw={700}>{portfolios.length}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Profile Currency</Text>
            <Text size="h1" fw={700}>{profile?.defaultCurrency}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Status</Text>
            <Text size="h1" fw={700} c="green">Active</Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Portfolio cards */}
      <Title order={3}>Your Portfolios</Title>
      {portfolios.length === 0 ? (
        <Card padding="xl" radius="md" withBorder>
          <Text c="dimmed" ta="center" mb="lg">No portfolios yet. Add one to get started.</Text>
          <Button onClick={() => navigate('/trades')} variant="filled">Add First Trade</Button>
        </Card>
      ) : (
        <Grid>
          {portfolios.map(p => (
            <Grid.Col key={p.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card
                padding="lg"
                radius="md"
                withBorder
                hoverable
                onClick={() => navigate(`/summary/${p.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Title order={4}>{p.name}</Title>
                <Text size="xs" c="dimmed" mt="xs">
                  ID: {p.id} · Created: {new Date(p.createdAt).toLocaleDateString()}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
```

---

## Phase 3: Trade Management

### Goal
Trade listing, create/edit forms, and delete functionality.

### 3.1 Trade List Component

**`src/components/TradeList.tsx`**
```typescript
import { Trade } from '../types';
import { Table, Text, ActionIcon, Stack } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: number) => void;
}

export default function TradeList({ trades, onEdit, onDelete }: TradeListProps) {
  if (trades.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No trades yet. Click "Add Trade" to get started.
      </Text>
    );
  }

  const rows = trades.map(t => (
    <Table.Tr key={t.id}>
      <Table.Td>{new Date(t.tradeDate).toLocaleDateString()}</Table.Td>
      <Table.Td fw={500}>{t.ticker}</Table.Td>
      <Table.Td>
        <Text
          size="xs"
          fw={500}
          c={t.tradeType === 'Buy' ? 'green' : 'red'}
          variant="light"
          px="sm"
          py="2"
          style={{ borderRadius: 'var(--mantine-radius-xs)', display: 'inline-block' }}
        >
          {t.tradeType}
        </Text>
      </Table.Td>
      <Table.Td ta="right">{t.shares.toFixed(4)}</Table.Td>
      <Table.Td ta="right">{t.price.toFixed(4)}</Table.Td>
      <Table.Td ta="right">{t.commission.toFixed(4)}</Table.Td>
      <Table.Td ta="right" fw={500}>
        {(t.shares * t.price).toFixed(2)}
      </Table.Td>
      <Table.Td>{t.currency}</Table.Td>
      <Table.Td>
        <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(t)}>
          <IconPencil size={16} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="red" onClick={() => onDelete(t.id)}>
          <IconTrash size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table
      striped
      highlightOnHover
      horizontalSpacing="md"
      verticalSpacing="xs"
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Date</Table.Th>
          <Table.Th>Ticker</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th ta="right">Shares</Table.Th>
          <Table.Th ta="right">Price</Table.Th>
          <Table.Th ta="right">Commission</Table.Th>
          <Table.Th ta="right">Total</Table.Th>
          <Table.Th>Currency</Table.Th>
          <Table.Th></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
```

### 3.2 Trade Form Component

**`src/components/TradeForm.tsx`**
```typescript
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Trade, TradeType } from '../types';
import {
  Paper, Title, TextInput, Select, NumberInput, Button, Group, Text,
  Stack, Alert, Textarea, Divider, Box,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface TradeFormProps {
  portfolioId: number;
  editTrade?: Trade | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function TradeForm({ portfolioId, editTrade, onSubmit, onCancel }: TradeFormProps) {
  const [form, setForm] = useState({
    ticker: editTrade?.ticker || '',
    tradeType: editTrade?.tradeType || 'Buy' as TradeType,
    shares: editTrade?.shares?.toString() || '',
    price: editTrade?.price?.toString() || '',
    commission: editTrade?.commission?.toString() || '0',
    tradeDate: editTrade?.tradeDate ? new Date(editTrade.tradeDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: editTrade?.notes || '',
    isin: editTrade?.isin || '',
    currency: editTrade?.currency || 'PLN',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [etfSuggestions, setEtfSuggestions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.get('/etfs');
        if (result.ok) {
          const data = result.data as any[];
          setEtfSuggestions(data.map((e: any) => ({
            value: e.ticker,
            label: `${e.ticker} — ${e.name}`,
          })));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        portfolioId,
        ticker: form.ticker.toUpperCase(),
        tradeType: form.tradeType,
        shares: parseFloat(form.shares),
        price: parseFloat(form.price),
        commission: parseFloat(form.commission) || 0,
        tradeDate: form.tradeDate,
        notes: form.notes || undefined,
        isin: form.isin || undefined,
        currency: form.currency,
      };

      if (editTrade) {
        const result = await api.put(`/trades/${editTrade.id}`, payload);
        if (!result.ok) { setError(result.error || 'Failed to update trade'); return; }
      } else {
        const result = await api.post('/trades', payload);
        if (!result.ok) { setError(result.error || 'Failed to create trade'); return; }
      }
      onSubmit();
    } catch {
      setError('Failed to save trade');
    } finally {
      setLoading(false);
    }
  };

  const total = (parseFloat(form.shares) || 0) * (parseFloat(form.price) || 0);

  return (
    <Paper withBorder padding="xl" radius="md">
      <Title order={3} mb="lg">
        {editTrade ? 'Edit Trade' : 'Add Trade'}
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg" closeable onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Ticker"
              placeholder="VOO"
              value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
              data={etfSuggestions}
              comboboxProps={{ withinPortal: false }}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Type"
              value={form.tradeType}
              onChange={e => setForm(f => ({ ...f, tradeType: e as TradeType }))}
              data={[
                { value: 'Buy', label: 'Buy' },
                { value: 'Sell', label: 'Sell' },
              ]}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Shares"
              value={form.shares ? parseFloat(form.shares) : null}
              onChange={v => setForm(f => ({ ...f, shares: String(v || 0) }))}
              decimalScale={4}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Price"
              value={form.price ? parseFloat(form.price) : null}
              onChange={v => setForm(f => ({ ...f, price: String(v || 0) }))}
              decimalScale={4}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Commission"
              value={form.commission ? parseFloat(form.commission) : null}
              onChange={v => setForm(f => ({ ...f, commission: String(v || 0) }))}
              decimalScale={4}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Currency"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e || 'PLN' }))}
              data={[
                { value: 'PLN', label: 'PLN' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'GBP', label: 'GBP' },
              ]}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Date"
              type="date"
              value={form.tradeDate}
              onChange={e => setForm(f => ({ ...f, tradeDate: e.target.value }))}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="ISIN"
              placeholder="US9229081234"
              value={form.isin}
              onChange={e => setForm(f => ({ ...f, isin: e.target.value }))}
            />
          </Grid.Col>
        </Grid>

        <Textarea
          label="Notes"
          placeholder="Optional notes..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
        />

        <Divider />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total: <Text span fw={500}>{total.toFixed(2)}</Text>
          </Text>
          <Group gap="sm">
            <Button variant="subtle" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSubmit} loading={loading}>
              {editTrade ? 'Update' : 'Add Trade'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
```

### 3.3 Trades Page

**`src/pages/TradesPage.tsx`**
```typescript
import { useEffect, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import api from '../services/api';
import { Trade } from '../types';
import { Center, Text, Stack, Group, Title, Paper, Select, Button } from '@mantine/core';
import TradeList from '../components/TradeList';
import TradeForm from '../components/TradeForm';

export default function TradesPage() {
  const { profile } = useProfile();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const { data } = await api.get(`/profiles/${profile.id}/portfolios`);
        setPortfolios(data.portfolios || data);
        if (data.portfolios?.[0]) {
          setSelectedPortfolioId(data.portfolios[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  const loadTrades = async () => {
    if (!selectedPortfolioId) return;
    try {
      const { data } = await api.get(`/portfolios/${selectedPortfolioId}/trades`);
      setTrades(data.trades || data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (selectedPortfolioId) loadTrades();
  }, [selectedPortfolioId]);

  const handleDelete = async (id: number) => {
    const { confirm } = await import('@mantine/modals');
    confirm({
      title: 'Delete Trade',
      children: 'Are you sure you want to delete this trade?',
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/trades/${id}`);
          loadTrades();
        } catch { /* ignore */ }
      },
    });
  };

  if (loading) return <Center h={200}><Text c="dimmed">Loading...</Text></Center>;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Trades</Title>
        <Group gap="sm">
          <Select
            value={String(selectedPortfolioId || '')}
            onChange={e => setSelectedPortfolioId(e ? Number(e) : null)}
            data={portfolios.map(p => ({ value: String(p.id), label: p.name }))}
            placeholder="Select portfolio"
            w={200}
          />
          <Button onClick={() => { setEditingTrade(null); setShowForm(true); }}>
            + Add Trade
          </Button>
        </Group>
      </Group>

      {showForm ? (
        <TradeForm
          portfolioId={selectedPortfolioId!}
          editTrade={editingTrade}
          onSubmit={() => { setShowForm(false); setEditingTrade(null); loadTrades(); }}
          onCancel={() => { setShowForm(false); setEditingTrade(null); }}
        />
      ) : (
        <Paper withBorder padding="lg" radius="md">
          <TradeList
            trades={trades}
            onEdit={t => { setEditingTrade(t); setShowForm(true); }}
            onDelete={handleDelete}
          />
        </Paper>
      )}
    </Stack>
  );
}
```

---

## Phase 4: ETF Management

### Goal
ETF reference page with create/edit forms and autocomplete for trades.

### 4.1 ETF List Component

**`src/components/ETFList.tsx`**
```typescript
import { ETF } from '../types';
import { Table, Text, ActionIcon } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';

interface ETFListProps {
  etfs: ETF[];
  onEdit: (etf: ETF) => void;
}

export default function ETFList({ etfs, onEdit }: ETFListProps) {
  if (etfs.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No ETFs defined. Add one to enable autocomplete.
      </Text>
    );
  }

  const rows = etfs.map(e => (
    <Table.Tr key={e.id}>
      <Table.Td fw={500}>{e.ticker}</Table.Td>
      <Table.Td>{e.name}</Table.Td>
      <Table.Td>
        <Text
          size="xs"
          fw={500}
          c={e.type === 'Accumulating' ? 'blue' : 'purple'}
          variant="light"
          px="sm"
          py="2"
          style={{ borderRadius: 'var(--mantine-radius-xs)', display: 'inline-block' }}
        >
          {e.type}
        </Text>
      </Table.Td>
      <Table.Td>{e.exchange || '—'}</Table.Td>
      <Table.Td ta="right">{e.expenseRatio ? `${(e.expenseRatio * 100).toFixed(2)}%` : '—'}</Table.Td>
      <Table.Td>{e.currency || '—'}</Table.Td>
      <Table.Td>
        <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(e)}>
          <IconPencil size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Ticker</Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Exchange</Table.Th>
          <Table.Th ta="right">Expense Ratio</Table.Th>
          <Table.Th>Currency</Table.Th>
          <Table.Th></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
```

### 4.2 ETF Form Component

**`src/components/ETFForm.tsx`**
```typescript
import { useState, useEffect } from 'react';
import api from '../services/api';
import { ETF } from '../types';
import {
  Paper, Title, TextInput, Select, NumberInput, Button, Group, Text,
  Stack, Alert, Divider, Grid,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ETFFormProps {
  editETF?: ETF | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ETFForm({ editETF, onSubmit, onCancel }: ETFFormProps) {
  const [form, setForm] = useState({
    ticker: editETF?.ticker || '',
    name: editETF?.name || '',
    exchange: editETF?.exchange || '',
    type: editETF?.type || 'Accumulating' as 'Accumulating' | 'Distributing',
    expenseRatio: editETF?.expenseRatio?.toString() || '',
    currency: editETF?.currency || '',
    isin: editETF?.isin || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ticker: form.ticker.toUpperCase(),
        name: form.name,
        exchange: form.exchange || undefined,
        type: form.type,
        expenseRatio: form.expenseRatio ? parseFloat(form.expenseRatio) : undefined,
        currency: form.currency || undefined,
        isin: form.isin || undefined,
      };

      if (editETF) {
        const result = await api.put(`/etfs/${editETF.id}`, payload);
        if (!result.ok) { setError(result.error || 'Failed to update ETF'); return; }
      } else {
        const result = await api.post('/etfs', payload);
        if (!result.ok) { setError(result.error || 'Failed to create ETF'); return; }
      }
      onSubmit();
    } catch {
      setError('Failed to save ETF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder padding="xl" radius="md">
      <Title order={3} mb="lg">{editETF ? 'Edit ETF' : 'Add ETF'}</Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg" closeable onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Ticker *"
              placeholder="VOO"
              value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Name *"
              placeholder="Vanguard S&P 500 ETF"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Exchange"
              placeholder="NYSE"
              value={form.exchange}
              onChange={e => setForm(f => ({ ...f, exchange: e.target.value }))}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e as 'Accumulating' | 'Distributing' }))}
              data={[
                { value: 'Accumulating', label: 'Accumulating' },
                { value: 'Distributing', label: 'Distributing' },
              ]}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Expense Ratio (%)"
              value={form.expenseRatio ? parseFloat(form.expenseRatio) : null}
              onChange={v => setForm(f => ({ ...f, expenseRatio: String(v || 0) }))}
              decimalScale={2}
              placeholder="0.10"
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Currency"
              placeholder="USD"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="ISIN"
              value={form.isin}
              onChange={e => setForm(f => ({ ...f, isin: e.target.value }))}
            />
          </Grid.Col>
        </Grid>

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            {editETF ? 'Update' : 'Add ETF'}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
```

### 4.3 ETFs Page

**`src/pages/ETFsPage.tsx`**
```typescript
import { useEffect, useState } from 'react';
import api from '../services/api';
import { ETF } from '../types';
import { Center, Text, Stack, Group, Title, Paper, Button } from '@mantine/core';
import ETFList from '../components/ETFList';
import ETFForm from '../components/ETFForm';

export default function ETFsPage() {
  const [etfs, setEtfs] = useState<ETF[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingETF, setEditingETF] = useState<ETF | null>(null);

  const loadETFs = async () => {
    try {
      const { data } = await api.get('/etfs');
      setEtfs(data.etfs || data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadETFs(); }, []);

  if (loading) return <Center h={200}><Text c="dimmed">Loading...</Text></Center>;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>ETF Reference</Title>
        <Button onClick={() => { setEditingETF(null); setShowForm(true); }}>
          + Add ETF
        </Button>
      </Group>

      {showForm ? (
        <ETFForm
          editETF={editingETF}
          onSubmit={() => { setShowForm(false); setEditingETF(null); loadETFs(); }}
          onCancel={() => { setShowForm(false); setEditingETF(null); }}
        />
      ) : (
        <Paper withBorder padding="lg" radius="md">
          <ETFList etfs={etfs} onEdit={e => { setEditingETF(e); setShowForm(true); }} />
        </Paper>
      )}
    </Stack>
  );
}
```

---

## Phase 5: Portfolio Summary & P&L

### Goal
Portfolio summary page with holdings table, P&L cards, and price refresh.

### 5.1 Portfolio Summary Page

**`src/pages/PortfolioSummaryPage.tsx`**
```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PortfolioSummary, Holding } from '../types';
import {
  Center, Text, Stack, Group, Title, Card, Grid, Table, Button,
} from '@mantine/core';

export default function PortfolioSummaryPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = async () => {
    if (!portfolioId) return;
    try {
      const { data } = await api.get(`/portfolios/${portfolioId}/summary`);
      setSummary(data.summary || data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSummary(); }, [portfolioId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/prices/refresh-all');
      await loadSummary();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <Center h={200}><Text c="dimmed">Loading...</Text></Center>;
  if (!summary) return <Center h={200}><Text c="dimmed">Portfolio not found</Text></Center>;

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const gainColor = (value: number) => (value >= 0 ? 'green' : 'red');

  const holdingRows = summary.holdings.map(h => (
    <Table.Tr key={h.ticker}>
      <Table.Td fw={500}>{h.ticker}</Table.Td>
      <Table.Td ta="right">{h.shares.toFixed(4)}</Table.Td>
      <Table.Td ta="right">{h.avgCost.toFixed(4)}</Table.Td>
      <Table.Td ta="right">{h.currentPrice ? h.currentPrice.toFixed(4) : '—'}</Table.Td>
      <Table.Td ta="right">{formatCurrency(h.totalInvested, h.currency)}</Table.Td>
      <Table.Td ta="right">{formatCurrency(h.currentValue, h.currency)}</Table.Td>
      <Table.Td ta="right" c={gainColor(h.gainLoss)} fw={500}>
        {formatCurrency(h.gainLoss, h.currency)}
      </Table.Td>
      <Table.Td ta="right" c={gainColor(h.gainLossPercent)} fw={500}>
        {formatPercent(h.gainLossPercent)}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack>
      {/* Header */}
      <Group justify="space-between">
        <Stack gap="xs">
          <Title order={2}>{summary.portfolioName}</Title>
          <Text size="sm" c="blue" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            ← Back to Dashboard
          </Text>
        </Stack>
        <Button
          variant="subtle"
          onClick={handleRefresh}
          loading={refreshing}
        >
          ↻ Refresh Prices
        </Button>
      </Group>

      {/* Summary cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Invested</Text>
            <Text size="h3" fw={700}>{formatCurrency(summary.totalInvested, 'PLN')}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Current Value</Text>
            <Text size="h3" fw={700}>{formatCurrency(summary.currentValue, 'PLN')}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Gain/Loss</Text>
            <Text size="h3" fw={700} c={gainColor(summary.totalGainLoss)}>
              {formatCurrency(summary.totalGainLoss, 'PLN')}
              <Text span size="sm" c={gainColor(summary.totalGainLossPercent)}>
                {' '}{formatPercent(summary.totalGainLossPercent)}
              </Text>
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Realized P&L</Text>
            <Text size="h3" fw={700} c={gainColor(summary.totalRealizedGainLoss)}>
              {formatCurrency(summary.totalRealizedGainLoss, 'PLN')}
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Holdings table */}
      <Paper withBorder radius="md">
        <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ticker</Table.Th>
              <Table.Th ta="right">Shares</Table.Th>
              <Table.Th ta="right">Avg Cost</Table.Th>
              <Table.Th ta="right">Current Price</Table.Th>
              <Table.Th ta="right">Invested</Table.Th>
              <Table.Th ta="right">Value</Table.Th>
              <Table.Th ta="right">Gain/Loss</Table.Th>
              <Table.Th ta="right">G/L %</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{holdingRows}</Table.Tbody>
        </Table>
        {summary.holdings.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">No holdings. Add some trades to see your portfolio.</Text>
        )}
      </Paper>
    </Stack>
  );
}
```

---

## Project Structure

```
apps/bet-tracker-client/
├── src/
│   ├── components/
│   │   ├── Layout.tsx              # Main layout with nav
│   │   ├── TradeList.tsx           # Trades table
│   │   ├── TradeForm.tsx           # Create/edit trade form
│   │   ├── ETFList.tsx             # ETFs table
│   │   └── ETFForm.tsx             # Create/edit ETF form
│   ├── context/
│   │   └── ProfileContext.tsx      # Active profile state
│   ├── pages/
│   │   ├── WizardPage.tsx          # Onboarding wizard
│   │   ├── DashboardPage.tsx       # Portfolio overview
│   │   ├── TradesPage.tsx          # Trade management
│   │   ├── ETFsPage.tsx            # ETF reference
│   │   └── PortfolioSummaryPage.tsx # P&L summary
│   ├── services/
│   │   └── api.ts                  # Native fetch API wrapper
│   ├── types/
│   │   └── index.ts                # All TypeScript types
│   ├── App.tsx                     # Router + providers
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Mantine styles import
├── index.html
├── vite.config.ts
└── package.json
```

---

## Execution Order

1. **Phase 0** — Project scaffolding + types + API client + Mantine
2. **Phase 1** — Profile context + Wizard + Layout
3. **Phase 2** — Dashboard + portfolio selection
4. **Phase 3** — Trade management (list, form, edit, delete)
5. **Phase 4** — ETF management (list, form)
6. **Phase 5** — Portfolio summary + P&L display

---

## Notes for AI Agent

- All components are functional with hooks (no class components)
- Mantine UI via `@mantine/core` + `@mantine/hooks` — use Mantine components consistently
- API calls use native `fetch` via the `api` helper in `src/services/api.ts` — no Axios
- API responses follow `{ ok, status, data, error }` pattern — always check `result.ok`
- Use `any` sparingly — prefer the types defined in `src/types/index.ts`
- Error handling: show `Alert` components with error messages from API responses
- Loading states: show "Loading..." text during async operations
- Confirm before delete operations (use `@mantine/modals` confirm dialog)
- The wizard redirects to `/` after setup — the router checks for active profile
- Currency formatting uses `Intl.NumberFormat`
- Positive P&L is green, negative is red
- All form inputs should have proper labels and validation
- The price refresh button calls `POST /api/v1/prices/refresh-all` then reloads the summary
- Use `@tabler/icons-react` for icons (IconPencil, IconTrash, IconAlertCircle, IconCheck)
- Forms use Mantine's `Grid` + `Grid.Col` for responsive two-column layouts
- Tables use Mantine's `Table` with `striped` and `highlightOnHover` props
