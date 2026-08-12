import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError, tradeApi } from '../../services/api'
import { TradeType, type CreateTradeRequest, type Portfolio, type Trade, type UpdateTradeRequest } from '../../types/domain'

const toLocalInputValue = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const defaultExecutedAt = () => toLocalInputValue(new Date(Date.now() - 60_000).toISOString())

const errorMessage = (caught: unknown): string => {
  if (caught instanceof ApiError) {
    const fields = caught.details
      ? Object.entries(caught.details).map(([field, messages]) => `${field}: ${messages.join(', ')}`).join(' ')
      : ''
    return fields ? `${caught.message} ${fields}` : caught.message
  }

  return caught instanceof Error ? caught.message : 'The request could not be completed.'
}

type TradeFormState = {
  ticker: string
  tradeType: TradeType
  shares: string
  price: string
  commission: string
  executedAt: string
  notes: string
  isin: string
}

const newForm = (): TradeFormState => ({
  ticker: '',
  tradeType: TradeType.Buy,
  shares: '',
  price: '',
  commission: '0',
  executedAt: defaultExecutedAt(),
  notes: '',
  isin: ''
})

const formFromTrade = (trade: Trade): TradeFormState => ({
  ticker: trade.ticker,
  tradeType: trade.tradeType,
  shares: String(trade.shares),
  price: String(trade.price),
  commission: String(trade.commission),
  executedAt: toLocalInputValue(trade.executedAt),
  notes: trade.notes ?? '',
  isin: trade.isin ?? ''
})

const formatMoney = (value: number, currency: string) => value.toLocaleString(undefined, { style: 'currency', currency })

