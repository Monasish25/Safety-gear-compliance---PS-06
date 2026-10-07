import { useEffect, useRef } from 'react'
import { useUtcTimestamp } from '../utils/liveTime.js'
import Overlay from '../Overlay/Overlay.jsx'

export default function MainFeed({
  feed,
  view,
  infrared,
  overlays,
  zoom,
  cameraStream,
  cameraError,
  onToggleCamera,
  onZoom,
  wsFrame,
  wsDetections,
  wsConnected,
  wsFps,
  wsCamLabel,
  wsOutputFile,
}) {
  const stamp = useUtcTimestamp()
  const cameraRef = useRef(null)

  useEffect(() => {
    if (!cameraRef.current) return
    cameraRef.current.srcObject = cameraStream || null
    if (cameraStream) cameraRef.current.play().catch(() => {})
  }, [cameraStream])

  // Show WS frame when connected (and no local device camera is active)
  const showWsFrame = wsConnected && wsFrame && !cameraStream

  return (
    <section className="main-feed glass-surface" id="monitor-feed">
      <div className="feed-heading">
        <div className="feed-heading__name">
          <span className="live-badge">
            <i /> {cameraStream ? 'DEVICE CAMERA' : wsConnected ? 'AI LIVE · best.pt' : 'DEMO FEED'}
          </span>
          <h2>
            {view === '2x2'
              ? 'LIVE CCTV MATRIX // 2X2 QUAD-SPLIT (ALL 4 CAMERAS)'
              : `${feed.id} // ${wsConnected && wsCamLabel ? wsCamLabel.toUpperCase() : `${feed.zone} - ${feed.place}`}`}
          </h2>
        </div>
        <div className="codec-details">
          <button className="camera-source-button" type="button" onClick={onToggleCamera}>
            {cameraStream ? 'Disconnect camera' : 'Connect device camera'}
          </button>
          <span>{cameraStream ? 'LIVE DEVICE VIDEO' : wsConnected ? `AI MODEL · ${wsFps} FPS` : 'SAMPLE IMAGE'}</span>
        </div>
      </div>

      <div
        className={`monitoring-video${infrared ? ' is-infrared' : ''}${overlays ? '' : ' overlays-hidden'}${view === 'solo' ? ' is-solo' : ''}`}
        style={{ '--feed-position': feed.position, '--feed-tone': feed.tone }}
      >
        {/* Device camera (local getUserMedia) */}
        {cameraStream && (
          <video
            ref={cameraRef}
            className="device-camera-video"
            autoPlay
            muted
            playsInline
            aria-label="Connected device camera preview"
          />
        )}

        {/* AI model annotated frame from backend (best.pt + OpenCV) */}
        {showWsFrame && (
          <img
            src={wsFrame}
            alt="AI model annotated frame"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#040b12',
              zIndex: 0,
            }}
          />
        )}

        {cameraError && (
          <div className="camera-error" role="status">
            {cameraError}
          </div>
        )}

        <div className="camera-noise" aria-hidden="true" />

        <div className="overlay-layer" aria-hidden={!overlays}>
          {/* Static demo overlays shown only when WS is NOT connected */}
          {!wsConnected && !cameraStream && (
            <>
              <Overlay className="worker-box worker-box--one" tag="COMPLIANT">
                ID: W-104 | VEST: OK | HELM: OK [97.8%]
              </Overlay>
              <Overlay className="worker-box worker-box--two">
                ID: W-089 | VEST: OK | HELM: OK [96.1%]
              </Overlay>
              <Overlay className="worker-box worker-box--three warning-box" tag="PPE BREACH">
                ID: W-211 | NO HELMET [94.2%]
              </Overlay>
              <Overlay className="hazard-box" tag="⚠ FIRE / THERMAL">
                HAZARD: SMOKE / THERMAL SPIKE [98.6%]
                <small>COORD: 44.82N / 12.04E • ZONE B4-EAST</small>
              </Overlay>
            </>
          )}
          <span className="crosshair" aria-hidden="true">
            <i />
          </span>
        </div>

        {infrared && (
          <div className="infrared-scale" aria-label="Infrared thermal overlay">
            <span>38°C</span>
            <i />
            <span>78°C</span>
          </div>
        )}

        <div className="feed-timecode">
          REC <i /> {view === '2x2' ? 'QUAD-2X2' : feed.id}{' '}
          <span>● {wsConnected ? 'AI MODEL CONNECTED · BEST.PT' : 'SIGNAL STABLE'}</span>
        </div>

        {zoom !== 1 && <span className="zoom-readout">ZOOM {zoom.toFixed(1)}×</span>}

        <div className="feed-bottom-bar">
          <span>UTC {stamp}Z</span>
          <i />
          <span>GRID: {view === '2x2' ? 'QUAD-MATRIX' : `SEC-${feed.id}`}</span>
          <i />
          <span>OPTICAL ZOOM {zoom.toFixed(1)}X</span>
          <i />
          <span>
            {wsConnected
              ? `AI MODEL · best.pt · ${wsFps} FPS · REC ACTIVE`
              : 'DEMO OVERLAYS · AI MODEL CONNECTING...'}
          </span>
        </div>
      </div>

      <div className="feed-panel-footer">
        <span>
          <i className="status-dot" />{' '}
          {cameraStream
            ? 'LOCAL CAMERA CONNECTED'
            : wsConnected
            ? `AI MODEL LIVE · ${view === '2x2' ? '2X2 QUAD' : wsCamLabel || feed.id}`
            : 'DEMO MODE'}
        </span>
        <button type="button" onClick={onZoom}>
          OPTICAL ZOOM +
        </button>
        <span className="mono-data">
          {wsConnected
            ? `AI INFERENCE: ONLINE · best.pt · ${wsFps} FPS`
            : 'AI INFERENCE: CONNECTING...'}
        </span>
      </div>
    </section>
  )
}
