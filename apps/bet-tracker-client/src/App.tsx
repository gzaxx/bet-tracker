import { useState, type FormEvent } from 'react'
import './App.css'
import { ProfileProvider, useProfiles } from './features/profiles/ProfileContext'
import { PriceManager } from './features/prices/PriceManager'
import { SummaryManager } from './features/summary/SummaryManager'
import { TradeManager } from './features/trades/TradeManager'
import type { Portfolio } from './types/domain'

type DeleteTarget = { kind: 'profile' | 'portfolio'; id: number; label: string }

const ErrorBanner = () => {
  const { error, clearError, refresh } = useProfiles()
  if (!error) {
    return null
  }

  return (
    <div className="alert alert-error" role="alert">
      <span>{error}</span>
      <div className="alert-actions">
        <button type="button" className="button button-subtle" onClick={() => void refresh()}>Retry</button>
        <button type="button" className="icon-button" aria-label="Dismiss error" onClick={clearError}>×</button>
      </div>
    </div>
  )
}

const Onboarding = () => {
  const { createProfileAndPortfolio, error, refresh } = useProfiles()
  const [profileName, setProfileName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [portfolioName, setPortfolioName] = useState('Main portfolio')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    await createProfileAndPortfolio({ name: profileName, defaultCurrency: currency }, portfolioName)
    setSubmitting(false)
  }

  return (
    <main className="shell onboarding-shell">
      <p className="eyebrow">Local proof of concept</p>
      <h1>Start tracking with a profile</h1>
      <p className="lede">Create your first profile and portfolio. Portfolio currency is copied from the profile and remains fixed.</p>
      {error && <div className="alert alert-error" role="alert"><span>{error}</span><button type="button" className="button button-subtle" onClick={() => void refresh()}>Retry</button></div>}
      <form className="card form-card" onSubmit={submit}>
        <div className="form-heading">
          <div>
            <p className="section-kicker">Onboarding</p>
            <h2>Your first profile</h2>
          </div>
          <span className="step">1 / 1</span>
        </div>
        <label htmlFor="onboarding-profile-name">Profile name</label>
        <input id="onboarding-profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Personal" required maxLength={100} />
        <label htmlFor="onboarding-currency">Default currency</label>
        <input id="onboarding-currency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} placeholder="USD" required minLength={3} maxLength={3} />
        <label htmlFor="onboarding-portfolio-name">First portfolio</label>
        <input id="onboarding-portfolio-name" value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} placeholder="Long term" required maxLength={100} />
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create profile and portfolio'}</button>
      </form>
    </main>
  )
}

const ProfileSettings = () => {
  const { activeProfile, updateProfile } = useProfiles()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(activeProfile?.name ?? '')
  const [currency, setCurrency] = useState(activeProfile?.defaultCurrency ?? '')
  const [submitting, setSubmitting] = useState(false)

  if (!activeProfile) {
    return null
  }

  const startEditing = () => {
    setName(activeProfile.name)
    setCurrency(activeProfile.defaultCurrency)
    setEditing(true)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const updated = await updateProfile(activeProfile.id, { name, defaultCurrency: currency })
    setSubmitting(false)
    if (updated) {
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <section className="card profile-summary">
        <div>
          <p className="section-kicker">Active profile</p>
          <h2>{activeProfile.name}</h2>
          <p className="muted">Default currency: <strong>{activeProfile.defaultCurrency}</strong></p>
        </div>
        <button type="button" className="button button-subtle" onClick={startEditing}>Edit profile</button>
      </section>
    )
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="form-heading"><h2>Edit profile</h2><button type="button" className="button button-subtle" onClick={() => setEditing(false)}>Cancel</button></div>
      <label htmlFor="profile-name">Profile name</label>
      <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
      <label htmlFor="profile-currency">Default currency</label>
      <input id="profile-currency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required minLength={3} maxLength={3} />
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save profile'}</button>
    </form>
  )
}

const NewProfileForm = () => {
  const { createProfile } = useProfiles()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const created = await createProfile({ name, defaultCurrency: currency })
    setSubmitting(false)
    if (created) {
      setName('')
      setCurrency('USD')
    }
  }

  return (
    <form className="card compact-form" onSubmit={submit}>
      <div className="form-heading"><div><p className="section-kicker">Profiles</p><h2>Add another profile</h2></div></div>
      <div className="inline-fields">
        <label>Profile name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Retirement" required maxLength={100} /></label>
        <label>Currency<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required minLength={3} maxLength={3} /></label>
        <button className="button button-secondary" type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add profile'}</button>
      </div>
    </form>
  )
}

const PortfolioCard = ({ portfolio, onDelete, onSelect, selected }: { portfolio: Portfolio; onDelete: (portfolio: Portfolio) => void; onSelect: (portfolio: Portfolio) => void; selected: boolean }) => {
  const { updatePortfolio } = useProfiles()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(portfolio.name)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const updated = await updatePortfolio(portfolio.id, { name })
    setSubmitting(false)
    if (updated) {
      setEditing(false)
    }
  }

  return (
    <article className={`portfolio-card${selected ? ' portfolio-card-selected' : ''}`}>
      {editing ? (
        <form onSubmit={submit}>
          <label htmlFor={`portfolio-${portfolio.id}-name`}>Portfolio name</label>
          <input id={`portfolio-${portfolio.id}-name`} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
          <div className="button-row"><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button><button className="button button-subtle" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>
      ) : (
        <>
          <button type="button" className="portfolio-select" onClick={() => onSelect(portfolio)} aria-pressed={selected}>
            <span className="portfolio-icon" aria-hidden="true">↗</span>
            <span className="portfolio-details"><strong>{portfolio.name}</strong><span className="muted">Currency</span><span className="currency-value">{portfolio.currency}</span></span>
          </button>
          <div className="button-row"><button type="button" className="button button-primary" onClick={() => onSelect(portfolio)}>{selected ? 'Selected' : 'View trades'}</button><button type="button" className="button button-subtle" onClick={() => setEditing(true)}>Edit</button><button type="button" className="button button-danger-ghost" onClick={() => onDelete(portfolio)}>Delete</button></div>
        </>
      )}
    </article>
  )
}

