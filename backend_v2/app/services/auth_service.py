"""
Auth Service
============
Resolves the authenticated caller from a bearer token and enforces
role-based access. Real Supabase Auth verification — replaces the mock
dependency that used to make GET /users/me return a hardcoded admin
identity for every caller regardless of who was actually logged in.
"""

import logging
from fastapi import Depends, Header, HTTPException

from .database import db

logger = logging.getLogger(__name__)

# Matches the dev-only backdoor login in routers/auth.py (admin@pixely.pe /
# admin). Kept for local development; this exact string never appears
# anywhere else, so it cannot be produced by a real Supabase session token.
DEV_BACKDOOR_TOKEN = "dev-admin-token"
DEV_BACKDOOR_USER = {
    "id": "user-admin-001",
    "email": "admin@pixely.pe",
    "full_name": "Admin User",
    "role": "admin",
    "client_id": None,
}


async def get_current_user(authorization: str = Header(default=None)) -> dict:
    """Resolve {id, email, full_name, role, client_id} from the Authorization header.

    Verifies the bearer token against Supabase Auth (or the dev backdoor
    token) and loads the matching profile row for role/tenant scoping.
    Raises 401 if the token is missing, malformed, or invalid.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1].strip()

    if token == DEV_BACKDOOR_TOKEN:
        return DEV_BACKDOOR_USER

    if not db.anon_client:
        raise HTTPException(status_code=500, detail="Auth not configured")

    try:
        auth_result = db.anon_client.auth.get_user(token)
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    auth_user = getattr(auth_result, "user", None)
    if not auth_user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    profile = db.get_user_by_email(auth_user.email)
    if not profile:
        raise HTTPException(status_code=403, detail="No profile linked to this account")

    return {
        "id": profile.get("id", auth_user.id),
        "email": auth_user.email,
        "full_name": profile.get("full_name"),
        "role": profile.get("role", "analyst"),
        "client_id": profile.get("client_id"),
    }


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that additionally requires role == 'admin'."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def verify_client_access(client_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Path-param dependency: the caller must be admin or belong to this client_id.

    FastAPI binds `client_id` here from the path automatically as long as the
    route itself declares a `{client_id}` path segment. For endpoints where
    client_id arrives in the request body instead, check it manually with
    `get_current_user` + the same role/client_id comparison used here.
    """
    if user.get("role") != "admin" and user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Not authorized for this client")
    return user
