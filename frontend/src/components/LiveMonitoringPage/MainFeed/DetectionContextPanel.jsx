/**
 * DetectionContextPanel
 *
 * A small glass-panel below or adjacent to the main camera feed.
 * Shows only readiness/status information — no production-looking values.
 *
 * Styled using the project's existing glass-surface + monitor CSS variables.
 *
 * Props
 *   feed  {{ id: string, zone: string }}  – selected feed metadata
 */
export default function DetectionContextPanel({ feed }) {
  return (
    <aside
      className="dcp-panel glass-surface"
      aria-label="Live detection context — awaiting backend"
    >
      <header className="dcp-header">
        <span className="dcp-title">LIVE DETECTION CONTEXT</span>
        <span className="dcp-chip dcp-chip--off">Backend unavailable</span>
      </header>

      <ul className="dcp-row-list" aria-label="Detection context rows">
        <li className="dcp-row">
          <span className="dcp-row-label">Camera</span>
          <span className="dcp-row-value dcp-row-value--muted">Awaiting connection</span>
        </li>
        <li className="dcp-row">
          <span className="dcp-row-label">Zone</span>
          <span className="dcp-row-value dcp-row-value--muted">Not assigned</span>
        </li>
        <li className="dcp-row">
          <span className="dcp-row-label">AI inference</span>
          <span className="dcp-row-value dcp-row-value--muted">Not connected</span>
        </li>
        <li className="dcp-row">
          <span className="dcp-row-label">Detection result</span>
          <span className="dcp-row-value dcp-row-value--muted">Awaiting backend</span>
        </li>
        <li className="dcp-row">
          <span className="dcp-row-label">Last update</span>
          <span className="dcp-row-value dcp-row-value--muted">--</span>
        </li>
      </ul>

      <p className="dcp-description">
        When connected, real model results will show worker IDs, PPE status,
        posture risk, hazard type, asset status, confidence, location, and
        duration.
      </p>
    </aside>
  )
}

