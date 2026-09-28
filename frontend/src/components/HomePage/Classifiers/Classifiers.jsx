const classifiers = [
  { id: '01', title: 'PPE Detection', type: 'COMPUTER VISION', state: 'ACTIVE', description: 'Hard hats · High-vis vests · Safety zones' },
  { id: '02', title: 'Smoke Alert', type: 'ATMOSPHERIC AI', state: 'ACTIVE', description: 'Particulate signatures · Smoke plume analysis' },
  { id: '03', title: 'Fire Detection', type: 'THERMAL VISION', state: 'ACTIVE', description: 'Heat anomalies · Flame pattern recognition' },
]

function Preview({ type }) {
  if (type === 'PPE Detection') {
    return <div className="classifier-preview preview-ppe" aria-label="PPE detection preview"><div className="preview-worker" /><i className="preview-bbox bbox-green" /><i className="preview-bbox bbox-blue" /><span className="preview-tag">PPE OK · 98%</span><span className="preview-corner">CAM 01 / 04</span></div>
  }
  if (type === 'Smoke Alert') {
    return <div className="classifier-preview preview-smoke" aria-label="Smoke alert confidence chart"><div className="smoke-cloud" /><div className="chart-bars">{[34, 48, 39, 67, 44, 82, 58, 95, 63, 74, 50, 89].map((height, i) => <i key={i} style={{ '--bar-height': `${height}%` }} />)}</div><span className="preview-tag">SMOKE INDEX · 0.08</span><span className="preview-corner">THRESHOLD 0.72</span></div>
  }
  return <div className="classifier-preview preview-thermal" aria-label="Thermal fire detection preview"><div className="thermal-grid" /><div className="thermal-hotspot" /><i className="preview-bbox bbox-amber" /><span className="preview-tag">THERMAL · 31.4°C</span><span className="preview-corner">ZONE C / LIVE</span></div>
}

export default function Classifiers() {
  return (
    <section className="section-block" id="monitoring">
      <div className="section-heading">
        <div><p className="section-eyebrow">PERCEPTION LAYER</p><h2>Active Computer Vision Classifiers</h2></div>
        <a href="#pipeline" className="text-link">View system architecture <span aria-hidden="true">→</span></a>
      </div>
      <div className="classifier-grid">
        {classifiers.map((classifier) => (
          <article className="classifier-card glass-panel" key={classifier.id}>
            <div className="classifier-card__heading"><div><span className="classifier-index">{classifier.id}</span><span className="classifier-type">{classifier.type}</span></div><span className="active-state"><i />{classifier.state}</span></div>
            <Preview type={classifier.title} />
            <div className="classifier-card__footer"><div><h3>{classifier.title}</h3><p>{classifier.description}</p></div><span className="classifier-arrow" aria-hidden="true">↗</span></div>
          </article>
        ))}
      </div>
    </section>
  )
}
