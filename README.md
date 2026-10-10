# Industrial Safety Vision AI (Safety-Gear-Compliance)

## 1. Executive Summary & Introduction
The Industrial Safety Vision AI (Safety-Gear-Compliance) project represents a paradigm shift in factory floor monitoring and occupational hazard prevention. In modern industrial environments, the enforcement of Personal Protective Equipment (PPE) policies is traditionally handled through manual supervision, random audits, and post-incident reviews. This archaic approach is fundamentally flawed as it relies on human vigilance, which is subject to fatigue, distraction, and limited field of view. Consequently, safety violations frequently go unnoticed until an accident occurs, resulting in severe injuries, loss of life, and catastrophic legal and financial liabilities for the enterprise.

To eliminate these vulnerabilities, this project introduces a fully autonomous, real-time Computer Vision system capable of continuously monitoring multiple camera feeds without human intervention. By leveraging state-of-the-art neural networks—specifically customized variants of the Ultralytics YOLOv8 architecture—the system actively scans for personnel, evaluates their compliance with mandated PPE protocols (such as wearing safety helmets, high-visibility vests, and industrial gloves), and simultaneously monitors the environment for catastrophic hazards like fire and smoke.

When a violation or hazard is detected, the system does not simply log a passive record. Instead, it utilizes an advanced temporal evaluation engine to confirm the violation over consecutive frames, thereby virtually eliminating false positives caused by transient camera glitches or temporary physical occlusions. Once confirmed, the incident is broadcast in real-time with sub-100 millisecond latency via WebSockets to a high-fidelity, React-based supervisor dashboard. This dashboard, designed with a premium, futuristic aesthetic (often referred to as the 'DOOM' aesthetic or glassmorphism), provides safety managers with an unprecedented level of situational awareness. Supervisors can view live telemetry overlays, review high-resolution AI-captured evidence snapshots of the exact moment a violation occurred, acknowledge incidents, and resolve them—all from a centralized command center.

This README document serves as the comprehensive, authoritative guide to the architecture, codebase, algorithms, and operational procedures of the Industrial Safety Vision AI system. It is intended for software engineers, computer vision researchers, DevOps specialists, and industrial safety officers who seek a profound understanding of how this system operates at every level of the technology stack.

## 2. Project Objectives & Core Problem Statement

### The Problem
Industrial environments—such as manufacturing plants, construction sites, chemical refineries, and logistics hubs—are inherently dangerous. Workers are routinely exposed to heavy machinery, extreme temperatures, hazardous chemicals, and suspended loads. To mitigate these risks, occupational safety regulatory bodies (such as OSHA in the United States) mandate the strict usage of PPE. Despite these mandates, compliance is notoriously difficult to enforce. 
1. **Human Limitation:** A single safety officer cannot continuously monitor hundreds of workers across millions of square feet of facility space.
2. **Delayed Response:** When an incident occurs, the response is reactive rather than proactive. By the time a supervisor is notified of a missing safety vest, the worker may have already entered a high-risk zone.
3. **Lack of Auditable Evidence:** Disciplinary actions or safety retraining programs are often hindered by a lack of objective evidence. 'He-said-she-said' disputes arise because there is no photographic proof of the safety violation.
4. **False Positives in Legacy Systems:** Older automated systems relied on basic motion detection or primitive Haar Cascade classifiers. These systems generated thousands of false alarms (e.g., mistaking a yellow box for a yellow helmet), leading to 'alarm fatigue' where supervisors simply began ignoring the system entirely.

### The Objectives
This project was engineered from the ground up to solve these exact problems. The primary objectives are:
1. **Absolute Autonomy:** The system must operate 24/7 on edge computing hardware without requiring manual calibration for different lighting conditions or camera angles.
2. **Zero-Latency Alerting:** The time between a worker removing their safety gear and the supervisor receiving an alert on the dashboard must be less than 500 milliseconds.
3. **High Precision & Recall:** The AI must achieve over 95% precision (minimizing false positives) and over 95% recall (minimizing false negatives). It achieves this through a hybrid approach: using deep learning (YOLOv8) for primary detection and optical color-signature analysis (HSV masking) as a fallback mechanism.
4. **Actionable Evidence:** Every single confirmed violation must be accompanied by a high-resolution snapshot stored in a secure database, providing undeniable proof of the infraction for compliance audits.
5. **Architectural Decoupling:** The heavy computational workload of running neural network inferences must not block or slow down the web server that serves the user interface. The system must be strictly decoupled into a background AI worker and a fast RESTful API server.

