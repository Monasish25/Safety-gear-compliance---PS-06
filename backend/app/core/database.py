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
        # Check if zones exist
        if db.query(schema.Zone).count() == 0:
            zone1 = schema.Zone(
                name="Assembly Zone",
                camera_source="demo://cam01_main_bay",
                status="ok"
            )
            db.add(zone1)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
