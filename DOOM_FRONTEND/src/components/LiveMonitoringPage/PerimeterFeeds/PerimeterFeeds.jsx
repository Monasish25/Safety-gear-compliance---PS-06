import { useState, useEffect } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

const ZONES = ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D']
const TONES = ['green', 'blue', 'warning', 'purple']

function getFriendlyMeta(filename, index) {
  let place = 'CCTV Inspection Feed'
  let zoneName = ZONES[index % ZONES.length]

  if (filename.includes('factory_safety_demo')) {
    place = 'Factory Assembly Floor'
    zoneName = 'ZONE A (Assembly)'
  } else if (filename.includes('industrial_bay_cctv')) {
    place = 'Industrial Welding Bay'
    zoneName = 'ZONE B (Welding)'
  } else if (filename.includes('ppe_compliance_test')) {
    place = 'PPE Compliance Checkpoint'
    zoneName = 'ZONE C (Gate)'
  } else if (filename.includes('13751987')) {
    const idPrefix = filename.split('_')[0].slice(0, 6).toUpperCase()
    place = `Logistics High-Bay [${idPrefix}]`
    zoneName = 'ZONE D (Logistics)'
  } else {
    const clean = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    place = clean.length > 24 ? clean.slice(0, 22) + '...' : clean
  }

  return {
    id: `CAM_0${index + 1}`,
    shortZone: zoneName.split(' ')[1] || `ZONE ${index + 1}`,
    zone: zoneName,
    place,
    tone: TONES[index % TONES.length]
  }
}

export default function PerimeterFeeds({ 
  selectedFeed, 
  activeVideoUrl, 
  onSelect, 
  onAnalyseFeed,
  onOpenUploadModal 
}) {
  const [libraryFeeds, setLibraryFeeds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLibraryFeeds()
  }, [])

  async function fetchLibraryFeeds() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/videos/library`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const videos = data.videos || []
      
      const feeds = videos.map((v, idx) => {
        const meta = getFriendlyMeta(v.filename, idx)
        return {
          ...meta,
          filename: v.filename,
          size_mb: v.size_mb,
          stream_url: `${API_BASE}/videos/library/${encodeURIComponent(v.filename)}/stream`,
          process_url: v.process_url,
          status: 'LIVE FOOTAGE'
        }
      })
      setLibraryFeeds(feeds)
    } catch (e) {
      console.error('Failed to load library footage feeds:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="perimeter-section" aria-label="Connected CCTV Footage Feeds">
      <div className="perimeter-heading">
        <div>
          <p>
            CCTV FOOTAGE &amp; CAMERA FEEDS
            <span style={{ marginLeft: '8px', color: '#00f0ff', letterSpacing: '0.04em' }}>
              [{libraryFeeds.length} CONNECTED RECORDINGS]
            </span>
          </p>
          <small>
            Streams sourced directly from backend/storage/uploads • Hover to preview • Click to switch Main Feed
          </small>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="perimeter-head-btn"
            onClick={fetchLibraryFeeds}
            title="Refresh uploads library"
          >
            🔄 {loading ? 'REFRESHING...' : 'REFRESH'}
          </button>
          {onOpenUploadModal && (
            <button
              type="button"
              className="perimeter-head-btn perimeter-head-btn--accent"
              onClick={onOpenUploadModal}
              title="Open video upload and library modal"
            >
              📂 MANAGE LIBRARY
            </button>
          )}
        </div>
      </div>

      {loading && libraryFeeds.length === 0 ? (
        <p className="feed-empty-note" style={{ color: '#00f0ff' }}>
          Scanning backend/storage/uploads directory for CCTV footage clips...
        </p>
      ) : error && libraryFeeds.length === 0 ? (
        <p className="feed-empty-note" style={{ color: '#ff6978' }}>
          Error connecting to uploads library: {error}
        </p>
      ) : libraryFeeds.length > 0 ? (
        <div className="perimeter-grid">
          {libraryFeeds.map((feed) => {
            const isCurrentlyPlaying = activeVideoUrl && activeVideoUrl.includes(encodeURIComponent(feed.filename))
            const isSelected = selectedFeed?.id === feed.id || isCurrentlyPlaying

            return (
              <div
                key={feed.id}
                className={`perimeter-feed glass-surface${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelect?.(feed, false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelect?.(feed, false)
                  }
                }}
              >
                {/* Video Preview Thumbnail */}
                <div className="perimeter-image">
                  <video
                    src={feed.stream_url}
                    preload="metadata"
                    muted
                    loop
                    playsInline
                    className="perimeter-thumb-video"
                    onMouseEnter={(e) => {
                      e.currentTarget.play().catch(() => {})
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause()
                      e.currentTarget.currentTime = 0
                    }}
                  />

                  {/* Top Badges */}
                  <span className={`perimeter-status perimeter-status--${feed.tone}`}>
                    {isCurrentlyPlaying ? '● ON AIR' : feed.status}
                  </span>
                  
                  <span className="perimeter-size-pill">
                    {feed.size_mb} MB
                  </span>

                  {/* CCTV Watermark / Camera Tag */}
                  <b>{feed.id} // {feed.shortZone}</b>
                  <i className="perimeter-rec-dot" />
                </div>

                {/* Footer Info & Actions */}
                <div className="perimeter-meta-row">
                  <div className="perimeter-caption-box">
                    <span className="perimeter-caption">{feed.place}</span>
                    <span className="perimeter-filename" title={feed.filename}>
                      {feed.filename.length > 26 ? feed.filename.slice(0, 24) + '…' : feed.filename}
                    </span>
                  </div>

                  <div className="perimeter-actions">
                    <button
                      type="button"
                      className={`perimeter-btn stream-btn${isCurrentlyPlaying ? ' is-active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect?.(feed, false)
                      }}
                      title="Stream raw footage in Main Feed"
                    >
                      {isCurrentlyPlaying ? 'ACTIVE' : '▶ PLAY'}
                    </button>

                    <button
                      type="button"
                      className="perimeter-btn ai-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAnalyseFeed ? onAnalyseFeed(feed) : onSelect?.(feed, true)
                      }}
                      title="Run YOLO PPE & Hazard Detection on this footage"
                    >
                      ⚡ AI
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="feed-empty-note">
          No CCTV footage found in backend/storage/uploads. Click &quot;Manage Library&quot; to upload videos.
        </p>
      )}
    </section>
  )
}