## 3. High-Level Architecture & Data Flow

The architecture of the Safety-Gear-Compliance system is divided into three highly decoupled, highly cohesive subsystems: The AI Inference Worker, the FastAPI Backend Server, and the React Frontend Dashboard. This separation of concerns is critical for scalability, fault tolerance, and performance.

### 3.1 Data Flow Pipeline
1. **Video Ingestion:** The AI Inference Worker connects to a camera feed. This can be a local USB webcam (for testing), a network-attached IP camera via RTSP (Real-Time Streaming Protocol), or a pre-recorded MP4 video file (for simulations).
2. **Frame Extraction & Preprocessing:** The worker extracts frames at a target rate (e.g., 25-30 FPS). The frames are resized and normalized to meet the input layer requirements of the YOLOv8 neural network (typically 640x640 pixels).
3. **Neural Network Inference:** The preprocessed frame is passed through two parallel YOLOv8 models. The first model (`PPE.pt`) scans for personnel and protective gear. The second model (`FireSmoke.pt`) scans for environmental hazards.
4. **Association & Sub-Box Generation:** The raw bounding boxes returned by YOLO are fed into an Association Engine. This engine maps isolated safety gear (like a helmet) to the specific person wearing it. It generates distinct tracking sub-boxes for the Head, Torso, and Hands.
5. **Non-Maximum Suppression (NMS):** To prevent the AI from hallucinating multiple overlapping boxes for a single person (especially when the person is very close to the camera), an Intersection-over-Union (IoU) filter mathematically eliminates duplicate detections.
6. **Temporal Confirmation:** The raw detections for that specific frame are passed to the Temporal Engine. The engine checks the recent history of that specific tracked worker. If a worker is missing a vest for just 1 frame (perhaps due to motion blur), it is ignored. If the worker is missing a vest for 30 consecutive frames (approximately 1 second), the engine upgrades the status to a Confirmed Alert.
7. **Database Storage & Snapshotting:** When a Confirmed Alert is generated, the AI Worker captures the current frame, draws the bounding boxes on it using OpenCV, saves the image as a JPG in the local storage volume, and commits a record to the SQLite Database via SQLAlchemy.
8. **WebSocket Broadcasting:** Simultaneously, the alert payload is sent to the FastAPI server, which instantly broadcasts the JSON payload via WebSockets to all connected React clients.
9. **UI Rendering:** The React dashboard receives the WebSocket message, instantly flashes a red warning on the screen, plays a warning sound, increments the KPI counters, and adds the incident to the live incident repository without requiring the user to refresh the page.

## 4. AI & Computer Vision Pipeline Deep Dive

The core intelligence of this project resides in the computer vision pipeline. It is not merely a wrapper around a YOLO model; it is a complex orchestration of multiple algorithms designed to achieve robust tracking and analysis.

### 4.1 Ultralytics YOLOv8 Integration
YOLO (You Only Look Once) version 8 is employed as the primary object detection engine. YOLOv8 is an anchor-free model that predicts the center of an object directly, which significantly speeds up inference and improves accuracy for small objects like gloves or safety glasses.
- **Model `PPE.pt`:** This weights file has been trained on thousands of annotated images of industrial workers. Its class list includes: `person`, `helmet`, `vest`, `gloves`, and `mask`. It outputs absolute pixel coordinates representing the bounding boxes of these objects.
- **Model `FireSmoke.pt`:** A separate model dedicated to detecting turbulent, non-rigid structures like smoke clouds and fire flames.

### 4.2 Intersection-over-Union (IoU) Non-Maximum Suppression
A critical challenge in close-range object detection is that the neural network may fire multiple times for the same object. For example, a worker's left shoulder and right shoulder might be misidentified as two separate people if the camera is too close.
To solve this, the pipeline implements a custom NMS algorithm based on IoU. 
1. The algorithm calculates the geometric intersection area of two bounding boxes.
2. It calculates the union (total area of both boxes combined).
3. It divides the intersection by the union to get a ratio between 0.0 and 1.0.
4. If the IoU ratio exceeds 0.35 (35% overlap), the system concludes that the two boxes represent the exact same physical person. The box with the lower confidence score is ruthlessly suppressed and deleted from the pipeline.

