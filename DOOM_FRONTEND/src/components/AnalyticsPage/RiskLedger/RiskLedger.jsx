function displayDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString()
}

export default function RiskLedger({ events, cameras, zones }) {
  const cameraById = new Map(cameras.map((camera) => [camera.id, camera]))
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]))

  return <section className="analytics-ledger glass-surface"><header className="section-card-heading"><div><span className="chart-icon">▤</span><h2>Latest Backend Events</h2></div><b className="ledger-label">{events.length} OF LATEST 200</b></header><div className="ledger-scroll"><table><thead><tr><th>Event</th><th>Camera</th><th>Zone</th><th>Severity</th><th>Status</th><th>Started</th></tr></thead><tbody>{events.slice(0, 12).map((event) => <tr key={event.id}><td><b>{String(event.event_type || 'Unknown').replaceAll('_', ' ')}</b><small>{event.id || event.alert_id}</small></td><td>{cameraById.get(event.camera_id)?.name || event.camera_id}</td><td>{zoneById.get(event.zone_id)?.name || event.zone_id || 'Unassigned'}</td><td>{event.severity || 'Unknown'}</td><td>{event.status || 'Unknown'}</td><td>{displayDate(event.triggered_at || event.timestamp)}</td></tr>)}</tbody></table>{events.length === 0 && <p className="analytics-empty">No events are available from the backend.</p>}</div></section>
}
