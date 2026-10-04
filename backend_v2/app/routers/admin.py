"""
Admin Panel Router
==================
Endpoints for brand-centric admin panel.
Brands contain users and have plans that define accessible modules.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from ..services.database import db
from ..services.auth_service import require_admin



logger = logging.getLogger(__name__)

# Every endpoint in this router requires an authenticated admin — see finding
# that this router previously had zero role checks at all.
router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

# =============================================================================
# MODULES — every brand gets every module now; there are no subscription tiers.
# =============================================================================

ALL_MODULES = ["interview", "manual", "strategy", "schedule"]

MODULE_INFO = {
    "interview": {"name": "Entrevista", "icon": "clipboard-list"},
    "manual": {"name": "Voz de marca", "icon": "book-open"},
    "strategy": {"name": "Estrategia", "icon": "target"},
    "schedule": {"name": "Cronograma", "icon": "calendar"}
}

# =============================================================================
# MODELS
# =============================================================================

class BrandCreate(BaseModel):
    nombre: str

class BrandResponse(BaseModel):
    id: str
    nombre: str
    created_at: Optional[str] = None
    user_count: int = 0
    modules: List[str] = []

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    brand_id: str

class ModuleStatus(BaseModel):
    id: str
    name: str
    icon: str
    status: str  # "completed", "pending", "ready", "not_available"
    can_execute: bool = False

# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/test")
async def test_admin():
    return {"status": "ok"}

@router.get("/brands", response_model=List[BrandResponse])
async def list_brands():
    """List all brands with user count."""
    print("ENDPOINT HIT: /admin/brands")
    brands = db.list_clients()
    result = []
    
    for brand in brands:
        # Count users for this brand
        users = db.list_brand_users(brand["id"]) if hasattr(db, 'list_brand_users') else []
        user_count = len(users) if users else 0

        result.append(BrandResponse(
            id=brand["id"],
            nombre=brand.get("nombre", "Sin nombre"),
            created_at=brand.get("created_at"),
            user_count=user_count,
            modules=ALL_MODULES
        ))
    
    return result


@router.post("/brands", response_model=BrandResponse)
async def create_brand(request: BrandCreate):
    """Create a new brand."""
    import uuid

    brand_id = str(uuid.uuid4())
    brand_data = {
        "id": brand_id,
        "nombre": request.nombre,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        db.create_client(brand_data)
        logger.info(f"✅ Created brand: {request.nombre}")

        return BrandResponse(
            id=brand_id,
            nombre=request.nombre,
            created_at=brand_data["created_at"],
            user_count=0,
            modules=ALL_MODULES
        )
    except Exception as e:
        logger.error(f"Failed to create brand: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/{brand_id}")
async def get_brand_detail(brand_id: str):
    """Get brand detail with modules status and users."""
    brand = db.get_client(brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    # Get module statuses
    modules = []
    for mod_id in ALL_MODULES:
        mod_info = MODULE_INFO.get(mod_id, {})
        status = await get_module_status(brand_id, mod_id)
        modules.append({
            "id": mod_id,
            "name": mod_info.get("name", mod_id),
            "icon": mod_info.get("icon", "circle"),
            "status": status["status"],
            "can_execute": status["can_execute"]
        })
    
    # Get users
    users = db.list_brand_users(brand_id) if hasattr(db, 'list_brand_users') else []
    
    return {
        "brand": {
            "id": brand["id"],
            "nombre": brand.get("nombre"),
            "created_at": brand.get("created_at")
        },
        "modules": modules,
        "users": users
    }


async def get_module_status(brand_id: str, module_id: str) -> dict:
    """Get status for a specific module."""
    
    # ==============================================================================
    # ORDEN DE FLUJO:
    # 1. Interview (Base)
    # 2. Voz de marca (la escribe /02_voz_de_marca desde Claude Desktop)
    # 3. Strategy (la escribe /04_estrategia desde Claude Desktop)
    # 4. Schedule (lo escribe /05_planificacion en content_pieces)
    # ==============================================================================

    if module_id == "interview":
        interview = db.get_interview(brand_id)
        if interview:
            return {"status": "completed", "can_execute": False}
        return {"status": "pending", "can_execute": False}
    
    elif module_id == "manual":
        # Voz de marca: written only by /02_voz_de_marca (Claude Desktop); the panel just shows it
        voice = db.get_brand_identity(brand_id)
        if voice and (voice.get("tone_traits") or voice.get("archetype")):
            return {"status": "completed", "can_execute": True}  # opens the view, generates nothing
        return {"status": "pending", "can_execute": False}

    elif module_id == "strategy":
        # Written only by /04_estrategia (Claude Desktop); the panel just shows it
        if db.get_strategy_nodes(brand_id):
            return {"status": "completed", "can_execute": True}  # opens the view, generates nothing
        return {"status": "pending", "can_execute": False}

    elif module_id == "schedule":
        # The monthly plan is written only by /05_planificacion (Claude Desktop) into
        # content_pieces; the panel just opens it in Planificación once it exists.
        if db.has_content_pieces(brand_id):
            return {"status": "completed", "can_execute": True}
        return {"status": "pending", "can_execute": False}

    return {"status": "not_available", "can_execute": False}


@router.post("/brands/{brand_id}/users")
async def create_brand_user(brand_id: str, request: UserCreate):
    """Create a user for a brand."""
    # Verify brand exists
    brand = db.get_client(brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Check if admin client is available for user creation
    if not db.admin_client:
        raise HTTPException(status_code=500, detail="Admin client not configured")
    
    try:
        # Create user in Supabase Auth
        auth_response = db.admin_client.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=500, detail="Failed to create auth user")
        
        user_id = auth_response.user.id
        
        # Create user profile linked to brand
        profile_data = {
            "id": user_id,
            "email": request.email,
            "full_name": request.full_name or request.email.split("@")[0],
            "client_id": brand_id,  # Link to brand
            "role": "client",
            "created_at": datetime.utcnow().isoformat()
        }
        
        db.create_user_profile(profile_data)
        logger.info(f"✅ Created user {request.email} for brand {brand_id}")
        
        return {
            "id": user_id,
            "email": request.email,
            "full_name": profile_data["full_name"],
            "brand_id": brand_id
        }
        
    except Exception as e:
        error_msg = str(e).lower()
        # Handle "User already registered" case
        if "already" in error_msg and "registered" in error_msg:
            try:
                logger.info(f"User {request.email} exists in Auth. Attempting to link...")
                # Find auth user ID
                users = db.admin_client.auth.admin.list_users()
                existing_user = next((u for u in users if u.email == request.email), None)
                
                if existing_user:
                    user_id = existing_user.id
                    
                    # Check if profile already exists in our DB
                    existing_profile = db.get_user_by_email(request.email)
                    if existing_profile:
                        # User has a profile -> Conflict, cannot reassignment easily
                        raise HTTPException(
                            status_code=409, 
                            detail=f"El usuario ya existe y pertenece a la marca {existing_profile.get('clientId') or 'otra'}. No se puede duplicar."
                        )
                    
                    # No profile -> Create one linked to this brand
                    profile_data = {
                        "id": user_id,
                        "email": request.email,
                        "full_name": request.full_name or request.email.split("@")[0],
                        "client_id": brand_id,
                        "role": "client",
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    db.create_user_profile(profile_data)
                    logger.info(f"✅ Recovered and linked user {request.email} to brand {brand_id}")
                    
                    return {
                        "id": user_id,
                        "email": request.email,
                        "full_name": profile_data["full_name"],
                        "brand_id": brand_id,
                        "info": "Usuario existente vinculado exitosamente"
                    }
                    
            except HTTPException:
                raise # Re-raise known HTTP exceptions
            except Exception as inner_e:
                logger.error(f"User recovery failed: {inner_e}")
                # Fall through to default error
        
        logger.error(f"Failed to create user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/{brand_id}/strategies")
async def get_brand_strategies(brand_id: str):
    """Get strategies for a brand."""
    strategies = db.get_strategy_nodes(brand_id) if hasattr(db, 'get_strategy_nodes') else []
    return {"strategies": strategies}




