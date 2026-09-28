import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
import { startingIncidents, eventPool, initialEntries } from './data/incidentData.js'
import { entriesForIncident, randomTime } from './utils/incidentTelemetry.js'
import ActionBar from './ActionBar/ActionBar.jsx'
import FilterPanel from './FilterPanel/FilterPanel.jsx'
import IncidentTable from './IncidentTable/IncidentTable.jsx'
import InspectionDrawer from './InspectionDrawer/InspectionDrawer.jsx'
import AuditFooter from './AuditFooter/AuditFooter.jsx'
import './IncidentPage.css'
export default function IncidentPage({ user, onHome, onLive, onAnalytics, onHow, onSignOut }) {
  const [incidents, setIncidents] = useState(startingIncidents)
  const [selectedId, setSelectedId] = useState('INC-9482')
  const [selectedIds, setSelectedIds] = useState(['INC-9482'])
  const [query, setQuery] = useState('')
  const [horizon, setHorizon] = useState('Today (May 18)')
  const [filters, setFilters] = useState({ zone: 'all', classifier: 'all', severity: 'all' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const [logs, setLogs] = useState(initialEntries.map((entry, index) => ({ ...entry, key: `initial-${index}` })))
  const [processing, setProcessing] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [network, setNetwork] = useState(14.2)
  const [networkFlash, setNetworkFlash] = useState(false)
  const [gps, setGps] = useState([32.7767, -96.7970])
  const [gpsFlash, setGpsFlash] = useState(false)
  const searchRef = useRef(null)
  const logsRef = useRef(null)
  const incident = incidents.find((item) => item.id === selectedId) || incidents[0]
  const checkedCount = selectedIds.length

  const filtered = useMemo(() => incidents.filter((item) => {
    const search = query.trim().toLowerCase()
    const matchesQuery = !search || [item.id, item.time, item.zone, item.camera, item.classifier, item.classification, item.context, item.assignee, item.status].some((value) => value.toLowerCase().includes(search))
    const zoneLetter = filters.zone === 'all' || item.zone.toLowerCase().includes(filters.zone.replace('Zone ', '').slice(0, 1).toLowerCase())
    const matchesClassifier = filters.classifier === 'all' || item.classifier === filters.classifier
    const matchesSeverity = filters.severity === 'all' || (filters.severity === 'Critical' && item.severity === 'CRITICAL') || (filters.severity === 'Warning' && item.severity === 'WARNING') || (filters.severity === 'Safe / Resolved' && (item.severity === 'RESOLVED' || ['Resolved', 'Closed', 'False Alarm'].includes(item.status)))
    return matchesQuery && zoneLetter && matchesClassifier && matchesSeverity
  }), [incidents, query, filters])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  useEffect(() => { setPage(1) }, [query, filters, horizon])
  useEffect(() => {
    function onKeyDown(event) {
      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const entries = incident.id === 'INC-9482' ? initialEntries : entriesForIncident(incident)
    setLogs(entries.map((entry, index) => ({ ...entry, time: randomTime(), key: `${incident.id}-${Date.now()}-${index}` })))
    setGps([...incident.gps])
    setProcessing('')
  }, [incident.id])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const event = eventPool[Math.floor(Math.random() * eventPool.length)]
      setLogs((current) => [{ ...event, time: randomTime(), key: `${Date.now()}-${Math.random()}` }, ...current].slice(0, 20))
    }, 3000)
    return () => window.clearInterval(timer)
  }, [incident.id])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNetwork(10 + Math.random() * 15)
      setNetworkFlash(true)
      window.setTimeout(() => setNetworkFlash(false), 420)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [incident.id])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGps(([latitude, longitude]) => [latitude + (Math.random() - .5) * .001, longitude + (Math.random() - .5) * .001])
      setGpsFlash(true)
      window.setTimeout(() => setGpsFlash(false), 520)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [incident.id])

  useEffect(() => { if (logsRef.current) logsRef.current.scrollTop = 0 }, [logs])

  function appendLog(message, severity = 'neutral') {
    setLogs((current) => [{ message, severity, time: randomTime(), key: `${Date.now()}-${Math.random()}` }, ...current].slice(0, 20))
  }

  function clearFilters() {
    setQuery('')
    setHorizon('Today (May 18)')
    setFilters({ zone: 'all', classifier: 'all', severity: 'all' })
    setPage(1)
  }

  function runCommand(nextStatus) {
    const message = nextStatus === 'False Alarm' ? 'OPERATOR CLASSIFIED EVENT AS FALSE ALARM' : nextStatus === 'Escalated to 911' ? '911 EMERGENCY ESCALATION TRANSMITTED' : 'INCIDENT MARKED RESOLVED BY OPERATOR'
    if (!window.confirm(`Confirm ${nextStatus} for #${incident.id}?`)) return
    setProcessing(nextStatus)
    window.setTimeout(() => {
      setIncidents((current) => current.map((item) => item.id === incident.id ? { ...item, status: nextStatus } : item))
      appendLog(message, nextStatus === 'Escalated to 911' ? 'critical' : nextStatus === 'Resolved' ? 'resolved' : 'warning')
      setProcessing('')
    }, 1500)
  }

  function acknowledgeSelected() {
    if (!selectedIds.length) return
    setIncidents((current) => current.map((item) => selectedIds.includes(item.id) ? { ...item, status: 'Acknowledged' } : item))
    if (selectedIds.includes(incident.id)) appendLog(`OPERATOR ACK · ${user?.name || 'CURRENT OPERATOR'}`, 'resolved')
  }

  function exportTelemetry() {
    const csv = ['TIMESTAMP,EVENT,SEVERITY', ...logs.map((entry) => `${entry.time},"${entry.message}",${entry.severity}`)].join('\r\n')
    const anchor = document.createElement('a')
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    anchor.href = objectUrl
    anchor.download = `${incident.id.toLowerCase()}-telemetry.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  function purgeBuffer() {
    if (window.confirm('Purge the current non-audit telemetry buffer? Audit records will be retained.')) setLogs([])
  }

  return (
    <div className="incident-page min-h-screen text-white">
      <div className="incident-nav-wrap"><Navbar user={user} activePage="incidents" onOpenHome={onHome} onOpenLive={onLive} onOpenIncidents={() => {}} onOpenAnalytics={onAnalytics} onOpenHow={onHow} onSignOut={onSignOut} broadcasting={broadcasting} onBroadcast={() => setBroadcasting((value) => !value)} /></div>
      {broadcasting && <div className="audit-broadcast"><span className="critical-pulse" /> EMERGENCY BROADCAST ACTIVE <button type="button" onClick={() => setBroadcasting(false)}>DISMISS</button></div>}
      <div className="incident-page-header">
        <ActionBar onClear={clearFilters} onHome={onHome} incidents={incidents} />
      </div>
      <main className="incident-main">
        <FilterPanel filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} horizon={horizon} setHorizon={setHorizon} searchRef={searchRef} matched={filtered.length} page={page} pageSize={pageSize} />
        <div className="incident-workspace">
          <IncidentTable
            rows={rows}
            selectedId={selectedId}
            checked={checkedCount}
            setSelectedIds={setSelectedIds}
            selectedIds={selectedIds}
            onSelect={setSelectedId}
            page={page}
            setPage={setPage}
            pageCount={pageCount}
            pageSize={pageSize}
            setPageSize={setPageSize}
            onAcknowledge={acknowledgeSelected}
            onExportTelemetry={exportTelemetry}
            onPurge={purgeBuffer}
          />
          <InspectionDrawer incident={incident} logs={logs} onCommand={runCommand} processing={processing} network={network} gps={gps} networkFlash={networkFlash} gpsFlash={gpsFlash} logsRef={logsRef} />
        </div>
        <AuditFooter />
      </main>
    </div>
  )
}
