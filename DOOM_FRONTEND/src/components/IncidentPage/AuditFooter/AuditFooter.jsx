export default function AuditFooter({ connected = true }) {
  return <footer className="incident-footer"><span>VISION SHIELD <i style={{ background: connected ? '#10b981' : '#f59e0b' }} /> INCIDENT SERVICE: {connected ? 'ACTIVE & AUDITED' : 'CONNECTING...'}</span><span>© VISION SHIELD INDUSTRIAL DEFENSE SYSTEMS.</span></footer>
}
