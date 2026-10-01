/**
 * WorkerAccountabilityPanel
 *
 * Root container for the Worker Location and Emergency Accountability section.
 * Rendered on the Live Monitoring page between the zone cards and the footer.
 *
 * Composes:
 *   - FactoryLocationPlaceholder  (site map placeholder)
 *   - WorkerDetailsPlaceholder    (anonymous worker details)
 *   - EmergencyStatusSummary      (emergency state panel)
 *
 * All data props are currently empty/null — awaiting backend integration.
 *
 * Props
 *   workerLocations       {WorkerLocation[]}             – from adapter (empty)
 *   accountabilityState   {EmergencyAccountability|null} – from adapter (null)
 */
import FactoryLocationPlaceholder from './FactoryLocationPlaceholder.jsx'
import WorkerDetailsPlaceholder from './WorkerDetailsPlaceholder.jsx'
import EmergencyStatusSummary from './EmergencyStatusSummary.jsx'

export default function WorkerAccountabilityPanel({ workerLocations, accountabilityState }) {
  return (
    <section
      className="wa-section"
      aria-label="Worker accountability — awaiting location data"
    >
      {/* Section header */}
      <div className="wa-header">
        <div className="wa-header-left">
          <span className="wa-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </span>
          <h2 className="wa-title">WORKER ACCOUNTABILITY</h2>
        </div>
        <span className="wa-status-chip wa-status-chip--off">Awaiting location data</span>
      </div>

      {/* Quick-summary row */}
      <div className="wa-summary-strip glass-surface">
        <div className="wa-summary-item">
          <span className="wa-summary-label">Location source</span>
          <span className="wa-summary-value wa-summary-value--muted">Not connected</span>
        </div>
        <div className="wa-summary-sep" aria-hidden="true" />
        <div className="wa-summary-item">
          <span className="wa-summary-label">Workers on site</span>
          <span className="wa-summary-value wa-summary-value--muted">--</span>
        </div>
        <div className="wa-summary-sep" aria-hidden="true" />
        <div className="wa-summary-item">
          <span className="wa-summary-label">In affected zone</span>
          <span className="wa-summary-value wa-summary-value--muted">--</span>
        </div>
        <div className="wa-summary-sep" aria-hidden="true" />
        <div className="wa-summary-item">
          <span className="wa-summary-label">Accounted for</span>
          <span className="wa-summary-value wa-summary-value--muted">--</span>
        </div>
        <div className="wa-summary-sep" aria-hidden="true" />
        <div className="wa-summary-item">
          <span className="wa-summary-label">Unaccounted</span>
          <span className="wa-summary-value wa-summary-value--muted">--</span>
        </div>
        <div className="wa-summary-sep" aria-hidden="true" />
        <div className="wa-summary-item">
          <span className="wa-summary-label">Last update</span>
          <span className="wa-summary-value wa-summary-value--muted">--</span>
        </div>
      </div>

      {/* Main content grid: map | details | emergency */}
      <div className="wa-content-grid">
        {/* Factory location map placeholder */}
        <div className="wa-map-col glass-surface">
          <FactoryLocationPlaceholder workerLocations={workerLocations} />
        </div>

        {/* Worker details placeholder */}
        <div className="wa-details-col glass-surface">
          <WorkerDetailsPlaceholder selectedWorker={null} />
        </div>

        {/* Emergency accountability summary */}
        <div className="wa-emergency-col glass-surface">
          <EmergencyStatusSummary accountabilityState={accountabilityState} />
        </div>
      </div>

      {/* Footer note */}
      <p className="wa-footer-note">
        Real worker positions and muster status will appear when the tracking
        backend is connected. Worker identity is anonymized in monitoring view.
      </p>
    </section>
  )
}
