export default function ZoneStatus() {
  const zonesStatus = [
    { title: 'ZONE A • HEAVY FAB', state: 'NORMAL', tone: 'normal', array: 'ARRAY: 8/8 ONLINE', compliance: '99.1% COMPLIANCE', alerts: 'ALERTS: 0 CRITICAL • 0 WARNINGS' },
    { title: 'ZONE B • ASSEMBLY', state: 'ALERT ACTIVE', tone: 'critical', array: 'ARRAY: 6/6 ONLINE', compliance: '94.2% COMPLIANCE', alerts: 'ALERTS: 1 FIRE • 1 PPE VIOLATION' },
    { title: 'ZONE C • CHEMICAL', state: 'WARNING', tone: 'warning', array: 'ARRAY: 10/10 ONLINE', compliance: '96.5% COMPLIANCE', alerts: 'ALERTS: 0 CRITICAL • 1 PPE BREACH' },
    { title: 'ZONE D • LOGISTICS', state: 'NORMAL', tone: 'normal', array: 'ARRAY: 4/4 ONLINE', compliance: '100.0% COMPLIANCE', alerts: 'ALERTS: ALL CLEAR • ZERO INCIDENTS' },
  ]
  return <section className="zone-status-row" aria-label="Zone status summary">{zonesStatus.map((zone) => <article key={zone.title} className={`zone-status-card glass-surface zone-status-card--${zone.tone}`}><div><h3>{zone.title}</h3><span className={`zone-state zone-state--${zone.tone}`}><i />{zone.state}</span></div><p>{zone.array}</p><p>{zone.compliance}</p><strong>{zone.alerts}</strong></article>)}</section>
}
