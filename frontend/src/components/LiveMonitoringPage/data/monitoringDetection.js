/**
 * @file monitoringDetection.js
 * Future backend data contract for live AI inference results.
 *
 * TODO (backend developer): Replace the empty `detections` export below
 * with a real data source — e.g. a REST API poll, a WebSocket subscription,
 * or a React context provider — that streams MonitoringDetection[] objects
 * from the inference server. The visual components (LiveDetectionPlaceholder,
 * DetectionContextPanel) are already wired to receive this shape; no UI
 * redesign should be needed once real data is flowing.
 */

/**
 * @typedef {'worker' | 'ppe_violation' | 'posture_risk' | 'fire' | 'smoke' | 'asset_issue'} DetectionKind
 */

/**
 * @typedef {'low' | 'medium' | 'high' | 'critical'} RiskLevel
 */

/**
 * @typedef {Object} DetectionBoundingBox
 * @property {number} x        - Normalised X origin (0–1, left edge).
 * @property {number} y        - Normalised Y origin (0–1, top edge).
 * @property {number} width    - Normalised width  (0–1).
 * @property {number} height   - Normalised height (0–1).
 */

/**
 * @typedef {Object} DetectionMetadata
 * @property {string[]} [missingPpe]           - PPE items absent (e.g. ['helmet', 'vest']).
 * @property {string}   [postureType]           - Posture classification label.
 * @property {string}   [assetId]               - Asset identifier.
 * @property {'normal'|'warning'|'critical'} [assetStatus] - Asset condition.
 * @property {number}   [nearbyWorkerCount]     - Workers within proximity radius.
 */

/**
 * @typedef {Object} MonitoringDetection
 * @property {string}               id              - Unique detection event ID.
 * @property {DetectionKind}        kind            - Category of detection.
 * @property {string}               label           - Human-readable label.
 * @property {number}               [confidence]    - Model confidence score (0–1).
 * @property {RiskLevel}            [riskLevel]     - Assessed risk severity.
 * @property {string}               [workerId]      - Worker identifier if applicable.
 * @property {string}               [zone]          - Facility zone identifier.
 * @property {number}               [durationSeconds] - Seconds the event has persisted.
 * @property {DetectionBoundingBox} [boundingBox]   - Bounding box in the camera frame.
 * @property {DetectionMetadata}    [metadata]      - Extended detection metadata.
 */

/**
 * Live detection results from the AI inference backend.
 *
 * Currently empty — awaiting backend integration.
 * The backend developer should replace this export (or the mechanism that
 * populates it) with real MonitoringDetection[] data. No UI redesign needed.
 * When connected, real results will carry: worker IDs, PPE status, posture
 * risk, hazard type, asset status, confidence score, zone, and duration.
 *
 * @type {MonitoringDetection[]}
 */
export const detections = []
