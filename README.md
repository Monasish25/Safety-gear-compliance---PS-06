# SMART ATTENDANCE 🛡️

Industrial Turnstile PPE Verification, Zone Access Control & Worker Attendance System.

**SMART ATTENDANCE** is a mission-critical, enterprise gate access and attendance verification platform designed for manufacturing plants, fabrication bays, and industrial turnstiles.

It enforces a strict, multi-stage access rule:
> **Access Granted & Marked Present** $\iff$ **Valid Signed QR Badge** $\text{AND}$ **All Required PPE Items for Assigned Zone WORN**.
>
> **Privacy Guarantee**: *Zero facial recognition. No biometric profiling. Face blurring applied on stored snapshots.*

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide React, Recharts.
- **Backend**: FastAPI (Python 3.11+), Uvicorn, WebSockets.
- **Database**: PostgreSQL 16 (SQLAlchemy 2.0 Async + `asyncpg` + Alembic migration) with high-reliability SQLite (`aiosqlite`) fallback.
- **Computer Vision**: Ultralytics YOLO11 / YOLOv8 fine-tuned for PPE, YOLO11-Pose (anatomical keypoint association), OpenCV, `pyzbar`, `zxing-cpp`.
- **Security**: Cryptographically signed HMAC-SHA256 badges, bcrypt password hashing, JWT access & refresh tokens in httpOnly secure cookies, role-based authorization (HEAD, SUPERVISOR, VIEWER).

---

## ⚡ Quick Start & Setup

### 1. Prerequisites
- Node.js 20+ & npm
- Python 3.11+
- PostgreSQL 16 (or Docker)

### 2. Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Configure environment variables in `backend/.env`:
   ```env
   # PostgreSQL Connection (or leave commented to use backend/data/smart_attendance.db fallback)
   DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@localhost:5432/smart_attendance

   # Security & Cryptography Keys
   SECRET_KEY=factory-super-secret-production-signing-key-32b
   HMAC_QR_SECRET=qr-super-secure-hmac-salt-secret-key-32b

   # Initial Head Administrator Credentials (Created on first startup)
   HEAD_EMAIL=head@factory.internal
   HEAD_PASSWORD=Admin@12345
   HEAD_NAME=Chief Plant Officer
   ```
4. Run Alembic database migrations:
   ```bash
   alembic upgrade head
   ```
5. Start the FastAPI server:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### 3. Frontend Setup
1. Configure frontend environment in `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🔐 Default Head Login Credentials

On first run, the system automatically initializes the HEAD admin account:
- **Email**: `head@factory.internal`
- **Initial Password**: `Admin@12345`
- *Note: On first login, the officer will be prompted to change the initial password.*

### User Roles & Clearances
- **HEAD (Admin)**: Full access, manages users, settings, shifts, work zones, PPE rules, workers, overrides, and vision model console.
- **SUPERVISOR**: Operates live gate scanner, photo upload inspection, approves zone transfers, issues manual check-in/out overrides.
- **VIEWER**: Read-only access to dashboard and compliance reports.

---

## 🏭 Factory Work Zones & Zone Transfer Logic

Each factory area is configured as a **Zone** with required PPE items:
- **Welding Bay**: Helmet, Vest, Shoes, Gloves, Goggles (5 items)
- **Assembly Line**: Helmet, Vest, Shoes, Gloves (4 items)
- **Warehouse**: Helmet, Vest, Shoes (3 items)
- **Packaging**: Vest, Shoes (2 items)
- **Quality Lab**: Goggles, Gloves (2 items)

### Transfer Decision Algorithm
When a worker is scanned at the turnstile:
1. **Full Compliance**: All required PPE for worker's default zone is worn $\rightarrow$ **ALLOWED** (Assigned Zone = Default Zone).
2. **Missing PPE Gear**: Worker missing required items $\rightarrow$ System dynamically evaluates alternative zones whose required PPE is satisfied by what the worker IS wearing.
   - Ranks candidates by same department first, then lowest current occupancy.
   - If match found $\rightarrow$ **TRANSFERRED** (e.g. "Gloves missing – moved from Welding Bay to Warehouse").
   - If no zone fits $\rightarrow$ **ACCESS_DENIED** ("Collect required PPE and scan again").
3. **Obscured Item**: Item marked `NOT_VISIBLE` $\rightarrow$ **NEEDS MANUAL CHECK** flagged for supervisor review.

---

## 🎥 Running Live Camera & RTSP Gate Scanners

Navigate to the **/scan** page:

### 1. Browser Webcam / USB Turnstile Camera
1. Select your optical device from the camera dropdown.
2. The browser captures frames via `getUserMedia` and streams them over WebSocket (`/ws/scan`) at ~3.5 FPS.
3. The server tracks people using temporal consistency (70% consistency across 8+ frames over ~2 seconds) before confirming entry.
4. Includes built-in 30-second anti-passback debounce per worker.

### 2. IP / RTSP Gate Camera
Configure the camera RTSP stream in **Settings** &bull; **Factory Gate Configuration**:
- Set `useRtsp: true`
- Enter `rtsp://admin:pass@192.168.1.100:554/live/ch0`

