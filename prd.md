Industrial Safety Vision AI — Product Requirements Document
Version: 1.0 (Hackathon MVP) · Status: Draft · Owner: Product/Engineering Team

Assumption: this PRD targets a 5-person team building a demo-ready prototype within a hackathon timebox (typically 24–72 hours of build time). Where the brief did not specify a number, reasonable hackathon-scale defaults are used and called out explicitly.

1. Product Overview
Industrial Safety Vision AI turns recorded (and later live) CCTV footage into verified, location-aware safety alerts. It detects workers, PPE (helmet, vest), smoke, and fire; tracks workers anonymously across frames; confirms violations over time rather than from single frames; and delivers evidence-backed alerts to a supervisor dashboard for human review and action.

2. Problem Statement
Factories lose critical response time because PPE non-compliance and early fire/smoke signs go unnoticed until a human happens to look, or until an incident escalates. Manual CCTV monitoring doesn't scale across zones and shifts. The system must close this gap with automated, trustworthy, explainable detection — without becoming a source of alert fatigue or false accusations against workers.

3. Target Users and Stakeholders
Role	Need
Safety Supervisor	Real-time alerts, evidence, ability to acknowledge/resolve
Plant/Operations Manager	Historical trends, compliance rate, zone risk reporting
Factory Worker (indirect)	Fair, privacy-respecting monitoring; no identity exposure
Hackathon Judges	Clear demo of detection → confirmation → alert → resolution loop
System Admin	Configure cameras, zones, PPE rules
4. Goals
Reliably detect person, helmet, vest, smoke, fire from uploaded MP4 video.
Confirm violations only after temporal evidence, minimizing false alerts.
Produce location-aware, evidence-backed alerts within seconds.
Provide a working acknowledge/resolve workflow with audit history.
Keep the system privacy-respecting (no facial recognition, no identity).
5. Non-Goals
No live RTSP as the primary/required path (optional stretch only).
No facial recognition or employee identification.
No autonomous control of alarms, machines, doors, evacuation, or emergency services.
No claim of certified safety-compliance or regulatory approval.
No multi-factory / multi-tenant SaaS scope in the MVP.
No mobile app, blockchain, Kubernetes, or graph database.
6. MVP Scope
In scope (MVP)	Phase 2	Future
Upload MP4, run detection	RTSP live stream	Multi-factory support
Person, helmet, vest, smoke, fire detection	Gloves/footwear detection	Face-blurred privacy pipeline
ByteTrack anonymous tracking	PostGIS real polygons	ReID (pgvector embeddings)
Rectangle/polygon-JSON zones	SMS/email notification channels	Predictive risk analytics
Redis temporal confirmation	Camera health dashboard	Edge/on-device inference
PostgreSQL event storage	Role-based multi-supervisor routing	Supervisor AI copilot (full)
MinIO evidence storage	Analytics drill-downs	Auto-escalation workflows
React dashboard: alerts, evidence, ack/resolve		
WebSocket live alert push		
7. User Stories
As a supervisor, I upload a factory video so the system can analyze it for safety violations.
As a supervisor, I see a helmet-missing alert with zone, camera, time, and photo evidence, so I can verify it visually.
As a supervisor, I acknowledge and resolve an alert with a note, so there's an auditable record.
As a manager, I view historical incidents and compliance rate by zone, so I can prioritize safety investment.
As an admin, I configure which PPE is required per zone, so rules match real factory policy.
As a worker (indirect beneficiary), I am tracked only by an anonymous ID, never by name or face.
As a judge, I watch a controlled demo showing detection → confirmation → alert → resolution.
8. Functional Requirements
ID	Requirement	Priority
FR-1	Accept MP4 upload and process frame-by-frame	MVP
FR-2	Detect person, helmet, vest, smoke, fire per frame	MVP
FR-3	Track individuals with anonymous IDs across frames (ByteTrack)	MVP
FR-4	Associate PPE items with the correct person via region overlap	MVP
FR-5	Map detections to a factory zone by bounding-box center	MVP
FR-6	Apply per-zone PPE rules to determine required gear	MVP
FR-7	Require multi-frame/multi-second confirmation before creating an event	MVP
FR-8	Store PPE state as PRESENT / MISSING / NOT_VISIBLE / UNCERTAIN	MVP
FR-9	Generate confirmed safety events with severity	MVP
FR-10	Capture and store evidence image(s) per event in MinIO	MVP
FR-11	Push alerts to dashboard via WebSocket	MVP
FR-12	Support acknowledge → resolve workflow with notes	MVP
FR-13	Prevent duplicate alerts via cooldown/fingerprint	MVP
FR-14	Show historical events and basic compliance analytics	MVP
FR-15	Support RTSP live ingestion	Phase 2
FR-16	Multi-channel notification (SMS/email)	Phase 2
FR-17	Camera health monitoring/alerts	Phase 2
9. Non-Functional Requirements
Category	Requirement
Latency	< 1s alert delay for recorded video processing; < 2s target for future live streams
Throughput	≥ 5 FPS inference on 640×640 input on available hackathon hardware
Reliability	No area is ever marked "safe" if a pipeline component is down — surface a health warning instead
Privacy	No facial recognition; anonymous track IDs only; no PII in logs
Auditability	Every event, alert, acknowledgement, resolution, and note is timestamped and attributed
Security	No secrets (DB passwords, MinIO keys, RTSP URLs) in frontend code, logs, or API responses
Portability	Entire stack runs via docker compose up
Explainability	Every alert shows confidence, duration, and the specific evidence that triggered it
10. User Flow
Admin configures cameras + zones + PPE rules
        │
        ▼
