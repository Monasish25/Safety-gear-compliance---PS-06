function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'Unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

function EventTypeChart({ events }) {
  const counts = Object.entries(countBy(events, 'event_type')).sort((a, b) => b[1] - a[1])
  const maxCount = Math.max(1, ...counts.map(([, count]) => count))
  return <article className="analytics-chart glass-surface"><header className="chart-heading"><div><span className="chart-icon">▤</span><h2>Events by Type</h2></div><span className="chart-small">LATEST {events.length} RECORDS</span></header>{counts.length ? <div className="incident-bars">{counts.map(([type, count]) => <div className="incident-bar-row" key={type}><div><span>{type.replaceAll('_', ' ')}</span><small>{count} events</small></div><div className="bar-track"><i className="bar-blue" style={{ width: `${(count / maxCount) * 100}%` }} /></div><b>{count}</b></div>)}</div> : <p className="analytics-empty">No event records are available from the backend.</p>}</article>
}

function EventsByZone({ events, zones }) {
  const zoneCounts = countBy(events.filter((event) => event.zone_id), 'zone_id')
  const rows = zones.map((zone) => ({ ...zone, eventCount: zoneCounts[zone.id] || 0 })).sort((a, b) => b.eventCount - a.eventCount)
  const maxCount = Math.max(1, ...rows.map((zone) => zone.eventCount))
  return <article className="analytics-chart glass-surface"><header className="chart-heading"><div><span className="chart-icon">⬡</span><h2>Events by Configured Zone</h2></div><span className="chart-small">BACKEND ZONE RECORDS</span></header>{rows.length ? <div className="incident-bars">{rows.map((zone) => <div className="incident-bar-row" key={zone.id}><div><span>{zone.name}</span><small>{zone.risk_level || 'Risk level not set'}</small></div><div className="bar-track"><i className="bar-amber" style={{ width: `${(zone.eventCount / maxCount) * 100}%` }} /></div><b>{zone.eventCount}</b></div>)}</div> : <p className="analytics-empty">No zones are configured in the backend.</p>}</article>
}

function RecentEventsChart({ events }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    const count = events.filter((event) => {
      const eventDate = new Date(event.triggered_at || event.timestamp || Date.now())
      return eventDate >= date && eventDate < next
    }).length
    return { date, count }
  })
  const maxCount = Math.max(1, ...days.map((day) => day.count))
  return <article className="analytics-chart glass-surface"><header className="chart-heading"><div><span className="chart-icon">▥</span><h2>Events by Day</h2></div><span className="chart-small">LATEST 200 BACKEND RECORDS · 7 DAYS</span></header><div className="incident-bars">{days.map(({ date, count }) => <div className="incident-bar-row" key={date.toISOString()}><div><span>{date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><small>{count} events</small></div><div className="bar-track"><i className="bar-blue" style={{ width: `${(count / maxCount) * 100}%` }} /></div><b>{count}</b></div>)}</div></article>
}

function CameraStatus({ cameras }) {
  return <article className="analytics-chart glass-surface"><header className="chart-heading"><div><span className="chart-icon">◉</span><h2>Backend Camera Registry</h2></div><span className="chart-small">{cameras.length} CAMERAS</span></header>{cameras.length ? <div className="camera-registry-list">{cameras.map((camera) => <div className="camera-registry-row" key={camera.id}><span><b>{camera.name || camera.id}</b><small>{camera.location_label || camera.id}</small></span><strong className={camera.is_active ? 'camera-registry-online' : 'camera-registry-offline'}>{camera.is_active ? 'ACTIVE' : 'INACTIVE'}</strong></div>)}</div> : <p className="analytics-empty">No cameras are registered in the backend.</p>}</article>
}

export default function Charts({ events, zones, cameras }) {
  return <section className="analytics-charts"><EventTypeChart events={events}/><EventsByZone events={events} zones={zones}/><RecentEventsChart events={events}/><CameraStatus cameras={cameras}/></section>
}
