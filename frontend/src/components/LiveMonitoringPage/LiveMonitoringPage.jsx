import { useEffect, useRef, useState } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
import { feedList, initialThreats, randomThreats } from './data/monitorData.js'
import { formatUtc } from './utils/liveTime.js'
import { useDetectionWS } from './utils/useDetectionWS.js'
import NavbarClock from './NavbarClock/NavbarClock.jsx'
import StatCards from './StatsBar/StatsBar.jsx'
import ZoneControls from './ZoneControls/ZoneControls.jsx'
import MainFeed from './MainFeed/MainFeed.jsx'
import PerimeterFeeds from './PerimeterFeeds/PerimeterFeeds.jsx'
import ThreatStream from './ThreatStream/ThreatStream.jsx'
import ZoneStatus from './ZoneStatus/ZoneStatus.jsx'
import MonitorFooter from './Footer/Footer.jsx'
import PtzConsole from './PtzConsole/PtzConsole.jsx'
import Toast from './Toast/Toast.jsx'
import './LiveMonitoringPage.css'

export default function LiveMonitoringPage({ user, onHome, onIncidents, onAnalytics, onHow, onSignOut }) {
  const [muted, setMuted] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [activeZone, setActiveZone] = useState(0)
  const [view, setView] = useState('2x2')
  const [infrared, setInfrared] = useState(false)
  const [overlays, setOverlays] = useState(true)
  const [ptzOpen, setPtzOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [selectedFeed, setSelectedFeed] = useState(feedList[0])
  const [threats, setThreats] = useState(initialThreats)
  const [hideResolved, setHideResolved] = useState(false)
  const [toast, setToast] = useState('')
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const streamRef = useRef(null)
  const toastTimer = useRef(null)
  const nextThreatId = useRef(8822)
  const clock = <NavbarClock />

  // ── WebSocket live inference — streams 2X2 quad matrix or selected camera via best.pt ─
  const activeCamId = view === '2x2' ? '2X2' : selectedFeed.id
  const {
    connected: wsConnected,
    fps: wsFps,
    frame: wsFrame,
    detections: wsDetections,
    threats: wsThreats,
    camLabel: wsCamLabel,
    outputFile: wsOutputFile,
  } = useDetectionWS({ camId: activeCamId })

  // Merge real WS threats into the threat stream when they arrive
  useEffect(() => {
    if (wsThreats.length === 0) return
    setThreats((current) => [...wsThreats, ...current].slice(0, 20))
  }, [wsThreats])

  // Keep the demo random-threat ticker only when the WS is not connected
  useEffect(() => {
    if (wsConnected) return
    const timer = window.setInterval(() => {
      const sample = randomThreats[Math.floor(Math.random() * randomThreats.length)]
      const now = new Date()
      const time = `${formatUtc(now)} UTC`
      setThreats((current) => [
        { ...sample, id: `THR-${nextThreatId.current++}`, time, key: `${now.getTime()}-${Math.random()}` },
        ...current,
      ].slice(0, 12))
    }, 8000)
    return () => window.clearInterval(timer)
  }, [wsConnected])

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = 0
  }, [threats])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  useEffect(() => () => cameraStream?.getTracks().forEach((track) => track.stop()), [cameraStream])

  async function toggleDeviceCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
      setCameraError('')
      notify('Device camera disconnected')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access requires HTTPS or localhost in a supported browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      setCameraError('')
      setCameraStream(stream)
      notify('Device camera connected. AI boxes remain demo overlays.')
    } catch (error) {
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings.'
          : `Camera unavailable: ${error.message}`
      )
    }
  }

  function notify(message) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3800)
  }

  function handleAction(action, threat) {
    if (!window.confirm(`${action} for ${threat.title} at ${threat.location.replace('LOCATION: ', '')}?`)) return
    notify(`${action} sent · ${threat.id}`)
  }

  function exportStream() {
    const csv = [
      'ID,SEVERITY,TIME,LOCATION,EVENT',
      ...threats.map((item) => `${item.id},${item.kind},${item.time},"${item.location}","${item.title}"`),
    ].join('\r\n')
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.href = objectUrl
    link.download = 'safewatch-live-threat-stream.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    notify('Threat stream CSV exported')
  }

  function emergencyBroadcast() {
    setBroadcasting((active) => !active)
    notify(broadcasting ? 'Emergency broadcast cancelled' : 'Emergency broadcast activated')
  }

  return (
    <div className="monitor-page min-h-screen text-white">
      <div className="monitor-nav">
        <Navbar
          user={user}
          activePage="live"
          onOpenHome={onHome}
          onOpenLive={() => {}}
          onOpenIncidents={onIncidents}
          onOpenAnalytics={onAnalytics}
          onOpenHow={onHow}
          onSignOut={onSignOut}
          broadcasting={broadcasting}
          onBroadcast={emergencyBroadcast}
          utcTime={clock}
          muted={muted}
          onToggleMute={() => setMuted((value) => !value)}
        />
      </div>
      <main className="monitor-main">
        <StatCards />
        <ZoneControls
          activeZone={activeZone}
          setActiveZone={setActiveZone}
          view={view}
          setView={setView}
          onPtz={() => setPtzOpen((value) => !value)}
          ir={infrared}
          setIr={setInfrared}
          overlays={overlays}
          setOverlays={setOverlays}
        />
        <div className="monitor-workspace">
          <div className="monitor-left-column">
            <MainFeed
              feed={selectedFeed}
              view={view}
              infrared={infrared}
              overlays={overlays}
              zoom={zoom}
              cameraStream={cameraStream}
              cameraError={cameraError}
              onToggleCamera={toggleDeviceCamera}
              onZoom={() => setZoom((value) => Math.min(4, value + 0.1))}
              wsFrame={wsFrame}
              wsDetections={wsDetections}
              wsConnected={wsConnected}
              wsFps={wsFps}
              wsCamLabel={wsCamLabel}
              wsOutputFile={wsOutputFile}
            />
            <PerimeterFeeds
              selectedFeed={selectedFeed}
              onSelect={(feed) => {
                setSelectedFeed(feed)
                setView('solo')
                setZoom(1)
                notify(`Switched to ${feed.id} // ${feed.place}`)
              }}
            />
          </div>
          <ThreatStream
            threats={threats}
            onAction={handleAction}
            hideResolved={hideResolved}
            setHideResolved={setHideResolved}
            streamRef={streamRef}
            onExport={exportStream}
          />
        </div>
        <ZoneStatus />
        <MonitorFooter />
      </main>
      {ptzOpen && (
        <PtzConsole
          onZoom={(amount) => setZoom((value) => Math.max(1, Math.min(4, value + amount)))}
          onClose={() => setPtzOpen(false)}
        />
      )}
      <Toast toast={toast} onDismiss={() => setToast('')} />
    </div>
  )
}
