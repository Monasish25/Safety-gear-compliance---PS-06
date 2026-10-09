import { feedList } from '../data/monitorData.js'

export default function PerimeterFeeds({ selectedFeed, onSelect }) {
  return (
    <section className="perimeter-section">
      <div className="perimeter-heading"><div><p>CONFIGURED CAMERA FEEDS</p><small>Camera list will appear when the monitoring service is connected.</small></div></div>
      {feedList.length ? <div className="perimeter-grid">{feedList.map((feed) => <button key={feed.id} className={`perimeter-feed glass-surface${selectedFeed?.id === feed.id ? ' is-selected' : ''}`} type="button" onClick={() => onSelect(feed)}><span className="perimeter-image" style={{ '--feed-position': feed.position, '--feed-tone': feed.tone }}><b>{feed.id} // {feed.shortZone}</b></span><span className={`perimeter-status perimeter-status--${feed.tone}`}>{feed.status}</span><span className="perimeter-caption">{feed.place}</span></button>)}</div> : <p className="feed-empty-note">No camera feeds are configured.</p>}
    </section>
  )
}
