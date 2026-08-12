import { useEffect, useState } from 'react'
import { ApiError, summaryApi } from '../../services/api'
import type { Portfolio, PortfolioSummary } from '../../types/domain'

const formatMoney = (value: number, currency: string) => value.toLocaleString(undefined, { style: 'currency', currency })

const errorMessage = (caught: unknown): string => {
  if (caught instanceof ApiError && caught.details) {
    const fields = Object.values(caught.details).flat()
    if (fields.length > 0) {
      return fields.join(' ')
    }
  }

  return caught instanceof Error ? caught.message : 'The summary could not be loaded.'
}

export const SummaryManager = ({ portfolio, refreshKey }: { portfolio: Portfolio; refreshKey: number }) => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await summaryApi.get(portfolio.id))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [portfolio.id, refreshKey])

  return (
    <section className="card summary-manager" id={`portfolio-summary-${portfolio.id}`} aria-labelledby={`summary-${portfolio.id}`}>
      <div className="section-header">
        <div><p className="section-kicker">Portfolio summary</p><h2 id={`summary-${portfolio.id}`}>{portfolio.name} · P&amp;L</h2><p className="muted">FIFO holdings and manual prices in {portfolio.currency}.</p></div>
        <div className="button-row"><a className="button button-subtle" href="#portfolio-dashboard">Dashboard</a><a className="button button-subtle" href={`#trades-${portfolio.id}`}>Trades</a><button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      </div>
      {error && <div className="alert alert-error" role="alert"><span>{error}</span><button type="button" className="button button-subtle" onClick={() => void refresh()}>Retry</button></div>}
      {loading ? <p className="muted">Loading portfolio summary…</p> : summary && summary.holdings.length === 0 ? <div className="empty-state"><h3>No holdings yet</h3><p>Add a buy trade to see holdings and P&amp;L here.</p></div> : summary && <>
        <div className="summary-totals">
          <div><span>Cost basis</span><strong>{formatMoney(summary.totalCostBasis, summary.currency)}</strong></div>
          <div><span>Current value</span><strong>{formatMoney(summary.totalMarketValue, summary.currency)}</strong></div>
          <div><span>Realized P&amp;L</span><strong className={summary.realizedProfitLoss >= 0 ? 'profit' : 'loss'}>{formatMoney(summary.realizedProfitLoss, summary.currency)}</strong></div>
          <div><span>Unrealized P&amp;L</span><strong className={summary.unrealizedProfitLoss >= 0 ? 'profit' : 'loss'}>{formatMoney(summary.unrealizedProfitLoss, summary.currency)}</strong></div>
        </div>
        {summary.missingPriceTickers.length > 0 && <div className="alert alert-warning" role="status"><span>Missing current prices for {summary.missingPriceTickers.join(', ')}. Their value and unrealized P&amp;L are excluded from totals.</span><a className="button button-subtle" href={`#prices-${portfolio.id}`}>Add prices</a></div>}
        <div className="trade-table-wrap"><table className="trade-table summary-table"><thead><tr><th>Ticker</th><th>Shares</th><th>Average cost</th><th>Cost basis</th><th>Current price</th><th>Value</th><th>Unrealized P&amp;L</th></tr></thead><tbody>{summary.holdings.map((holding) => <tr key={holding.ticker}><td><strong>{holding.ticker}</strong></td><td>{holding.shares}</td><td>{formatMoney(holding.averageCost, summary.currency)}</td><td>{formatMoney(holding.costBasis, summary.currency)}</td><td>{holding.currentPrice === null ? <span className="missing-value">Missing</span> : formatMoney(holding.currentPrice, summary.currency)}</td><td>{holding.currentValue === null ? <span className="missing-value">—</span> : formatMoney(holding.currentValue, summary.currency)}</td><td>{holding.unrealizedProfitLoss === null ? <span className="missing-value">—</span> : <span className={holding.unrealizedProfitLoss >= 0 ? 'profit' : 'loss'}>{formatMoney(holding.unrealizedProfitLoss, summary.currency)}</span>}</td></tr>)}</tbody></table></div>
      </>}
    </section>
  )
}
