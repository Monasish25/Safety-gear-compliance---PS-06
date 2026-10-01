/**
 * FactoryLocationPlaceholder
 *
 * Shows where the future live factory site map will be placed.
 * No fake markers, no fake evacuation paths, no fake incident zones.
 * No external map library is used.
 *
 * The placeholder communicates that:
 *   - A site map will be rendered here once configured.
 *   - Worker positions will appear when location data is connected.
 *   - Muster points will appear when configured by the site administrator.
 *
 * Props
 *   workerLocations  {WorkerLocation[]}  – pass-through from adapter (empty)
 */
export default function FactoryLocationPlaceholder({ workerLocations }) {
  const hasData = workerLocations && workerLocations.length > 0

  return (
    <div className="flp-shell" aria-label="Factory location view — awaiting configuration">
      {/* Map canvas area */}
      <div className="flp-canvas" aria-hidden="true">
        {/* Grid lines suggesting a floor plan — purely decorative */}
        <svg className="flp-grid" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {/* Outer perimeter */}
          <rect x="6" y="6" width="188" height="108" rx="4" fill="none" stroke="rgba(130,180,240,.14)" strokeWidth="1" />
          {/* Zone dividers */}
          <line x1="100" y1="6" x2="100" y2="114" stroke="rgba(130,180,240,.09)" strokeWidth=".8" strokeDasharray="3,4" />
          <line x1="6" y1="60" x2="194" y2="60" stroke="rgba(130,180,240,.09)" strokeWidth=".8" strokeDasharray="3,4" />
          {/* Zone labels */}
          <text x="53" y="20" fill="rgba(180,210,245,.22)" fontSize="7" fontFamily="monospace" textAnchor="middle">ZONE A</text>
          <text x="148" y="20" fill="rgba(180,210,245,.22)" fontSize="7" fontFamily="monospace" textAnchor="middle">ZONE B</text>
          <text x="53" y="73" fill="rgba(180,210,245,.22)" fontSize="7" fontFamily="monospace" textAnchor="middle">ZONE C</text>
          <text x="148" y="73" fill="rgba(180,210,245,.22)" fontSize="7" fontFamily="monospace" textAnchor="middle">ZONE D</text>
          {/* Muster point markers — ghost/outline only, no data implied */}
          <circle cx="16" cy="114" r="4" fill="none" stroke="rgba(100,220,180,.25)" strokeWidth="1" strokeDasharray="2,2" />
          <circle cx="184" cy="114" r="4" fill="none" stroke="rgba(100,220,180,.25)" strokeWidth="1" strokeDasharray="2,2" />
          <text x="16" y="117" fill="rgba(100,220,180,.18)" fontSize="4" fontFamily="monospace" textAnchor="middle">M</text>
          <text x="184" y="117" fill="rgba(100,220,180,.18)" fontSize="4" fontFamily="monospace" textAnchor="middle">M</text>
        </svg>

        {/* Centre overlay label */}
        <div className="flp-centre-label">
          <p className="flp-centre-title">FACTORY LOCATION VIEW</p>
          <p className="flp-centre-sub">Site map will appear here</p>
        </div>
      </div>

      {/* Status rows */}
      <ul className="flp-status-list" aria-label="Location status">
        <li className="flp-status-row">
          <span className="flp-status-label">Worker positions</span>
          <span className="flp-status-value flp-status-value--muted">
            {hasData ? `${workerLocations.length} tracked` : 'Awaiting data'}
          </span>
        </li>
        <li className="flp-status-row">
          <span className="flp-status-label">Muster points</span>
          <span className="flp-status-value flp-status-value--muted">Awaiting configuration</span>
        </li>
        <li className="flp-status-row">
          <span className="flp-status-label">Location source</span>
          <span className="flp-status-value flp-status-value--muted">Not connected</span>
        </li>
      </ul>
    </div>
  )
}
