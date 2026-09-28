import FilterGroup from '../FilterGroup/FilterGroup.jsx'
import Icon from '../Icons/Icon.jsx'
import { zones, classifiers, severities, horizons } from '../data/incidentData.js'

export default function FilterPanel({ filters, setFilters, query, setQuery, horizon, setHorizon, searchRef, matched, page, pageSize }) {
  const tags = [
    { text: `Timestamp: ${horizon === 'Today (May 18)' ? 'Today' : horizon}`, clear: () => setHorizon('24H') },
    ...(filters.zone !== 'all' ? [{ text: `Zone: ${filters.zone}`, clear: () => setFilters((value) => ({ ...value, zone: 'all' })) }] : [{ text: 'Zone: All', clear: () => setFilters((value) => ({ ...value, zone: 'all' })) }]),
    ...(filters.classifier !== 'all' ? [{ text: `Type: ${filters.classifier}`, clear: () => setFilters((value) => ({ ...value, classifier: 'all' })) }] : []),
    ...(filters.severity !== 'all' ? [{ text: `Severity: ${filters.severity}`, clear: () => setFilters((value) => ({ ...value, severity: 'all' })) }] : []),
    { text: 'Sort: Timestamp (DESC)', clear: () => {} },
  ]
  const start = matched === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, matched)

  return (
    <section className="incident-filters glass-surface" aria-label="Incident filters">
      <div className="filter-top-row">
        <label className="search-field"><Icon name="search" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Incident ID, Camera, Operator or Keyword..." /><kbd>CTRL + K</kbd></label>
        <div className="horizon-control"><span>TIME HORIZON</span><div className="filter-pills">{horizons.map((item, index) => <button type="button" key={item} className={`filter-pill${horizon === item ? ' is-active' : ''}`} onClick={() => setHorizon(item)}>{index === 3 && <Icon name="calendar" />}{item}</button>)}</div></div>
      </div>
      <div className="filter-groups">
        <FilterGroup label="TACTICAL ZONE SELECTOR" items={zones} active={filters.zone} onSelect={(zone) => setFilters((value) => ({ ...value, zone }))} />
        <FilterGroup label="NEURAL CLASSIFIER RULE" items={classifiers} active={filters.classifier} onSelect={(classifier) => setFilters((value) => ({ ...value, classifier }))} />
        <FilterGroup label="THREAT SEVERITY TIER" items={severities} active={filters.severity} onSelect={(severity) => setFilters((value) => ({ ...value, severity }))} kind="severity" />
      </div>
      <div className="query-summary"><div className="query-tags">{tags.map((tag, index) => <button key={`${tag.text}-${index}`} type="button" className="query-tag" onClick={tag.clear}>{tag.text} <span>×</span></button>)}</div><span className="match-count">MATCHED {matched} INCIDENTS <i>(SHOWING {start}-{end})</i></span></div>
    </section>
  )
}