const Confirmation = ({ target, onCancel, onConfirm, submitting }: { target: DeleteTarget; onCancel: () => void; onConfirm: () => void; submitting: boolean }) => (
  <div className="confirmation-backdrop" role="presentation">
    <section className="confirmation" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title">
      <p className="section-kicker">Confirm deletion</p>
      <h2 id="confirmation-title">Delete {target.label}?</h2>
      <p>{target.kind === 'profile' ? 'This permanently deletes the profile and all portfolios belonging to it.' : 'This permanently deletes the portfolio and its trades.'}</p>
      <div className="button-row"><button type="button" className="button button-subtle" onClick={onCancel}>Cancel</button><button type="button" className="button button-danger" onClick={onConfirm} disabled={submitting}>{submitting ? 'Deleting…' : 'Delete permanently'}</button></div>
    </section>
  </div>
)

const Dashboard = () => {
  const { profiles, activeProfile, activeProfileId, portfolios, selectProfile, createPortfolio, deleteProfile, deletePortfolio } = useProfiles()
  const [portfolioName, setPortfolioName] = useState('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null)
  const [creatingPortfolio, setCreatingPortfolio] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0)

  if (!activeProfile || activeProfileId === null) {
    return null
  }

  const activePortfolios = portfolios.filter((portfolio) => portfolio.profileId === activeProfile.id)
  const selectedPortfolio = activePortfolios.find((portfolio) => portfolio.id === selectedPortfolioId)

  const submitPortfolio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreatingPortfolio(true)
    const created = await createPortfolio({ profileId: activeProfile.id, name: portfolioName })
    setCreatingPortfolio(false)
    if (created) {
      setPortfolioName('')
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return
    }
    setDeleting(true)
    const deleted = pendingDelete.kind === 'profile' ? await deleteProfile(pendingDelete.id) : await deletePortfolio(pendingDelete.id)
    setDeleting(false)
    if (deleted) {
      if (pendingDelete.kind === 'portfolio' && pendingDelete.id === selectedPortfolioId) {
        setSelectedPortfolioId(null)
      }
      setPendingDelete(null)
    }
  }

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <div><p className="eyebrow">Local proof of concept</p><h1>Bet Tracker</h1></div>
        <label className="profile-switcher">Active profile<select value={activeProfile.id} onChange={(event) => { setSelectedPortfolioId(null); selectProfile(Number(event.target.value)) }}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.defaultCurrency}</option>)}</select></label>
      </header>
      <ErrorBanner />
      <ProfileSettings />
      <section className="portfolio-section" id="portfolio-dashboard">
        <div className="section-header"><div><p className="section-kicker">Dashboard</p><h2>Portfolios</h2><p className="muted">Every portfolio reports in {activeProfile.defaultCurrency}.</p></div><button type="button" className="button button-danger-ghost" onClick={() => setPendingDelete({ kind: 'profile', id: activeProfile.id, label: `profile “${activeProfile.name}”` })}>Delete profile</button></div>
        {activePortfolios.length === 0 ? <div className="empty-state"><h3>No portfolios yet</h3><p>Create a portfolio to begin recording trades.</p></div> : <div className="portfolio-grid">{activePortfolios.map((portfolio) => <PortfolioCard portfolio={portfolio} selected={portfolio.id === selectedPortfolioId} onSelect={(candidate) => setSelectedPortfolioId(candidate.id)} onDelete={(candidate) => setPendingDelete({ kind: 'portfolio', id: candidate.id, label: `portfolio “${candidate.name}”` })} key={portfolio.id} />)}</div>}
        <form className="card compact-form" onSubmit={submitPortfolio}><div className="form-heading"><div><p className="section-kicker">New portfolio</p><h2>Create a portfolio</h2></div><span className="currency-chip">{activeProfile.defaultCurrency}</span></div><div className="inline-fields"><label>Portfolio name<input value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} placeholder="Long term" required maxLength={100} /></label><button className="button button-primary" type="submit" disabled={creatingPortfolio}>{creatingPortfolio ? 'Creating…' : 'Create portfolio'}</button></div><p className="form-note">Currency is copied from the profile and cannot be edited.</p></form>
        {selectedPortfolio && <><SummaryManager portfolio={selectedPortfolio} refreshKey={summaryRefreshKey} /><TradeManager portfolio={selectedPortfolio} onChanged={() => setSummaryRefreshKey((current) => current + 1)} /><PriceManager portfolio={selectedPortfolio} onChanged={() => setSummaryRefreshKey((current) => current + 1)} /></>}
      </section>
      <NewProfileForm />
      {pendingDelete && <Confirmation target={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={() => void confirmDelete()} submitting={deleting} />}
    </main>
  )
}

const AppContent = () => {
  const { profiles, loading } = useProfiles()
  if (loading) {
    return <main className="shell loading-shell"><p className="eyebrow">Local proof of concept</p><h1>Bet Tracker</h1><p className="api-status api-status-loading">Loading your local workspace…</p></main>
  }

  return profiles.length === 0 ? <Onboarding /> : <Dashboard />
}

const App = () => <ProfileProvider><AppContent /></ProfileProvider>

export default App
