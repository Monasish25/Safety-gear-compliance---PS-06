export default function Toast({ toast, onDismiss }) {
  if (!toast) return null
  return <div className="monitor-toast" role="status"><span>✓</span><div><b>ACTION CONFIRMED</b><small>{toast}</small></div><button type="button" aria-label="Dismiss notification" onClick={onDismiss}>×</button></div>
}
