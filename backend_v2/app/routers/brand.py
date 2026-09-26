
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Any

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