Supervisor uploads MP4 ──► Processing pipeline runs
        │
        ▼
Dashboard shows: video preview, detected boxes, live event feed
        │
        ▼
Confirmed event appears as an alert card (New)
        │
        ▼
Supervisor opens evidence → Acknowledge → investigates → Resolve + note
        │
        ▼
Event moves into history; feeds compliance analytics
11. System Architecture
CCTV / Uploaded MP4
        │
        ▼
Video Ingestion Service
        │
        ▼
Frame Sampling + Preprocessing (CLAHE, denoise)
        │
        ├── YOLO Detection (person, helmet, vest, smoke, fire)
        ├── ByteTrack (person tracking)
        └── Zone Mapping (bbox center → zone polygon)
        │
        ▼
PPE Association ──► Rule Engine
        │
        ▼
Redis: temporal confirmation + cooldown
        │
        ├── confirmed? ──► MinIO (evidence) + PostgreSQL (event)
        │
        ▼
FastAPI / WebSocket
        │
        ▼
React Supervisor Dashboard
12. Computer Vision Pipeline
Ingest: read MP4 via OpenCV.
Sample: read at source FPS, infer at 5 FPS; carry original frame for evidence.
Preprocess: optional CLAHE contrast enhancement + light denoise for dusty/dim scenes; run enhanced and original in parallel when confidence is borderline.
Detect: YOLO model outputs person, helmet, vest, smoke, fire boxes with confidence.
Track: ByteTrack assigns/maintains anonymous track_ids, tolerating brief occlusion (dust, machinery) using low-confidence-match recovery.
Associate: map helmet/vest boxes to the relevant person's head/torso region.
Zone-map: person bbox center → zone polygon lookup.
Decide: rule engine + Redis temporal counters confirm or dismiss.
13. PPE Detection and Association Logic
person_head  = top 25–30% of person bbox
person_torso = middle section of person bbox

helmet_state = PRESENT   if overlap(person_head, helmet_bbox) > threshold
             = MISSING   if head region clearly visible AND no helmet overlap
             = NOT_VISIBLE if head region occluded/out of frame
             = UNCERTAIN if enhanced vs. original frame disagree

vest_state   = same pattern using torso region
Example detection payload:

{
  "camera_id": "CAM_01",
  "track_id": "CAM_01_W_017",
  "zone": "Welding Area",
  "helmet_state": "MISSING",
  "helmet_confidence": 0.12,
  "vest_state": "PRESENT",
  "vest_confidence": 0.90,
  "visibility_quality": "GOOD"
}
14. Dust, Blur, and Occlusion Handling
Never conflate "not visible" with "not wearing." NOT_VISIBLE/UNCERTAIN never trigger an alert — they extend observation instead.
Run CLAHE + denoise on frames flagged low-contrast; compare original vs. enhanced predictions — disagreement → UNCERTAIN.
Occlusion-aware tracking: keep a track alive for a configurable window (default 3s) while a worker is briefly hidden by dust/machinery, reconnecting on reappearance near the predicted position.
Recommend (non-blocking) camera placement guidance: head/torso-height mounting, adequate resolution (1080p+), avoiding glare/backlight, regular lens cleaning.
15. Zone-Based Safety Policy Engine
Zone	Required PPE	Risk Level
Assembly Zone	Helmet, Vest	Medium
Welding Zone	Helmet, Vest, Gloves	High
Chemical Storage	Helmet, Vest, Gloves, Mask	Critical
Zones are stored as simple rectangle/polygon JSON in the MVP ({"x_min":500,"y_min":0,"x_max":1000,"y_max":720}); detection zone = the zone polygon containing the person bbox center. PostGIS is an explicit Phase 2/future upgrade for irregular real-world polygons and spatial indexing.

