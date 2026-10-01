import { useEffect, useRef } from 'react'
import { useUtcTimestamp } from '../utils/liveTime.js'
import Overlay from '../Overlay/Overlay.jsx'
import CameraFeedPlaceholder from './CameraFeedPlaceholder.jsx'
import LiveDetectionPlaceholder from './LiveDetectionPlaceholder.jsx'
import DetectionContextPanel from './DetectionContextPanel.jsx'
import { detections } from '../data/monitoringDetection.js'

export default function MainFeed({ feed, view, infrared, overlays, zoom, cameraStream, cameraError, onToggleCamera, onZoom }) {
  const stamp = useUtcTimestamp()
  const cameraRef = useRef(null)
  useEffect(() => {
    if (!cameraRef.current) return
    cameraRef.current.srcObject = cameraStream || null
    if (cameraStream) cameraRef.current.play().catch(() => {})
  }, [cameraStream])
  return (
    <section className="main-feed glass-surface" id="monitor-feed">
      <div className="feed-heading">
        <div className="feed-heading__name"><span className="live-badge"><i /> {cameraStream ? 'DEVICE CAMERA' : 'DEMO FEED'}</span><h2>{feed.id} // {feed.zone} - {feed.place}</h2></div>
        <div className="codec-details"><button className="camera-source-button" type="button" onClick={onToggleCamera}>{cameraStream ? 'Disconnect camera' : 'Connect device camera'}</button><span>{cameraStream ? 'LIVE DEVICE VIDEO' : 'SAMPLE IMAGE'}</span></div>
      </div>
      <div className={`monitoring-video${infrared ? ' is-infrared' : ''}${overlays ? '' : ' overlays-hidden'}${view === 'solo' ? ' is-solo' : ''}`} style={{ '--feed-position': feed.position, '--feed-tone': feed.tone }}>
        {cameraStream && <video ref={cameraRef} className="device-camera-video" autoPlay muted playsInline aria-label="Connected device camera preview" />}
        {cameraError && <div className="camera-error" role="status">{cameraError}</div>}
        <div className="camera-noise" aria-hidden="true" />
        <div className="overlay-layer" aria-hidden={!overlays}>
          <Overlay className="worker-box worker-box--one" tag="COMPLIANT">ID: W-104 | VEST: OK | HELM: OK [97.8%]</Overlay>
          <Overlay className="worker-box worker-box--two">ID: W-089 | VEST: OK | HELM: OK [96.1%]</Overlay>
          <Overlay className="worker-box worker-box--three warning-box" tag="PPE BREACH">ID: W-211 | NO HELMET [94.2%]</Overlay>
          <Overlay className="hazard-box" tag="⚠ FIRE / THERMAL">HAZARD: SMOKE / THERMAL SPIKE [98.6%]<small>COORD: 44.82N / 12.04E • ZONE B4-EAST</small></Overlay>
          <span className="crosshair" aria-hidden="true"><i /></span>
        </div>
        {/* Camera feed placeholder — visible when no real CCTV stream is connected */}
        <CameraFeedPlaceholder cameraStream={cameraStream} cameraError={cameraError} isSelected={false} />
        {/* Live AI detection layer placeholder — visible when inference backend is not connected */}
        <LiveDetectionPlaceholder detections={detections} />
        {infrared && <div className="infrared-scale" aria-label="Infrared thermal overlay"><span>38°C</span><i /><span>78°C</span></div>}
        <div className="feed-timecode">REC <i /> {feed.id} <span>● SIGNAL STABLE</span></div>
        {zoom !== 1 && <span className="zoom-readout">ZOOM {zoom.toFixed(1)}×</span>}
        <div className="feed-bottom-bar"><span>UTC {stamp}Z</span><i /> <span>GRID: SEC-B4-BAY</span><i /> <span>OPTICAL ZOOM {zoom.toFixed(1)}X</span><i /> <span>DEMO OVERLAYS · NO AI MODEL CONNECTED</span></div>
      </div>
      <div className="feed-panel-footer"><span><i className="status-dot" /> {cameraStream ? 'LOCAL CAMERA CONNECTED' : 'SAMPLE IMAGE · DEMO ONLY'}</span><button type="button" onClick={onZoom}>OPTICAL ZOOM +</button><span className="mono-data">AI INFERENCE: NOT CONNECTED</span></div>
      {/* Detection context panel — glass panel below feed, awaiting backend integration */}
      <DetectionContextPanel feed={feed} />
    </section>
  )
}
