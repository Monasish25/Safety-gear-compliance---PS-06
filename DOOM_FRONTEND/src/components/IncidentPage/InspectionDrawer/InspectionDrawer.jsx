export default function InspectionDrawer({ incident }) {
  return (
    <aside className="inspection-drawer glass-surface" aria-label="Incident inspection drawer">
      {incident ? <div className="drawer-empty-state">Incident details are unavailable.</div> : <div className="drawer-empty-state"><span className="section-index">—</span><h2>No incident selected</h2><p>Incident details and telemetry will appear here when the incident service is connected.</p></div>}
    </aside>
  )
}
