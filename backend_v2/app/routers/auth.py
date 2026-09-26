"""
Auth Router
===========
Mock authentication for Pixely Partners.
Provides token generation to allow frontend login.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

from ..services.database import db
from ..services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_email: str
    tenant_id: str
    ficha_cliente_id: Optional[str] = None
    logo_url: Optional[str] = None
    role: str

class UserInfo(BaseModel):
    id: str
    email: str
    full_name: str
    tenant_id: str
    role: str
    is_active: bool
    logo_url: Optional[str] = None
    client_id: Optional[str] = None


@router.post("/token", response_model=AuthResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login endpoint. Authenticates via Supabase Auth.
    """
    # Check Database via Supabase Auth
    try:
        # DEV FALLBACK: Allow admin@pixely.pe / admin
        if form_data.username == "admin@pixely.pe" and form_data.password == "admin":
            logger.warning(f"🔓 Using DEV BACKDOOR for {form_data.username}")
            return {
                "access_token": "dev-admin-token",
                "token_type": "bearer",
                "user_email": "admin@pixely.pe",
                "tenant_id": "tenant-default",
                "ficha_cliente_id": None,
                "logo_url": None,
                "role": "admin",
            }

        # This returns a session if successful (use anon_client for auth flows)
        auth_client = db.anon_client or db.client
        auth_response = auth_client.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })

        if auth_response.user:
            # Get Role and Client from Public Profile
            user_profile = db.get_user_by_email(form_data.username)
            role = user_profile.get("role", "analyst") if user_profile else "analyst"
            client_id = user_profile.get("client_id") if user_profile else None

            return {
                "access_token": auth_response.session.access_token,
                "token_type": "bearer",
                "user_email": auth_response.user.email,
                "tenant_id": "tenant-default",
                "ficha_cliente_id": client_id,
                "logo_url": None,
                "role": role,
            }
    except Exception as e:
        # Log error for debugging
        logger.error(f"Login failed for {form_data.username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/users/me", response_model=UserInfo)
async def read_users_me(user: dict = Depends(get_current_user)):
    """Returns the real caller's identity, resolved from their verified bearer token."""
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user.get("full_name") or user["email"].split("@")[0],
        "tenant_id": "tenant-default",
        "role": user.get("role", "analyst"),
        "is_active": True,
        "logo_url": None,
        "client_id": user.get("client_id"),
    }
