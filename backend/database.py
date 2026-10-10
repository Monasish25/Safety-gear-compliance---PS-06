"""
SQLAlchemy 2.0 Async Database Engine & Session Provider
Configured for Supabase PostgreSQL (via asyncpg).
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

# Load environment variables from both root and backend directory
load_dotenv()
backend_env_path = Path(__file__).resolve().parent / ".env"
if backend_env_path.exists():
    load_dotenv(dotenv_path=backend_env_path, override=True)

# Supabase PostgreSQL DATABASE_URL
DEFAULT_SUPABASE_URL = "postgresql+asyncpg://postgres.cdxprtdjuplpgacohljj:chiranjibsql@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
ENV_DB_URL = os.environ.get("DATABASE_URL", DEFAULT_SUPABASE_URL)

# Ensure asyncpg dialect prefix if raw postgresql:// or postgres:// passed
if ENV_DB_URL.startswith("postgresql://"):
    ENV_DB_URL = ENV_DB_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif ENV_DB_URL.startswith("postgres://"):
    ENV_DB_URL = ENV_DB_URL.replace("postgres://", "postgresql+asyncpg://", 1)

ACTIVE_DIALECT = "postgresql"
engine = None
AsyncSessionLocal = None


class Base(DeclarativeBase):
    pass


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Returns initialized AsyncSessionLocal session factory."""
    global AsyncSessionLocal
    return AsyncSessionLocal


async def get_session() -> AsyncSession:
    """FastAPI dependency for yielding async db sessions."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_database():
    """Initializes connection to the remote Supabase PostgreSQL database."""
    global engine, AsyncSessionLocal, ACTIVE_DIALECT

    # Connect to Supabase PostgreSQL
    # statement_cache_size=0 is required for Supabase transaction poolers (Supavisor / PgBouncer)
    connect_args = {
        "statement_cache_size": 0,
        "timeout": 15,
    }

    try:
        engine = create_async_engine(
            ENV_DB_URL,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
        async with engine.connect() as conn:
            await conn.exec_driver_sql("SELECT 1")

        host_label = ENV_DB_URL.split("@")[-1] if "@" in ENV_DB_URL else "Supabase"
        print(f"[DB-SUCCESS] Connected exclusively to Supabase PostgreSQL at {host_label}")
    except Exception as e:
        print(f"[DB-ERROR] Failed to connect to Supabase database: {e}")
        raise RuntimeError(
            f"Cannot connect to Supabase PostgreSQL. Please verify DATABASE_URL in backend/.env: {e}"
        ) from e

    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("[DB-OK] Supabase PostgreSQL tables verified.")
    return ACTIVE_DIALECT

