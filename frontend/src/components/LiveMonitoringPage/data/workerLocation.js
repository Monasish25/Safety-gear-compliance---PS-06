/**
 * @file workerLocation.js
 * Future backend data contract for worker location tracking and emergency
 * accountability.
 *
 * TODO (backend developer): Replace the empty exports below with real data
 * sources — e.g. REST API polls, WebSocket subscriptions, RFID/beacon events,
 * camera-tracking feeds, or wearable telemetry. The visual components
 * (WorkerAccountabilityPanel, FactoryLocationPlaceholder, WorkerDetailsPlaceholder,
 * EmergencyStatusSummary) are already structured to receive this shape;
 * no UI redesign should be needed once real data is flowing.
 *
 * Backend integration pending: replace the empty worker-location/accountability
 * state with verified location events from the monitoring backend.
 */

/**
 * @typedef {'inside' | 'affected_zone' | 'moving_to_muster' | 'accounted_for' | 'unaccounted' | 'unknown'} WorkerLocationStatus
 */

/**
 * @typedef {Object} WorkerCoordinates
 * @property {number} x  - Normalised X position on the site map (0–1).
 * @property {number} y  - Normalised Y position on the site map (0–1).
 */

/**
 * @typedef {'camera_tracking' | 'rfid' | 'beacon' | 'wearable' | 'simulated'} LocationSource
 */

/**
 * @typedef {Object} WorkerLocation
 * @property {string}              workerId        - Anonymous worker identifier (no PII).
 * @property {string}              [zone]          - Current facility zone identifier.
 * @property {WorkerLocationStatus} status         - Current accountability status.
 * @property {string}              [lastUpdated]   - ISO-8601 timestamp of the last location event.
 * @property {WorkerCoordinates}   [coordinates]   - Normalised map coordinates.
 * @property {LocationSource}      [locationSource]- Source system providing this location.
 */

/**
 * @typedef {Object} EmergencyAccountability
 * @property {boolean} emergencyActive              - Whether an emergency is currently active.
 * @property {string}  [affectedZone]               - Zone identifier where the emergency occurred.
 * @property {number}  [workersOnSite]              - Total workers present on site.
 * @property {number}  [workersInAffectedZone]      - Workers detected inside the affected zone.
 * @property {number}  [accountedFor]               - Workers confirmed at muster point.
 * @property {number}  [movingToMuster]             - Workers en-route to muster point.
 * @property {number}  [unaccounted]               - Workers whose location is unknown.
 * @property {string}  [lastUpdated]               - ISO-8601 timestamp of the last accountability refresh.
 * @property {string}  [locationSource]            - Human-readable label for the active location source.
 */

/**
 * Live worker location events from the tracking backend.
 *
 * Currently empty — awaiting backend integration.
 * Worker identity is anonymized in monitoring view. No PII is stored here.
 *
 * @type {WorkerLocation[]}
 */
export const workerLocations = []

/**
 * Current emergency accountability state from the backend.
 *
 * Currently null — awaiting backend integration.
 * When an emergency is active the backend should populate this object.
 *
 * @type {EmergencyAccountability | null}
 */
export const accountabilityState = null
