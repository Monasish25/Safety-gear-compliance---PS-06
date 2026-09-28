function CameraTile({ label, number, state, variant = '' }) {
  return (
    <div className={`camera-tile ${variant}`}>
      <div className="camera-scene" aria-hidden="true">
        <span className="scene-light scene-light--one" />
        <span className="scene-light scene-light--two" />
        <span className="scene-machine" />
        <span className="detection-box detection-box--one" />
        <span className="detection-box detection-box--two" />
      </div>
      <span className="camera-tile__number">CAM {number}</span>
      <span className="camera-tile__label">{label}</span>
      <span className={`camera-tile__state ${state === 'ALERT' ? 'is-alert' : ''}`}>{state}</span>
    </div>
  )
}

function CameraMatrix() {
  return (
    <aside className="camera-card glass-panel" aria-label="Live camera matrix preview">
      <div className="camera-card__top">
        <div><span className="status-dot" /> LIVE CAMERA MATRIX</div>
        <span className="camera-card__count">04 FEEDS</span>
      </div>
      <div className="camera-matrix">
        <CameraTile number="01" label="North gate" state="CLEAR" />
        <CameraTile number="02" label="Assembly bay" state="CLEAR" variant="scene-warm" />
        <CameraTile number="03" label="Line 04" state="CHECK" variant="scene-blue" />
        <CameraTile number="04" label="Storage" state="ALERT" variant="scene-alert" />
      </div>
      <div className="camera-card__bottom"><span>VISION ENGINE V 2.8.4</span><span>UPDATED JUST NOW</span></div>
    </aside>
  )
}

export default function HeroSection({ activeView, onSelectView }) {
  return (
    <section className="hero-section" id="home">
      <div className="hero-copy">
        <div className="online-pill"><span className="status-dot status-dot--pulse" /> DEFENSE-GRID: ONLINE</div>
        <p className="hero-kicker">INDUSTRIAL INTELLIGENCE · SAFETY FIRST</p>
        <h1>Industrial Safety Monitoring <span>for Active Job Sites</span></h1>
        <p className="hero-description">A clear, real-time view of every active worksite. Detect risk earlier, coordinate response faster, and keep every shift moving safely.</p>
        <div className="hero-actions">
          <button type="button" className="button button--primary" onClick={() => onSelectView('Command overview')}>Enter Dashboard <span aria-hidden="true">↗</span></button>
          <button type="button" className="button button--glass" onClick={() => onSelectView('Admin view')}>Admin View</button>
          <button type="button" className="button button--glass" onClick={() => onSelectView('Safety officer view')}>Safety Officer View</button>
        </div>
        <p className="view-indicator">CURRENT VIEW <strong>{activeView}</strong></p>
      </div>
      <CameraMatrix />
    </section>
  )
}
