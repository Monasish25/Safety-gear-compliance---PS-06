import Snapshot from '../Snapshot/Snapshot.jsx'
import Icon from '../Icons/Icon.jsx'

export default function IncidentTable({ rows, selectedId, checked, selectedIds, setSelectedIds, onSelect, page, setPage, pageCount, pageSize, setPageSize, onAcknowledge, onExportTelemetry, onPurge }) {
  const allOnPageChecked = rows.length > 0 && rows.every((item) => selectedIds.includes(item.id))
  function toggleAll() {
    setSelectedIds((current) => allOnPageChecked ? current.filter((id) => !rows.some((row) => row.id === id)) : [...new Set([...current, ...rows.map((row) => row.id)])])
  }
  return (
    <section className="repository-card glass-surface" aria-label="Incident repository">
      <div className="repository-heading">
        <div><p className="eyebrow">SECURE EVENT STORE</p><h2>INCIDENT REPOSITORY MATRIX</h2><span>STREAM SYNC: AUTO-UPDATE (2s)</span></div>
        <div className="repository-paging"><span>PAGE {page} OF {pageCount}</span><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button></div>
      </div>
      <div className="table-scroll">
        <table className="incident-table">
          <thead><tr><th><input aria-label="Select all visible incidents" type="checkbox" checked={allOnPageChecked} onChange={toggleAll} /></th><th>INCIDENT ID</th><th>TIME (UTC)</th><th>ZONE // STREAM</th><th>CLASSIFICATION</th><th>SEVERITY</th><th>CONFIDENCE</th><th>SNAPSHOT</th><th>ASSIGNEE • STATUS</th><th>ACTION</th></tr></thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className={`${selectedId === item.id ? 'is-selected ' : ''}${selectedIds.includes(item.id) ? 'is-checked' : ''}`} onClick={() => onSelect(item.id)}>
                <td onClick={(event) => event.stopPropagation()}><input aria-label={`Select ${item.id}`} type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /></td>
                <td className="mono incident-id">#{item.id}</td><td className="mono time-cell">{item.time}</td>
                <td><b>{item.zone}</b><small>// {item.camera}</small></td>
                <td><b>{item.classification}</b><small>// {item.context}</small></td>
                <td><span className={`severity-badge severity-${item.severity.toLowerCase()}`}><i />{item.severity}</span></td>
                <td className="mono confidence">{item.confidence}</td>
                <td><Snapshot incident={item} small /></td>
                <td><b>{item.assignee}</b><small className={`status-text status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</small></td>
                <td><button className="detail-button" type="button" onClick={(event) => { event.stopPropagation(); onSelect(item.id) }}>Detail <Icon name="chevron" /></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="10" className="empty-row">NO INCIDENTS MATCH THE ACTIVE QUERY</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="repository-footer">
        <div className="batch-operations"><span>BATCH OPERATIONS:</span><button className="glass-button" type="button" disabled={!checked} onClick={onAcknowledge}>Acknowledge Selected ({checked})</button><button className="glass-button" type="button" onClick={onExportTelemetry}>Export Telemetry Log</button><button className="glass-button danger-text" type="button" onClick={onPurge}>Purge Non-Audit Buffer</button></div>
        <label className="rows-select">ROWS PER PAGE: <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option>7</option><option>25</option><option>50</option><option>100</option></select></label>
      </div>
    </section>
  )
}
