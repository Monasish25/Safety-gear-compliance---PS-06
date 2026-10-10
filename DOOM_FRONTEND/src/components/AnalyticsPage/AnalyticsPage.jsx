import { useCallback, useEffect, useRef, useState } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
import NavbarClock from '../LiveMonitoringPage/NavbarClock/NavbarClock.jsx'
import TelemetryStrip from './TelemetryStrip/TelemetryStrip.jsx'
import KpiSummary from './KpiSummary/KpiSummary.jsx'
import Charts from './Charts/Charts.jsx'
import Insights from './Insights/Insights.jsx'
import RiskLedger from './RiskLedger/RiskLedger.jsx'
import AnalyticsFooter from './Footer/AnalyticsFooter.jsx'
import AnalyticsToast from './Toast/AnalyticsToast.jsx'
import './AnalyticsPage.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
const REFRESH_INTERVAL = 15000

async function getBackendData(path, signal) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_BASE}${path}`, { 
    signal, 
    headers: { 
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    } 
  })
  if (!response.ok) throw new Error(`Backend returned ${response.status}`)
  return response.json()
}

export default function AnalyticsPage({ user, theme, onThemeChange, onHome, onLive, onIncidents, onHow, onSignOut }) {
  const [dashboard, setDashboard] = useState({ cameras: [], zones: [], events: [], connected: false })
  const [loading, setLoading] = useState(true)
  const [broadcasting, setBroadcasting] = useState(false)
  const [muted, setMuted] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const requests = useRef(new Set())

  const fetchDashboard = useCallback(async (signal, showLoader = false) => {
    if (showLoader) setLoading(true)
    try {
      const [cameras, zones, events] = await Promise.all([
        getBackendData('/cameras', signal),
        getBackendData('/zones', signal),
        getBackendData('/events?limit=200', signal),
      ])
      if (![cameras, zones, events].every(Array.isArray)) throw new Error('Backend returned an unexpected response')
      setDashboard({ cameras, zones, events, connected: true })
    } catch (error) {
      if (error.name !== 'AbortError') setDashboard({ cameras: [], zones: [], events: [], connected: false })
    } finally {
      if (showLoader && !signal?.aborted) setLoading(false)
    }
  }, [])

  const startFetch = useCallback((showLoader = false) => {
    const controller = new AbortController()
    requests.current.add(controller)
    fetchDashboard(controller.signal, showLoader).finally(() => requests.current.delete(controller))
  }, [fetchDashboard])

  useEffect(() => {
    startFetch(true)
    const refreshTimer = window.setInterval(() => startFetch(), REFRESH_INTERVAL)
    return () => {
      requests.current.forEach((controller) => controller.abort())
      requests.current.clear()
      window.clearInterval(refreshTimer)
      window.clearTimeout(toastTimer.current)
    }
  }, [startFetch])

  function notify(message) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }

  function refresh() {
    startFetch(true)
  }

  return <div className="analytics-page min-h-screen text-white"><div className="analytics-nav"><Navbar user={user} theme={theme} onThemeChange={onThemeChange} activePage="analytics" onOpenHome={onHome} onOpenLive={onLive} onOpenIncidents={onIncidents} onOpenAnalytics={() => {}} onOpenHow={onHow} onSignOut={onSignOut} broadcasting={broadcasting} onBroadcast={() => { setBroadcasting((value) => !value); notify(broadcasting ? 'Emergency broadcast cancelled' : 'Emergency broadcast activated') }} utcTime={<NavbarClock/>} muted={muted} onToggleMute={() => setMuted((value) => !value)}/></div>{broadcasting && <div className="analytics-broadcast"><i className="pulse-red"/> EMERGENCY BROADCAST ACTIVE <button onClick={() => setBroadcasting(false)}>DISMISS</button></div>}<main className="analytics-main"><TelemetryStrip cameras={dashboard.cameras} zones={dashboard.zones} connected={dashboard.connected} loading={loading} onRefresh={refresh}/><KpiSummary cameras={dashboard.cameras} zones={dashboard.zones} events={dashboard.events} connected={dashboard.connected}/><Charts events={dashboard.events} zones={dashboard.zones} cameras={dashboard.cameras}/><section className="analytics-bottom"><Insights events={dashboard.events} cameras={dashboard.cameras} connected={dashboard.connected}/><RiskLedger events={dashboard.events} cameras={dashboard.cameras} zones={dashboard.zones}/></section><AnalyticsFooter connected={dashboard.connected}/></main><AnalyticsToast message={toast}/></div>
}
