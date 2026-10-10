import { useMemo, useRef, useState, useEffect } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
import { horizons } from './data/incidentData.js'
import ActionBar from './ActionBar/ActionBar.jsx'
import FilterPanel from './FilterPanel/FilterPanel.jsx'
import IncidentTable from './IncidentTable/IncidentTable.jsx'
import InspectionDrawer from './InspectionDrawer/InspectionDrawer.jsx'
import AuditFooter from './AuditFooter/AuditFooter.jsx'
import './IncidentPage.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export default function IncidentPage({ user, theme, onThemeChange, onHome, onLive, onAnalytics, onHow, onSignOut }) {
  const [incidents, setIncidents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [query, setQuery] = useState('')
  const [horizon, setHorizon] = useState(horizons[0])
  const [filters, setFilters] = useState({ zone: 'all', classifier: 'all', severity: 'all' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const [broadcasting, setBroadcasting] = useState(false)
  const [loading, setLoading] = useState(true)
  const searchRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchIncidents() {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/events?limit=100`, { 
          signal: controller.signal,
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })
        if (!res.ok) return
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        const formatted = items.map(evt => ({
          id: evt.alert_id || evt.id || `ALT-${Math.floor(Math.random()*1000)}`,
          time: new Date(evt.triggered_at || evt.timestamp || Date.now()).toLocaleTimeString(),
          zone: evt.zone_name || evt.zone_id || 'Zone A',
          camera: evt.camera_id || 'CAM-1',
          classifier: evt.event_type || 'Violation',
          classification: 'System Detection',
          context: evt.violation_reason || 'Safety compliance policy violation detected',
          assignee: 'Unassigned',
          status: evt.status ? (evt.status.charAt(0).toUpperCase() + evt.status.slice(1)) : 'Open',
          severity: evt.severity ? evt.severity.toUpperCase() : 'WARNING',
          snapshot_path: evt.snapshot_path,
          confidence: '96%'
        }))
        setIncidents(formatted)
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to fetch incidents', err)
      } finally {
        setLoading(false)
      }
    }
    fetchIncidents()
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => incidents.filter((item) => {
    const search = query.trim().toLowerCase()
    const matchesQuery = !search || [item.id, item.time, item.zone, item.camera, item.classifier, item.classification, item.context, item.assignee, item.status].some((value) => value.toLowerCase().includes(search))
    const matchesZone = filters.zone === 'all' || item.zone.toLowerCase().includes(filters.zone.slice(-1).toLowerCase())
    const matchesClassifier = filters.classifier === 'all' || item.classifier === filters.classifier
    const matchesSeverity = filters.severity === 'all' || (filters.severity === 'Critical' && item.severity === 'CRITICAL') || (filters.severity === 'Warning' && item.severity === 'WARNING') || (filters.severity === 'Safe / Resolved' && item.severity === 'RESOLVED')
    return matchesQuery && matchesZone && matchesClassifier && matchesSeverity
  }), [incidents, query, filters])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function clearFilters() {
    setQuery('')
    setHorizon(horizons[0])
    setFilters({ zone: 'all', classifier: 'all', severity: 'all' })
    setPage(1)
  }

  function exportTelemetry() {
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(new Blob(['TIMESTAMP,EVENT,SEVERITY\r\n'], { type: 'text/csv' }))
    link.href = objectUrl
    link.download = 'incident-telemetry.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  async function updateStatus(id, newStatus) {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/events/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ status: newStatus, note: 'Updated from Dashboard' })
      })
      if (res.ok) {
        setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1) } : inc))
      }
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  return (
    <div className="incident-page min-h-screen text-white">
      <div className="incident-nav-wrap"><Navbar user={user} theme={theme} onThemeChange={onThemeChange} activePage="incidents" onOpenHome={onHome} onOpenLive={onLive} onOpenIncidents={() => {}} onOpenAnalytics={onAnalytics} onOpenHow={onHow} onSignOut={onSignOut} broadcasting={broadcasting} onBroadcast={() => setBroadcasting((value) => !value)} /></div>
      {broadcasting && <div className="audit-broadcast"><span className="critical-pulse" /> EMERGENCY BROADCAST ACTIVE <button type="button" onClick={() => setBroadcasting(false)}>DISMISS</button></div>}
      <div className="incident-page-header"><ActionBar onClear={clearFilters} onHome={onHome} incidents={incidents} /></div>
      <main className="incident-main">
        <FilterPanel filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} horizon={horizon} setHorizon={setHorizon} searchRef={searchRef} matched={filtered.length} page={page} pageSize={pageSize} />
        <div className="incident-workspace">
          <IncidentTable rows={rows} selectedId={selectedId} checked={selectedIds.length} setSelectedIds={setSelectedIds} selectedIds={selectedIds} onSelect={setSelectedId} page={page} setPage={setPage} pageCount={pageCount} pageSize={pageSize} setPageSize={setPageSize} onAcknowledge={() => {}} onExportTelemetry={exportTelemetry} onPurge={() => {}} />
          <InspectionDrawer incident={incidents.find(i => i.id === selectedId)} onUpdateStatus={updateStatus} />
        </div>
        <AuditFooter />
      </main>
    </div>
  )
}
