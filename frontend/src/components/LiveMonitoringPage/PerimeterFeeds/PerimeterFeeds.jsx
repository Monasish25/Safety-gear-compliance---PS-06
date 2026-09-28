import { feedList } from '../data/monitorData.js'

export default function PerimeterFeeds({ selectedFeed, onSelect }) {
  return (
    <section className="perimeter-section">
      <div className="perimeter-heading"><div><p>SYNCED PERIMETER ARRAYS <span>(4 FEEDS ACTIVE)</span></p><small>SECONDARY OPTICAL NETWORK</small></div><span className="mono-data">BANDWIDTH: 49.8 MB/S</span></div>
      <div className="perimeter-grid">{feedList.map((feed) => <button key={feed.id} className={`perimeter-feed glass-surface${selectedFeed.id === feed.id ? ' is-selected' : ''}`} type="button" onClick={() => onSelect(feed)}><span className="perimeter-image" style={{ '--feed-position': feed.position, '--feed-tone': feed.tone }}><i className="mini-detection" /><b>{feed.id} // {feed.shortZone}</b></span><span className={`perimeter-status perimeter-status--${feed.tone}`}>{feed.status}</span><span className="perimeter-caption">{feed.place}</span></button>)}</div>
    </section>
  )
}