16. Event Confirmation and Alert Rules
Event	Confirmation rule
Missing helmet	Same tracked worker, in helmet-required zone, head sufficiently visible, helmet absent ≥ 2s, no active duplicate
Missing vest	Same tracked worker, in vest-required zone, torso sufficiently visible, vest absent ≥ 2s, no active duplicate
Smoke	Detected in ≥ 3 of last 5 inference observations
Fire	Detected in ≥ 2 of last 3 inference observations
Poor visibility	Returns NOT_VISIBLE/UNCERTAIN; keep observing; never alert
Duplicate-prevention fingerprint: camera_id + zone_id + worker_track_id + event_type with a 30s cooldown after the previous alert (unless previously resolved).

17. Alert Severity Matrix
Severity	Trigger examples
Low	Minor policy warning in a low-risk area
Medium	Missing helmet or vest in a standard work zone
High	Missing critical PPE in a high-risk zone; persistent smoke; camera health failure
Critical	Confirmed fire; smoke/fire near chemical storage; high-risk multi-event situation
18. Dashboard Requirements
Active alerts panel: card per alert — event type, severity, camera, zone, worker ID, time, confidence, status, evidence thumbnail, Acknowledge/Resolve buttons.
Video/evidence viewer: shows the annotated snapshot or clip behind an alert.
Zone/floor overview: simple colored zone map (green/yellow/red) with camera icons; flashes on active incident.
Event history: filterable list/table of past events with status and resolution notes.
Analytics (Recharts): compliance rate by zone/day, false-alert rate, incident counts by type.
Real-time updates via WebSocket; no polling required for new alerts.
19. API Requirements
POST   /videos/upload
POST   /videos/{id}/process
GET    /videos/{id}/results

GET    /cameras          POST /cameras
GET    /zones             POST /zones
GET    /ppe-rules

GET    /events            GET /events/{event_id}
PATCH  /events/{event_id}/status      # ACKNOWLEDGED | RESOLVED
POST   /events/{event_id}/notes

GET    /analytics/summary
WS     /ws/alerts
Example alert payload:

{
  "event_type": "MISSING_HELMET",
  "severity": "HIGH",
  "camera_id": "CAM_01",
  "zone": "Welding Area",
  "worker_track_id": "CAM_01_W_017",
  "confidence": 0.87,
  "timestamp": "2026-09-24T14:32:10Z",
  "snapshot_url": "/evidence/event-000123.jpg",
  "status": "NEW"
}
20. Database Design
Three-tier storage: PostgreSQL (structured/permanent), Redis (temporary live state), MinIO (evidence binaries).

Table	Purpose	Key fields
users	Supervisors/admins	id, name, role, email
cameras	Video sources	id, name, location_label, stream_url, is_active
zones	Areas per camera	id, camera_id (FK), name, risk_level, polygon (JSONB)
ppe_rules	Required PPE per zone	id, zone_id (FK), helmet_required, vest_required, gloves_required
worker_tracks	Anonymous tracked workers	id, camera_id (FK), tracker_id, first_seen_at, last_seen_at, status
safety_events	Confirmed incidents	id, camera_id (FK), zone_id (FK), worker_track_id (FK), event_type, severity, confidence, status, started_at, ended_at, metadata (JSONB)
evidence_files	Links events to MinIO objects	id, safety_event_id (FK), evidence_type, object_path, captured_at, is_annotated
alert_actions	Ack/resolve audit trail	id, safety_event_id (FK), action, user_id (FK), timestamp, note
camera_health_logs	Pipeline/camera uptime	id, camera_id (FK), status, checked_at, detail
CREATE TABLE safety_events (
  id UUID PRIMARY KEY,
  camera_id UUID REFERENCES cameras(id),
  zone_id UUID REFERENCES zones(id),
  worker_track_id UUID REFERENCES worker_tracks(id),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  confidence NUMERIC(4,3),
  status VARCHAR(30) DEFAULT 'NEW',
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  metadata JSONB
);
Redis keys (temporary only): active_track:{camera}:{track}, helmet_missing_frames:{track}, last_alert:{camera}:{track}:{event_type} (cooldown), camera_heartbeat:{camera}.

