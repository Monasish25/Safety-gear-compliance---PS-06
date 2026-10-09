import { useMemo, useRef, useState } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
import { horizons } from './data/incidentData.js'
import ActionBar from './ActionBar/ActionBar.jsx'
import FilterPanel from './FilterPanel/FilterPanel.jsx'
import IncidentTable from './IncidentTable/IncidentTable.jsx'
import InspectionDrawer from './InspectionDrawer/InspectionDrawer.jsx'
import AuditFooter from './AuditFooter/AuditFooter.jsx'
import './IncidentPage.css'

export default function IncidentPage({ user, theme, onThemeChange, onHome, onLive, onAnalytics, onHow, onSignOut }) {
  const [incidents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [query, setQuery] = useState('')
  const [horizon, setHorizon] = useState(horizons[0])
  const [filters, setFilters] = useState({ zone: 'all', classifier: 'all', severity: 'all' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const [broadcasting, setBroadcasting] = useState(false)
  const searchRef = useRef(null)

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

  return (
    <div className="incident-page min-h-screen text-white">
      <div className="incident-nav-wrap"><Navbar user={user} theme={theme} onThemeChange={onThemeChange} activePage="incidents" onOpenHome={onHome} onOpenLive={onLive} onOpenIncidents={() => {}} onOpenAnalytics={onAnalytics} onOpenHow={onHow} onSignOut={onSignOut} broadcasting={broadcasting} onBroadcast={() => setBroadcasting((value) => !value)} /></div>
      {broadcasting && <div className="audit-broadcast"><span className="critical-pulse" /> EMERGENCY BROADCAST ACTIVE <button type="button" onClick={() => setBroadcasting(false)}>DISMISS</button></div>}
      <div className="incident-page-header"><ActionBar onClear={clearFilters} onHome={onHome} incidents={incidents} /></div>
      <main className="incident-main">
        <FilterPanel filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} horizon={horizon} setHorizon={setHorizon} searchRef={searchRef} matched={filtered.length} page={page} pageSize={pageSize} />
        <div className="incident-workspace">
          <IncidentTable rows={rows} selectedId={selectedId} checked={selectedIds.length} setSelectedIds={setSelectedIds} selectedIds={selectedIds} onSelect={setSelectedId} page={page} setPage={setPage} pageCount={pageCount} pageSize={pageSize} setPageSize={setPageSize} onAcknowledge={() => {}} onExportTelemetry={exportTelemetry} onPurge={() => {}} />
          <InspectionDrawer incident={null} logs={[]} logsRef={null} />
        </div>
        <AuditFooter />
      </main>
    </div>
  )
}
