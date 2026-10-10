import { useCallback, useEffect, useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
const REFRESH_INTERVAL = 15000

const classifierTypes = [
  { id: '01', title: 'PPE Detection', type: 'PPE COMPLIANCE', description: 'Helmet and vest events reported by the backend.', events: ['MISSING_HELMET', 'MISSING_VEST'] },
  { id: '02', title: 'Smoke Detection', type: 'ATMOSPHERIC HAZARD', description: 'Smoke alerts recorded by the vision pipeline.', events: ['SMOKE_DETECTED'] },
  { id: '03', title: 'Fire Detection', type: 'THERMAL HAZARD', description: 'Fire alerts recorded by the vision pipeline.', events: ['FIRE_DETECTED'] },
]

async function fetchJson(path, signal) {
  const response = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Backend returned ${response.status}`)
  return response.json()
}

function assetUrl(path) {
  if (!path || /^https?:\/\//i.test(path) || API_BASE.startsWith('/')) return path
  return new URL(path, API_BASE).toString()
}

function summarize(classifier, events) {
  const matchingEvents = events.filter((event) => classifier.events.includes(String(event.event_type).toUpperCase()))
  const latest = matchingEvents[0] || null
  return { count: matchingEvents.length, latest }
}

function confidenceLabel(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${Math.round(value <= 1 ? value * 100 : value)}%`
}

function timestampLabel(value) {
  if (!value) return 'No event recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString()
}

function ClassifierCard({ classifier, cameras, events, connected, loading }) {
  const { count, latest } = summarize(classifier, events)
  const activeCameraCount = cameras.filter((camera) => camera.is_active).length

  return (
    <article className="classifier-card glass-panel" aria-label={`${classifier.title} backend data`}>
      <div className="classifier-card__heading">
        <div><span className="classifier-index">{classifier.id}</span><span className="classifier-type">{classifier.type}</span></div>
        <span className={`active-state${connected ? '' : ' is-offline'}`}><i />{connected ? 'API CONNECTED' : 'API OFFLINE'}</span>
      </div>
      <div className="classifier-preview classifier-data-preview">
        {latest?.snapshot_url && <img className="classifier-event-image" src={assetUrl(latest.snapshot_url)} alt={`Backend evidence for ${classifier.title}`} onError={(event) => { event.currentTarget.hidden = true }} />}
        <div className="classifier-data-summary">
          {loading && <span className="classifier-data-message">Loading backend records…</span>}
          {!loading && !connected && <span className="classifier-data-message">Backend data is unavailable. Check the API connection.</span>}
          {!loading && connected && <>
            <div className="classifier-data-metrics">
              <div><strong>{count}</strong><span>matching events · latest 200</span></div>
              <div><strong>{activeCameraCount}</strong><span>active cameras</span></div>
              <div><strong>{confidenceLabel(latest?.confidence)}</strong><span>latest confidence</span></div>
            </div>
            <span className="classifier-data-latest">{latest ? `${latest.event_type.replaceAll('_', ' ')} · ${latest.camera_id} · ${timestampLabel(latest.started_at)}` : 'No matching detections in backend records'}</span>
          </>}
        </div>
      </div>
      <div className="classifier-card__footer">
        <div><h3>{classifier.title}</h3><p>{classifier.description}</p></div>
        {latest?.snapshot_url && <span className="classifier-arrow" aria-hidden="true">↗</span>}
      </div>
    </article>
  )
}

export default function Classifiers() {
  const [backendData, setBackendData] = useState({ cameras: [], events: [], connected: false })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadBackendData = useCallback(async (signal) => {
    try {
      const [cameras, events] = await Promise.all([
        fetchJson('/cameras', signal),
        fetchJson('/events?limit=200', signal),
      ])
      if (!Array.isArray(cameras) || !Array.isArray(events)) throw new Error('Backend returned an unexpected response')
      setBackendData({ cameras, events, connected: true })
    } catch (error) {
      if (error.name !== 'AbortError') setBackendData({ cameras: [], events: [], connected: false })
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    loadBackendData(controller.signal)
    const refreshTimer = window.setInterval(() => loadBackendData(controller.signal), REFRESH_INTERVAL)
    return () => {
      controller.abort()
      window.clearInterval(refreshTimer)
    }
  }, [loadBackendData, refreshKey])

  return (
    <section className="section-block" id="monitoring">
      <div className="section-heading">
        <div><p className="section-eyebrow">PERCEPTION LAYER · BACKEND DATA</p><h2>Computer Vision Classifier Activity</h2></div>
        <div className="classifier-section-actions">
          <span className={`classifier-connection${backendData.connected ? ' is-connected' : ''}`} role="status">{loading ? 'CONNECTING…' : backendData.connected ? 'LIVE BACKEND DATA' : 'BACKEND UNAVAILABLE'}</span>
          <button className="text-link classifier-refresh" type="button" onClick={() => setRefreshKey((key) => key + 1)}>Refresh data</button>
        </div>
      </div>
      <div className="classifier-grid">
        {classifierTypes.map((classifier) => <ClassifierCard key={classifier.id} classifier={classifier} cameras={backendData.cameras} events={backendData.events} connected={backendData.connected} loading={loading} />)}
      </div>
    </section>
  )
}
