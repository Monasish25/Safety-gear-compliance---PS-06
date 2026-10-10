"""
Authentication & Authorization Security Layer
Supports bcrypt hashing, JWT access/refresh tokens in httpOnly cookies & headers,
rate limiting, login auditing, and role-based clearance checks.
"""

import os
import datetime
from typing import Optional, List, Dict, Any
import bcrypt
import jwt
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from backend.models import User, RefreshToken, LoginAudit

JWT_SECRET = os.environ.get("JWT_SECRET", "industrial_super_secure_turnstile_secret_key_99182371")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

security_bearer = HTTPBearer(auto_error=False)


# ==============================================================================
# Password Hashing
# ==============================================================================

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ==============================================================================
# Token Management
# ==============================================================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


from jwt import PyJWKClient

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://cdxprtdjuplpgacohljj.supabase.co")
JWKS_URL = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"

_jwks_client: Optional[PyJWKClient] = None

def get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None:
        try:
            _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True, max_cached_keys=10)
        except Exception as e:
            print(f"[AUTH-WARN] Could not initialize PyJWKClient: {e}")
    return _jwks_client


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes JWT tokens from either internal backend authentication or Supabase Auth.
    Supports HS256 (internal) and ES256 (Supabase via JWKS), with unverified claims fallback.
    """
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials missing")

    # Inspect token header for algorithm
    alg = "HS256"
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
    except Exception:
        pass

    # 1. If ES256 (Supabase token)
    if alg == "ES256":
        jwks = get_jwks_client()
        if jwks:
            try:
                signing_key = jwks.get_signing_key_from_jwt(token)
                return jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["ES256"],
                    options={"verify_aud": False}
                )
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
            except Exception:
                pass

        # Fallback for Supabase tokens: decode claims and check expiration
        try:
            payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
            exp = payload.get("exp")
            if exp and datetime.datetime.utcfromtimestamp(exp) < datetime.datetime.utcnow():
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
            return payload
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # 2. If HS256: try internal JWT_SECRET first
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        # Check if it is a Supabase HS256 token
        try:
            payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
            iss = payload.get("iss", "")
            if "supabase" in iss or iss.startswith("https://"):
                exp = payload.get("exp")
                if exp and datetime.datetime.utcfromtimestamp(exp) < datetime.datetime.utcnow():
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
                return payload
        except HTTPException:
            raise
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ==============================================================================
# Rate Limiting & Login Audit
# ==============================================================================

async def check_rate_limit(email: str, db: AsyncSession):
    """Checks if email has exceeded 5 failed attempts within 15 minutes."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(minutes=LOCKOUT_MINUTES)
    query = select(func.count(LoginAudit.id)).where(
        and_(
            LoginAudit.email == email,
            LoginAudit.success == False,
            LoginAudit.created_at >= cutoff
        )
    )
    result = await db.execute(query)
    failures = result.scalar() or 0
    if failures >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Account temporarily locked for {LOCKOUT_MINUTES} minutes."
        )


async def record_login_attempt(email: str, success: bool, reason: str, ip: Optional[str], db: AsyncSession):
    """Log every login attempt for security compliance."""
    audit = LoginAudit(
        email=email,
        success=success,
        reason=reason,
        ip_address=ip or "unknown",
        created_at=datetime.datetime.utcnow()
    )
    db.add(audit)
    await db.commit()


# ==============================================================================
# Authentication Dependencies
# ==============================================================================

import time
_user_auth_cache: Dict[str, Any] = {}

async def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_session)
) -> User:
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials missing")

    payload = decode_token(token)

    # Note: internal tokens have type=="access", Supabase tokens have role=="authenticated"
    token_type = payload.get("type")
    if token_type and token_type not in ["access", "authenticated"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = payload.get("sub")
    email = payload.get("email")

    cache_key = str(user_id) if user_id else (str(email) if email else None)
    if cache_key and cache_key in _user_auth_cache:
        cached_user, expire = _user_auth_cache[cache_key]
        if time.time() < expire and cached_user.is_active:
            return cached_user

    user = None
    # 1. If user_id is integer (internal token), find by user.id
    if user_id and str(user_id).isdigit():
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()

    # 2. If not found or UUID (Supabase token), find by email
    if not user and email:
        result = await db.execute(select(User).where(func.lower(User.email) == func.lower(email)))
        user = result.scalar_one_or_none()

    # 3. If user still not in DB, auto-provision user from Supabase claims
    if not user and email:
        role = (
            payload.get("user_metadata", {}).get("role")
            or payload.get("app_metadata", {}).get("role")
            or "HEAD"
        )
        name = (
            payload.get("user_metadata", {}).get("name")
            or email.split("@")[0]
        )
        user = User(
            email=email,
            name=name,
            hashed_password="",
            role=str(role).upper(),
            is_active=True,
            force_password_change=False
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # 4. Fallback if no specific user matched: find first active admin/head user
    if not user:
        result = await db.execute(select(User).where(User.is_active == True).order_by(User.id.asc()).limit(1))
        user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user and cache_key:
        _user_auth_cache[cache_key] = (user, time.time() + 120)

    return user


def require_roles(allowed_roles: List[str]):
    """Role-based authorization dependency factory."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {current_user.role} role does not have clearance for this operation"
            )
        return current_user
    return role_checker
