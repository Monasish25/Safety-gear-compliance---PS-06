const kpis = [
  { key: 'cameras', title: 'Active Cameras', tone: 'teal', detail: 'Camera records marked active by the backend.' },
  { key: 'zones', title: 'Configured Zones', tone: 'green', detail: 'Zones currently registered by the backend.' },
  { key: 'events', title: 'Recent Events', tone: 'amber', detail: 'Records returned in the latest 200-event query.' },
  { key: 'open', title: 'Unresolved Events', tone: 'red', detail: 'Recent records not marked resolved.' },
]

export default function KpiSummary({ cameras, zones, events, connected }) {
  const values = {
    cameras: cameras.filter((camera) => camera.is_active).length,
    zones: zones.length,
    events: events.length,
    open: events.filter((event) => String(event.status).toUpperCase() !== 'RESOLVED').length,
  }

  return (
    <section className="analytics-kpis" aria-label="Backend metrics">
      {kpis.map((kpi) => (
        <article className={`analytics-kpi glass-surface tone-${kpi.tone}`} key={kpi.key}>
          <header><span>BACKEND METRIC</span><b className={`metric-badge badge-${connected ? kpi.tone : 'red'}`}>{connected ? 'LIVE DATA' : 'UNAVAILABLE'}</b></header>
          <h2>{kpi.title}</h2>
          <div className="kpi-reading"><strong>{connected ? values[kpi.key] : '—'}</strong></div>
          <p>{connected ? kpi.detail : 'Connect the analytics page to the backend to load this metric.'}</p>
        </article>
      ))}
    </section>
  )
}
