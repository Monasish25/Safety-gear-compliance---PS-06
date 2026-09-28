import Snapshot from '../Snapshot/Snapshot.jsx'
import Icon from '../Icons/Icon.jsx'

export default function InspectionDrawer({ incident, logs, onCommand, processing, network, gps, networkFlash, gpsFlash, logsRef }) {
  return (
    <aside className="inspection-drawer glass-surface" aria-label="Incident inspection drawer">
      <div className="drawer-header"><div className="drawer-header__title"><span className="critical-pulse" /><div><b>#{incident.id}</b><small>INSPECTION DRAWER</small></div></div><span className="dispatch-badge">LIVE DISPATCH</span><button className="drawer-external" aria-label="Open inspection in new view" type="button"><Icon name="external" /></button></div>
      <div className="drawer-scroll">
        <header className="drawer-incident-title"><p className="severity-label">{incident.severity} PRIORITY <span>•</span> {incident.zone}</p><h2>{incident.title}</h2><p>{incident.subtitle}</p></header>
        <Snapshot incident={incident} />
        <section className="drawer-section telemetry-section"><div className="drawer-section-heading"><div><span className="section-index">01</span><h3>EVENT CHRONOLOGY TELEMETRY</h3></div><span className="live-chip"><i /> LIVE</span></div><div className="telemetry-list" ref={logsRef}>{logs.map((entry, index) => <div className={`telemetry-entry severity-${entry.severity}${index === 0 ? ' is-new' : ''}`} key={entry.key || `${entry.time}-${entry.message}`}><span className="telemetry-mark" /><time>{entry.time}</time><b>{entry.message}</b></div>)}</div></section>
        <section className="drawer-section"><div className="drawer-section-heading"><div><span className="section-index">02</span><h3>HARDWARE IDENTIFIER</h3></div><span className="hardware-live">SYNCED</span></div><div className="hardware-grid"><div className="hardware-cell"><span>OPTICAL SENSOR</span><b className="mono">{incident.camera}-AXIS-PTZ-8K</b></div><div className="hardware-cell"><span>GPS COORDINATES</span><b className={`mono${gpsFlash ? ' value-flash' : ''}`}>{gps[0].toFixed(4)} N&nbsp; {Math.abs(gps[1]).toFixed(4)} W</b></div><div className="hardware-cell"><span>INFERENCE CORE</span><b className="mono">TensorRT-10.1 (INT8)</b></div><div className="hardware-cell"><span>NETWORK LATENCY</span><b className={`mono${networkFlash ? ' value-flash' : ''}`}>{network.toFixed(1)} ms (LAN-ISOLATED)</b></div></div></section>
        <section className="drawer-section triage-section"><div className="drawer-section-heading"><div><span className="section-index">03</span><h3>COMMAND &amp; TRIAGE OVERRIDES</h3></div></div><div className="triage-buttons"><button className="triage-button" disabled={!!processing} type="button" onClick={() => onCommand('False Alarm')}>{processing === 'False Alarm' ? 'Processing...' : 'False Alarm'}</button><button className="triage-button triage-red" disabled={!!processing} type="button" onClick={() => onCommand('Escalated to 911')}>{processing === 'Escalated to 911' ? 'Processing...' : 'Escalate 911'}</button><button className="triage-button triage-green" disabled={!!processing} type="button" onClick={() => onCommand('Resolved')}>{processing === 'Resolved' ? 'Processing...' : 'Mark Resolved'}</button></div><p className="drawer-status">CURRENT STATUS <b>{incident.status}</b></p></section>
      </div>
    </aside>
  )
}
