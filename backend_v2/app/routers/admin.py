"""
Admin Panel Router
==================
Endpoints for brand-centric admin panel.
Brands contain users and have plans that define accessible modules.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from ..services.database import db
from ..services import gemini_service, aggregator
from ..services.auth_service import require_admin



logger = logging.getLogger(__name__)

# Every endpoint in this router requires an authenticated admin — see finding
# that this router previously had zero role checks at all.
router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

# =============================================================================
# MODULES — every brand gets every module now; there are no subscription tiers.
# =============================================================================

ALL_MODULES = ["interview", "manual", "analysis", "strategy", "schedule"]

MODULE_INFO = {
    "interview": {"name": "Entrevista", "icon": "clipboard-list"},
    "manual": {"name": "Manual", "icon": "book-open"},
    "analysis": {"name": "Análisis", "icon": "bar-chart-2"},
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

class AnalysisRequest(BaseModel):
    analysis_type: str  # "real" or "aspirational"
    instagram_url: str

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
    # 2. Manual (Requiere Interview)
    # 3. Analysis (Requiere Manual)
    # 4. Strategy (Requiere Analysis)
    # 5. Schedule (Requiere Strategy)
    # ==============================================================================

    if module_id == "interview":
        interview = db.get_interview(brand_id)
        if interview:
            return {"status": "completed", "can_execute": False}
        return {"status": "pending", "can_execute": False}
    
    elif module_id == "manual":
        # Depende de Interview
        interview = db.get_interview(brand_id)
        brand_identity = db.get_brand_identity(brand_id)
        
        if brand_identity and brand_identity.get("mission"):
            return {"status": "completed", "can_execute": True} # Can view
        elif interview:
            return {"status": "ready", "can_execute": True} # Ready to generate/view empty?
        return {"status": "pending", "can_execute": False}
    
    elif module_id == "analysis":
        # Depende de Manual (Identidad)
        brand_identity = db.get_brand_identity(brand_id)
        
        # Check status using existing method
        client_status = db.get_client_status(brand_id)
        status = client_status.get("status")
        
        if status:
             if status == "COMPLETED":
                 return {"status": "completed", "can_execute": True}
             elif status in ["PROCESSING", "CLASSIFYING", "AGGREGATING"]:
                 return {"status": "processing", "can_execute": False}
             elif status == "ERROR":
                 # Allow retry on error
                 return {"status": "ready", "can_execute": True}

        # Fallback if no report exists
        if brand_identity and brand_identity.get("mission"):
            return {"status": "ready", "can_execute": True}
        return {"status": "pending", "can_execute": False}
    
    elif module_id == "strategy":
        # Depende de Analysis
        report = db.get_latest_completed_report(brand_id)
        strategies = db.get_strategy_nodes(brand_id) if hasattr(db, 'get_strategy_nodes') else []
        
        if strategies and len(strategies) > 0:
            return {"status": "completed", "can_execute": True}
        elif report:
            return {"status": "ready", "can_execute": True}
        return {"status": "pending", "can_execute": False}
    
    elif module_id == "schedule":
        # Depende de Strategy
        strategies = db.get_strategy_nodes(brand_id) if hasattr(db, 'get_strategy_nodes') else []
        if strategies and len(strategies) > 0:
             return {"status": "ready", "can_execute": True}
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


@router.post("/brands/{brand_id}/analysis")
async def execute_analysis(brand_id: str, request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Execute analysis for a brand."""
    from ..routers.pipeline import _run_full_pipeline
    import uuid
    
    # Verify brand exists
    brand = db.get_client(brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Verify interview is completed
    brand_identity = db.get_brand_identity(brand_id)
    if not brand_identity or not brand_identity.get("mission"):
        raise HTTPException(status_code=400, detail="Manual de Marca (Identidad) debe estar completo antes del análisis")
    
    # Validate analysis type
    if request.analysis_type not in ["real", "aspirational"]:
        raise HTTPException(status_code=400, detail="Invalid analysis type. Must be 'real' or 'aspirational'")
    
    try:
        # Call the pipeline manually
        logger.info(f"Starting {request.analysis_type} analysis for brand {brand_id}")
        
        report_id = str(uuid.uuid4())
        
        # 1. Create record in Supabase
        db.create_report(report_id, brand_id, status="PROCESSING")
        
        # 2. Launch background task
        background_tasks.add_task(
            _run_full_pipeline, 
            report_id=report_id,
            client_id=brand_id,
            instagram_url=request.instagram_url,
            comments_limit=1000 # Default limit
        )
        
        return {
            "status": "started",
            "analysis_type": request.analysis_type,
            "report_id": report_id,
            "message": f"Análisis {'de marca real' if request.analysis_type == 'real' else 'aspiracional'} iniciado"
        }
        
    except Exception as e:
        logger.error(f"Failed to start analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/{brand_id}/strategies")
async def get_brand_strategies(brand_id: str):
    """Get strategies for a brand."""
    strategies = db.get_strategy_nodes(brand_id) if hasattr(db, 'get_strategy_nodes') else []
    return {"strategies": strategies}


@router.get("/brands/{brand_id}/tasks")
async def get_brand_tasks(brand_id: str):
    """Get tasks/schedule for a brand."""
    tasks = db.get_tasks(brand_id) if hasattr(db, 'get_tasks') else []
    return {"tasks": tasks}


@router.post("/brands/{brand_id}/manual")
async def generate_brand_manual(brand_id: str):
    """Generate Brand Identity (Manual) from Interview."""
    # Verify brand exists
    brand = db.get_client(brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Verify interview
    interview = db.get_interview(brand_id)
    if not interview:
        raise HTTPException(status_code=400, detail="Entrevista requerida para generar el manual")
        
    try:
        from ..services.gemini_service import generate_brand_identity
        logger.info(f"Generating manual for brand {brand_id}")
        
        identity = await generate_brand_identity(interview)
        
        # Save to DB
        db.update_brand_identity(brand_id, identity)
        
        return {"status": "success", "message": "Manual de marca generado", "data": identity}
        
    except Exception as e:
        logger.error(f"Failed to generate manual: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/strategy/seed")
async def seed_strategy_manually(brand_id: str):
    """
    Trigger manual para generar la Estrategia (Árbol de Objetivos) 
    usando IA basada en el Análisis completado.
    """
    logger.info(f"♟️ [Admin] Iniciando generación manual de estrategia para {brand_id}")
    
    # 1. Validar prerrequisitos
    report = db.get_latest_completed_report(brand_id)
    if not report or not report.get("frontend_compatible_json"):
        raise HTTPException(
            status_code=400, 
            detail="No se puede generar estrategia: El Análisis no está completado o no existe."
        )
    
    analysis = report["frontend_compatible_json"]
    if "Q10" not in analysis:
        raise HTTPException(
            status_code=400, 
            detail="No se puede generar estrategia: El Análisis (Q1-Q10) no está completo (Falta Q10)."
        )

    # 2. Obtener contexto (Entrevista)
    interview_record = db.get_interview(brand_id)
    interview_data = interview_record.get("data", {}) if interview_record else {}
    
    client = db.get_client(brand_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    try:
        # 3. Generar Árbol con IA (El "Arquitecto")
        strategy_json = await gemini_service.generate_strategic_plan(
            interview_data=interview_data,
            analysis_json=analysis
        )
        
        # 5. Convertir JSON a Nodos Visuales (x, y)
        strategy_nodes = aggregator.convert_tree_to_nodes(brand_id, strategy_json)
        
        # 6. Guardar en Base de Datos
        db.sync_strategy_nodes(brand_id, strategy_nodes)
        
        return {
            "status": "success", 
            "message": "Estrategia generada correctamente", 
            "nodes_count": len(strategy_nodes)
        }

    except Exception as e:
        logger.error(f"❌ Error en generación manual de estrategia: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/brands/{brand_id}/reset-strategy")
async def reset_brand_strategy(brand_id: str):
    """
    Reset and regenerate the strategy for a brand using AI (Admin only).
    Deletes all existing nodes and generates a new complete strategy.
    """
    try:
        logger.info(f"🔄 Resetting and regenerating strategy for brand {brand_id}")
        
        # 1. Get brand info
        brand = db.get_client(brand_id)
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand_name = brand.get("nombre", "Marca")

        # 2. Get interview data
        interview_data = db.get_interview(brand_id)
        if not interview_data:
            logger.warning(f"⚠️ No interview data found for {brand_name}, using minimal data")
            interview_data = {
                "brand_name": brand_name,
                "industry": brand.get("industry", "General"),
                "target_audience": "Público general",
                "objectives": ["Aumentar visibilidad", "Generar engagement"]
            }
        
        # 3. Get analysis data
        analysis = db.get_latest_completed_report(brand_id)
        if not analysis:
            logger.warning(f"⚠️ No analysis data found for {brand_name}, using minimal data")
            analysis = {
                "frontend_compatible_json": {
                    "summary": "Análisis pendiente",
                    "recommendations": []
                }
            }
        else:
            analysis = analysis.get("frontend_compatible_json", {})
        
        # 4. Generate strategy with AI
        logger.info(f"🤖 Generating AI strategy for {brand_name}")
        strategy_json = await gemini_service.generate_strategic_plan(
            interview_data=interview_data,
            analysis_json=analysis
        )

        # 5. Convert JSON to visual nodes
        strategy_nodes = aggregator.convert_tree_to_nodes(brand_id, strategy_json)
        
        # 6. Save to database (this will delete old nodes and create new ones)
        db.sync_strategy_nodes(brand_id, strategy_nodes)
        
        logger.info(f"✅ Strategy regenerated for {brand_name}: {len(strategy_nodes)} nodes created")
        
        return {
            "status": "success",
            "message": f"Strategy regenerated for {brand_name}",
            "nodes_created": len(strategy_nodes)
        }
        
    except Exception as e:
        logger.error(f"❌ Error regenerating strategy for brand {brand_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


