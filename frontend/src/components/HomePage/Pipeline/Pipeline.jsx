const stages = [
  { number: '01', title: 'Camera Feed Ingestion', detail: 'Encrypted RTSP streams', icon: '▦', meta: '12 FEEDS · 30 FPS' },
  { number: '02', title: 'AI Inference Engine', detail: 'On-edge vision models', icon: '⌘', meta: '42 MS LATENCY' },
  { number: '03', title: 'Alert & Relay Mesh', detail: 'Prioritized event routing', icon: '⌁', meta: '99.98% UPTIME' },
  { number: '04', title: 'Ops Center Console', detail: 'Unified response workspace', icon: '◫', meta: 'LIVE · SYNCED' },
]

export default function Pipeline() {
  return (
    <section className="section-block pipeline-section" id="pipeline">
      <div className="section-heading"><div><p className="section-eyebrow">FROM CAMERA TO ACTION</p><h2>Real-Time Data Pipeline</h2></div><span className="pipeline-live"><i /> ALL SYSTEMS OPERATIONAL</span></div>
      <div className="pipeline-grid">
        {stages.map((stage, index) => (
          <article className="pipeline-card glass-panel" key={stage.number}>
            <div className="pipeline-card__top"><span>{stage.number}</span><span className="pipeline-icon" aria-hidden="true">{stage.icon}</span></div>
            <h3>{stage.title}</h3><p>{stage.detail}</p><span className="pipeline-meta">{stage.meta}</span>
            {index < stages.length - 1 && <span className="pipeline-connector" aria-hidden="true">→</span>}
          </article>
        ))}
      </div>
    </section>
  )
}
