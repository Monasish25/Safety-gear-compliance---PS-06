export default function ThreatStream({ threats = [], hideResolved, streamRef, onExport }) {
  const visibleThreats = hideResolved ? threats.filter((item) => item.kind !== 'resolved') : threats
  const threatCount = visibleThreats.length

  return (
    <aside className="threat-stream glass-surface" aria-label="Real-time threat and incident stream">
      <header className="threat-stream__header">
        <div className="stream-title">
          <span className="stream-emergency-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 2.2 22 20a1.35 1.35 0 0 1-1.18 2H3.18A1.35 1.35 0 0 1 2 20L12 2.2Zm0 4.1L5.1 19.2h13.8L12 6.3Zm-1 4.1h2v5.2h-2v-5.2Zm0 6.7h2v2h-2v-2Z" />
            </svg>
          </span>
          <div>
            <h2>THREAT <span>&amp; INCIDENT STREAM</span></h2>
            <p>
              <i style={{ background: threatCount > 0 ? '#ff4d4d' : '#69dfa1', boxShadow: threatCount > 0 ? '0 0 8px #ff4d4d' : '0 0 6px #69dfa1' }} /> 
              {threatCount > 0 ? `${threatCount} ACTIVE INCIDENTS DETECTED` : 'AWAITING MONITORING DATA'}
            </p>
          </div>
        </div>
        <div className="stream-header-actions">
          <button type="button" onClick={onExport}>Export CSV</button>
        </div>
      </header>

      <div className="threat-list" ref={streamRef}>
        {visibleThreats.length ? (
          visibleThreats.map((threat) => (
            <article className={`threat-card threat-card--${threat.kind}`} key={threat.id}>
              <div className="threat-card__head">
                <span className="threat-severity"><i />{threat.kind.toUpperCase()}</span>
                <span className="threat-id">{threat.id}</span>
              </div>
              <div className="threat-card__title">
                <h3>{threat.title}</h3>
                <time>{threat.time}</time>
              </div>
              <p className="threat-location">{threat.location}</p>
              <p className="threat-description">{threat.description}</p>
            </article>
          ))
        ) : (
          <p className="feed-empty-note">No active safety violations detected. Monitoring API live.</p>
        )}
      </div>

      <footer className="threat-stream__footer">
        <span>
          <i style={{ background: threatCount > 0 ? '#ffaa00' : '#69dca1' }} />
          {threatCount > 0 ? `AUTOMATED DISPATCH ACTIVE (${threatCount} QUEUED)` : 'DISPATCH SYSTEM STANDBY'}
        </span>
      </footer>
    </aside>
  )
}
