---
name: reactjs
description: ReactJS development guidance for Bet Tracker — functional components, TypeScript, state management, API integration, and component organization.
---

# ReactJS + Bet Tracker Conventions

## Component Organization

Components by feature, not by type. Co-locate where possible.

```
src/
  components/     # Reusable UI (buttons, cards, forms)
  pages/          # Page-level (TradesPage, PortfolioPage)
  services/       # API calls (tradeApi.ts, portfolioApi.ts)
  hooks/          # Custom hooks (useTrades.ts)
  types/          # Shared TypeScript interfaces
```

## Component Pattern

Functional components with hooks. Arrow functions. Explicit types for props.

```tsx
const TradeCard: React.FC<{ trade: Trade; onDelete: (id: number) => void }> = ({ trade, onDelete }) => {
  // render
};
```

## API Integration

Centralized in `services/`. Use `fetch` or Axios. Always handle loading and error states.

```typescript
export async function getTrades(): Promise<Trade[]> {
  const res = await fetch('/api/trades');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}
```

## State Management

For this PoC: React Context or local state. Avoid Redux. Use custom hooks for reusable async logic.

```tsx
function useTrades() {
  const [data, setData] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // fetch logic
  return { data, loading, error, refetch };
}
```

## TypeScript

Define explicit interfaces for all API contracts. Types in `types/` for shared shapes, or inline per-feature for local ones.

```typescript
interface Trade { id: number; symbol: string; gainLoss: number; }
interface CreateTradeRequest { symbol: string; quantity: number; }
```

## Styling

CSS modules or plain CSS. Keep it simple for the PoC.

## Anti-patterns

- ❌ Class components — use functional with hooks
- ❌ Inline API calls in components — extract to services or hooks
- ❌ `any` types — define explicit interfaces
- ❌ Over-engineering state — Context is enough for this PoC
- ❌ Shared `components/` for feature-specific UI — co-locate
