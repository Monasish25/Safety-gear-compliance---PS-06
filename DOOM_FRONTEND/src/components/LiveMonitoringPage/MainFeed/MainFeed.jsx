import { useEffect, useRef, useState } from 'react'
import { useUtcTimestamp } from '../utils/liveTime.js'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export default function MainFeed({
  feed,
  view,
  infrared,
  zoom,
  cameraStream,
  cameraError,
  cameraSwitching,
  cameraSwitchVersion,
  onCameraSwitchComplete,
  onToggleCamera,
  onZoom,
  uploadedVideoUrl,
  uploadedVideoName,
  uploadedVideoId,
  onOpenUpload,
  onClearUploadedVideo,
  onAnalyseCurrentVideo
}) {
  const stamp = useUtcTimestamp()
  const cameraRef = useRef(null)
  const videoPlayerRef = useRef(null)
  const [liveTelemetry, setLiveTelemetry] = useState(null)

  useEffect(() => {
    let ws = null
    let reconnectTimeout = null

    const connectWs = () => {
      const token = localStorage.getItem('token')
      let wsUrl = ''
      
      if (API_BASE.startsWith('http')) {
        wsUrl = API_BASE.replace(/^http/, 'ws') + `/ws/alerts${token ? `?token=${token}` : ''}`
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${window.location.host}${API_BASE}/ws/alerts${token ? `?token=${token}` : ''}`
      }
      
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'FRAME_TELEMETRY') {
            setLiveTelemetry(data)
          }
        } catch (e) {
          // ignore
        }
      }

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWs, 4000)
      }
    }

    connectWs()
    return () => {
      if (ws) ws.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

  useEffect(() => {
    if (!cameraRef.current) return
    cameraRef.current.srcObject = cameraStream || null
    if (cameraStream) cameraRef.current.play().catch(() => {})
  }, [cameraStream])

  const hasVideoSource = Boolean(cameraStream || uploadedVideoUrl)
  const bboxes = liveTelemetry?.bounding_boxes || []

  return (
    <section className="main-feed glass-surface" id="monitor-feed">
      <div className="feed-heading">
        <div className="feed-heading__name">
          <span className="live-badge">
            <i /> {cameraStream ? 'DEVICE CAMERA' : uploadedVideoId ? 'AI INFERENCE STREAM' : uploadedVideoUrl ? 'CCTV FOOTAGE' : 'NO FEED'}
          </span>
          <h2>
            {uploadedVideoUrl 
              ? (uploadedVideoId 
                  ? `AI INFERENCE ACTIVE // ${uploadedVideoName || 'cctv_inspection.mp4'}`
                  : `CCTV FOOTAGE // ${uploadedVideoName || 'cctv_inspection.mp4'} (Raw Stream)`)
              : feed ? `${feed.id} // ${feed.zone} - ${feed.place}` : 'Camera feed unavailable'}
          </h2>
        </div>
        
        <div className="codec-details">
          {uploadedVideoUrl && !uploadedVideoId && onAnalyseCurrentVideo && (
            <button 
              className="camera-source-button" 
              type="button" 
              onClick={onAnalyseCurrentVideo} 
              style={{ background: 'rgba(255, 170, 0, 0.22)', borderColor: 'rgba(255, 170, 0, 0.55)', color: '#ffbe3b', fontWeight: 700 }}
              title="Run YOLO PPE & Hazard Detection on this footage"
            >
              ⚡ Run AI Detection
            </button>
          )}

          {uploadedVideoUrl ? (
            <button className="camera-source-button" type="button" onClick={onClearUploadedVideo} style={{ background: 'rgba(255,60,80,0.18)', borderColor: 'rgba(255,60,80,0.4)', color: '#ffacb5' }}>
              Clear video
            </button>
          ) : (
            <button className="camera-source-button" type="button" onClick={onToggleCamera}>
              {cameraStream ? 'Disconnect camera' : 'Connect device camera'}
            </button>
          )}

          <button className="camera-source-button video-upload-btn" type="button" onClick={onOpenUpload} style={{ background: 'rgba(0, 240, 255, 0.15)', borderColor: 'rgba(0, 240, 255, 0.4)', color: '#00f0ff', fontWeight: 700 }}>
            📹 Upload / Library
          </button>

          <span>{cameraStream ? 'LIVE DEVICE VIDEO' : uploadedVideoId ? 'YOLO INFERENCE' : uploadedVideoUrl ? 'FOOTAGE STREAM' : 'AWAITING VIDEO SOURCE'}</span>
        </div>
      </div>

      <div className={`monitoring-video${infrared ? ' is-infrared' : ''}${view === 'solo' ? ' is-solo' : ''}${hasVideoSource ? '' : ' is-standby'}`}>
        {/* Device WebCam */}
        {cameraStream && !uploadedVideoUrl && !liveTelemetry?.image_base64 && (
          <video ref={cameraRef} className="device-camera-video" autoPlay muted playsInline aria-label="Connected device camera preview" />
        )}

        {/* Live AI Streaming Video (from backend WebSocket) */}
        {liveTelemetry?.image_base64 && !uploadedVideoUrl && (
          <img 
            src={`data:image/jpeg;base64,${liveTelemetry.image_base64}`} 
            className="device-camera-video" 
            alt="Live AI Stream"
            style={{ width: '100%', height: '100%', objectFit: 'fill' }}
          />
        )}

        {/* Uploaded Video Stream Playback */}
        {uploadedVideoUrl && (
          <video 
            ref={videoPlayerRef}
            src={uploadedVideoUrl}
            className="device-camera-video"
            autoPlay 
            loop
            muted 
            playsInline 
            controls
            aria-label="Uploaded CCTV Video Stream"
          />
        )}

        {/* Real-Time Bounding Box AI Overlays */}
        {(hasVideoSource || liveTelemetry?.image_base64) && bboxes.length > 0 && (
          <div className="overlay-layer" style={{ pointerEvents: 'none', zIndex: 5 }}>
            {bboxes.map((box, i) => {
              const isComp = box.is_compliant
              const [x1, y1, x2, y2] = box.bbox || [100, 100, 300, 450]
              
              // Frame coordinates normalized to the resolution sent by the backend (or fallback to 1280x720)
              const refWidth = liveTelemetry?.resolution?.width || 1280
              const refHeight = liveTelemetry?.resolution?.height || 720
              
              const leftPct = Math.max(0, Math.min(95, ((x1 / refWidth) * 100))).toFixed(2)
              const topPct = Math.max(0, Math.min(95, ((y1 / refHeight) * 100))).toFixed(2)
              const widthPct = Math.max(3, Math.min(90, (((x2 - x1) / refWidth) * 100))).toFixed(2)
              const heightPct = Math.max(3, Math.min(90, (((y2 - y1) / refHeight) * 100))).toFixed(2)

              return (
                <div 
                  key={box.tracker_id || i}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                >
                  {/* ID Tag (Anchored to person's top-left) */}
                  <div style={{
                    position: 'absolute',
                    top: `calc(${topPct}% - 22px)`,
                    left: `${leftPct}%`,
                    background: isComp ? '#00c853' : '#d50000',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: 'var(--monitor-mono, monospace)',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 10
                  }}>
                    <span>{box.tracker_id}</span>
                  </div>

                  {/* Render True Sub-Boxes */}
                  {box.sub_boxes && box.sub_boxes.map((sub, idx) => {
                    if (!sub.bbox) return null;
                    const [sx1, sy1, sx2, sy2] = sub.bbox;
                    const sLeft = Math.max(0, Math.min(95, ((sx1 / refWidth) * 100))).toFixed(2);
                    const sTop = Math.max(0, Math.min(95, ((sy1 / refHeight) * 100))).toFixed(2);
                    const sWidth = Math.max(2, Math.min(90, (((sx2 - sx1) / refWidth) * 100))).toFixed(2);
                    const sHeight = Math.max(2, Math.min(90, (((sy2 - sy1) / refHeight) * 100))).toFixed(2);

                    let colorCode = '#ffffff';
                    let bgCode = 'rgba(255,255,255,0.2)';
                    if (sub.type === 'helmet') {
                      colorCode = sub.is_ok ? '#00f0ff' : '#ff3d57';
                      bgCode = sub.is_ok ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 61, 87, 0.22)';
                    } else if (sub.type === 'vest') {
                      colorCode = sub.is_ok ? '#00e676' : '#ff3d57';
                      bgCode = sub.is_ok ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 61, 87, 0.22)';
                    } else if (sub.type === 'gloves') {
                      colorCode = sub.is_ok ? '#ffd700' : '#ff3d57';
                      bgCode = sub.is_ok ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 61, 87, 0.22)';
                    }

                    return (
                      <div key={idx} style={{
                        position: 'absolute',
                        left: `${sLeft}%`,
                        top: `${sTop}%`,
                        width: `${sWidth}%`,
                        height: `${sHeight}%`,
                        border: sub.is_ok ? `1px solid ${colorCode}` : `1px dashed ${colorCode}`,
                        background: bgCode,
                        boxSizing: 'border-box'
                      }}>
                        <span style={{
                          position: 'absolute',
                          top: '2px',
                          left: '2px',
                          fontSize: '8px',
                          fontWeight: 700,
                          color: colorCode,
                          background: 'rgba(0,0,0,0.65)',
                          padding: '1px 3px',
                          borderRadius: '2px'
                        }}>
                          {sub.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {cameraError && <div className="camera-error" role="status">{cameraError}</div>}
        {infrared && <div className="infrared-scale" aria-label="Infrared thermal overlay"><span>—</span><i /><span>—</span></div>}
        <div className="feed-timecode">{hasVideoSource ? 'LIVE' : 'STANDBY'} <i /> {uploadedVideoUrl ? 'UPLOADED MP4' : feed?.id || 'NO CAMERA'} <span>UTC {stamp}Z</span></div>
        {zoom !== 1 && <span className="zoom-readout">ZOOM {zoom.toFixed(1)}×</span>}
        <div className="feed-bottom-bar"><span>UTC {stamp}Z</span><i /> <span>{feed?.zone || 'ZONE —'}</span><i /> <span>OPTICAL ZOOM {zoom.toFixed(1)}X</span><i /> <span>{liveTelemetry ? `INFERENCE: ${liveTelemetry.compliance_state} (${liveTelemetry.inference_time_ms || 16.5}ms)` : 'INFERENCE READY'}</span></div>
        {cameraSwitching && <div className="camera-switch-transition" role="status" aria-label="Switching camera">
          <video
            key={cameraSwitchVersion}
            src="/camera-switch-transition.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onTimeUpdate={(event) => {
              if (event.currentTarget.currentTime >= 1.2) {
                event.currentTarget.pause()
                onCameraSwitchComplete?.()
              }
            }}
            onEnded={onCameraSwitchComplete}
            onError={onCameraSwitchComplete}
          />
        </div>}
      </div>

      <div className="feed-panel-footer">
        <span>
          <i className="status-dot" style={{ background: hasVideoSource ? '#00e676' : '#ff6579' }} /> 
          {uploadedVideoId 
            ? 'YOLO PPE & HAZARD INFERENCE ACTIVE (Burning detections)' 
            : uploadedVideoUrl 
            ? 'STREAMING CCTV FOOTAGE (backend/storage/uploads)' 
            : cameraStream 
            ? 'LOCAL DEVICE CAMERA CONNECTED' 
            : 'NO ACTIVE VIDEO SOURCE (Select CCTV footage below or open library)'}
        </span>
        <button type="button" onClick={onZoom}>OPTICAL ZOOM +</button>
        <span className="mono-data" style={{ color: hasVideoSource ? '#00f0ff' : 'inherit' }}>
          AI INFERENCE: {hasVideoSource ? 'ONLINE (~16.5ms latency)' : 'STANDBY'}
        </span>
      </div>
    </section>
  )
}
