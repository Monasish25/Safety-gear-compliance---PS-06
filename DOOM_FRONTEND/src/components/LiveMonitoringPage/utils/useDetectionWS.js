import { useCallback, useEffect, useRef, useState } from 'react'

const RECONNECT_MS = 2500
const MAX_DETECTIONS_IN_STREAM = 15

/**
 * useDetectionWS({ camId })
 *
 * Connects to /ws/detections?cam=<camId> and returns:
 *   { connected, fps, source, camLabel, outputFile, frame, detections, threats }
 *
 * - camId: 'CAM-01', 'CAM-02', 'CAM-03', 'CAM-04', '2X2'
 */
export function useDetectionWS({ camId } = {}) {
  const [connected, setConnected] = useState(false)
  const [fps, setFps] = useState(0)
  const [source, setSource] = useState('')
  const [camLabel, setCamLabel] = useState('')
  const [outputFile, setOutputFile] = useState('')
  const [frame, setFrame] = useState(null)
  const [detections, setDetections] = useState([])
  const [threats, setThreats] = useState([])
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const threatCounter = useRef(9000)

  const connect = useCallback(() => {
    // Close any existing connection before opening a new one
    if (wsRef.current && wsRef.current.readyState < 2) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const qs = camId ? `?cam=${encodeURIComponent(camId)}` : ''
    let wsUrl = ''
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      wsUrl = `ws://localhost:8000/ws/detections${qs}`
    } else {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      wsUrl = `${proto}://${location.host}/ws/detections${qs}`
    }

    let ws
    try {
      ws = new WebSocket(wsUrl)
    } catch (err) {
      console.warn('[SafeGear WS] direct connect failed, fallback to proxy:', err)
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${location.host}/ws/detections${qs}`)
    }
    wsRef.current = ws

    ws.onopen = () => {
      console.log(`[SafeGear WS] Connected to camera: ${camId || 'default'}`)
      setConnected(true)
    }

    ws.onmessage = (event) => {
      let data
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (data.error) {
        console.error('[SafeGear WS]', data.error)
        return
      }

      setConnected(true)
      setFps(data.fps ?? 0)
      setSource(data.source ?? '')
      if (data.cam_label !== undefined) setCamLabel(data.cam_label)
      if (data.output_file !== undefined) setOutputFile(data.output_file)
      if (data.frame) setFrame(data.frame)
      if (data.detections) {
        setDetections(data.detections)

        // Convert model detections into ThreatStream format for non-resolved hits
        const now = new Date()
        const timeStr = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        const newThreats = (data.detections || [])
          .filter((d) => d.kind !== 'resolved')
          .map((d) => ({
            id: `THR-${threatCounter.current++}`,
            kind: d.kind,
            title: d.label.toUpperCase().replace(/_/g, ' '),
            time: timeStr,
            location: `LOCATION: ${data.cam_label || data.source || 'AI Detection'} [ID: ${d.id || '?'}]`,
            description: `best.pt detected "${d.label}" with ${(d.confidence * 100).toFixed(1)}% confidence.`,
            actions: d.kind === 'critical'
              ? ['TRIGGER ALARM', 'DISPATCH MARSHAL', 'ACK']
              : ['SPEAKER WARNING', 'LOG VIOLATION'],
            key: `${now.getTime()}-${Math.random()}`,
          }))

        if (newThreats.length > 0) {
          setThreats((prev) => [...newThreats, ...prev].slice(0, MAX_DETECTIONS_IN_STREAM))
        }
      }
    }

    ws.onerror = (err) => {
      console.warn('[SafeGear WS] error:', err)
      ws.close()
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = window.setTimeout(connect, RECONNECT_MS)
    }
  }, [camId])

  useEffect(() => {
    window.clearTimeout(reconnectTimer.current)
    connect()
    return () => {
      window.clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  return { connected, fps, source, camLabel, outputFile, frame, detections, threats }
}
