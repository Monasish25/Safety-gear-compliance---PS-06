import uuid
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("safegear.database")

# Production PostgreSQL Engine (Supabase)
connect_args = {}
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif settings.DATABASE_URL.startswith("postgresql://") and not settings.DATABASE_URL.startswith("postgresql+"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,
    )
    # Test connection
    with engine.connect() as conn:
        logger.info("Successfully connected to Production PostgreSQL (Supabase).")
except Exception as e:
    logger.critical(f"FATAL: PostgreSQL connection failed. Production system cannot start without database. Error: {e}")
    raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI DB Session Dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Ensures all ORM models are registered on Base.metadata and creates all tables.
    Seeds default factory zones if empty.
    """
    # Import all models to register on Base.metadata
    from app.models import models, schema  # noqa: F401

    # Create all tables on engine
    Base.metadata.create_all(bind=engine)

    # Seed default data if database is empty
    db = SessionLocal()
    try:
        if db.query(schema.Zone).count() == 0:
            cam = schema.Camera(
                camera_id="CAM_MAIN_01",
                name="Main Factory Floor Cam 1",
                location_label="Building A - Primary Bay",
                is_active=True
            )
            db.add(cam)

            zone1 = schema.Zone(
                zone_id="ZONE_ASSEMBLY_01",
                camera_id=cam.camera_id,
                name="Assembly Zone",
                risk_level="Medium",
                camera_source="demo://cam01_main_bay",
                status="ok"
            )
            db.add(zone1)

            rule1 = schema.ComplianceRule(
                rule_id="RULE_ASSEMBLY_01",
                zone_id=zone1.zone_id,
                helmet_required=True,
                vest_required=True,
                goggles_required=False
            )
            db.add(rule1)

            db.commit()
            logger.info("Successfully initialized database tables and seeded default factory zone.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database defaults: {e}")
    finally:
        db.close()
