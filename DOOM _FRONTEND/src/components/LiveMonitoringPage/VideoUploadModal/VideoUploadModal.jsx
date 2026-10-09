import { useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export default function VideoUploadModal({ onClose, onUploadSuccess, onTriggerDemo }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setErrorMsg(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setErrorMsg(null)
    setProgress(30)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_BASE}/videos/upload`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`)
      const data = await res.json()
      setProgress(70)

      // Start pipeline processing
      const procRes = await fetch(`${API_BASE}/videos/${data.video_id}/process?camera_id=CAM_01`, {
        method: 'POST'
      })
      if (!procRes.ok) throw new Error('Failed to start vision pipeline processing')
      
      setProgress(100)
      onUploadSuccess(data.video_id, file.name)
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Error uploading video file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      zIndex: 99,
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      background: 'rgba(2, 8, 18, 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      padding: '20px'
    }}>
      <div 
        className="modal-panel glass-surface" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)',
          padding: '24px',
          background: 'rgba(12, 24, 40, 0.92)',
          border: '1px solid rgba(132, 202, 255, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 5, 16, 0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📹</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--monitor-mono, monospace)', color: '#f0f6ff' }}>
              UPLOAD FACTORY CCTV VIDEO
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Demo Video Launcher */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(2, 132, 199, 0.18) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong style={{ fontSize: '0.82rem', color: '#fff', display: 'block' }}>Use Pre-Generated Demo Footage</strong>
              <span style={{ fontSize: '0.7rem', color: 'rgba(215, 232, 250, 0.65)' }}>
                Includes compliant workers, missing helmet in Welding Zone, and Fire hazard.
              </span>
            </div>
            <button
              onClick={() => {
                onTriggerDemo()
                onClose()
              }}
              style={{
                background: 'linear-gradient(90deg, #00f0ff, #0284c7)',
                border: 'none',
                borderRadius: '8px',
                color: '#040810',
                padding: '8px 14px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ▶ LOAD DEMO
            </button>
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontFamily: 'var(--monitor-mono, monospace)' }}>
            ─── OR UPLOAD CUSTOM MP4 FILE ───
          </div>

          {/* Drag & Drop Area */}
          <label style={{
            border: '2px dashed rgba(0, 240, 255, 0.35)',
            borderRadius: '12px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: file ? 'rgba(0, 240, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}>
            <span style={{ fontSize: '2rem' }}>📁</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
              {file ? file.name : 'Click to select or drag & drop MP4 video'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(222, 234, 248, 0.55)' }}>
              Supports .mp4, .avi, .mov (sampled at 5 FPS inference rate)
            </span>
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          {errorMsg && (
            <div style={{ color: '#ff6b7b', fontSize: '0.75rem', padding: '8px 12px', background: 'rgba(255, 60, 80, 0.12)', border: '1px solid rgba(255, 60, 80, 0.3)', borderRadius: '8px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {uploading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <span>Uploading video & launching YOLO vision pipeline...</span>
                <span style={{ color: '#00f0ff', fontFamily: 'monospace' }}>{progress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #00f0ff, #00e676)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={onClose} 
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                padding: '8px 16px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              CANCEL
            </button>
            <button 
              onClick={handleUpload} 
              disabled={!file || uploading} 
              style={{
                background: (!file || uploading) ? 'rgba(0, 240, 255, 0.2)' : 'linear-gradient(90deg, #00f0ff, #0284c7)',
                border: 'none',
                borderRadius: '8px',
                color: (!file || uploading) ? 'rgba(255, 255, 255, 0.4)' : '#040810',
                padding: '8px 18px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: (!file || uploading) ? 'not-allowed' : 'pointer'
              }}
            >
              {uploading ? 'PROCESSING...' : 'START INFERENCE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
