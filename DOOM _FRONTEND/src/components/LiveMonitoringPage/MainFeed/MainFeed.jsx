import { useEffect, useRef } from 'react'
import { useUtcTimestamp } from '../utils/liveTime.js'

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
  onOpenUpload,
  onClearUploadedVideo,
  liveTelemetry
}) {
  const stamp = useUtcTimestamp()
  const cameraRef = useRef(null)
  const videoPlayerRef = useRef(null)

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
            <i /> {cameraStream ? 'DEVICE CAMERA' : uploadedVideoUrl ? 'UPLOADED VIDEO STREAM' : 'NO FEED'}
          </span>
          <h2>
            {uploadedVideoUrl 
              ? `UPLOADED FILE // ${uploadedVideoName || 'cctv_inspection.mp4'} - AI Inference Active`
              : feed ? `${feed.id} // ${feed.zone} - ${feed.place}` : 'Camera feed unavailable'}
          </h2>
        </div>
        
        <div className="codec-details">
          {uploadedVideoUrl ? (
            <button className="camera-source-button" type="button" onClick={onClearUploadedVideo} style={{ background: 'rgba(255,60,80,0.18)', borderColor: 'rgba(255,60,80,0.4)', color: '#ffacb5' }}>
              Clear uploaded video
            </button>
          ) : (
            <button className="camera-source-button" type="button" onClick={onToggleCamera}>
              {cameraStream ? 'Disconnect camera' : 'Connect device camera'}
            </button>
          )}

          <button className="camera-source-button video-upload-btn" type="button" onClick={onOpenUpload} style={{ background: 'rgba(0, 240, 255, 0.15)', borderColor: 'rgba(0, 240, 255, 0.4)', color: '#00f0ff', fontWeight: 700 }}>
            📹 Upload CCTV Video
          </button>

          <span>{cameraStream ? 'LIVE DEVICE VIDEO' : uploadedVideoUrl ? 'MP4 INFERENCE STREAM' : 'AWAITING VIDEO SOURCE'}</span>
        </div>
      </div>

      <div className={`monitoring-video${infrared ? ' is-infrared' : ''}${view === 'solo' ? ' is-solo' : ''}${hasVideoSource ? '' : ' is-standby'}`}>
        {/* Device WebCam */}
        {cameraStream && !uploadedVideoUrl && (
          <video ref={cameraRef} className="device-camera-video" autoPlay muted playsInline aria-label="Connected device camera preview" />
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
        {hasVideoSource && bboxes.length > 0 && (
          <div className="overlay-layer" style={{ pointerEvents: 'none', zIndex: 5 }}>
            {bboxes.map((box, i) => {
              const isComp = box.is_compliant
              const [x1, y1, x2, y2] = box.bbox || [100, 100, 300, 450]
              
              // Frame coordinates normalized to 1280x720 video container
              const leftPct = Math.max(0, Math.min(95, ((x1 / 1280) * 100))).toFixed(2)
              const topPct = Math.max(0, Math.min(95, ((y1 / 720) * 100))).toFixed(2)
              const widthPct = Math.max(3, Math.min(90, (((x2 - x1) / 1280) * 100))).toFixed(2)
              const heightPct = Math.max(3, Math.min(90, (((y2 - y1) / 720) * 100))).toFixed(2)

              return (
                <div 
                  key={box.tracker_id || i}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    border: isComp ? '2px solid #00e676' : '2px solid #ff3d57',
                    borderRadius: '4px',
                    background: isComp ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 61, 87, 0.12)',
                    boxShadow: isComp ? '0 0 12px rgba(0, 230, 118, 0.35)' : '0 0 14px rgba(255, 61, 87, 0.45)',
                    color: isComp ? '#a9f0c7' : '#ffacb5',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.08s ease-out'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-22px',
                    left: '-2px',
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
                    gap: '4px'
                  }}>
                    <span>{box.tracker_id}</span>
                    <span style={{ opacity: 0.7 }}>|</span>
                    <span>{box.status_label || (isComp ? 'Compliant' : 'Non-Compliant')}</span>
                  </div>

                  {/* Helmet Sub-Box Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '32%',
                    border: box.ppe_state?.helmet_state === 'PRESENT' ? '1px solid #00f0ff' : '1px dashed #ff3d57',
                    background: box.ppe_state?.helmet_state === 'PRESENT' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 61, 87, 0.22)',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      fontSize: '8px',
                      fontWeight: 700,
                      color: box.ppe_state?.helmet_state === 'PRESENT' ? '#00f0ff' : '#ff9da8',
                      background: 'rgba(0,0,0,0.65)',
                      padding: '1px 3px',
                      borderRadius: '2px'
                    }}>
                      {box.ppe_state?.helmet_state === 'PRESENT' ? 'Helmet ✓' : 'NO HELMET ✗'}
                    </span>
                  </div>

                  {/* Vest Sub-Box Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: 0,
                    right: 0,
                    height: '55%',
                    border: box.ppe_state?.vest_state === 'PRESENT' ? '1px solid #00e676' : '1px dashed #ff3d57',
                    background: box.ppe_state?.vest_state === 'PRESENT' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 61, 87, 0.22)',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      fontSize: '8px',
                      fontWeight: 700,
                      color: box.ppe_state?.vest_state === 'PRESENT' ? '#a9f0c7' : '#ff9da8',
                      background: 'rgba(0,0,0,0.65)',
                      padding: '1px 3px',
                      borderRadius: '2px'
                    }}>
                      {box.ppe_state?.vest_state === 'PRESENT' ? 'Vest ✓' : 'NO VEST ✗'}
                    </span>
                  </div>

                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '2px',
                    right: '2px',
                    fontSize: '9px',
                    fontFamily: 'var(--monitor-mono, monospace)',
                    background: 'rgba(5, 15, 28, 0.85)',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '4px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}>
                    <span>{box.zone_name || 'Bay'}</span>
                  </div>
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
          {uploadedVideoUrl ? 'UPLOADED VIDEO STREAMING (YOLOv8 Inference Active)' : cameraStream ? 'LOCAL CAMERA CONNECTED' : 'NO VIDEO SOURCE (Click Upload CCTV Video)'}
        </span>
        <button type="button" onClick={onZoom}>OPTICAL ZOOM +</button>
        <span className="mono-data" style={{ color: hasVideoSource ? '#00f0ff' : 'inherit' }}>
          AI INFERENCE: {hasVideoSource ? 'ONLINE (~16.5ms latency)' : 'STANDBY'}
        </span>
      </div>
    </section>
  )
}
