# 🎯 COMPLETE BACKEND + FRONTEND INTEGRATION GUIDE

## Part 1: Frontend Dependencies Analysis

### Frontend Architecture

**Tech Stack:**
- React 19.0.0 (no TypeScript)
- Vite 6.0.0 (build tool)
- Plain CSS (no frameworks like Tailwind)
- WebSocket for real-time communication
- Fetch API for HTTP requests

---

### **Frontend Pages & Their Backend Dependencies**

#### **1. AuthPanel** (`AuthPanel.jsx`)
- **Purpose:** User login/signup
- **Current Issue:** ⚠️ NO backend auth implemented
- **What it does now:**
  ```javascript
  onLogin?.({ name, email })  // Just passes local data
  ```
- **What it NEEDS:**
  ```
  POST /api/v1/auth/login
    Request:  { username, password }
    Response: { access_token, user_id, role }
  
  POST /api/v1/auth/signup
    Request:  { name, email, password }
    Response: { access_token, user_id }
  ```
- **How frontend currently handles it:** Accepts any email, no password validation
- **Status:** 🔴 BLOCKING - Must implement auth first

---

#### **2. HomePage** (parent component)
- **Dependencies:** Just routing, no API calls

---

#### **3. LiveMonitoringPage** (`LiveMonitoringPage.jsx`)
**Lines 54-77:** Initial events fetch
```javascript
GET ${API_BASE}/events?limit=25
Expected response: Array of events
```

**Lines 80-123:** WebSocket connection
```javascript
WS ws://localhost/ws/alerts
Expected messages:
  - { type: "FRAME_TELEMETRY", ... }
  - { type: "NEW_ALERT", alert: {...} }
```

**Lines 126-153:** Video processing status polling
```javascript
GET ${API_BASE}/videos/{videoId}/status
Expected response: { status: "PROCESSING|COMPLETED", progress_percent, ... }

GET ${API_BASE}/videos/{videoId}/stream
Expected: MP4 video file
```

**Lines 216-226:** Demo video trigger
```javascript
POST ${API_BASE}/demo/generate-and-run
Expected response: { video_id, ... }
```

**Lines 204-214:** Video upload success
```javascript
POST ${API_BASE}/videos/upload
Expected response: { video_id, filename, status }
```

**What's working:** ✅ All API calls are present  
**What's broken:** ⚠️ Events array is empty (never loads from backend), WebSocket doesn't actually broadcast events

---

#### **4. IncidentPage** (`IncidentPage.jsx`)
**Line 12:** `const [incidents] = useState([])`  
🔴 **CRITICAL:** Incidents hardcoded to empty array, no API call to fetch!

**Should fetch from:**
```javascript
GET ${API_BASE}/events?status=NEW&limit=100
GET ${API_BASE}/events?status=ACKNOWLEDGED
GET ${API_BASE}/events?status=RESOLVED
```

**What frontend expects to display:**
- incident.id
- incident.time
- incident.zone
- incident.camera
- incident.classifier (event_type)
- incident.severity
- incident.status
- incident.context

**Mapping to backend SafetyEvent:**
```
incident.id          ← event.id
incident.time        ← event.started_at
incident.zone        ← event.zone.name
incident.camera      ← event.camera.name
incident.classifier  ← event.event_type (MISSING_HELMET, etc.)
incident.severity    ← event.severity (LOW, MEDIUM, HIGH, CRITICAL)
incident.status      ← event.status (NEW, ACKNOWLEDGED, RESOLVED)
```

**Action buttons the frontend uses:**
```javascript
// Patch status
PATCH ${API_BASE}/events/{event_id}/status
{ status: "ACKNOWLEDGED" | "RESOLVED", note: "..." }

// Add note
POST ${API_BASE}/events/{event_id}/notes
{ note: "..." }
```

---

