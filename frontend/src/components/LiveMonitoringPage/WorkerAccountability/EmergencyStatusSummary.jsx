/**
 * EmergencyStatusSummary
 *
 * Shows one of three placeholder states based on whether an emergency is
 * active and whether location data is available.
 *
 * All values are neutral — no fake counts, timestamps, or zones.
 *
 * Props
 *   accountabilityState  {EmergencyAccountability | null}
 */
export default function EmergencyStatusSummary({ accountabilityState }) {
  // State 1 – no emergency active (includes null state = not connected)
  if (!accountabilityState || !accountabilityState.emergencyActive) {
    return (
      <div className="ess-block ess-block--normal" aria-label="Emergency status: normal">
        <div className="ess-row">
          <span className="ess-label">Emergency status</span>
          <span className="ess-badge ess-badge--normal">Normal</span>
        </div>
        <div className="ess-row">
          <span className="ess-label">Accountability</span>
          <span className="ess-value ess-value--muted">Not active</span>
        </div>
        <p className="ess-note">
          Emergency accountability will activate when an incident is confirmed.
        </p>
      </div>
    )
  }

  // State 2 – emergency active but no location source connected
  if (!accountabilityState.locationSource) {
    return (
      <div className="ess-block ess-block--active" aria-label="Emergency status: active, location unavailable">
        <div className="ess-row">
          <span className="ess-label">Emergency status</span>
          <span className="ess-badge ess-badge--active">Active</span>
        </div>
        <div className="ess-row">
          <span className="ess-label">Accountability</span>
          <span className="ess-value ess-value--warn">Location feed unavailable</span>
        </div>
        <p className="ess-note">
          Worker status cannot be verified until the location source reconnects.
        </p>
      </div>
    )
  }

  // State 3 – emergency active, location source connected but no data yet
  return (
    <div className="ess-block ess-block--active" aria-label="Emergency status: active, awaiting worker data">
      <div className="ess-row">
        <span className="ess-label">Emergency status</span>
        <span className="ess-badge ess-badge--active">Active</span>
      </div>
      <div className="ess-row">
        <span className="ess-label">Accountability</span>
        <span className="ess-value ess-value--muted">Awaiting worker data</span>
      </div>
      <div className="ess-row">
        <span className="ess-label">Affected zone</span>
        <span className="ess-value ess-value--muted">{accountabilityState.affectedZone ?? '--'}</span>
      </div>
      <div className="ess-row">
        <span className="ess-label">Workers on site</span>
        <span className="ess-value ess-value--muted">--</span>
      </div>
      <div className="ess-row">
        <span className="ess-label">In affected zone</span>
        <span className="ess-value ess-value--muted">--</span>
      </div>
      <div className="ess-row">
        <span className="ess-label">Accounted for</span>
        <span className="ess-value ess-value--muted">--</span>
      </div>
      <div className="ess-row">
        <span className="ess-label">Moving to muster</span>
        <span className="ess-value ess-value--muted">--</span>
      </div>
      <div className="ess-row">
        <span className="ess-label">Unaccounted</span>
        <span className="ess-value ess-value--muted">--</span>
      </div>
    </div>
  )
}