### 4.3 Fallback Optical Signature Analysis (HSV Masking)
Neural networks are powerful, but they can be unpredictable. If the YOLO model fails to detect a high-visibility vest due to unusual lighting or a rare camera angle, the system falls back to deterministic optical physics.
The pipeline extracts the Torso region of the detected person (mathematically defined as 20% to 75% of the height of the person's bounding box). It converts this sub-image from BGR color space to HSV (Hue, Saturation, Value) color space. 
In HSV space, the system applies strict threshold masks for 'Neon Fluorescent Yellow-Green' and 'Safety Orange'. It then counts the number of pixels that fall within these strict color ranges. If more than 10% of the torso region consists of these neon colors, the system overrides the YOLO model and confirms the presence of a safety vest. This hybrid approach guarantees exceptional recall rates.

### 4.4 The Sub-Box Association Engine
Simply detecting a helmet and a person is not enough. The system must mathematically prove that the helmet is ON the person. 
The Association Engine evaluates the geometric relationship between all detected PPE items and all detected persons. It checks if the center coordinate of a helmet falls within the upper 32% of a specific person's bounding box. If it does, the helmet is 'associated' with that person.
Crucially, the system extracts the RAW bounding boxes of the associated gear and passes them as `sub_boxes` to the frontend. This means that if a worker moves their hand, the 'Gloves' bounding box on the UI will dynamically physically follow the worker's hand on the screen, rather than remaining statically glued to their side.

## 5. Backend Architecture (FastAPI & SQLAlchemy)

The backend serves as the nervous system of the application. It is built in Python using FastAPI, chosen for its asynchronous capabilities (ASGI) and extreme performance, which rivals NodeJS and Go.

### 5.1 Decoupled Worker Architecture
A common anti-pattern in AI web applications is running the heavy OpenCV `cv2.read()` and YOLO `model.predict()` loops directly inside the web server's request-response cycle. This immediately blocks the event loop, causing the website to freeze.
This project entirely avoids this by segregating the AI into an independent script (`inference_worker.py`). The worker runs in a completely separate OS process. It communicates with the database directly and pushes updates to the FastAPI server asynchronously. The FastAPI server is therefore perfectly free to handle hundreds of concurrent REST API requests from the frontend without any stuttering.

### 5.2 RESTful API Design
The backend exposes a clean, documented REST API prefix at `/api/v1`.
- **`GET /events`**: The workhorse endpoint for the dashboard. It supports pagination (`?page=1&limit=50`), free-text search (`?query=helmet`), status filtering (`?status=open`), and severity filtering.
- **`PATCH /events/{alert_id}/status`**: Allows the supervisor to acknowledge or resolve an incident. It modifies the database state and instantly triggers a WebSocket broadcast so all other observing supervisors see the status change immediately.
- **`GET /analytics/kpi`**: Aggregates mathematical data for the frontend charts (e.g., grouping incidents by day or by zone).
- **`GET /evidence/{file_path}`**: A static file server that delivers the high-resolution JPG snapshots captured during violations.

### 5.3 WebSocket Manager
Real-time capabilities are driven by the `ws.py` module. It maintains a dictionary of active WebSocket connections. When the AI worker detects a violation, it triggers a payload that the ConnectionManager iterates over, sending JSON strings to every connected browser. This powers the live bounding boxes that literally track workers across the video feed at 30 FPS.

### 5.4 Database Schema (SQLAlchemy)
The system uses SQLAlchemy as an Object Relational Mapper (ORM). 
- **`Detection` Table**: A high-volume table that stores raw frame-by-frame metadata. Useful for training future AI models or auditing the model's confidence over time.
- **`Alert` Table**: A highly curated table that stores confirmed incidents. It includes foreign keys to the Zone and Camera, string fields for the violation reason, timestamps for the lifecycle (`triggered_at`, `acknowledged_at`, `resolved_at`), and the file path to the evidence snapshot.

## 6. Frontend Architecture (React, Vite, UI/UX)

The frontend is a Single Page Application (SPA) built with React and bundled with Vite for near-instant Hot Module Replacement (HMR) during development and highly optimized minification for production.

### 6.1 Aesthetic & UI/UX Design Philosophy
The UI was meticulously designed to evoke a premium, futuristic, command-center aesthetic, often described as a 'glassmorphism' or 'DOOM' theme. 
In industrial safety, operators stare at screens for 8-12 hours a day. White, glaring interfaces cause eye strain, while cluttered, generic interfaces cause cognitive overload.
To combat this, the frontend utilizes:
- **Deep Dark Mode Themes**: Using rich, desaturated blue/black backgrounds (`#0a0f16`).
- **Glassmorphism**: Semi-transparent panels with background-blur (`backdrop-filter`) to create a sense of depth and hierarchy without relying on harsh borders.
- **High-Contrast Typography**: Modern sans-serif fonts (like Inter or Roboto) with stark white text for primary data, and muted slate for secondary metadata.
- **Neon Accent Colors**: Strategic use of vibrant cyan (for active systems), amber (for warnings), and crimson red (for critical hazards). These colors are used sparingly so that when a red alert box flashes, it immediately commands the operator's attention.

### 6.2 Component Breakdown
- **`MainFeed.jsx`**: The crown jewel of the frontend. It renders a massive HTML5 Video element or standard `<img>` tag to receive the live camera stream. Overlaid on top of this video is a perfectly synchronized transparent `<div>` layer. This layer maps over the `sub_boxes` array received via WebSockets, rendering absolute-positioned borders that dynamically stick to the workers' heads, torsos, and hands in real-time.
- **`IncidentPage.jsx`**: A complex data repository. It utilizes `useMemo` to perform lightning-fast client-side filtering and searching across hundreds of historical incidents. It features pagination and batch operations.
- **`InspectionDrawer.jsx`**: An animated side-panel that slides out when an incident is clicked. It retrieves the AI evidence snapshot from the backend and provides the Acknowledge/Resolve workflow buttons.
- **`AnalyticsPage.jsx`**: A data visualization hub. It computes KPIs and generates bar charts (Events by Type, Events by Zone, 7-Day Trending) entirely using standard HTML/CSS, avoiding heavy charting libraries to maximize render performance.

### 6.3 State Management & Network Resilience
The frontend utilizes React hooks (`useState`, `useEffect`) and native `AbortController` APIs to manage network requests. If the user navigates away from the Analytics page while a request is pending, the `AbortController` instantly kills the HTTP request, preventing memory leaks and React state updates on unmounted components. The WebSockets feature auto-reconnection logic; if the backend goes offline, the UI elegantly displays an "API UNAVAILABLE" state and silently attempts to reconnect in the background.

## 7. Complete API Reference

For developers looking to integrate this system with third-party ERPs, SAP systems, or external alert routing tools (like PagerDuty or Slack), the backend offers a comprehensive REST API. All endpoints are prefixed with `/api/v1` and require a valid JWT Bearer token in the Authorization header.

### `GET /api/v1/events`
**Description:** Fetches a paginated list of confirmed safety incidents.
**Query Parameters:**
- `limit` (int, default=10): Number of results per page.
- `page` (int, default=1): Page offset.
- `status` (string): Filter by `open`, `acknowledged`, `resolved`, or `all`.
- `severity` (string): Filter by `WARNING` or `CRITICAL`.
**Returns:** JSON Array of Alert objects.

### `PATCH /api/v1/events/{alert_id}/status`
**Description:** Updates the lifecycle status of an incident.
**Body:** `{ "status": "resolved", "note": "Worker was instructed to put on vest." }`
**Returns:** The updated Alert object. Triggers a WebSocket status update.

### `GET /api/v1/cameras`
**Description:** Retrieves the status of all configured vision endpoints.
**Returns:** JSON Array containing camera details, RTSP URLs, and online/offline status boolean flags.

### `GET /api/v1/zones`
**Description:** Retrieves logical groupings of factory areas. Useful for determining the risk level of the area where a violation occurred.
**Returns:** JSON Array of Zone objects.

### `GET /api/v1/evidence/{snapshot_filename}`
**Description:** Static file server endpoint. Does not require JWT auth (to allow rendering in native `<img>` tags). 
**Returns:** A JPEG image file representing the exact frame where the AI confirmed a violation.

## 8. Deployment & Setup Guide

Deploying the Safety-Gear-Compliance system in a production environment requires careful orchestration of the frontend, backend, and AI worker.

### Prerequisites
- Operating System: Linux (Ubuntu 22.04 recommended) or Windows 11.
- Python: 3.10 or higher.
- Node.js: v18 or higher.
- Hardware: While it runs on CPUs, an NVIDIA GPU (RTX 3060 or higher) with CUDA Toolkit installed is highly recommended for processing multiple high-resolution RTSP streams simultaneously.

### Step 1: Backend Setup
1. Clone the repository and navigate to the `/backend` directory.
2. Create an isolated virtual environment: `python -m venv venv`.
3. Activate the environment: `source venv/bin/activate` (Linux) or `.\venv\Scripts\Activate.ps1` (Windows).
4. Install all heavy dependencies, including PyTorch, OpenCV, and Ultralytics: `pip install -r requirements.txt`.
5. Start the FastAPI REST server: `uvicorn app.main:app --host 0.0.0.0 --port 8000`. This server will now handle all HTTP and WebSocket traffic.

### Step 2: AI Worker Setup
1. Open a **second, separate terminal window**.
2. Navigate to `/backend` and activate the virtual environment again.
3. Launch the AI engine: `python inference_worker.py`. 
4. The worker will automatically look for available webcams or RTSP streams, load the YOLO `.pt` weights into RAM (or VRAM), and begin pushing bounding box telemetry to the database and FastAPI server.

### Step 3: Frontend Setup
1. Open a **third terminal window**.
2. Navigate to the `/DOOM_FRONTEND` directory.
3. Install Node modules: `npm install`.
4. Start the Vite development server: `npm run dev`.
5. Open your web browser and navigate to `http://localhost:5173`. You will be presented with the login screen. The dashboard will automatically connect to `localhost:8000` to retrieve data.

## 9. Troubleshooting & FAQ

**Q: The UI loads, but the live video feed is blank or shows an empty placeholder.**
*A:* This typically means the AI Inference Worker is not running or failed to connect to your camera. Check the terminal running `inference_worker.py`. Ensure that your camera is not being blocked by another application (like Zoom or Teams) and that privacy permissions allow Python to access the webcam.

**Q: The AI is drawing bounding boxes correctly, but NO incidents are ever showing up in the Incident Repository!**
*A:* This is due to the Temporal Confirmation Engine. If you take your helmet off for only half a second, the system assumes it was an anomaly and ignores it. You must simulate a sustained violation. Take off the required safety gear and remain in frame for at least 2 to 3 consecutive seconds for the system to confidently lock in the violation, capture the snapshot, and write it to the database.

**Q: Why is the AI drawing multiple overlapping bounding boxes on my face?**
*A:* This occurs when the subject is extremely close to the camera, causing the neural network to identify shoulders or shadows as separate entities. This project implements an IoU-based Non-Maximum Suppression filter to destroy duplicates. If you still see duplicates, ensure your codebase contains the latest updates in `pipeline.py` where `_compute_iou(cand, kept) > 0.35` is enforced.

**Q: Can I run this on a Raspberry Pi?**
*A:* The backend REST server and frontend React dashboard can run on almost anything. However, the `inference_worker.py` utilizing YOLOv8 requires significant compute. A standard Raspberry Pi will likely achieve less than 1 Frame Per Second (FPS). For edge deployments, an NVIDIA Jetson Nano or Orin Nano is highly recommended.

**Q: How do I change the safety rules? For example, requiring Gloves only in Zone B?**
*A:* The system is designed to handle per-zone compliance rules. You can modify the dictionary passed into the Temporal Engine within `pipeline.py` or `inference_worker.py` to specify `{ "gloves": True }` for Zone B and `{ "gloves": False }` for Zone A. The AI will immediately adjust its alert generation logic accordingly.

---
*End of Documentation. Property of the Industrial Safety Vision AI Development Team.*