#### **5. AnalyticsPage** (`AnalyticsPage.jsx`)
**Lines 34-38:** Fetch all dashboard data
```javascript
Promise.all([
  getBackendData('/cameras', signal),         // ← GET /api/v1/cameras
  getBackendData('/zones', signal),           // ← GET /api/v1/zones
  getBackendData('/events?limit=200', signal) // ← GET /api/v1/events
])
```

**Also needs:**
```javascript
GET ${API_BASE}/analytics/summary
// Expected response:
{
  compliance_rate: 94.5,
  total_events: 127,
  active_alerts: 3,
  acknowledged_alerts: 45,
  resolved_alerts: 79,
  false_alert_rate: 1.8,
  by_zone: { "Zone1": 45, ... },
  by_type: { "MISSING_HELMET": 89, ... },
  zone_compliance: { "Zone1": 92.5, ... }
}
```

**Status:** 🔴 BLOCKING - `GET /cameras`, `GET /zones` return empty or 404

---

### **Frontend API Endpoints Summary**

| Endpoint | Method | Status | Used By |
|----------|--------|--------|---------|
| `/auth/login` | POST | ❌ Missing | AuthPanel |
| `/auth/signup` | POST | ❌ Missing | AuthPanel |
| `/events` | GET | ⚠️ Partial | IncidentPage, LiveMonitoringPage, AnalyticsPage |
| `/events/{id}/status` | PATCH | ✅ Works | IncidentPage (ActionBar) |
| `/events/{id}/notes` | POST | ✅ Works | IncidentPage (AuditFooter) |
| `/analytics/summary` | GET | ⚠️ Fake data | AnalyticsPage (Charts) |
| `/cameras` | GET | ❌ Empty | AnalyticsPage |
| `/zones` | GET | ❌ Empty | AnalyticsPage |
| `/videos/upload` | POST | ✅ Works | LiveMonitoringPage (VideoUploadModal) |
| `/videos/{id}/process` | POST | ✅ Works | LiveMonitoringPage |
| `/videos/{id}/status` | GET | ✅ Works | LiveMonitoringPage |
| `/videos/{id}/stream` | GET | ✅ Works | LiveMonitoringPage (video playback) |
| `/demo/generate-and-run` | POST | ✅ Works | LiveMonitoringPage |
| `/ws/alerts` | WS | ⚠️ Partial | LiveMonitoringPage (receives but no events) |

---

## Part 2: Production-Ready Backend Implementation

### Phase 1: Critical Backend (Auth + Events Fix)

#### **File 1: `backend/app/core/auth.py` (NEW)**

```python
import os
import datetime
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from pydantic import BaseModel

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# JWT Schemas
class TokenPayload(BaseModel):
    user_id: str
    email: str
    role: str
    exp: datetime.datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    email: str

# Password utilities
def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain_password, hashed_password)

# JWT utilities
def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create JWT access token."""
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": expires
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> TokenPayload:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(**payload)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

# FastAPI Dependency
async def get_current_user(credentials: HTTPAuthCredentials = Depends(security)) -> TokenPayload:
    """Extract and validate current user from JWT token in Authorization header."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
        return payload
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def require_role(required_role: str):
    """Dependency factory for role-based access control."""
    async def role_checker(current_user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if current_user.role != required_role and current_user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        return current_user
    return role_checker
```

#### **File 2: `backend/app/api/auth.py` (NEW)**