21. Evidence Storage Design
MinIO bucket factory-safety-evidence, object paths like evidence/2026/09/24/CAM_01/missing_helmet/event_000123.jpg.
Store original + annotated snapshot; optional 10–20s clip if time allows.
PostgreSQL never stores raw frames or video — only object_path + metadata.
Access to evidence requires authentication; no public bucket listing.
22. Agent Architecture
Agent	Purpose	Input → Output
1. Video Ingestion Agent	Read MP4/RTSP into frames	File/stream → frame sequence
2. Vision Detection Agent	Run YOLO per sampled frame	Frame → raw detections (boxes, classes, confidence)
3. Person Tracking Agent	Assign/maintain anonymous IDs	Detections → tracked person boxes
4. PPE Association Agent	Link PPE boxes to a person's regions	Person + PPE boxes → per-person PPE states
5. Zone Policy Agent	Map position → zone → required PPE	Bbox center → zone + rule set
6. Event Decision Agent	Apply temporal confirmation, create confirmed events only	Observations (Redis state) → confirmed event or none
7. Evidence Storage Agent	Save snapshot/clip to MinIO	Frame(s) → object path
8. Alert Delivery Agent	Push confirmed event to dashboard	Event → WebSocket alert
9. Analytics Agent	Aggregate historical stats	Event history → compliance/analytics data
10. Supervisor Copilot Agent (optional)	Summarize an event in plain language for a supervisor	Event + evidence → explanation text
Each agent's spec follows the same template — purpose, input, output, allowed actions, prohibited actions, error behavior, logs, privacy restrictions, success criteria — applying the Global Agent Rules in Section 23 uniformly. For example, the Event Decision Agent:

