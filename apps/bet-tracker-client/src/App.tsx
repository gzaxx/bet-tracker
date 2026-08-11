import { useEffect, useState } from 'react'
import './App.css'

type ApiState = 'loading' | 'ready' | 'error'

const App = () => {
  const [apiState, setApiState] = useState<ApiState>('loading')

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch('/api/v1/health')
        setApiState(response.ok ? 'ready' : 'error')
      } catch {
        setApiState('error')
      }
    }

    void checkApi()
  }, [])

  return (
    <main>
      <p className="eyebrow">Local proof of concept</p>
      <h1>Bet Tracker</h1>
      <p>Track long-only trades and portfolio performance locally.</p>
      <p className={`api-status api-status-${apiState}`}>
        API: {apiState === 'loading' ? 'checking…' : apiState === 'ready' ? 'connected' : 'unavailable'}
      </p>
    </main>
  )
}

export default App