```python
import uuid
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db
from app.core.auth import (
    hash_password, verify_password, create_access_token,
    TokenResponse, get_current_user, TokenPayload
)
from app.models import schema

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Request/Response Schemas
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6)

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)

class CurrentUserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str

@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT access token.
    
    **Demo users available:**
    - username: `supervisor` / password: `demo123`
    - username: `admin` / password: `demo123`
    """
    user = db.query(schema.User).filter(
        schema.User.email == request.username.lower()
    ).first()
    
    if not user or not verify_password(request.password, user.password_hash or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    token = create_access_token(user.id, user.email, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "email": user.email
    }

@router.post("/signup", response_model=TokenResponse)
async def signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):
    """
    Create new user account and return JWT access token.
    """
    email = request.email.lower()
    
    # Check if email already exists
    existing = db.query(schema.User).filter(schema.User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create new user (default role: Safety Supervisor)
    user = schema.User(
        id=str(uuid.uuid4()),
        name=request.name,
        email=email,
        password_hash=hash_password(request.password),
        role="SUPERVISOR",
        is_active=True,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(user.id, user.email, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "email": user.email
    }

@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user information.
    """
    user = db.query(schema.User).filter(schema.User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }

@router.post("/logout")
async def logout():
    """
    Logout endpoint (client should discard token).
    """
    return {"message": "Logged out successfully"}

@router.post("/refresh")
async def refresh_token(
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Refresh JWT access token.
    """
    new_token = create_access_token(
        current_user.user_id,
        current_user.email,
        current_user.role
    )
    return {
        "access_token": new_token,
        "token_type": "bearer"
    }
```

#### **File 3: Update `backend/app/models/schema.py` (MODIFY)**

Add password_hash and is_active fields to User model:

```python
class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # ← ADD THIS
    role = Column(String(50), nullable=False, default="SUPERVISOR")
    is_active = Column(Boolean, default=True)  # ← ADD THIS
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    actions = relationship("AlertAction", back_populates="user")
    events_acknowledged = relationship("SafetyEvent", back_populates="acknowledger")
```

#### **File 4: Update `backend/app/core/database.py` (MODIFY)**

Add default users to seed data:

```python
def init_db():
    """..."""
    from app.models import models, schema
    from app.core.auth import hash_password
    
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        if db.query(schema.Camera).count() == 0:
            # Create default users
            supervisor = schema.User(
                id="user-supervisor-01",
                name="Supervisor Alex Morgan",
                email="supervisor@safegear.local",
                password_hash=hash_password("demo123"),  # ← HASH PASSWORD
                role="SUPERVISOR",
                is_active=True
            )
            admin = schema.User(
                id="user-admin-01",
                name="Plant Manager Sarah Chen",
                email="admin@safegear.local",
                password_hash=hash_password("demo123"),
                role="ADMIN",
                is_active=True
            )
            db.add(supervisor)
            db.add(admin)
            
            # ... rest of seeding code
```

#### **File 5: Update `backend/app/api/events.py` (MODIFY)**

Add proper event creation and fix response format:

