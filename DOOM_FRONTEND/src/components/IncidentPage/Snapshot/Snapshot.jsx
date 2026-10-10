const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export default function Snapshot({ incident, small = false }) {
  if (incident?.snapshot_path) {
    return (
      <div className={`incident-snapshot-real ${small ? 'small-thumb' : 'large-thumb'}`}>
        <img src={`${API_BASE}/${incident.snapshot_path}`} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
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
