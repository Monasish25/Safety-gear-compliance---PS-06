import { useState, useEffect } from 'react'
import { getApiBase } from '../../../config/api.js'

export default function Snapshot({ incident, small = false }) {
  const [imgError, setImgError] = useState(false)
  const API_BASE = getApiBase()

  useEffect(() => {
    setImgError(false)
  }, [incident?.id, incident?.snapshot_path])

  if (incident?.snapshot_path && !imgError) {
    const filename = String(incident.snapshot_path).replace(/^\/+/, '').replace(/^evidence\//, '')
    const query = filename.includes('?') ? '&ngrok-skip-browser-warning=true' : '?ngrok-skip-browser-warning=true'
    const imageUrl = `${API_BASE}/evidence/${filename}${query}`

    return (
      <div className={`incident-snapshot-real ${small ? 'small-thumb' : 'large-thumb'}`} style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '8px', background: '#070f1e' }}>
        <img 
          src={imageUrl} 
          alt="Evidence Snapshot" 
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: small ? 'cover' : 'contain', display: 'block', borderRadius: small ? '4px' : '8px' }} 
        />
      </div>
    )
  }

  return (
    <div className={`incident-snapshot incident-snapshot--${incident?.classifier?.toLowerCase().replaceAll(' ', '-').replaceAll('/', '-') || 'violation'}${small ? ' incident-snapshot--small' : ''}`}>
      <div className="snapshot-plant"><i /><i /><i /><span /></div>
      <div className="snapshot-fire" />
      <span className="snapshot-box"><b>{incident?.classifier?.toUpperCase()}_DETECT [IoU: {incident?.confidence?.replace('%', '') || '96'}]</b></span>
      {!small && <div className="snapshot-stats"><span>PEAK TEMP <b>--</b></span><span>OBSCURATION <b>--</b></span><span>OPTICAL BLUR <b>--</b></span></div>}
    </div>
  )
}