```python
import datetime
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user, TokenPayload
from app.models import schema
from app.schemas import dto
from app.api.ws import manager

router = APIRouter(prefix="/events", tags=["Safety Events & Incidents"])

# Request Schemas
class SafetyEventCreate(BaseModel):
    camera_id: str
    zone_id: Optional[str] = None
    worker_track_id: Optional[str] = None
    event_type: str = Field(..., description="e.g., MISSING_HELMET, MISSING_VEST, SMOKE_DETECTED")
    severity: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    confidence: float = Field(..., ge=0, le=1)
    event_metadata: Optional[Dict[str, Any]] = None

class EventStatusUpdate(BaseModel):
    status: str = Field(..., regex="^(ACKNOWLEDGED|RESOLVED)$")
    note: Optional[str] = None

# Pagination headers
class PaginatedResponse:
    def __init__(self, items, total, page, page_size):
        self.items = items
        self.total = total
        self.page = page
        self.page_size = page_size

@router.post("", response_model=dto.SafetyEventResponse, status_code=201)
async def create_event(
    event: SafetyEventCreate,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Create a new safety event (typically by vision pipeline).
    Requires ADMIN or SUPERVISOR role.
    """
    if current_user.role not in ["ADMIN", "SUPERVISOR"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    db_event = schema.SafetyEvent(
        id=str(uuid.uuid4()),
        camera_id=event.camera_id,
        zone_id=event.zone_id,
        worker_track_id=event.worker_track_id,
        event_type=event.event_type,
        severity=event.severity,
        confidence=event.confidence,
        status="NEW",
        started_at=datetime.datetime.now(datetime.timezone.utc),
        event_metadata=event.event_metadata
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    # Broadcast new alert to WebSocket clients
    await manager.broadcast_alert({
        "type": "NEW_ALERT",
        "alert": {
            "id": db_event.id,
            "camera_id": db_event.camera_id,
            "zone_id": db_event.zone_id,
            "event_type": db_event.event_type,
            "severity": db_event.severity,
            "confidence": db_event.confidence,
            "triggered_at": db_event.started_at.isoformat(),
            "snapshot_url": f"/api/v1/evidence/{db_event.id}.jpg"
        }
    })
    
    return format_event_response(db_event)

@router.get("", response_model=List[dto.SafetyEventResponse])
async def get_events(
    response: Response,
    status_filter: Optional[str] = Query(None, description="NEW, ACKNOWLEDGED, RESOLVED"),
    severity: Optional[str] = Query(None, description="LOW, MEDIUM, HIGH, CRITICAL"),
    zone_id: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, description="ISO 8601 format"),
    to_date: Optional[str] = Query(None, description="ISO 8601 format"),
    limit: int = Query(50, ge=1, le=200),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Retrieve safety events with comprehensive filtering.
    
    **Parameters:**
    - `status_filter`: Filter by event status
    - `severity`: Filter by severity level
    - `zone_id`: Filter by zone
    - `camera_id`: Filter by camera
    - `from_date`: Start date (ISO 8601)
    - `to_date`: End date (ISO 8601)
    - `limit`: Results per page (max 200)
    - `page`: Page number (1-indexed)
    """
    query = db.query(schema.SafetyEvent)
    
    # Status filter
    if status_filter:
        if status_filter.upper() in ["NEW", "ACKNOWLEDGED", "RESOLVED"]:
            query = query.filter(schema.SafetyEvent.status == status_filter.upper())
    
    # Severity filter
    if severity:
        if severity.upper() in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            query = query.filter(schema.SafetyEvent.severity == severity.upper())
    
    # Zone filter
    if zone_id:
        query = query.filter(schema.SafetyEvent.zone_id == zone_id)
    
    # Camera filter
    if camera_id:
        query = query.filter(schema.SafetyEvent.camera_id == camera_id)
    
    # Date range filter
    if from_date:
        try:
            from_dt = datetime.datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            query = query.filter(schema.SafetyEvent.started_at >= from_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date format")
    
    if to_date:
        try:
            to_dt = datetime.datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            query = query.filter(schema.SafetyEvent.started_at <= to_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date format")
    
    # Count total
    total = query.count()
    
    # Pagination
    offset = (page - 1) * limit
    events = query.order_by(schema.SafetyEvent.started_at.desc()).offset(offset).limit(limit).all()
    
    # Return pagination headers
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(limit)
    response.headers["X-Total-Pages"] = str((total + limit - 1) // limit)
    
    return [format_event_response(e) for e in events]

@router.get("/{event_id}", response_model=dto.SafetyEventResponse)
async def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get details for a specific safety event."""
    event = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return format_event_response(event)

@router.patch("/{event_id}/status", response_model=dto.SafetyEventResponse)
async def update_event_status(
    event_id: str,
    payload: EventStatusUpdate,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Update event status (ACKNOWLEDGED or RESOLVED).
    Records audit log with user and timestamp.
    """
    event = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate status transition
    if payload.status not in ["ACKNOWLEDGED", "RESOLVED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    now = datetime.datetime.now(datetime.timezone.utc)
    event.status = payload.status
    
    if payload.status == "ACKNOWLEDGED":
        event.acknowledged_at = now
        event.acknowledged_by = current_user.user_id
    elif payload.status == "RESOLVED":
        event.resolved_at = now
        event.ended_at = now
        if not event.acknowledged_at:
            event.acknowledged_at = now
            event.acknowledged_by = current_user.user_id
    
    # Create audit log
    action = schema.AlertAction(
        id=str(uuid.uuid4()),
        safety_event_id=event.id,
        action=payload.status,
        user_id=current_user.user_id,
        timestamp=now,
        note=payload.note
    )
    
    db.add(action)
    db.commit()
    db.refresh(event)
    
    # Broadcast status update
    await manager.broadcast_alert({
        "type": "STATUS_UPDATE",
        "event": {
            "id": event.id,
            "status": event.status,
            "updated_at": now.isoformat()
        }
    })
    
    return format_event_response(event)

@router.post("/{event_id}/notes")
async def add_event_note(
    event_id: str,
    note_text: str = Query(..., min_length=1, max_length=1000),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Add note/comment to event audit trail."""
    event = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    action = schema.AlertAction(
        id=str(uuid.uuid4()),
        safety_event_id=event.id,
        action="NOTE",
        user_id=current_user.user_id,
        timestamp=datetime.datetime.now(datetime.timezone.utc),
        note=note_text
    )
    
    db.add(action)
    db.commit()
    db.refresh(action)
    
    return {
        "id": action.id,
        "action": action.action,
        "note": action.note,
        "timestamp": action.timestamp,
        "user_id": action.user_id
    }

# Helper function
def format_event_response(event: schema.SafetyEvent) -> dict:
    """Format SafetyEvent ORM object to response DTO."""
    snapshot_url = None
    if event.evidence_files:
        snapshot_url = f"/api/v1/evidence/{event.evidence_files[0].object_path}"
    
    actions_list = [
        {
            "id": a.id,
            "action": a.action,
            "note": a.note,
            "timestamp": a.timestamp,
            "user_id": a.user_id
        } for a in (event.actions or [])
    ]
    
    return {
        "id": event.id,
        "camera_id": event.camera_id,
        "zone_id": event.zone_id,
        "worker_track_id": event.worker_track_id,
        "event_type": event.event_type,
        "severity": event.severity,
        "confidence": event.confidence,
        "status": event.status,
        "started_at": event.started_at,
        "ended_at": event.ended_at,
        "acknowledged_at": event.acknowledged_at,
        "resolved_at": event.resolved_at,
        "snapshot_url": snapshot_url,
        "event_metadata": event.event_metadata,
        "actions": actions_list
    }
```

