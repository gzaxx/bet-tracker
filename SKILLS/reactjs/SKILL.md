---
name: reactjs
description: ReactJS development guidance using Vite as build tool, functional components, TypeScript, hooks, state management, API integration, and component organization. Use when building or modifying frontend code.
---

# ReactJS + Vite Development

## Project Structure

```
bet-tracker-client/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page-level components
│   ├── services/       # API calls
│   ├── hooks/          # Custom hooks
│   ├── types/          # TypeScript interfaces
│   ├── App.tsx         # Root component
│   └── main.tsx        # Entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tsconfig.json
└── package.json
```

## Vite Setup

```bash
npm create vite@latest bet-tracker-client -- --template react-ts
cd bet-tracker-client
npm install
```

## vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:19888',  // Aspire API port
        changeOrigin: true,
      },
    },
  },
});
```

## Component Pattern

```tsx
interface TradeCardProps {
  trade: Trade;
  onDelete: (id: number) => void;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade, onDelete }) => {
  return (
    <div className="trade-card">
      <h3>{trade.symbol}</h3>
      <p>Gain/Loss: ${trade.gainLoss.toFixed(2)}</p>
      <button onClick={() => onDelete(trade.id)}>Delete</button>
    </div>
  );
};

export default TradeCard;
```

## API Service

```typescript
// services/tradeApi.ts
const API_BASE = '/api';

export async function getTrades(): Promise<Trade[]> {
  const res = await fetch(`${API_BASE}/trades`);
  if (!res.ok) throw new Error('Failed to fetch trades');
  return res.json();
}

export async function createTrade(data: CreateTradeRequest): Promise<Trade> {
  const res = await fetch(`${API_BASE}/trades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create trade');
  return res.json();
}
```

## Custom Hook

```tsx
// hooks/useTrades.ts
import { useState, useEffect } from 'react';
import { getTrades } from '../services/tradeApi';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTrades()
      .then(data => { if (!cancelled) setTrades(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { trades, loading, error };
}
```

## State Management

For this PoC, use React Context or local state. Avoid Redux unless complexity demands it.

## TypeScript Types

```typescript
interface Trade {
  id: number;
  symbol: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  gainLoss: number;
  tradeDate: string;
}

interface CreateTradeRequest {
  symbol: string;
  quantity: number;
  buyPrice: number;
}
```

## Styling

Use CSS modules or plain CSS. Keep styles simple for the PoC.

## Running

```bash
npm run dev      # Start dev server on port 5173
npm run build    # Production build
npm run preview  # Preview production build
```
