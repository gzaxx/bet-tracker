import { useMemo, useState, type FormEvent } from 'react'
import { ApiError, priceApi } from '../../services/api'
import type { PriceObservation, Portfolio } from '../../types/domain'

type PriceFormState = {
  ticker: string
  price: string
  effectiveAt: string
  providerSymbol: string
}

const toLocalInputValue = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const defaultEffectiveAt = () => toLocalInputValue(new Date(Date.now() - 60_000).toISOString())

const newForm = (): PriceFormState => ({
  ticker: '',
  price: '',
  effectiveAt: defaultEffectiveAt(),
  providerSymbol: ''
})

const formFromObservation = (observation: PriceObservation): PriceFormState => ({
  ticker: observation.ticker,
  price: String(observation.price),
  effectiveAt: toLocalInputValue(observation.effectiveAt),
  providerSymbol: observation.providerSymbol ?? ''
})

const errorMessage = (caught: unknown): string => {
  if (caught instanceof ApiError && caught.details) {
    const fields = Object.values(caught.details).flat()
    if (fields.length > 0) {
      return fields.join(' ')
    }
  }

  return caught instanceof Error ? caught.message : 'The request could not be completed.'
}

const formatMoney = (value: number, currency: string) => value.toLocaleString(undefined, { style: 'currency', currency })
const formatDate = (value: string) => new Date(value).toLocaleString()

export const PriceManager = ({ portfolio, onChanged }: { portfolio: Portfolio; onChanged?: () => void }) => {
  const [ticker, setTicker] = useState('')
  const [current, setCurrent] = useState<PriceObservation | null>(null)
  const [history, setHistory] = useState<PriceObservation[]>([])
  const [form, setForm] = useState<PriceFormState>(newForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizedTicker = ticker.trim().toUpperCase()
  const isStale = useMemo(() => current !== null && Date.now() - new Date(current.effectiveAt).getTime() > 24 * 60 * 60 * 1000, [current])

  const loadPrices = async (requestedTicker = normalizedTicker) => {
    const normalized = requestedTicker.trim().toUpperCase()
    if (!normalized) {
      setError('Ticker is required to load price history.')
      return
    }

    setTicker(normalized)
    setLoading(true)
    setError(null)
    try {
      const [latest, observations] = await Promise.all([
        priceApi.current(normalized, portfolio.currency),
        priceApi.history(normalized, portfolio.currency)
      ])
      setCurrent(latest)
      setHistory(observations)
    } catch (caught) {
      setError(errorMessage(caught))
      setCurrent(null)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ticker: form.ticker.trim().toUpperCase(),
        currency: portfolio.currency,
        price: Number(form.price),
        effectiveAt: new Date(form.effectiveAt).toISOString(),
        source: 'Manual',
        providerSymbol: form.providerSymbol.trim() || null
      }
      if (editingId === null) {
        await priceApi.create(body)
      } else {
        await priceApi.update(editingId, body)
      }
      onChanged?.()
      setForm(newForm())
      setEditingId(null)
      await loadPrices(body.ticker)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const edit = (observation: PriceObservation) => {
    setEditingId(observation.id)
    setForm(formFromObservation(observation))
    setError(null)
  }

  const remove = async (observation: PriceObservation) => {
    if (!window.confirm(`Delete the ${formatDate(observation.effectiveAt)} price for ${observation.ticker}?`)) {
      return
    }

    setDeletingId(observation.id)
    setError(null)
    try {
      await priceApi.remove(observation.id)
      onChanged?.()
      await loadPrices(observation.ticker)
      if (editingId === observation.id) {
        setEditingId(null)
        setForm(newForm())
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="price-manager card" id={`prices-${portfolio.id}`}>
      <div className="section-header">
        <div><p className="section-kicker">Manual prices</p><h2>Price history</h2><p className="muted">Enter prices in {portfolio.currency}; every observation is retained.</p></div>
        <span className="currency-chip">{portfolio.currency}</span>
      </div>

      {error && <div className="alert alert-error" role="alert"><span>{error}</span></div>}

      <form className="price-form" onSubmit={submit}>
        <div className="price-form-grid">
          <label>Ticker<input value={form.ticker} onChange={(event) => setForm({ ...form, ticker: event.target.value })} placeholder="MSFT" required maxLength={20} /></label>
          <label>Price<input type="number" min="0.0001" step="0.0001" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="100.00" required /></label>
          <label>Effective at<input type="datetime-local" value={form.effectiveAt} onChange={(event) => setForm({ ...form, effectiveAt: event.target.value })} required /></label>
          <label>Provider symbol <span className="muted">(optional)</span><input value={form.providerSymbol} onChange={(event) => setForm({ ...form, providerSymbol: event.target.value })} placeholder="NASDAQ:MSFT" maxLength={64} /></label>
        </div>
        <div className="button-row">
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId === null ? 'Add price' : 'Save price'}</button>
          {editingId !== null && <button className="button button-subtle" type="button" onClick={() => { setEditingId(null); setForm(newForm()) }}>Cancel edit</button>}
        </div>
      </form>

      <div className="price-lookup">
        <label>View ticker history<input value={ticker} onChange={(event) => setTicker(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void loadPrices() } }} placeholder="MSFT" /></label>
        <button className="button button-secondary" type="button" onClick={() => void loadPrices()} disabled={loading}>{loading ? 'Loading…' : 'Load history'}</button>
      </div>

      {loading ? <p className="muted">Loading price history…</p> : normalizedTicker ? <>
        <div className="current-price" aria-live="polite">
          <span>Current price</span>
          {current ? <strong>{formatMoney(current.price, portfolio.currency)}</strong> : <strong>Not available</strong>}
          {current && <small>{isStale ? `Stale · ${formatDate(current.effectiveAt)}` : `As of ${formatDate(current.effectiveAt)}`}</small>}
        </div>
        {history.length === 0 ? <div className="empty-state"><h3>No observations yet</h3><p>Add a manual price to start this ticker’s history.</p></div> : <div className="trade-table-wrap"><table className="trade-table price-table"><thead><tr><th>Effective at</th><th>Price</th><th>Source</th><th aria-label="Actions" /></tr></thead><tbody>{history.map((observation) => <tr key={observation.id}><td>{formatDate(observation.effectiveAt)}</td><td>{formatMoney(observation.price, observation.currency)}</td><td>{observation.source}</td><td><div className="button-row"><button className="button button-subtle" type="button" onClick={() => edit(observation)}>Edit</button><button className="button button-danger-ghost" type="button" onClick={() => void remove(observation)} disabled={deletingId === observation.id}>{deletingId === observation.id ? 'Deleting…' : 'Delete'}</button></div></td></tr>)}</tbody></table></div>}
      </> : <div className="empty-state"><h3>Choose a ticker</h3><p>Load a ticker to see its current price and retained observations.</p></div>}
    </section>
  )
}