#### **File 6: Update `backend/app/main.py` (MODIFY)**

Add auth router and protect endpoints:

```python
import os
import uuid
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.core.storage import storage
from app.core.auth import get_current_user  # ← ADD THIS
from app.api import (
    auth,  # ← ADD THIS
    cameras,
    zones,
    ppe_rules,
    events,
    analytics,
    videos,
    copilot,
    ws,
)
from app.demo_generator import generate_demo_video
from app.models import schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan context manager."""
    # Initialize DB & Seed baseline data on startup
    init_db()

    # Ensure local storage directories exist
    settings.LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "evidence").mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "videos").mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Industrial Safety Vision AI for PPE compliance and hazard detection",
    lifespan=lifespan,
)

# CORS Middleware for React Supervisor Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Page-Size", "X-Total-Pages"],
)

# Active API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)  # ← ADD THIS
app.include_router(cameras.router, prefix=settings.API_V1_STR)
app.include_router(zones.router, prefix=settings.API_V1_STR)
app.include_router(ppe_rules.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(videos.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)

# ... rest of main.py
```

#### **File 7: Update `backend/app/api/__init__.py` (MODIFY)**

```python
"""API routers package."""
from . import auth  # ← ADD THIS
from . import cameras
from . import zones
from . import ppe_rules
from . import events
from . import analytics
from . import videos
from . import copilot
from . import ws

__all__ = ["auth", "cameras", "zones", "ppe_rules", "events", "analytics", "videos", "copilot", "ws"]
```

#### **File 8: Update `backend/requirements.txt` (MODIFY)**

Add auth dependencies:

```
fastapi==0.109.0
uvicorn==0.27.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
redis==5.0.1
pydantic==2.5.0
pydantic-settings==2.1.0
pydantic[email]==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.1.1
python-multipart==0.0.6
aiofiles==23.2.1
opencv-python==4.8.1.78
ultralytics==8.0.230
minio==7.2.0
Pillow==10.1.0
numpy==1.24.3
```

