export default function FilterGroup({ label, items, active, onSelect, kind }) {
  return (
    <div className="filter-group">
      <p>{label}</p>
      <div className="filter-pills">
        {items.map((item) => {
          const key = item === 'All Zones' || item === 'All Types' || item === 'All' ? 'all' : item
          const selected = active === key
          let text = item
          if (kind === 'severity') {
            if (item === 'Critical') text = <><i className="severity-dot dot-critical" />Critical <b>(3)</b></>
            if (item === 'Warning') text = <><i className="severity-dot dot-warning" />Warning <b>(4)</b></>
            if (item === 'Safe / Resolved') text = <><i className="severity-dot dot-resolved" />Safe / Resolved <b>(7)</b></>
            if (item === 'All') text = <><i className="severity-dot dot-all" />All</>
          }
          return <button key={item} type="button" className={`filter-pill${selected ? ' is-active' : ''}`} onClick={() => onSelect(key)}>{text}</button>
        })}
      </div>
    </div>
  )
}
