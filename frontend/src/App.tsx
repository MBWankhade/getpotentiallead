import './App.css'
import { useEffect, useState } from 'react'
import { API_BASE_URL } from './config'

type AppProps = {}

export default function App(_props: AppProps) {
  const [status, setStatus] = useState('Checking backend connection...')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        setStatus(`Connected: ${data.message}`)
      } catch (error) {
        setStatus('Backend connection failed. Is backend running on port 3000?')
      }
    }

    checkBackend()
  }, [])

  return (
    <div className="app-root">
      <header>
        <img src="/logo.png" alt="Get Potential Lffead logo" className="brand-logo" />
        <h1>Get Potential Lead</h1>
      </header>
      <main>
        <p>{status}</p>
      </main>
    </div>
  )
}
