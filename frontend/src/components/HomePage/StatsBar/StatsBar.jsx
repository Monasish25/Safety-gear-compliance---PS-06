const stats = [
  { label: 'Active workers monitored', value: '1,248', detail: 'Across 12 active zones', icon: '◉', color: 'blue' },
  { label: 'Shift compliance rate', value: '98.6%', detail: '↑ 2.4% this week', icon: '✓', color: 'green' },
  { label: 'Smoke / thermal hazards', value: '02', detail: '1 requires attention', icon: '⌁', color: 'amber' },
  { label: 'Incident MTTR', value: '04:32', detail: 'Average response time', icon: '◷', color: 'violet' },
]

export default function StatsBar() {
  return (
    <section className="stats-grid" id="analytics" aria-label="Site safety statistics">
      {stats.map((stat) => (
        <article className="stat-card glass-panel" key={stat.label}>
          <div className={`stat-icon stat-icon--${stat.color}`} aria-hidden="true">{stat.icon}</div>
          <div className="stat-card__body">
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span>{stat.detail}</span>
          </div>
          <span className={`stat-spark stat-spark--${stat.color}`} aria-hidden="true" />
        </article>
      ))}
    </section>
  )
}
