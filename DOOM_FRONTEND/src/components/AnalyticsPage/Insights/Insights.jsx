export default function Insights({ events, cameras, connected }) {
  const urgentEvents = events.filter((event) => ['HIGH', 'CRITICAL'].includes(String(event.severity).toUpperCase())).length
  const openEvents = events.filter((event) => String(event.status).toUpperCase() !== 'RESOLVED').length
  const activeCameras = cameras.filter((camera) => camera.is_active).length

  return (
    <section className="analytics-insights glass-surface">
      <header className="section-card-heading"><div><span className="chart-icon">◉</span><h2>Backend Activity Summary</h2></div><b className="confidence">{connected ? 'SOURCE: LIVE API' : 'SOURCE: UNAVAILABLE'}</b></header>
      {connected ? <>
        <article className="insight-row"><b>RECENT RECORDS</b><p>The backend returned <strong>{events.length}</strong> event records and reports <strong>{activeCameras}</strong> active cameras.</p></article>
        <article className="insight-row insight-amber"><b>OPEN EVENT STATUS</b><p><strong>{openEvents}</strong> of the returned events are not marked resolved. <strong>{urgentEvents}</strong> have high or critical severity.</p></article>
      </> : <p className="analytics-empty">Activity summaries will appear after the backend is available.</p>}
    </section>
  )
}
