import Snapshot from '../Snapshot/Snapshot.jsx'
import Icon from '../Icons/Icon.jsx'

export default function InspectionDrawer({ incident, onUpdateStatus }) {
  return (
    <aside className="inspection-drawer glass-surface" aria-label="Incident inspection drawer">
      {!incident ? (
        <div className="drawer-empty-state"><span className="section-index">—</span><h2>No incident selected</h2><p>Select an incident from the repository to view detailed telemetry, evidence snapshots, and mitigation options.</p></div>
      ) : (
        <div className="drawer-content">
          <div className="drawer-header">
            <h2>INCIDENT #{incident.id}</h2>
            <span className={`severity-badge severity-${incident.severity.toLowerCase()}`}><i />{incident.severity}</span>
          </div>
          
          <div className="drawer-snapshot-container" style={{ margin: '1rem 0', height: '240px' }}>
            <Snapshot incident={incident} />
          </div>

          <div className="drawer-metadata">
            <div className="meta-group">
              <span className="meta-label">TIME (UTC)</span>
              <span className="meta-value mono">{incident.time}</span>
            </div>
            <div className="meta-group">
              <span className="meta-label">ZONE</span>
              <span className="meta-value">{incident.zone}</span>
            </div>
            <div className="meta-group">
              <span className="meta-label">CAMERA</span>
              <span className="meta-value">{incident.camera}</span>
            </div>
            <div className="meta-group">
              <span className="meta-label">EVENT TYPE</span>
              <span className="meta-value">{incident.classifier}</span>
            </div>
            <div className="meta-group">
              <span className="meta-label">REASON</span>
              <span className="meta-value" style={{ color: 'var(--color-primary)' }}>{incident.context}</span>
            </div>
            <div className="meta-group">
              <span className="meta-label">STATUS</span>
              <span className={`meta-value status-text status-${incident.status.toLowerCase()}`}>{incident.status}</span>
            </div>
          </div>

          <div className="drawer-actions" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {incident.status.toLowerCase() === 'open' && (
              <button className="primary-button" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onUpdateStatus(incident.id, 'acknowledged')}>
                Acknowledge Incident
              </button>
            )}
            {['open', 'acknowledged'].includes(incident.status.toLowerCase()) && (
              <button className="glass-button" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onUpdateStatus(incident.id, 'resolved')}>
                Mark as Resolved
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
