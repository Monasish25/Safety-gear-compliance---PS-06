/**
 * WorkerDetailsPlaceholder
 *
 * Shows the visual structure for a future worker-details panel.
 * All fields are in an awaiting/unavailable state.
 *
 * No names, faces, photos, personal health information, or fake IDs are shown.
 * Worker identity is anonymized in monitoring view.
 *
 * Props — none required in placeholder state.
 *   selectedWorker  {WorkerLocation | null}  – future: pass selected worker from map
 */
export default function WorkerDetailsPlaceholder({ selectedWorker }) {
  return (
    <aside
      className="wdp-panel"
      aria-label="Worker details — awaiting location data"
    >
      <header className="wdp-header">
        <div className="wdp-icon" aria-hidden="true">
          {/* Anonymous silhouette — SVG, no photo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
        <span className="wdp-title">WORKER DETAILS</span>
      </header>

      <ul className="wdp-row-list" aria-label="Worker detail rows">
        <li className="wdp-row">
          <span className="wdp-row-label">Worker ID</span>
          <span className="wdp-row-value wdp-row-value--muted">Awaiting data</span>
        </li>
        <li className="wdp-row">
          <span className="wdp-row-label">Current zone</span>
          <span className="wdp-row-value wdp-row-value--muted">--</span>
        </li>
        <li className="wdp-row">
          <span className="wdp-row-label">Last known location</span>
          <span className="wdp-row-value wdp-row-value--muted">--</span>
        </li>
        <li className="wdp-row">
          <span className="wdp-row-label">Status</span>
          <span className="wdp-row-value wdp-row-value--muted">Awaiting location</span>
        </li>
        <li className="wdp-row">
          <span className="wdp-row-label">Muster status</span>
          <span className="wdp-row-value wdp-row-value--muted">--</span>
        </li>
        <li className="wdp-row">
          <span className="wdp-row-label">Last update</span>
          <span className="wdp-row-value wdp-row-value--muted">--</span>
        </li>
      </ul>

      <p className="wdp-note">
        Worker-specific information will appear here after a verified location
        event is received.
      </p>
      <p className="wdp-privacy">🔒 Worker identity is anonymized in monitoring view.</p>
    </aside>
  )
}
