import './Loader.css'

export default function Loader({ size = 200, label = 'Loading' }) {
  return (
    <div className="loader-status" role="status" aria-label={label} style={{ '--loader-size': `${size}px` }}>
      <span className="loader" aria-hidden="true" />
    </div>
  )
}
