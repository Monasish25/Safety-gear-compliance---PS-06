/**
 * CameraFeedPlaceholder
 *
 * Displays a clear "awaiting connection" state inside the camera frame when
 * no real CCTV or uploaded footage is connected.
 *
 * Props
 *   cameraStream  {MediaStream|null}  – pass through from MainFeed
 *   cameraError   {string}            – pass through from MainFeed
 *   isSelected    {boolean}           – true when the feed is selected/active
 */
export default function CameraFeedPlaceholder({ cameraStream, cameraError, isSelected }) {
  // Show only when there is no real stream and no in-progress error message.
  // The camera-error div in MainFeed already handles error text; this panel
  // shows the neutral "awaiting" state.
  if (cameraStream) return null

  return (
    <div
      className="cfp-shell"
      role="status"
      aria-label="Camera feed awaiting connection"
    >
      <div className="cfp-icon" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7 16 12 23 17V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </div>

      <p className="cfp-heading">CAMERA FEED PLACEHOLDER</p>
      <p className="cfp-sub">Real CCTV or uploaded footage will appear here</p>

      <ul className="cfp-status-list" aria-label="Camera connection status">
        <li><span className="cfp-label">Camera status</span><span className="cfp-value cfp-value--muted">Awaiting connection</span></li>
        <li><span className="cfp-label">Source</span><span className="cfp-value cfp-value--muted">Not connected</span></li>
      </ul>

      {isSelected && (
        <p className="cfp-selected-note">
          No live result is available yet. This area will display real camera
          and model information after backend integration.
        </p>
      )}

      <p className="cfp-preview-label" aria-hidden="true">Preview layout — awaiting live AI feed</p>
    </div>
  )
}

