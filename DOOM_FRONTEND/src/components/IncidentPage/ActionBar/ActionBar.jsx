import Icon from '../Icons/Icon.jsx'

export default function ActionBar({ onClear, onHome, incidents }) {
  function exportCsv() {
    const header = ['Incident ID', 'Time UTC', 'Zone', 'Camera', 'Classification', 'Severity', 'Confidence', 'Assignee', 'Status']
    const rows = incidents.map((item) => [item.id, item.time, item.zone, item.camera, `${item.classification} / ${item.context}`, item.severity, item.confidence, item.assignee, item.status])
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.href = objectUrl
    link.download = 'vision-shield-incident-audit.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  return (
    <header className="incident-actionbar glass-surface">
      <div className="incident-actionbar__identity">
        <span className="archive-mark" aria-hidden="true"><i /></span>
        <div>
          <div className="actionbar-title-row"><h1>INCIDENT MANAGEMENT &amp; AUDIT LOG</h1><span className="classified-badge">CLASSIFIED SCADA ARCHIVE</span></div>
          <p>INCIDENT REPOSITORY STATUS: AWAITING SERVICE CONNECTION</p>
        </div>
      </div>
      <div className="incident-actionbar__buttons">
        <button className="glass-button" type="button" onClick={exportCsv}><Icon name="download" /> Export CSV</button>
        <button className="glass-button" type="button" onClick={() => window.print()}><Icon name="pdf" /> Generate PDF Audit</button>
        <button className="glass-button" type="button" onClick={onClear}><Icon name="reset" /> Clear Filters</button>
        <button className="return-home" type="button" onClick={onHome}>Home</button>
      </div>
    </header>
  )
}