### 3. Photo Upload Inspection
Switch to the **Upload Photo** tab on `/scan` to perform single-frame high-resolution audits on uploaded images (JPG, PNG, WEBP &bull; up to 10 MB). Supervisors can optionally click *"Record attendance from this photo"*.

---

## 🪪 Worker Security QR Badges & Printing

Every registered personnel gets a tamper-proof QR badge:
- **Cryptographic Signature**: Encoded as an HMAC-SHA256 signed token (`wid + issued_at + signature`). Cannot be forged.
- **Public Verification**: Scanning with any smartphone opens `/qr/:token` showing badge validity, shift, default zone, today's attendance status, and transfer destination (without exposing sensitive personal contact info).
- **Supervisor Verification**: Scanning while logged in provides 30-day attendance history and manual override buttons.
- **Printing Badges**:
  - Individual: Click the QR icon on any worker row in **Workers** &bull; click **Print Badge**.
  - Bulk: Click **PRINT ALL BADGES** on the Workers page to download an A4 PDF sheet (8 badges per page, pre-rendered with ReportLab).

---

## 🤖 Vision Model Training & Evaluation (`ml/`)

The repository includes a self-contained training and benchmarking pipeline in `ml/`:

```
ml/
├── dataset.yaml     # YOLO class mappings (11 classes including explicit "no_X" negative classes)
├── train.py         # Fine-tuning script with augmentations (blur, glare, shift lighting)
├── evaluate.py      # Benchmark runner calculating per-class precision, recall, and mAP50
└── export.py        # ONNX and TensorRT export for high-performance deployment
```

### Run Model Evaluation:
```bash
python ml/evaluate.py --data ml/dataset.yaml --weights C:/Attendance System/models/yolov8n_ppe.pt
```

### Production Accuracy Targets:
- **Helmet & Vest**: $\ge 95\%$ Precision & Recall
- **Gloves, Goggles, Shoes**: $\ge 90\%$ Precision & Recall
- Benchmark results and supervisor retraining feedback are viewable by HEAD at `/model`.

---

## 🧪 Automated Test Suite

Run backend test suite with Pytest:
```bash
python -m pytest tests/test_backend.py -v
```

Tests cover:
- Login authentication, argon2/bcrypt password hashing, and role-based permissions.
- Cryptographic HMAC-SHA256 signature verification & tamper detection.
- Shift timing, grace period check-ins, and Night shift midnight crossing logic.
- Work zone transfer ranking and auto-selection.
- Hard access denial when worker gear fits no active zones.
- `NOT_VISIBLE` obscured gear triggering `NEEDS_MANUAL_CHECK`.
- Photo upload scan pipeline endpoint.

---

## 🐳 Docker Compose Deployment

Run the complete multi-service stack with PostgreSQL, FastAPI backend, and Nginx frontend:
```bash
docker compose up -d --build
```
- Frontend UI: `http://localhost`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 📄 License
Internal Proprietary Industrial Gate System &bull; All Rights Reserved.
