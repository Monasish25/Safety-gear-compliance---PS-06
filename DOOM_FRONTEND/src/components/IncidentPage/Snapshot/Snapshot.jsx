export default function Snapshot({ incident, small = false }) {
  return (
    <div className={`incident-snapshot incident-snapshot--${incident.classifier.toLowerCase().replaceAll(' ', '-').replaceAll('/', '-')}${small ? ' incident-snapshot--small' : ''}`}>
      <div className="snapshot-plant"><i /><i /><i /><span /></div>
      <div className="snapshot-fire" />
      <span className="snapshot-box"><b>{incident.classifier.toUpperCase()}_DETECT [IoU: {incident.confidence.replace('%', '')}]</b></span>
      {!small && <div className="snapshot-stats"><span>PEAK TEMP <b>{incident.temp}</b></span><span>OBSCURATION <b>{incident.obscuration}</b></span><span>OPTICAL BLUR <b>{incident.blur}</b></span></div>}
    </div>
  )
}
