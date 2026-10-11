import { useState } from 'react'
import { getApiBase } from '../../../config/api.js'

export default function Snapshot({ incident, small = false }) {
  const [imgError, setImgError] = useState(false)
  const API_BASE = getApiBase()

  if (incident?.snapshot_path && !imgError) {
    let cleanPath = incident.snapshot_path.replace(/^\/+/, '')
    if (!cleanPath.startsWith('evidence/') && !cleanPath.includes('evidence/')) {
      cleanPath = `evidence/${cleanPath}`
    }
    const query = cleanPath.includes('?') ? '&ngrok-skip-browser-warning=true' : '?ngrok-skip-browser-warning=true'
    const imageUrl = `${API_BASE}/${cleanPath}${query}`

    return (
      <div className={`incident-snapshot-real ${small ? 'small-thumb' : 'large-thumb'}`}>
        <img 
          src={imageUrl} 
          alt="Evidence" 
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} 
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
