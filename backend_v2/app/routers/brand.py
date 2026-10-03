
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Any, Literal
from datetime import datetime, timezone
import re

from ..config import settings
from ..services.database import db
from ..services.auth_service import verify_client_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/brand", tags=["Brand Identity"])

# --- Models ---
class BrandColors(BaseModel):
    primary: str
    secondary: str
    accent: str
    background: str

class BrandTone(BaseModel):
    trait: str
    description: str

class BrandIdentity(BaseModel):
    mission: str
    vision: str
    values: List[dict] # {title: str, desc: str}
    tone_traits: List[BrandTone]
    archetype: str
    colors: Optional[dict] = {}
    typography: Optional[dict] = {}
    logo_url: Optional[str] = None
    stationery_url: Optional[str] = None



# --- Prompts ---


# --- Endpoints ---

@router.get("/{client_id}")
async def get_brand(client_id: str, _user: dict = Depends(verify_client_access)):
    client = db.get_client(client_id)
    identity = db.get_brand_identity(client_id)
    
    brand_name = client.get('nombre') if client else "Marca"
    
    if not identity:
        # Try to at least return personas if identity is missing but interview exists
        interview = db.get_interview(client_id)
        if interview and interview.get("data"):
             audience = interview["data"].get("audience", {})
             if audience.get("idealPersona") or audience.get("antiPersona"):
                  return {
                      "status": "partial", 
                      "data": {
                          "personas": {
                              "ideal": audience.get("idealPersona"),
                              "anti": audience.get("antiPersona")
                          }
                      }, 
                      "brand_name": brand_name
                  }

        return {"status": "empty", "data": None, "brand_name": brand_name}
    
    # Inject Personas from Interview if available
    interview = db.get_interview(client_id)
    if interview and interview.get("data"):
        audience = interview["data"].get("audience", {})
        identity["personas"] = {
            "ideal": audience.get("idealPersona"),
            "anti": audience.get("antiPersona")
        }

    # "values" is stored as an array of JSON-encoded strings; parse before sending
    if identity.get("values"):
        parsed_values = []
        for v in identity["values"]:
            if isinstance(v, str):
                try:
                    parsed_values.append(json.loads(v))
                except (json.JSONDecodeError, TypeError):
                    parsed_values.append(v)
            else:
                parsed_values.append(v)
        identity["values"] = parsed_values

    identity["download_url"] = client.get("brand_manual_url") if client else None

    return {"status": "success", "data": identity, "brand_name": brand_name}

@router.put("/{client_id}")
async def update_brand(client_id: str, identity: BrandIdentity, _user: dict = Depends(verify_client_access)):
    try:
        data = identity.model_dump()
        db.update_brand_identity(client_id, data)
        return {"status": "success", "message": "Brand identity updated"}
    except Exception as e:
        logger.error(f"Error updating brand for {client_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Voz de marca: client approval and real colors ---

class VoiceReview(BaseModel):
    estado: Literal["Aprobada", "Cambios solicitados"]
    comentario: Optional[str] = None


@router.patch("/{client_id}/voice/review")
async def review_voice(client_id: str, review: VoiceReview, user: dict = Depends(verify_client_access)):
    """The client approves their brand voice or sends it back with a comment."""
    comentario = (review.comentario or "").strip() or None
    if review.estado == "Cambios solicitados" and not comentario:
        raise HTTPException(status_code=422, detail="Cuéntanos qué cambiarías")
    if not db.get_brand_identity(client_id):
        raise HTTPException(status_code=404, detail="Esta marca aún no tiene voz definida")
    data = {
        "voz_estado": review.estado,
        "voz_comentario": comentario,
        "voz_revisada_at": datetime.now(timezone.utc).isoformat(),
        "voz_revisada_por": user.get("email"),
    }
    db.update_brand_identity(client_id, data)
    return {"status": "success", "data": data}


HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


class BrandColorsUpdate(BaseModel):
    colors: dict


@router.put("/{client_id}/colors")
async def update_colors(client_id: str, body: BrandColorsUpdate, _user: dict = Depends(verify_client_access)):
    """The brand's real colors, set by the client (never invented by the generator)."""
    allowed = ("primary", "secondary", "accent", "background")
    colors = {k: v for k, v in body.colors.items() if k in allowed and isinstance(v, str) and HEX.match(v)}
    if not colors:
        raise HTTPException(status_code=422, detail="Colores inválidos: usa el formato #RRGGBB")
    db.update_brand_identity(client_id, {"colors": colors})
    return {"status": "success", "data": colors}

