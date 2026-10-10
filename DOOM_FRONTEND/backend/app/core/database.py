import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Create engine with sqlite support if applicable
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models import schema
    Base.metadata.create_all(bind=engine)
    
    # Seed default data if empty
    db = SessionLocal()
    try:
        # Check if cameras exist
        if db.query(schema.Camera).count() == 0:
            # Create default supervisor
            supervisor = schema.User(
                id=str(uuid.uuid4()),
                name="Supervisor Alex Morgan",
                role="Safety Supervisor",
                email="alex.morgan@safeworks.internal"
            )
            admin = schema.User(
                id=str(uuid.uuid4()),
                name="Plant Manager Sarah Chen",
                role="Plant Manager",
                email="sarah.chen@safeworks.internal"
            )
            db.add(supervisor)
            db.add(admin)
            
            # Cameras
            cam1_id = "CAM_01"
            cam2_id = "CAM_02"
            
            cam1 = schema.Camera(
                id=cam1_id,
                name="Factory Floor - Main Bay (Cam 01)",
                location_label="Bay 1 (Assembly & Welding)",
                stream_url="demo://cam01_main_bay",
                is_active=True
            )
            cam2 = schema.Camera(
                id=cam2_id,
                name="Storage & HazMat Annex (Cam 02)",
                location_label="Chemical Storage Bay",
                stream_url="demo://cam02_hazmat",
                is_active=True
            )
            db.add(cam1)
            db.add(cam2)
            db.flush()
            
            # Zones (PRD Section 15)
            # Coordinates normalized or pixel scale (e.g. 1280x720)
            zone_assembly = schema.Zone(
                id="ZONE_ASSEMBLY",
                camera_id=cam1_id,
                name="Assembly Zone",
                risk_level="Medium",
                polygon={
                    "points": [[40, 60], [600, 60], [600, 680], [40, 680]],
                    "x_min": 40, "y_min": 60, "x_max": 600, "y_max": 680
                }
            )
            zone_welding = schema.Zone(
                id="ZONE_WELDING",
                camera_id=cam1_id,
                name="Welding Zone",
                risk_level="High",
                polygon={
                    "points": [[620, 60], [1240, 60], [1240, 680], [620, 680]],
                    "x_min": 620, "y_min": 60, "x_max": 1240, "y_max": 680
                }
            )
            zone_chemical = schema.Zone(
                id="ZONE_CHEMICAL",
                camera_id=cam2_id,
                name="Chemical Storage",
                risk_level="Critical",
                polygon={
                    "points": [[100, 100], [1180, 100], [1180, 650], [100, 650]],
                    "x_min": 100, "y_min": 100, "x_max": 1180, "y_max": 650
                }
            )
            db.add(zone_assembly)
            db.add(zone_welding)
            db.add(zone_chemical)
            db.flush()
            
            # PPE Rules per zone (PRD Section 15)
            rule_assembly = schema.PPERule(
                id=str(uuid.uuid4()),
                zone_id="ZONE_ASSEMBLY",
                helmet_required=True,
                vest_required=True,
                gloves_required=False,
                mask_required=False
            )
            rule_welding = schema.PPERule(
                id=str(uuid.uuid4()),
                zone_id="ZONE_WELDING",
                helmet_required=True,
                vest_required=True,
                gloves_required=True,
                mask_required=False
            )
            rule_chemical = schema.PPERule(
                id=str(uuid.uuid4()),
                zone_id="ZONE_CHEMICAL",
                helmet_required=True,
                vest_required=True,
                gloves_required=True,
                mask_required=True
            )
            db.add(rule_assembly)
            db.add(rule_welding)
            db.add(rule_chemical)
            
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