Allowed: read Redis counters, PostgreSQL zone/PPE rules; write a confirmed safety_events row.
Prohibited: creating an event from a single observation; inferring worker identity; bypassing cooldown.
Error behavior: if Redis or PostgreSQL is unreachable, emit a system-health warning and take no alerting action.
Success criteria: zero confirmed events created from fewer than the required confirmation frames/seconds.
23. Agent Rules and Restrictions (Global)
Evidence before assertion — every observation carries camera ID, timestamp, confidence, model version, frame reference.
No guessing — missing config/quality/evidence → explicit warning, never invented data.
Uncertainty is valid — dust/blur/occlusion/distance → NOT_VISIBLE/UNCERTAIN, not MISSING.
No one-frame safety decisions — only the Event Decision Agent confirms events, via temporal rules.
Privacy by design — no facial recognition, no identity inference, anonymous track IDs only.
Least privilege — each agent gets only the data/permissions it needs.
No direct industrial control — no sirens, machine shutdowns, doors, evacuation systems, emergency-service calls, or disciplinary action.
Human decision authority — only authenticated supervisors acknowledge/resolve.
Auditability — every create/ack/resolve/note/evidence reference is timestamped and attributed.
Duplicate prevention — fingerprint = camera_id + zone_id + worker_track_id + event_type + time_window.
Safe failure — any pipeline component failure → health warning; never imply "safe" during an outage.
Secrets protection — no RTSP URLs, DB passwords, or MinIO keys in frontend, logs, or API responses.
24. Privacy, Security, and Ethics
No facial recognition anywhere in the pipeline; workers are represented only as anonymous per-camera track IDs (e.g., CAM_01_W_017).
Evidence access is authenticated; consider face-blurring as a future enhancement.
The system explicitly does not identify, rank, or discipline individual workers — it reports zone/time-scoped compliance events only.
All secrets (DB credentials, MinIO keys, RTSP URLs) stay server-side; never exposed to the frontend or in logs.
The product does not claim regulatory safety certification or 100% detection accuracy.
25. Failure Handling and Monitoring
Failure	System behavior
Camera/video read fails	Log + surface "no data" state; never mark zone safe
YOLO/inference service down	Health warning on dashboard; pause event creation
Redis unavailable	No temporal confirmation possible → no new events created; warning logged
PostgreSQL unavailable	Alerts cannot be persisted; queue locally or fail loudly, never silently drop
MinIO unavailable	Event blocked until evidence can be stored — no alert without evidence
26. Testing Strategy
Unit tests for zone-mapping math, PPE association overlap logic, and temporal confirmation counters.
Integration test: one full recorded video → confirmed event → dashboard alert → acknowledge → resolve.
Regression set of curated clips: clean compliance, missing helmet, missing vest, dusty/occluded footage, smoke, fire, false-positive bait (steam, orange clothing, welding sparks).
Manual QA pass on the demo video before judging to avoid surprises.
27. Evaluation Metrics
Metric	What it measures
Detection precision / recall	Person, helmet, vest, smoke, fire, class-by-class
PPE violation precision / recall	Confirmed-event accuracy specifically
Smoke / fire precision / recall	Hazard-class accuracy
False alerts per hour	Alert-fatigue risk
Average alert latency	Time from violation start to alert delivery
Frames processed per second	Pipeline throughput
Worker track stability	ID-switch rate during occlusion/crossing
Event acknowledgement time	Supervisor responsiveness
Event resolution time	End-to-end incident handling time
Camera pipeline uptime	Reliability of the ingestion/inference path
28. Risks and Mitigations
Risk	Mitigation
Dust/blur causes false "missing PPE"	NOT_VISIBLE/UNCERTAIN state + CLAHE + dual-frame comparison
Alert fatigue from noisy detections	Temporal confirmation + cooldown + severity tiering
ID switching among similar-looking workers	ByteTrack short-term persistence; ReID deferred to future
Scope creep before core pipeline works	Phase 1 freezes scope to 1–2 cameras, 3 zones, core classes only
Live RTSP unreliable during judging	Recorded video is the guaranteed demo path; RTSP is a bonus
Privacy/ethics concerns	No facial recognition; anonymous IDs; explicit non-goals stated
29. Five-Person Team Work Breakdown
Person	Responsibility	Deliverables
1. AI Lead	Dataset, annotation, model training	Trained YOLO model, evaluation metrics
2. Vision Pipeline Lead	OpenCV, tracking, video processing	Frame pipeline, ByteTrack integration, annotated video
3. Backend Lead	FastAPI, rule engine, database	APIs, event decision logic, persistence
4. Frontend Lead	Dashboard, floor-plan UI	Live alerts, event history, evidence viewer
5. Integration/Presentation Lead	Docker Compose, testing, pitch	End-to-end demo, architecture diagram, presentation
Agree the API contract (Section 19 JSON shapes) before parallel work begins.

30. Development Roadmap
Phase	Focus
1	Freeze scope: 1–2 cameras, 3 zones, helmet/vest/smoke/fire only
2	Vision proof: script that reads video → detects → draws boxes → exports annotated MP4
3	Add tracking + temporal confirmation + cooldown
4	Backend: APIs, PostgreSQL, Redis, MinIO wiring
5	Dashboard: alerts, zone map, history, ack/resolve
6	One flagship innovation: configurable zone-based PPE policy + risk-aware severity
31. Hackathon Demo Script
Open dashboard with a normal factory video playing.
Show workers detected with compliant (green) indicators.
Show a worker entering a zone without a helmet.
Wait for on-screen temporal confirmation (few seconds).
Alert appears: camera, zone, timestamp, confidence, evidence snapshot.
Show smoke appearing in another zone → early-warning state.
Escalate to a fire alert with critical severity.
Supervisor acknowledges the alert.
Supervisor resolves it with a note; event moves to history.
Show that a repeated identical condition does not spam duplicate alerts.
Use prerecorded footage with known outcomes; mention live-RTSP as an available extension rather than relying on it live.

32. Open Questions and Future Enhancements
Open questions

How many cameras/zones should the hackathon demo actually cover — 1 or 2?
Who plays "supervisor" during the judged demo, and is a second role (manager view) shown?
Is a short evidence video clip in scope, or snapshots only, given the timebox?
Future enhancements

RTSP live ingestion as default input.
PostGIS polygons + spatial indexing for real floor plans.
pgvector-based anonymous worker re-identification across cameras.
SMS/email/push notification channels with role-based routing.
Camera health dashboard and predictive maintenance.
Fuller Supervisor Copilot Agent (natural-language incident summaries, trend Q&A).