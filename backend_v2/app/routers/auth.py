"""
Auth Router
===========
Mock authentication for Pixely Partners.
Provides token generation to allow frontend login.
"""

import logging
import re
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import Optional
from supabase import ClientOptions, create_client

from ..config import settings
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
    # So the client app can renew the session without asking for a new code
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None

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
        if settings.DEV_BACKDOOR and form_data.username == "admin@pixely.pe" and form_data.password == "admin":
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
                "refresh_token": auth_response.session.refresh_token,
                "expires_at": auth_response.session.expires_at,
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


# --- Sign in with a code sent by email (the client app; no passwords) ---------------------
#
# Supabase Auth sends the code (template "Magic Link" must include {{ .Token }}) and verifies it.
# Each call gets its own short-lived auth client so one person's session never lands on the
# shared client the backend uses for everyone else.

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CodeRequest(BaseModel):
    email: str = Field(..., max_length=254)


class CodeVerify(BaseModel):
    email: str = Field(..., max_length=254)
    code: str = Field(..., min_length=6, max_length=10)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, max_length=2000)


def _fresh_auth():
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY,
                           options=ClientOptions(auto_refresh_token=False, persist_session=False))
    return client.auth


def _clean_email(raw: str) -> str:
    email = raw.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Escribe un correo válido.")
    return email


def _session_response(session, user_email: str, profile: dict) -> dict:
    return {
        "access_token": session.access_token,
        "token_type": "bearer",
        "user_email": user_email,
        "tenant_id": "tenant-default",
        "ficha_cliente_id": profile.get("client_id"),
        "logo_url": None,
        "role": profile.get("role", "client"),
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
    }


@router.post("/auth/code/send")
async def send_login_code(body: CodeRequest):
    """Emails a one-time code to a client of a brand. Answers the same whether or not the email
    exists, so nobody can use this to find out who our clients are."""
    email = _clean_email(body.email)
    profile = db.get_user_by_email(email)
    if profile and profile.get("client_id"):
        try:
            _fresh_auth().sign_in_with_otp({"email": email, "options": {"should_create_user": False}})
        except Exception as e:
            msg = str(e).lower()
            logger.warning(f"Login code not sent to {email}: {e}")
            if "rate" in msg or "security purposes" in msg or "429" in msg:
                raise HTTPException(status_code=429, detail="Ya te enviamos un código hace poco. Espera un minuto y vuelve a pedirlo.")
            raise HTTPException(status_code=502, detail="No pudimos enviar el correo. Intenta de nuevo en unos minutos.")
    else:
        logger.info(f"Login code requested for an email that is not a client: {email}")
    return {"status": "success"}


@router.post("/auth/code/verify", response_model=AuthResponse)
async def verify_login_code(body: CodeVerify):
    email = _clean_email(body.email)
    code = re.sub(r"\D", "", body.code)
    try:
        res = _fresh_auth().verify_otp({"email": email, "token": code, "type": "email"})
    except Exception as e:
        logger.info(f"Wrong or expired login code for {email}: {e}")
        raise HTTPException(status_code=400, detail="El código no es correcto o ya venció. Pide uno nuevo.")
    if not res or not res.session or not res.user:
        raise HTTPException(status_code=400, detail="El código no es correcto o ya venció. Pide uno nuevo.")
    profile = db.get_user_by_email(res.user.email or email) or {}
    if not profile.get("client_id"):
        raise HTTPException(status_code=403, detail="Esta app es para clientes de Pixely. El equipo trabaja en Partners desde la computadora.")
    return _session_response(res.session, res.user.email or email, profile)


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh_login(body: RefreshRequest):
    """Renews an expired access token with the refresh token, so the client stays signed in."""
    try:
        res = _fresh_auth().refresh_session(body.refresh_token)
    except Exception as e:
        logger.info(f"Refresh failed: {e}")
        raise HTTPException(status_code=401, detail="Tu sesión venció. Vuelve a entrar.")
    if not res or not res.session or not res.user:
        raise HTTPException(status_code=401, detail="Tu sesión venció. Vuelve a entrar.")
    profile = db.get_user_by_email(res.user.email) or {}
    return _session_response(res.session, res.user.email, profile)
