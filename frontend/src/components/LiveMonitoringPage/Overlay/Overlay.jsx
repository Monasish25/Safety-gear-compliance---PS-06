export default function Overlay({ className, children, tag }) {
  return <div className={`ai-overlay ${className}`}><span>{children}</span>{tag && <b>{tag}</b>}</div>
}