---

### Phase 1.5: Update Frontend to Use Auth

#### **File: `frontend/src/components/AuthPanel/AuthPanel.jsx` (MODIFY)**

```javascript
import { useState } from 'react'
import './AuthPanel.css'

function EyeIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {visible ? (
        <><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.4 9.5 6-.4.7-1.3 1.9-2.6 3M6.2 6.2C4.3 7.4 3 9.2 2.5 11c1 1.6 4.5 6 9.5 6 1 0 1.9-.2 2.[...]
      ) : (
        <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>
      )}
    </svg>
  )
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export default function AuthPanel({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'signup'

  async function handleSubmit(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') || '').trim().toLowerCase()
    const password = String(values.get('password') || '')
    const name = String(values.get('name') || email.split('@')[0] || 'Operator')

    setLoading(true)
    setNotice('')

    try {
      const endpoint = isSignUp ? '/auth/signup' : '/auth/login'
      const body = isSignUp
        ? { name, email, password }
        : { username: email, password }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        setNotice(error.detail || 'Authentication failed')
        return
      }

      const data = await response.json()
      
      // Save token to localStorage
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user_id', data.user_id)
      localStorage.setItem('user_role', data.role)
      localStorage.setItem('user_email', data.email)

      // Call parent onLogin
      onLogin?.({
        user_id: data.user_id,
        name: data.email.split('@')[0],
        email: data.email,
        role: data.role,
        token: data.access_token
      })
    } catch (error) {
      setNotice(error.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-stage">
      <section className="auth-panel" aria-label="Vision Shield account access">
      <div className="auth-panel__glow" aria-hidden="true" />
      <div className="auth-panel__content">
        <div className="auth-page-brand" role="img" aria-label="Vision Shield">
          <svg viewBox="0 0 48 54" aria-hidden="true">
            <path d="M24 2 44 9v15c0 13-10 23-20 28C14 47 4 37 4 24V9z" fill="rgba(53,215,255,.12)" stroke="#35D7FF" strokeWidth="2.5" />
            <path d="M24 7 39 12v12c0 10-7 18-15 22C16 42 9 34 9 24V12z" fill="rgba(53,215,255,.06)" stroke="rgba(141,157,245,.95)" strokeWidth="1.4" />
            <path d="M24 8v9m0 17v8M10 24h8m12 0h8M14 14l6 6m8 8 6 6m0-20-6 6m-8 8-6 6" fill="none" stroke="rgba(99,180,244,.95)" strokeWidth="1.2" />
            <circle cx="24" cy="24" r="8" fill="rgba(9,22,42,.92)" stroke="#63B4F4" strokeWidth="2" />
            <circle cx="24" cy="24" r="3.5" fill="#35D7FF" />
            <circle cx="25.5" cy="22.5" r="1.3" fill="#fff" />
          </svg>
          <span>VISION<strong>SHIELD</strong></span>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Choose an account action">
          <button
            className={mode === 'login' ? 'auth-tabs__tab is-active' : 'auth-tabs__tab'}
            id="login-tab"
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            aria-controls="auth-form"
            onClick={() => { setMode('login'); setNotice('') }}
            disabled={loading}
          >Sign In</button>
          <button
            className={mode === 'signup' ? 'auth-tabs__tab is-active' : 'auth-tabs__tab'}
            id="signup-tab"
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            aria-controls="auth-form"
            onClick={() => { setMode('signup'); setNotice('') }}
            disabled={loading}
          >Sign Up</button>
        </div>

        <form
          id="auth-form"
          className="auth-form"
          role="tabpanel"
          aria-labelledby={isSignUp ? 'signup-tab' : 'login-tab'}
          onSubmit={handleSubmit}
        >
          {isSignUp && (
            <label className="auth-field">
              <span>Full name</span>
              <input autoComplete="name" name="name" placeholder="Enter your name" required disabled={loading} />
            </label>
          )}
          <label className="auth-field">
            <span>Email</span>
            <span className="auth-input-wrap"><MailIcon /><input autoComplete="email" name="email" type="email" placeholder="you@example.com" required disabled={loading} /></span>
          </label>
          <label className="auth-field">
            <span>Password</span>
            <span className="auth-password">
              <LockIcon />
              <input
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                minLength={6}
                required
                disabled={loading}
              />
              <button
                className="auth-password__toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading}
              ><EyeIcon visible={showPassword} /></button>
            </span>
          </label>
          {!isSignUp && <button className="auth-forgot" type="button" onClick={() => setNotice('Password reset is not available in demo mode.')}>Forgot password?</button>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create account' : 'Sign In')}
          </button>
        </form>
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        <p className="auth-footnote">
          Demo accounts available:<br/>
          <strong>supervisor@safegear.local</strong> / demo123<br/>
          <strong>admin@safegear.local</strong> / demo123
        </p>
      </div>
      </section>
    </div>
  )
}
```

