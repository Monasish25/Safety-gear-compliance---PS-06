import { useEffect, useRef, useState } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
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
import VideoUploadModal from './VideoUploadModal/VideoUploadModal.jsx'
import './LiveMonitoringPage.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export default function LiveMonitoringPage({ user, theme, onThemeChange, onHome, onIncidents, onAnalytics, onHow, onSignOut }) {
  const [muted, setMuted] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [activeZone, setActiveZone] = useState(0)
  const [selectedFeed, setSelectedFeed] = useState(null)
  const [view, setView] = useState('2x2')
  const [infrared, setInfrared] = useState(false)
  const [ptzOpen, setPtzOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraSwitching, setCameraSwitching] = useState(false)
  const [cameraSwitchVersion, setCameraSwitchVersion] = useState(0)
  const [toast, setToast] = useState('')

  // Video Upload & Streaming States
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null)
  const [uploadedVideoId, setUploadedVideoId] = useState(null)
  const [uploadedVideoName, setUploadedVideoName] = useState('')
  const [liveTelemetry, setLiveTelemetry] = useState(null)
  const [threats, setThreats] = useState([])

  const streamRef = useRef(null)
  const toastTimer = useRef(null)
  const cameraSwitchTimer = useRef(null)
  const clock = <NavbarClock />

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(cameraSwitchTimer.current)
  }, [])

  useEffect(() => () => cameraStream?.getTracks().forEach((track) => track.stop()), [cameraStream])

  // Initial fetch of active threats/alerts from backend DB
  useEffect(() => {
    async function fetchInitialEvents() {
      try {
        const res = await fetch(`${API_BASE}/events?limit=25`)
        if (!res.ok) return
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        const formatted = items.map((evt) => ({
          id: evt.alert_id || evt.id || `ALT-${Math.floor(Math.random()*1000)}`,
          kind: (evt.severity || 'high').toLowerCase(),
          title: (evt.event_type || 'PPE VIOLATION').replaceAll('_', ' '),
          time: new Date(evt.triggered_at || evt.timestamp || Date.now()).toLocaleTimeString(),
          location: evt.zone_name || evt.zone_id || 'Factory Floor',
          description: evt.violation_reason || 'Safety compliance policy violation detected'
        }))
        if (formatted.length > 0) {
          setThreats(formatted)
        }
      } catch (e) {
        console.error('Error loading initial threat events:', e)
      }
    }
    fetchInitialEvents()
  }, [])

  // WebSocket Live Telemetry & Alert Stream Connection
  useEffect(() => {
    let ws = null
    let reconnectTimeout = null

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws/alerts`
      
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'FRAME_TELEMETRY') {
            setLiveTelemetry(data)
          } else if (data.type === 'NEW_ALERT') {
            const alertPayload = data.alert
            const newThreat = {
              id: alertPayload.alert_id || `ALT-${Date.now().toString().slice(-4)}`,
              kind: (alertPayload.severity || 'high').toLowerCase(),
              title: (alertPayload.event_type || 'PPE VIOLATION').replaceAll('_', ' '),
              time: new Date().toLocaleTimeString(),
              location: alertPayload.zone_name || alertPayload.zone_id || 'Factory Floor',
              description: alertPayload.violation_reason || 'Safety compliance policy breach detected'
            }
            setThreats((prev) => [newThreat, ...prev.slice(0, 19)])
            notify(`ALERT TRIGGERED: ${newThreat.title}`)
          }
        } catch (e) {
          console.error('Error parsing live WS payload:', e)
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

  // Poll active video processing status until COMPLETED, then switch to annotated video file stream
  useEffect(() => {
    if (!uploadedVideoId) return
    let isSubscribed = true
    let timerId = null

    const pollStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/videos/${uploadedVideoId}/status`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'COMPLETED' && isSubscribed) {
          setUploadedVideoUrl(`${API_BASE}/videos/${uploadedVideoId}/stream?t=${Date.now()}`)
          notify(`Vision pipeline complete! Annotated video with burned-in bounding boxes ready.`)
        } else if (data.status === 'PROCESSING' && isSubscribed) {
          timerId = setTimeout(pollStatus, 2500)
        }
      } catch (e) {
        console.error('Error checking video status:', e)
      }
    }

    pollStatus()

    return () => {
      isSubscribed = false
      if (timerId) clearTimeout(timerId)
    }
  }, [uploadedVideoId])

  function showCameraSwitch() {
    setCameraSwitching(true)
    setCameraSwitchVersion((version) => version + 1)
    window.clearTimeout(cameraSwitchTimer.current)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    cameraSwitchTimer.current = window.setTimeout(() => setCameraSwitching(false), reducedMotion ? 300 : 1500)
  }

  function finishCameraSwitch() {
    window.clearTimeout(cameraSwitchTimer.current)
    setCameraSwitching(false)
  }

  function selectZone(zoneIndex) {
    if (zoneIndex !== activeZone) showCameraSwitch()
    setActiveZone(zoneIndex)
  }

  function selectFeed(feed) {
    if (feed?.id !== selectedFeed?.id) showCameraSwitch()
    setSelectedFeed(feed)
    setZoom(1)
  }

  async function toggleDeviceCamera() {
    if (cameraStream) {
      showCameraSwitch()
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
      setUploadedVideoUrl(null)
      showCameraSwitch()
      notify('Device camera connected')
    } catch (error) {
      setCameraError(error.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access in browser settings.' : `Camera unavailable: ${error.message}`)
    }
  }

  function handleUploadSuccess(videoId, filename) {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setUploadedVideoId(videoId)
    setUploadedVideoName(filename)
    setUploadedVideoUrl(`${API_BASE}/videos/${videoId}/stream`)
    showCameraSwitch()
    notify(`Video uploaded successfully! Running YOLO vision pipeline on ${filename}`)
  }

  async function handleTriggerDemo() {
    try {
      notify('Generating & launching demo video simulation...')
      const res = await fetch(`${API_BASE}/demo/generate-and-run`, { method: 'POST' })
      if (!res.ok) throw new Error('Demo generation failed')
      const data = await res.json()
      handleUploadSuccess(data.video_id, 'demo_simulated_factory.mp4')
    } catch (e) {
      notify(`Demo launch error: ${e.message}`)
    }
  }

  function clearUploadedVideo() {
    setUploadedVideoUrl(null)
    setUploadedVideoId(null)
    setUploadedVideoName('')
    setLiveTelemetry(null)
    notify('Uploaded video stream cleared')
  }

  function notify(message) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3800)
  }

  function exportStream() {
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(new Blob(['ID,SEVERITY,TIME,LOCATION,EVENT\r\n'], { type: 'text/csv' }))
    link.href = objectUrl
    link.download = 'vision-shield-live-threat-stream.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  function emergencyBroadcast() {
    setBroadcasting((active) => !active)
    notify(broadcasting ? 'Emergency broadcast cancelled' : 'Emergency broadcast activated')
  }

  return (
    <div className="monitor-page min-h-screen text-white">
      <div className="monitor-nav">
        <Navbar user={user} theme={theme} onThemeChange={onThemeChange} activePage="live" onOpenHome={onHome} onOpenLive={() => {}} onOpenIncidents={onIncidents} onOpenAnalytics={onAnalytics} onOpenHow={onHow} onSignOut={onSignOut} broadcasting={broadcasting} onBroadcast={emergencyBroadcast} utcTime={clock} muted={muted} onToggleMute={() => setMuted((value) => !value)} />
      </div>

      <main className="monitor-main">
        <StatCards />
        <ZoneControls activeZone={activeZone} setActiveZone={selectZone} view={view} setView={setView} onPtz={() => setPtzOpen((value) => !value)} ir={infrared} setIr={setInfrared} />
        
        <div className="monitor-workspace">
          <div className="monitor-left-column">
            <MainFeed 
              feed={selectedFeed} 
              view={view} 
              infrared={infrared} 
              zoom={zoom} 
              cameraStream={cameraStream} 
              cameraError={cameraError} 
              cameraSwitching={cameraSwitching} 
              cameraSwitchVersion={cameraSwitchVersion} 
              onCameraSwitchComplete={finishCameraSwitch} 
              onToggleCamera={toggleDeviceCamera} 
              onZoom={() => setZoom((value) => Math.min(4, value + .1))} 
              uploadedVideoUrl={uploadedVideoUrl}
              uploadedVideoName={uploadedVideoName}
              onOpenUpload={() => setIsUploadOpen(true)}
              onClearUploadedVideo={clearUploadedVideo}
              liveTelemetry={liveTelemetry}
            />
            <PerimeterFeeds selectedFeed={selectedFeed} onSelect={selectFeed} />
          </div>

          <ThreatStream threats={threats} streamRef={streamRef} onExport={exportStream} />
        </div>

        <ZoneStatus />
        <MonitorFooter />
      </main>

      {ptzOpen && <PtzConsole onZoom={(amount) => setZoom((value) => Math.max(1, Math.min(4, value + amount)))} onClose={() => setPtzOpen(false)} />}
      
      {isUploadOpen && (
        <VideoUploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
          onTriggerDemo={handleTriggerDemo}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast('')} />
    </div>
  )
}
