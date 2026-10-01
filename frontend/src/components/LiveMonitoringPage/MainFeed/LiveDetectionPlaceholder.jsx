/**
 * LiveDetectionPlaceholder
 *
 * Overlaid inside the camera frame to show where future AI detection results
 * will appear. All categories are shown in a neutral "Awaiting data" state.
 *
 * No fake bounding boxes, fake workers, fake counts, or fake confidence scores
 * are displayed. Only neutral placeholder values are used.
 *
 * Props
 *   detections  {MonitoringDetection[]}  – pass detections[] from adapter;
 *               component renders its "awaiting" state when the array is empty.
 */
export default function LiveDetectionPlaceholder({ detections }) {
  const noData = !detections || detections.length === 0

  return (
    <div
      className={`ldp-shell${noData ? ' ldp-shell--empty' : ''}`}
      aria-label="Live AI detection layer — awaiting inference"
    >
      <div className="ldp-header">
        <span className="ldp-badge" aria-hidden="true">AI</span>
        <span className="ldp-title">LIVE AI DETECTION LAYER</span>
        <span className="ldp-status-chip ldp-status-chip--off">No live inference</span>
      </div>

      <ul className="ldp-category-list" aria-label="Detection categories">
        <li className="ldp-category-row">
          <span className="ldp-cat-label">Worker tracking</span>
          <span className="ldp-cat-value ldp-cat-value--muted">Awaiting data</span>
        </li>
        <li className="ldp-category-row">
          <span className="ldp-cat-label">PPE compliance</span>
          <span className="ldp-cat-value ldp-cat-value--muted">Awaiting data</span>
        </li>
        <li className="ldp-category-row">
          <span className="ldp-cat-label">Posture monitoring</span>
          <span className="ldp-cat-value ldp-cat-value--muted">Awaiting data</span>
        </li>
        <li className="ldp-category-row">
          <span className="ldp-cat-label">Fire / smoke detection</span>
          <span className="ldp-cat-value ldp-cat-value--muted">Awaiting data</span>
        </li>
        <li className="ldp-category-row">
          <span className="ldp-cat-label">Asset monitoring</span>
          <span className="ldp-cat-value ldp-cat-value--muted">Awaiting data</span>
        </li>
      </ul>
    </div>
  )
}

