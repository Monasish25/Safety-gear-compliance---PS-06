import { useState, useEffect } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

const TAB = { DEMO: 'demo', LIBRARY: 'library', UPLOAD: 'upload' }

export default function VideoUploadModal({ onClose, onUploadSuccess, onTriggerDemo }) {
  const [activeTab, setActiveTab] = useState(TAB.LIBRARY)

  // Upload tab state
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState(null)

  // Library tab state
  const [libraryVideos, setLibraryVideos] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState(null)
  const [processingId, setProcessingId] = useState(null) // filename being processed

  // Fetch library on tab open
  useEffect(() => {
    if (activeTab === TAB.LIBRARY) fetchLibrary()
  }, [activeTab])

  async function fetchLibrary() {
    setLibraryLoading(true)
    setLibraryError(null)
    try {
      const res = await fetch(`${API_BASE}/videos/library`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLibraryVideos(data.videos || [])
    } catch (e) {
      setLibraryError(`Could not load video library: ${e.message}`)
    } finally {
      setLibraryLoading(false)
    }
  }

  async function handleStreamLibraryVideo(video) {
    // Stream directly without processing (raw playback)
    onUploadSuccess(`library__${encodeURIComponent(video.filename)}`, video.filename)
    onClose()
  }

  async function handleProcessLibraryVideo(video) {
    setProcessingId(video.filename)
    try {
      const res = await fetch(`${API_BASE}/videos/library/${encodeURIComponent(video.filename)}/process`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      onUploadSuccess(data.video_id, video.filename)
      onClose()
    } catch (e) {
      setLibraryError(`Failed to start inference: ${e.message}`)
      setProcessingId(null)
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadProgress(30)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_BASE}/videos/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`)
      const data = await res.json()
      setUploadProgress(70)

      const procRes = await fetch(`${API_BASE}/videos/${data.video_id}/process?camera_id=CAM_01`, { method: 'POST' })
      if (!procRes.ok) throw new Error('Failed to start vision pipeline processing')

      setUploadProgress(100)
      onUploadSuccess(data.video_id, file.name)
      onClose()
    } catch (err) {
      setUploadError(err.message || 'Error uploading video file')
    } finally {
      setUploading(false)
    }
  }

  // ── styles ────────────────────────────────────────────────────────────────
  const S = {
    backdrop: {
      position: 'fixed', zIndex: 99, inset: 0, display: 'grid', placeItems: 'center',
      background: 'rgba(2, 8, 18, 0.85)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', padding: '20px'
    },
    panel: {
      width: 'min(620px, 100%)', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      background: 'rgba(10, 20, 38, 0.96)', border: '1px solid rgba(132, 202, 255, 0.22)',
      borderRadius: '18px', boxShadow: '0 24px 60px rgba(0,5,16,0.6)', overflow: 'hidden'
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 22px 0', flexShrink: 0
    },
    tabs: {
      display: 'flex', gap: '4px', padding: '14px 22px 0', borderBottom: '1px solid rgba(255,255,255,0.09)', flexShrink: 0
    },
    tab: (active) => ({
      padding: '7px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'monospace',
      background: active ? 'rgba(0,240,255,0.14)' : 'transparent',
      color: active ? '#00f0ff' : 'rgba(255,255,255,0.45)',
      borderBottom: active ? '2px solid #00f0ff' : '2px solid transparent',
      transition: 'all 0.18s ease'
    }),
    body: { padding: '20px 22px', overflowY: 'auto', flex: 1 },
    demoCard: {
      background: 'linear-gradient(135deg, rgba(0,240,255,0.08), rgba(2,132,199,0.15))',
      border: '1px solid rgba(0,240,255,0.28)', borderRadius: '12px', padding: '16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
    },
    primaryBtn: {
      background: 'linear-gradient(90deg, #00f0ff, #0284c7)', border: 'none',
      borderRadius: '8px', color: '#040810', padding: '8px 16px',
      fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap'
    },
    ghostBtn: {
      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px', color: '#fff', padding: '8px 14px',
      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
    },
    videoRow: {
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
      borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)', marginBottom: '8px',
      transition: 'background 0.15s'
    },
    badge: (color) => ({
      fontSize: '0.62rem', padding: '2px 7px', borderRadius: '4px', fontWeight: 700,
      fontFamily: 'monospace', letterSpacing: '0.04em',
      background: `rgba(${color}, 0.18)`, color: `rgb(${color})`
    })
  }

  function sizeColor(mb) {
    if (mb < 2) return '120,200,120'
    if (mb < 8) return '255,200,60'
    return '80,190,255'
  }

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>📹</span>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: '#f0f6ff', letterSpacing: '0.06em' }}>
              VIDEO FEED SELECTOR
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {[
            { key: TAB.LIBRARY, label: '📂 LIBRARY' },
            { key: TAB.DEMO,    label: '⚡ DEMO' },
            { key: TAB.UPLOAD,  label: '⬆ UPLOAD' },
          ].map(t => (
            <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── LIBRARY TAB ─────────────────────────── */}
          {activeTab === TAB.LIBRARY && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                  {libraryLoading ? 'Scanning uploads...' : `${libraryVideos.length} video${libraryVideos.length !== 1 ? 's' : ''} in storage/uploads`}
                </span>
                <button style={S.ghostBtn} onClick={fetchLibrary} title="Refresh library">↻ REFRESH</button>
              </div>

              {libraryError && (
                <div style={{ color: '#ff6b7b', fontSize: '0.75rem', padding: '8px 12px', background: 'rgba(255,60,80,0.1)', border: '1px solid rgba(255,60,80,0.28)', borderRadius: '8px', marginBottom: '8px' }}>
                  ⚠ {libraryError}
                </div>
              )}

              {libraryLoading && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px', animation: 'spin 1s linear infinite' }}>⟳</div>
                  Loading video library...
                </div>
              )}

              {!libraryLoading && libraryVideos.length === 0 && !libraryError && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                  No videos found in storage/uploads.<br />
                  <span style={{ fontSize: '0.65rem' }}>Upload a video using the UPLOAD tab or run the backend pipeline first.</span>
                </div>
              )}

              {!libraryLoading && libraryVideos.map(video => {
                const isProcessing = processingId === video.filename
                // Strip UUID prefix if present (UUID_filename.mp4 → filename.mp4)
                const displayName = video.filename.replace(/^[0-9a-f-]{36}_/, '')

                return (
                  <div key={video.filename} style={S.videoRow}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎬</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e8f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayName}>
                        {displayName}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '3px', alignItems: 'center' }}>
                        <span style={S.badge(sizeColor(video.size_mb))}>{video.size_mb} MB</span>
                        <span style={S.badge('180,180,180')}>MP4</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleStreamLibraryVideo(video)}
                        style={{ ...S.ghostBtn, fontSize: '0.67rem', padding: '5px 10px' }}
                        title="Play raw video (no inference)"
                      >
                        ▶ PLAY
                      </button>
                      <button
                        onClick={() => handleProcessLibraryVideo(video)}
                        disabled={isProcessing}
                        style={{
                          ...S.primaryBtn, fontSize: '0.67rem', padding: '5px 10px',
                          opacity: isProcessing ? 0.6 : 1,
                          cursor: isProcessing ? 'wait' : 'pointer'
                        }}
                        title="Run YOLO PPE + FireSmoke inference pipeline"
                      >
                        {isProcessing ? '⟳ QUEUING...' : '⚡ ANALYSE'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── DEMO TAB ─────────────────────────────── */}
          {activeTab === TAB.DEMO && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={S.demoCard}>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block', marginBottom: '4px' }}>Pre-Generated Factory Demo</strong>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(215,232,250,0.6)', lineHeight: 1.5 }}>
                    Includes compliant workers, missing helmet violations in Welding Zone, and a Fire hazard scenario. Renders ~16 seconds of synthetic CCTV footage.
                  </span>
                </div>
                <button
                  onClick={() => { onTriggerDemo(); onClose() }}
                  style={{ ...S.primaryBtn, padding: '10px 18px' }}
                >
                  ▶ LOAD DEMO
                </button>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', margin: 0 }}>
                The demo generates a synthetic factory video on-the-fly and immediately runs the full YOLO PPE + FireSmoke inference pipeline. Live alerts will appear in the Threat Stream panel.
              </p>
            </div>
          )}

          {/* ── UPLOAD TAB ───────────────────────────── */}
          {activeTab === TAB.UPLOAD && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{
                border: '2px dashed rgba(0,240,255,0.32)', borderRadius: '12px', padding: '28px 20px',
                textAlign: 'center', cursor: 'pointer',
                background: file ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.02)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
              }}>
                <span style={{ fontSize: '2rem' }}>📁</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                  {file ? file.name : 'Click to select or drag & drop MP4 video'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(222,234,248,0.5)' }}>
                  Supports .mp4, .avi, .mov (sampled at 5 FPS inference rate)
                </span>
                <input type="file" accept="video/*" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setUploadError(null) } }} style={{ display: 'none' }} />
              </label>

              {uploadError && (
                <div style={{ color: '#ff6b7b', fontSize: '0.75rem', padding: '8px 12px', background: 'rgba(255,60,80,0.12)', border: '1px solid rgba(255,60,80,0.3)', borderRadius: '8px' }}>
                  ⚠️ {uploadError}
                </div>
              )}

              {uploading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Uploading & launching YOLO vision pipeline...</span>
                    <span style={{ color: '#00f0ff', fontFamily: 'monospace' }}>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #00f0ff, #00e676)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button onClick={onClose} style={S.ghostBtn}>CANCEL</button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  style={{ ...S.primaryBtn, opacity: (!file || uploading) ? 0.4 : 1, cursor: (!file || uploading) ? 'not-allowed' : 'pointer' }}
                >
                  {uploading ? 'PROCESSING...' : 'START INFERENCE'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
