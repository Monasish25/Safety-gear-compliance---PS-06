import { useEffect, useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
const REFRESH_INTERVAL = 15000

function CameraRegistry() {
  const [data, setData] = useState({ cameras: [], connected: false, loading: true })

  useEffect(() => {
    const controller = new AbortController()

    async function loadCameras() {
      try {
        const response = await fetch(`${API_BASE}/cameras`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`Backend returned ${response.status}`)
        const cameras = await response.json()
        if (!Array.isArray(cameras)) throw new Error('Backend returned an unexpected response')
        setData({ cameras, connected: true, loading: false })
      } catch (error) {
        if (error.name !== 'AbortError') setData({ cameras: [], connected: false, loading: false })
      }
    }

    loadCameras()
    const refreshTimer = window.setInterval(loadCameras, REFRESH_INTERVAL)
    return () => {
      controller.abort()
      window.clearInterval(refreshTimer)
    }
  }, [])

  const { cameras, connected, loading } = data
  const activeCount = cameras.filter((camera) => camera.is_active).length
  const visibleCameras = cameras.slice(0, 4)

  return (
    <aside className="camera-card glass-panel" aria-label="Camera registry from backend">
      <div className="camera-card__top">
        <div><span className={`status-dot${connected ? '' : ' status-dot--offline'}`} /> CAMERA REGISTRY</div>
        <span className="camera-card__count">{connected ? `${cameras.length} REGISTERED` : 'BACKEND'}</span>
      </div>
      <div className="camera-matrix" aria-live="polite">
        {loading ? <p className="camera-empty">Loading camera records…</p> : !connected ? <p className="camera-empty">Camera data is unavailable. Connect to the backend to view registered cameras.</p> : cameras.length === 0 ? <p className="camera-empty">No cameras are registered in the backend.</p> : (
          <>
            {visibleCameras.map((camera, index) => {
              const name = camera.name || camera.id || `Camera ${index + 1}`
              const location = camera.location_label || camera.id || 'Location not provided'
              return (
                <div className="camera-registry-row" key={camera.id || name}>
                  <span className="camera-registry-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="camera-registry-info"><strong>{name}</strong><small>{location}</small></span>
                  <span className={`camera-registry-state${camera.is_active ? ' is-active' : ''}`}>{camera.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
              )
            })}
            {cameras.length > visibleCameras.length && <p className="camera-more">+{cameras.length - visibleCameras.length} MORE REGISTERED CAMERAS</p>}
          </>
        )}
      </div>
      <div className="camera-card__bottom"><span>{connected ? `${activeCount} ACTIVE` : 'LIVE BACKEND DATA'}</span><span>{connected ? 'AUTO REFRESH · 15 SEC' : loading ? 'CONNECTING…' : 'NOT CONNECTED'}</span></div>
    </aside>
  )
}

export default function HeroSection({ activeView, onSelectView }) {
  return (
    <section className="hero-section" id="home">
      <div className="hero-copy">
        <div className="online-pill"><span className="status-dot status-dot--pulse" /> DEFENSE-GRID: ONLINE</div>
        <p className="hero-kicker">INDUSTRIAL INTELLIGENCE {'\u00b7'} SAFETY FIRST</p>
        <h1>Industrial Safety Monitoring <span>for Active Job Sites</span></h1>
        <p className="hero-description">A clear, real-time view of every active worksite. Detect risk earlier, coordinate response faster, and keep every shift moving safely.</p>
        <div className="hero-actions">
          <button type="button" className="button button--primary" onClick={() => onSelectView('Command overview')}>Enter Dashboard <span aria-hidden="true">{'\u2197'}</span></button>
          <button type="button" className="button button--glass" onClick={() => onSelectView('Admin view')}>Admin View</button>
          <button type="button" className="button button--glass" onClick={() => onSelectView('Safety officer view')}>Safety Officer View</button>
        </div>
        <p className="view-indicator">CURRENT VIEW <strong>{activeView}</strong></p>
      </div>
      <CameraRegistry />
    </section>
  )
}
