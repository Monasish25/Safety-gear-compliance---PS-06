import { zones } from '../data/monitorData.js'

export default function ZoneControls({ activeZone, setActiveZone, view, setView, onPtz, ir, setIr }) {
  return (
    <section className="zone-controls glass-surface" aria-label="Camera and zone controls">
      <div className="zone-filter-list">{zones.map((zone, index) => <button key={zone} type="button" className={`zone-filter${activeZone === index ? ' is-active' : ''}`} onClick={() => setActiveZone(index)}>{index === 2 && <i className="zone-alert-dot zone-alert-dot--purple" />}{index === 3 && <i className="zone-alert-dot zone-alert-dot--amber" />}{zone}</button>)}</div>
      <div className="feed-controls"><div className="view-toggle"><button className={view === '2x2' ? 'is-active' : ''} type="button" onClick={() => setView('2x2')}>2x2</button><button className={view === 'solo' ? 'is-active' : ''} type="button" onClick={() => setView('solo')}>Solo</button></div><button className="monitor-control" type="button" onClick={onPtz}>PTZ CONSOLE</button><button className={`monitor-control${ir ? ' is-on' : ''}`} type="button" onClick={() => setIr((value) => !value)}>IR FLIR {ir ? 'ON' : 'OFF'}</button><button className="monitor-control monitor-control--ai" type="button" disabled>AI OVERLAYS [UNAVAILABLE]</button></div>
    </section>
  )
}