export const TradeManager = ({ portfolio, onChanged }: { portfolio: Portfolio; onChanged?: () => void }) => {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TradeFormState>(newForm)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setTrades(await tradeApi.list(portfolio.id))
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setEditingId(null)
    setForm(newForm())
    void refresh()
  }, [portfolio.id])

  const totals = useMemo(() => trades.reduce((summary, trade) => {
    if (trade.tradeType === TradeType.Buy) {
      summary.invested += trade.shares * trade.price + trade.commission
      summary.position += trade.shares
    } else {
      summary.proceeds += trade.shares * trade.price - trade.commission
      summary.position -= trade.shares
    }
    return summary
  }, { invested: 0, proceeds: 0, position: 0 }), [trades])

  const updateField = <K extends keyof TradeFormState>(field: K, value: TradeFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const common = {
      ticker: form.ticker,
      tradeType: form.tradeType,
      shares: Number(form.shares),
      price: Number(form.price),
      commission: Number(form.commission),
      executedAt: new Date(form.executedAt).toISOString(),
      currency: portfolio.currency,
      notes: form.notes || null,
      isin: form.isin || null
    }

    try {
      const saved = editingId === null
        ? await tradeApi.create(portfolio.id, { portfolioId: portfolio.id, ...common } satisfies CreateTradeRequest)
        : await tradeApi.update(portfolio.id, editingId, common satisfies UpdateTradeRequest)
      setTrades((current) => editingId === null ? [...current, saved].sort((left, right) => left.executedAt.localeCompare(right.executedAt) || left.id - right.id) : current.map((trade) => trade.id === saved.id ? saved : trade).sort((left, right) => left.executedAt.localeCompare(right.executedAt) || left.id - right.id))
      onChanged?.()
      setEditingId(null)
      setForm(newForm())
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('Delete this trade? Later positions will be recalculated.')) {
      return
    }

    setDeletingId(id)
    setError(null)
    try {
      await tradeApi.remove(portfolio.id, id)
      onChanged?.()
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="card trade-manager" aria-labelledby={`trades-${portfolio.id}`}>
      <div className="section-header">
        <div><p className="section-kicker">{portfolio.name}</p><h2 id={`trades-${portfolio.id}`}>Trades</h2><p className="muted">FIFO inventory · {portfolio.currency}</p></div>
        <button type="button" className="button button-subtle" onClick={() => void refresh()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {error && <div className="alert alert-error" role="alert"><span>{error}</span><button type="button" className="button button-subtle" onClick={() => void refresh()}>Retry</button></div>}
      <div className="trade-totals">
        <div><span>Invested</span><strong>{formatMoney(totals.invested, portfolio.currency)}</strong></div>
        <div><span>Proceeds</span><strong>{formatMoney(totals.proceeds, portfolio.currency)}</strong></div>
        <div><span>Open shares</span><strong>{totals.position.toLocaleString()}</strong></div>
      </div>
      {loading ? <p className="muted">Loading trades…</p> : trades.length === 0 ? <div className="empty-state"><h3>No trades yet</h3><p>Add a buy to start a FIFO position.</p></div> : <div className="trade-table-wrap"><table className="trade-table"><thead><tr><th>Date</th><th>Ticker</th><th>Type</th><th>Shares</th><th>Price</th><th>Commission</th><th aria-label="Actions" /></tr></thead><tbody>{trades.map((trade) => <tr key={trade.id}><td>{new Date(trade.executedAt).toLocaleString()}</td><td><strong>{trade.ticker}</strong></td><td><span className={`trade-badge trade-${trade.tradeType === TradeType.Buy ? 'buy' : 'sell'}`}>{trade.tradeType === TradeType.Buy ? 'Buy' : 'Sell'}</span></td><td>{trade.shares}</td><td>{formatMoney(trade.price, trade.currency)}</td><td>{formatMoney(trade.commission, trade.currency)}</td><td><div className="button-row"><button type="button" className="button button-subtle" onClick={() => { setEditingId(trade.id); setForm(formFromTrade(trade)); }}>Edit</button><button type="button" className="button button-danger-ghost" onClick={() => void remove(trade.id)} disabled={deletingId === trade.id}>{deletingId === trade.id ? 'Deleting…' : 'Delete'}</button></div></td></tr>)}</tbody></table></div>}
      <form className="trade-form" onSubmit={submit}>
        <div className="form-heading"><div><p className="section-kicker">{editingId === null ? 'New trade' : 'Edit trade'}</p><h3>{editingId === null ? 'Record a trade' : `Edit trade #${editingId}`}</h3></div>{editingId !== null && <button type="button" className="button button-subtle" onClick={() => { setEditingId(null); setForm(newForm()); }}>Cancel</button>}</div>
        <div className="trade-form-grid">
          <label>Ticker<input value={form.ticker} onChange={(event) => updateField('ticker', event.target.value.toUpperCase())} required maxLength={20} placeholder="MSFT" /></label>
          <label>Type<select value={form.tradeType} onChange={(event) => updateField('tradeType', Number(event.target.value) as TradeType)}><option value={TradeType.Buy}>Buy</option><option value={TradeType.Sell}>Sell</option></select></label>
          <label>Shares<input type="number" min="0.00000001" step="any" value={form.shares} onChange={(event) => updateField('shares', event.target.value)} required /></label>
          <label>Price ({portfolio.currency})<input type="number" min="0.0001" step="any" value={form.price} onChange={(event) => updateField('price', event.target.value)} required /></label>
          <label>Commission ({portfolio.currency})<input type="number" min="0" step="any" value={form.commission} onChange={(event) => updateField('commission', event.target.value)} required /></label>
          <label>Executed at<input type="datetime-local" value={form.executedAt} onChange={(event) => updateField('executedAt', event.target.value)} required /></label>
          <label>ISIN (optional)<input value={form.isin} onChange={(event) => updateField('isin', event.target.value.toUpperCase())} maxLength={12} /></label>
          <label>Notes (optional)<input value={form.notes} onChange={(event) => updateField('notes', event.target.value)} maxLength={2000} /></label>
        </div>
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Saving…' : editingId === null ? 'Add trade' : 'Save trade'}</button>
      </form>
    </section>
  )
}