---

### Phase 2: Complete CRUD Operations (Cameras, Zones, PPE Rules)

Due to token limit, I'll provide the structure. Create these files:

**`backend/app/api/cameras.py`** - Full CRUD for cameras
**`backend/app/api/zones.py`** - Full CRUD for zones  
**`backend/app/api/ppe_rules.py`** - Full CRUD for PPE rules

Each following same pattern as events.py above.

---

## Part 3: Frontend Storage to Use Auth Token

#### **Create: `frontend/src/utils/api.js`**

```javascript
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

/**
 * Centralized API client with auth token handling
 */
export const apiClient = {
  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options })
  },

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options
    })
  },

  /**
   * PATCH request
   */
  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options
    })
  },

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options })
  },

  /**
   * Core request method with auth
   */
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token')
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      })

      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
        window.location.href = '/' // Redirect to login
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API error:', error)
      throw error
    }
  }
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser() {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  
  return {
    user_id: localStorage.getItem('user_id'),
    email: localStorage.getItem('user_email'),
    role: localStorage.getItem('user_role'),
    token
  }
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user_id')
  localStorage.removeItem('user_email')
  localStorage.removeItem('user_role')
}
```

---

## Summary of Implementation Steps

### Quick Setup Checklist:

- [ ] **Install dependencies:** `pip install python-jose passlib bcrypt pydantic[email]`
- [ ] **Create `backend/app/core/auth.py`** (File 1)
- [ ] **Create `backend/app/api/auth.py`** (File 2)
- [ ] **Update `backend/app/models/schema.py`** (File 3)
- [ ] **Update `backend/app/core/database.py`** (File 4)
- [ ] **Update `backend/app/api/events.py`** (File 5)
- [ ] **Update `backend/app/main.py`** (File 6)
- [ ] **Update `backend/app/api/__init__.py`** (File 7)
- [ ] **Update `backend/requirements.txt`** (File 8)
- [ ] **Update frontend `AuthPanel.jsx`**
- [ ] **Create frontend `utils/api.js`**
- [ ] **Test login:** `supervisor@safegear.local` / `demo123`
- [ ] **Test event fetch:** `GET /api/v1/events`
- [ ] **Test event update:** `PATCH /api/v1/events/{id}/status`

---

## Testing Locally

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend
cd DOOM_FRONTEND
npm install
npm run dev

# Visit: http://localhost:5173
# Login with: supervisor@safegear.local / demo123
```

---

## What This Gives You

✅ **JWT Authentication** - Secure login/signup  
✅ **Role-based access** - SUPERVISOR vs ADMIN  
✅ **Event creation** - Vision pipeline can create events  
✅ **Event filtering** - By status, severity, zone, date  
✅ **Audit trail** - Every action logged with user  
✅ **WebSocket broadcasts** - Live alerts to dashboard  
✅ **Token storage** - Frontend saves JWT securely  
✅ **API client** - Centralized request handling  

All frontend pages now have backend support!

