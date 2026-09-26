from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from ..services.context_builder import context_builder
from ..services.nanobanana_service_v2 import nanobanana_service_v2 as nanobanana_service
from ..services.database import db
import logging
import uuid
import base64

router = APIRouter(
    prefix="/studio",
    tags=["Image Studio"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class BrandVisualDNACreate(BaseModel):
    """Schema for creating/updating brand visual DNA"""
    color_primary_name: Optional[str] = None
    color_primary_hex: Optional[str] = None
    color_secondary_name: Optional[str] = None
    color_secondary_hex: Optional[str] = None
    color_accent_name: Optional[str] = None
    color_accent_hex: Optional[str] = None
    default_style: str = "natural"
    default_lighting: str = "studio"
    default_mood: str = "professional"
    default_resolution: str = "2K"
    preferred_archetypes: List[str] = ["lifestyle"]
    always_exclude: List[str] = ["text", "watermarks", "logos", "words"]
    brand_essence: Optional[str] = None
    visual_keywords: List[str] = []
    industry_leader_instagram: Optional[str] = None
    industry_leader_name: Optional[str] = None


class CameraSettings(BaseModel):
    """Camera and composition settings"""
    angle: Optional[str] = None  # eye-level, 45-degree, low-angle, high-angle
    shot: Optional[str] = None   # close-up, medium, wide, macro
    lens: Optional[str] = None   # 35mm, 50mm portrait, 85mm bokeh
    perspective: Optional[str] = None  # frontal, three-quarter, profile


class GenerateImageRequest(BaseModel):
    """Schema for image generation request - NanoBanana v2"""
    task_id: str  # REQUIRED - must link to a task
    tenant_id: str  # REQUIRED - for credit validation
    template_id: Optional[str] = None  # Deprecated, use archetype
    archetype: Optional[str] = None  # product_hero, lifestyle, promotional, minimalist, editorial
    reference_image_ids: List[str] = []
    product_image_id: Optional[str] = None
    custom_prompt: str = ""
    aspect_ratio: Optional[str] = None
    resolution: str = "2K"  # 1K, 2K, 4K
    use_pro_model: bool = False
    camera_settings: Optional[CameraSettings] = None


class AssignCreditsRequest(BaseModel):
    """Schema for assigning/adding credits to a tenant"""
    credits: int  # Number of credits to add


class StyleAnalysisComposition(BaseModel):
    """Composition analysis from image"""
    camera_angle: str = "eye_level"
    shot_type: str = "medium_shot"
    lens_style: str = "standard"
    aspect_ratio: str = "1:1"
    focal_point: str = ""


class StyleAnalysisLighting(BaseModel):
    """Lighting analysis from image"""
    type: str = "natural"
    direction: str = "front"
    quality: str = "soft"
    color_temperature: str = "neutral"


class StyleAnalysisColors(BaseModel):
    """Color palette analysis from image"""
    primary: str = "#FFFFFF"
    secondary: str = "#808080"
    accent: Optional[str] = None
    mood: str = ""


class StyleAnalysisStyle(BaseModel):
    """Style/aesthetic analysis from image"""
    aesthetic: str = "modern"
    mood: str = "calm"
    texture_emphasis: str = "smooth"
    background_type: str = "solid"


class StyleAnalysisResponse(BaseModel):
    """Complete style analysis response"""
    scene_type: str = "lifestyle"
    composition: StyleAnalysisComposition
    lighting: StyleAnalysisLighting
    color_palette: StyleAnalysisColors
    style: StyleAnalysisStyle
    archetype_suggestion: str = "lifestyle"
    reconstruction_summary: str = ""


class AnalyzeStyleRequest(BaseModel):
    """Request to analyze a reference image for style extraction"""
    image_id: str  # ID of image from image bank


# =============================================================================
# CREDITS ENDPOINTS
# =============================================================================

@router.get("/credits/{tenant_id}")
async def get_credits(tenant_id: str) -> Dict[str, Any]:
    """Get the credit balance for a tenant"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        response = db.client.table("studio_credits")\
            .select("*")\
            .eq("tenant_id", tenant_id)\
            .limit(1)\
            .execute()
        
        if not response.data or len(response.data) == 0:
            # No credits record yet — return zero balance
            return {
                "data": {
                    "tenant_id": tenant_id,
                    "total_credits": 0,
                    "used_credits": 0,
                    "available_credits": 0
                }
            }
        
        record = response.data[0]
        return {
            "data": {
                "tenant_id": tenant_id,
                "total_credits": record["total_credits"],
                "used_credits": record["used_credits"],
                "available_credits": record["total_credits"] - record["used_credits"]
            }
        }
    except Exception as e:
        logger.error(f"Error fetching credits for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credits/{tenant_id}")
async def assign_credits(tenant_id: str, request: AssignCreditsRequest) -> Dict[str, Any]:
    """
    Assign/add credits to a tenant. Admin-only endpoint.
    Positive value adds credits, can also set absolute value.
    """
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        if request.credits < 0:
            raise HTTPException(status_code=400, detail="Credits must be a positive number")
        
        # Upsert: create or update credits record
        response = db.client.table("studio_credits")\
            .upsert({
                "tenant_id": tenant_id,
                "total_credits": request.credits,
                "used_credits": 0,
                "updated_at": "now()"
            }, on_conflict="tenant_id")\
            .execute()
        
        # If we want to ADD credits instead of SET, fetch current and add
        # For now, this SETS the total credits
        
        logger.info(f"Assigned {request.credits} credits to tenant {tenant_id}")
        
        return {
            "data": {
                "tenant_id": tenant_id,
                "total_credits": request.credits,
                "message": f"Successfully assigned {request.credits} credits"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning credits to tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CONTEXT ENDPOINTS (Step 1 - existing)
# =============================================================================

@router.get("/context/{client_id}")
async def get_client_context(client_id: str) -> Dict[str, Any]:
    """
    Retrieves the segmented context blocks for a specific client to be used in the Studio Wizard Step 1.
    """
    try:
        blocks = await context_builder.get_client_context_blocks(client_id)
        if not blocks["interview"] and not blocks["analysis"]:
             logger.warning(f"No context found for client {client_id}")
             # We return empty blocks rather than 404 to allow the UI to show an empty state or manual input
        
        return {
            "data": {
                "interviewBlocks": blocks["interview"],
                "brandBlocks": blocks["manual"], # Currently empty placeholder
                "analysisBlocks": blocks["analysis"]
            }
        }
    except Exception as e:
        logger.error(f"Error fetching studio context for client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# BRAND VISUAL DNA ENDPOINTS (Step 1 - Setup)
# =============================================================================

@router.get("/brand-dna/{client_id}")
async def get_brand_visual_dna(client_id: str) -> Dict[str, Any]:
    """Get brand visual DNA configuration for a client"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        logger.info(f"📥 Fetching brand DNA for client: {client_id}")
        
        response = db.client.table("brand_visual_dna")\
            .select("*")\
            .eq("client_id", client_id)\
            .limit(1)\
            .execute()
        
        logger.info(f"📤 Response: {response}")
        
        # Get first result or None (equivalent to maybeSingle in JS)
        data = response.data[0] if response.data else None
        
        return {
            "data": data,
            "exists": data is not None,
            "is_configured": data.get("is_configured", False) if data else False
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"❌ Error fetching brand DNA for {client_id}: {e}")
        logger.error(f"❌ Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/brand-dna/{client_id}")
async def upsert_brand_visual_dna(client_id: str, dna: BrandVisualDNACreate) -> Dict[str, Any]:
    """Create or update brand visual DNA for a client"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Log incoming data for debugging
        logger.info(f"📥 Received brand DNA for client {client_id}")
        logger.info(f"📥 DNA payload: {dna.dict()}")
        
        payload = {
            "client_id": client_id,
            **dna.dict(),
            "is_configured": True
        }
        
        logger.info(f"📤 Upserting payload: {payload}")
        
        response = db.client.table("brand_visual_dna")\
            .upsert(payload, on_conflict="client_id")\
            .execute()
        
        logger.info(f"✅ Brand DNA saved for client {client_id}, response: {response}")
        return {"data": response.data[0] if response.data else payload, "status": "success"}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"❌ Error saving brand DNA for {client_id}: {e}")
        logger.error(f"❌ Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


# =============================================================================
# IMAGE BANK ENDPOINTS (Step 2 - Setup)
# =============================================================================

@router.get("/image-bank/{client_id}")
async def get_image_bank(
    client_id: str,
    category: Optional[str] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """Get images from the brand image bank"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        query = db.client.table("brand_image_bank")\
            .select("*")\
            .eq("client_id", client_id)\
            .eq("is_approved", True)\
            .eq("is_archived", False)\
            .order("is_favorite", desc=True)\
            .order("usage_count", desc=True)\
            .limit(limit)
        
        if category:
            query = query.eq("category", category)
        
        response = query.execute()
        
        return {
            "data": response.data or [],
            "total": len(response.data) if response.data else 0
        }
    except Exception as e:
        logger.error(f"Error fetching image bank for {client_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image-bank/{client_id}/upload")
async def upload_to_image_bank(
    client_id: str,
    file: UploadFile = File(...),
    category: str = Form("reference"),
    name: Optional[str] = Form(None),
    tags: Optional[str] = Form(None)  # Comma-separated
) -> Dict[str, Any]:
    """Upload an image to the brand image bank"""
    try:
        if not db.client and not db.admin_client:
            raise HTTPException(status_code=500, detail="Storage not configured")
        
        # Read file
        file_content = await file.read()
        file_size = len(file_content)
        
        # Generate ID and path
        image_id = str(uuid.uuid4())
        storage_path = f"image_bank/{client_id}/{category}/{image_id}.jpg"
        
        # Upload to storage
        storage_client = db.admin_client or db.client
        storage_client.storage.from_("generated-images").upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"}
        )
        
        # Get public URL
        image_url = storage_client.storage.from_("generated-images").get_public_url(storage_path)
        
        # Save to database
        record = {
            "id": image_id,
            "client_id": client_id,
            "image_url": image_url,
            "storage_path": storage_path,
            "category": category,
            "source": "manual_upload",
            "name": name or file.filename,
            "tags": tags.split(",") if tags else [],
            "file_size_bytes": file_size,
            "mime_type": file.content_type or "image/jpeg",
            "is_approved": True
        }
        
        response = db.client.table("brand_image_bank").insert(record).execute()
        
        logger.info(f"✅ Image uploaded to bank: {image_id}")
        return {"data": response.data[0] if response.data else record, "status": "success"}
    except Exception as e:
        logger.error(f"Error uploading to image bank: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/image-bank/{image_id}")
async def delete_from_image_bank(image_id: str) -> Dict[str, Any]:
    """Delete (archive) an image from the bank"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Soft delete (archive)
        db.client.table("brand_image_bank")\
            .update({"is_archived": True})\
            .eq("id", image_id)\
            .execute()
        
        return {"status": "success", "message": "Image archived"}
    except Exception as e:
        logger.error(f"Error archiving image {image_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/image-bank/{image_id}/favorite")
async def toggle_favorite(image_id: str, is_favorite: bool = True) -> Dict[str, Any]:
    """Toggle favorite status of an image"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        db.client.table("brand_image_bank")\
            .update({"is_favorite": is_favorite})\
            .eq("id", image_id)\
            .execute()
        
        return {"status": "success", "is_favorite": is_favorite}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# PENDING TASKS ENDPOINTS (Step 3 - Task Selection)
# =============================================================================

@router.get("/pending-tasks/{client_id}")
async def get_pending_tasks(client_id: str) -> Dict[str, Any]:
    """Get tasks that need image generation"""
    try:
        tasks = await nanobanana_service.get_pending_tasks(client_id)
        return {"data": tasks, "total": len(tasks)}
    except Exception as e:
        logger.error(f"Error fetching pending tasks for {client_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# TEMPLATES ENDPOINTS (Step 4 - Template Selection)
# =============================================================================

@router.get("/templates")
async def get_generation_templates(category: Optional[str] = None) -> Dict[str, Any]:
    """Get available generation templates (archetypes)"""
    try:
        templates = await nanobanana_service.get_templates(category)
        return {"data": templates, "total": len(templates)}
    except Exception as e:
        logger.error(f"Error fetching templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generation-options")
async def get_generation_options() -> Dict[str, Any]:
    """
    Get all available generation options for the UI.
    
    Returns camera options, lighting presets, moods, aspect ratios, etc.
    """
    try:
        return {
            "camera_options": nanobanana_service.get_camera_options(),
            "lighting_presets": nanobanana_service.get_lighting_presets(),
            "mood_options": nanobanana_service.get_mood_options(),
            "aspect_ratios": nanobanana_service.get_valid_aspect_ratios(),
            "format_mappings": nanobanana_service.get_format_mappings(),
            "resolutions": ["1K", "2K", "4K"],
            "archetypes": await nanobanana_service.get_templates(),
            "models": {
                "flash": {
                    "id": "flash",
                    "name": "NanoBanana Flash",
                    "description": "Rápido, ideal para alto volumen",
                    "max_references": 3
                },
                "pro": {
                    "id": "pro",
                    "name": "NanoBanana Pro",
                    "description": "Profesional con modo thinking, hasta 14 referencias",
                    "max_references": 14
                }
            }
        }
    except Exception as e:
        logger.error(f"Error fetching generation options: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# GENERATION ENDPOINTS (Step 5 - Generate)
# =============================================================================

@router.post("/generate")
async def generate_image(request: GenerateImageRequest) -> Dict[str, Any]:
    """
    Generate an image for a task using NanoBanana v2.
    
    IMPORTANT: task_id is required - all generations must be linked to a planning task.
    CREDITS: Each generation consumes 1 credit. Admins bypass credit check.
    """
    try:
        if not request.task_id:
            raise HTTPException(
                status_code=400, 
                detail="task_id is required - image generation must be linked to a planning task"
            )
        
        # =====================================================================
        # CREDIT CHECK - Verify tenant has available credits before generating
        # =====================================================================
        if db.client and request.tenant_id:
            credit_response = db.client.table("studio_credits")\
                .select("total_credits, used_credits")\
                .eq("tenant_id", request.tenant_id)\
                .limit(1)\
                .execute()
            
            if not credit_response.data or len(credit_response.data) == 0:
                raise HTTPException(
                    status_code=402,
                    detail="No tienes créditos disponibles. Contacta al administrador para obtener créditos de generación."
                )
            
            credit_record = credit_response.data[0]
            available = credit_record["total_credits"] - credit_record["used_credits"]
            
            if available <= 0:
                raise HTTPException(
                    status_code=402,
                    detail="Créditos agotados. Contacta al administrador para recargar tus créditos de generación."
                )
        
        # Convert camera_settings to dict if provided
        camera_settings_dict = None
        if request.camera_settings:
            camera_settings_dict = request.camera_settings.model_dump(exclude_none=True)
        
        result = await nanobanana_service.generate_for_task(
            task_id=request.task_id,
            template_id=request.template_id,
            archetype=request.archetype,
            reference_image_ids=request.reference_image_ids,
            product_image_id=request.product_image_id,
            custom_prompt=request.custom_prompt,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            use_pro_model=request.use_pro_model,
            camera_settings=camera_settings_dict
        )
        
        # =====================================================================
        # DEDUCT CREDIT - Only after successful generation
        # =====================================================================
        if db.client and request.tenant_id:
            try:
                # Increment used_credits by 1
                db.client.rpc("increment_used_credits", {
                    "p_tenant_id": request.tenant_id
                }).execute()
            except Exception as credit_err:
                # Don't fail the generation if credit deduction fails
                # Just log it for manual reconciliation
                logger.error(f"Failed to deduct credit for tenant {request.tenant_id}: {credit_err}")
                # Fallback: direct update
                try:
                    current = db.client.table("studio_credits")\
                        .select("used_credits")\
                        .eq("tenant_id", request.tenant_id)\
                        .limit(1)\
                        .execute()
                    if current.data and len(current.data) > 0:
                        new_used = current.data[0]["used_credits"] + 1
                        db.client.table("studio_credits")\
                            .update({"used_credits": new_used, "updated_at": "now()"})\
                            .eq("tenant_id", request.tenant_id)\
                            .execute()
                except Exception as fallback_err:
                    logger.error(f"Fallback credit deduction also failed: {fallback_err}")
        
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generated/{task_id}")
async def get_generated_images_for_task(task_id: str) -> Dict[str, Any]:
    """Get all generated images for a specific task"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        response = db.client.table("generated_images")\
            .select("*")\
            .eq("task_id", task_id)\
            .order("created_at", desc=True)\
            .execute()
        
        return {"data": response.data or [], "total": len(response.data) if response.data else 0}
    except Exception as e:
        logger.error(f"Error fetching generated images for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve/{image_id}")
async def approve_image_for_task(image_id: str) -> Dict[str, Any]:
    """Approve and select an image for a task, closing the generation loop"""
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Get the image to find its task_id (don't use .single() to avoid error on 0 rows)
        img_response = db.client.table("generated_images")\
            .select("task_id")\
            .eq("id", image_id)\
            .limit(1)\
            .execute()
        
        if not img_response.data or len(img_response.data) == 0:
            logger.error(f"Image not found in database: {image_id}")
            raise HTTPException(status_code=404, detail=f"Image {image_id} not found in database")
        
        task_id = img_response.data.get("task_id")
        
        # Mark image as selected
        db.client.table("generated_images")\
            .update({"is_selected": False})\
            .eq("task_id", task_id)\
            .execute()
        
        db.client.table("generated_images")\
            .update({"is_selected": True})\
            .eq("id", image_id)\
            .execute()
        
        # Update task status to approved
        db.client.table("tasks")\
            .update({
                "generation_status": "approved",
                "approved_image_id": image_id,
                "selected_image_id": image_id
            })\
            .eq("id", task_id)\
            .execute()
        
        logger.info(f"✅ Image {image_id} approved for task {task_id}")
        return {"status": "success", "message": "Image approved and task updated"}
    except Exception as e:
        logger.error(f"Error approving image {image_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# STYLE ANALYSIS ENDPOINT (Copy Style feature)
# =============================================================================

@router.post("/analyze-style", response_model=StyleAnalysisResponse)
async def analyze_reference_style(request: AnalyzeStyleRequest) -> Dict[str, Any]:
    """
    Analyze a reference image to extract style and composition parameters.
    
    This powers the "Copy Style" feature - users select a reference image
    and the system extracts all visual parameters to auto-configure generation.
    
    Returns:
        StyleAnalysisResponse with composition, lighting, colors, and style info
    """
    try:
        if not db.client:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Fetch the image from image bank
        response = db.client.table("image_bank")\
            .select("*")\
            .eq("id", request.image_id)\
            .limit(1)\
            .execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail=f"Image {request.image_id} not found in image bank")
        
        image_record = response.data[0]
        image_url = image_record.get("url") or image_record.get("image_url")
        
        if not image_url:
            raise HTTPException(status_code=400, detail="Image has no URL")
        
        logger.info(f"🔍 Analyzing style from image: {request.image_id}")
        
        # Download the image
        import httpx
        async with httpx.AsyncClient() as client:
            img_response = await client.get(image_url, timeout=30.0)
            if img_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to download image")
            
            image_data = img_response.content
            mime_type = img_response.headers.get("content-type", "image/jpeg")
        
        # Call NanoBanana service to analyze
        analysis_result = await nanobanana_service.analyze_style_image(
            image_data=image_data,
            mime_type=mime_type
        )
        
        # Transform to response model
        response_data = {
            "scene_type": analysis_result.get("scene_type", "lifestyle"),
            "composition": {
                "camera_angle": analysis_result.get("composition", {}).get("camera_angle", "eye_level"),
                "shot_type": analysis_result.get("composition", {}).get("shot_type", "medium_shot"),
                "lens_style": analysis_result.get("composition", {}).get("lens_style", "standard"),
                "aspect_ratio": analysis_result.get("composition", {}).get("aspect_ratio", "1:1"),
                "focal_point": analysis_result.get("composition", {}).get("focal_point", "")
            },
            "lighting": {
                "type": analysis_result.get("lighting", {}).get("type", "natural"),
                "direction": analysis_result.get("lighting", {}).get("direction", "front"),
                "quality": analysis_result.get("lighting", {}).get("quality", "soft"),
                "color_temperature": analysis_result.get("lighting", {}).get("color_temperature", "neutral")
            },
            "color_palette": {
                "primary": analysis_result.get("color_palette", {}).get("primary", "#FFFFFF"),
                "secondary": analysis_result.get("color_palette", {}).get("secondary", "#808080"),
                "accent": analysis_result.get("color_palette", {}).get("accent"),
                "mood": analysis_result.get("color_palette", {}).get("mood", "")
            },
            "style": {
                "aesthetic": analysis_result.get("style", {}).get("aesthetic", "modern"),
                "mood": analysis_result.get("style", {}).get("mood", "calm"),
                "texture_emphasis": analysis_result.get("style", {}).get("texture_emphasis", "smooth"),
                "background_type": analysis_result.get("style", {}).get("background_type", "solid")
            },
            "archetype_suggestion": analysis_result.get("archetype_suggestion", "lifestyle"),
            "reconstruction_summary": analysis_result.get("reconstruction_summary", "")
        }
        
        logger.info(f"✅ Style analysis complete for image {request.image_id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Style analysis failed for image {request.image_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# COMFYUI ENDPOINTS - Pixely Neural Studio
# =============================================================================

from ..services.comfyui_service import get_comfyui_service, ComfyUIError
from enum import Enum


class GenerationFormat(str, Enum):
    """Formatos de publicación disponibles"""
    PRODUCTO = "producto"
    SERVICIO = "servicio"
    EXPERIENCIA = "experiencia"
    PROMOCIONAL = "promocional"
    ANUNCIO = "anuncio"


class TimeOfDay(str, Enum):
    """Horas del día para iluminación"""
    DAWN = "dawn"
    MIDDAY = "midday"
    GOLDEN_HOUR = "golden_hour"
    NIGHT = "night"


class ComfyUIProductRequest(BaseModel):
    """Request para generación de imagen de Producto via ComfyUI"""
    client_id: str
    task_id: Optional[str] = None
    product_image: str  # Base64 PNG sin fondo
    composition_ref: Optional[str] = None  # Base64 referencia de composición
    surface_texture: Optional[str] = None  # Base64 textura
    light_ref: Optional[str] = None  # Base64 referencia de luz
    prompt: str = "Professional product photography, premium, studio lighting"
    negative_prompt: str = "text, watermark, logo, blurry, deformed, amateur"
    seed: int = -1
    steps: int = 30
    cfg_scale: float = 7.0
    width: int = 1024
    height: int = 1024


class ComfyUIServiceRequest(BaseModel):
    """Request para generación de imagen de Servicio via ComfyUI"""
    client_id: str
    task_id: Optional[str] = None
    face_photos: Optional[List[str]] = None  # 3 fotos en base64 para FaceID
    demographic: Optional[str] = None  # "Mujer, 30s, doctora, latina"
    pose_ref: str  # Base64 referencia de pose (requerido)
    background: Optional[str] = None  # Base64 foto del entorno
    background_prompt: str = "Modern office, bright, professional"
    prompt: str = "Professional service photography"
    seed: int = -1
    steps: int = 30


class ComfyUIExperienceRequest(BaseModel):
    """Request para generación de imagen de Experiencia via ComfyUI"""
    client_id: str
    task_id: Optional[str] = None
    space_image: str  # Base64 foto del lugar
    hands_feet: Optional[str] = None  # Base64 elemento humano parcial
    mood_ref: Optional[str] = None  # Base64 color grading reference
    time_of_day: TimeOfDay = TimeOfDay.GOLDEN_HOUR
    prompt: str = "Immersive lifestyle photography, POV"
    seed: int = -1
    steps: int = 30


class ComfyUIPromotionalRequest(BaseModel):
    """Request para generación de imagen Promocional via ComfyUI"""
    client_id: str
    task_id: Optional[str] = None
    layout_mask: str  # Base64 máscara B/N de zonas de texto
    product_image: str  # Base64 producto PNG
    primary_color: str = "#E63946"
    secondary_color: str = "#F1FAEE"
    accent_color: str = "#1D3557"
    prompt: str = "Clean promotional image, solid background"
    seed: int = -1


class ComfyUIAdRequest(BaseModel):
    """Request para generación de imagen de Anuncio via ComfyUI"""
    client_id: str
    task_id: Optional[str] = None
    concept_ref: str  # Base64 referencia de concepto visual
    hook_element: Optional[str] = None  # Base64 elemento disruptivo
    hook_prompt: str = ""  # "fire explosion, neon glow"
    creativity_level: float = 0.7  # 0.3 = realista, 1.0 = surrealista
    prompt: str = "High impact advertising, dramatic"
    seed: int = -1


class ComfyUIHealthResponse(BaseModel):
    """Response del health check de ComfyUI"""
    status: str
    comfyui_url: str
    is_healthy: bool
    queue_status: Optional[dict] = None


class ComfyUIGenerationResponse(BaseModel):
    """Response de generación ComfyUI"""
    success: bool
    images: List[str] = []  # URLs o base64 de imágenes
    generation_time: float = 0.0
    seed: int = 0
    prompt_id: Optional[str] = None
    error: Optional[str] = None


@router.get("/comfyui/health", response_model=ComfyUIHealthResponse)
async def comfyui_health_check():
    """
    Verifica que ComfyUI esté corriendo y respondiendo.
    """
    service = get_comfyui_service()
    is_healthy = await service.health_check()
    
    queue_status = None
    if is_healthy:
        try:
            queue_status = await service.get_queue_status()
        except Exception as e:
            logger.warning(f"Could not get queue status: {e}")
    
    return {
        "status": "ok" if is_healthy else "error",
        "comfyui_url": service.base_url,
        "is_healthy": is_healthy,
        "queue_status": queue_status
    }


@router.post("/comfyui/product", response_model=ComfyUIGenerationResponse)
async def generate_product_comfyui(request: ComfyUIProductRequest):
    """
    Genera imagen de producto usando ComfyUI (Formato: Producto Hero).
    
    Este endpoint usa el workflow de producto que:
    1. Toma el producto PNG sin fondo
    2. Genera un fondo basado en textura + iluminación
    3. Composita el producto REAL sobre el fondo (sin deformación)
    4. Aplica estilo de marca
    """
    logger.info(f"🖼️ ComfyUI Product generation for client {request.client_id}")
    
    try:
        service = get_comfyui_service()
        
        # Verificar salud de ComfyUI
        if not await service.health_check():
            raise HTTPException(
                status_code=503,
                detail="ComfyUI server is not responding. Please check RunPod status."
            )
        
        # Generar imagen
        result = await service.generate_product_hero(
            product_image=request.product_image,
            composition_ref=request.composition_ref,
            surface_texture=request.surface_texture,
            light_ref=request.light_ref,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            steps=request.steps,
            cfg_scale=request.cfg_scale,
            width=request.width,
            height=request.height,
        )
        
        # Si hay task_id, guardar en BD
        if request.task_id:
            # TODO: Guardar generación en tabla generated_images
            pass
        
        logger.info(f"✅ Product generated: {len(result['images'])} images in {result['generation_time']}s")
        
        return {
            "success": True,
            "images": result["images"],
            "generation_time": result["generation_time"],
            "seed": result.get("seed", request.seed),
            "prompt_id": result.get("prompt_id"),
        }
        
    except ComfyUIError as e:
        logger.error(f"❌ ComfyUI error: {e}")
        return {
            "success": False,
            "error": str(e),
            "images": [],
        }
    except Exception as e:
        logger.exception(f"❌ Unexpected error in product generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comfyui/service", response_model=ComfyUIGenerationResponse)
async def generate_service_comfyui(request: ComfyUIServiceRequest):
    """
    Genera imagen de servicio usando ComfyUI (Formato: Servicio).
    
    Usa FaceID para rostros consistentes y OpenPose para control de pose.
    """
    logger.info(f"🖼️ ComfyUI Service generation for client {request.client_id}")
    
    try:
        service = get_comfyui_service()
        
        if not await service.health_check():
            raise HTTPException(status_code=503, detail="ComfyUI server not responding")
        
        result = await service.generate_service(
            face_photos=request.face_photos,
            demographic=request.demographic,
            pose_ref=request.pose_ref,
            background=request.background,
            background_prompt=request.background_prompt,
            prompt=request.prompt,
            seed=request.seed,
            steps=request.steps,
        )
        
        return {
            "success": True,
            "images": result.get("images", []),
            "generation_time": result.get("generation_time", 0),
            "seed": result.get("seed", request.seed),
            "prompt_id": result.get("prompt_id"),
        }
        
    except ComfyUIError as e:
        logger.error(f"❌ ComfyUI error: {e}")
        return {"success": False, "error": str(e), "images": []}
    except Exception as e:
        logger.exception(f"❌ Error in service generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comfyui/experience", response_model=ComfyUIGenerationResponse)
async def generate_experience_comfyui(request: ComfyUIExperienceRequest):
    """
    Genera imagen de experiencia usando ComfyUI (Formato: Experiencia/Lifestyle).
    
    Usa Depth para espacios y ajusta iluminación según hora del día.
    """
    logger.info(f"🖼️ ComfyUI Experience generation for client {request.client_id}")
    
    try:
        service = get_comfyui_service()
        
        if not await service.health_check():
            raise HTTPException(status_code=503, detail="ComfyUI server not responding")
        
        result = await service.generate_experience(
            space_image=request.space_image,
            hands_feet=request.hands_feet,
            mood_ref=request.mood_ref,
            time_of_day=request.time_of_day.value,
            prompt=request.prompt,
            seed=request.seed,
            steps=request.steps,
        )
        
        return {
            "success": True,
            "images": result.get("images", []),
            "generation_time": result.get("generation_time", 0),
            "seed": result.get("seed", request.seed),
            "prompt_id": result.get("prompt_id"),
        }
        
    except ComfyUIError as e:
        logger.error(f"❌ ComfyUI error: {e}")
        return {"success": False, "error": str(e), "images": []}
    except Exception as e:
        logger.exception(f"❌ Error in experience generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comfyui/promotional", response_model=ComfyUIGenerationResponse)
async def generate_promotional_comfyui(request: ComfyUIPromotionalRequest):
    """
    Genera imagen promocional usando ComfyUI (Formato: Promocional/Ofertas).
    
    Usa máscara de layout para respetar zonas de texto y fuerza colores de marca.
    """
    logger.info(f"🖼️ ComfyUI Promotional generation for client {request.client_id}")
    
    try:
        service = get_comfyui_service()
        
        if not await service.health_check():
            raise HTTPException(status_code=503, detail="ComfyUI server not responding")
        
        result = await service.generate_promotional(
            layout_mask=request.layout_mask,
            product_image=request.product_image,
            brand_colors={
                "primary": request.primary_color,
                "secondary": request.secondary_color,
                "accent": request.accent_color,
            },
            prompt=request.prompt,
            seed=request.seed,
        )
        
        return {
            "success": True,
            "images": result.get("images", []),
            "generation_time": result.get("generation_time", 0),
            "seed": result.get("seed", request.seed),
            "prompt_id": result.get("prompt_id"),
        }
        
    except ComfyUIError as e:
        logger.error(f"❌ ComfyUI error: {e}")
        return {"success": False, "error": str(e), "images": []}
    except Exception as e:
        logger.exception(f"❌ Error in promotional generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comfyui/ad", response_model=ComfyUIGenerationResponse)
async def generate_ad_comfyui(request: ComfyUIAdRequest):
    """
    Genera imagen de anuncio usando ComfyUI (Formato: Anuncio/High Impact).
    
    Permite control de creatividad (realista a surrealista) mediante denoising.
    """
    logger.info(f"🖼️ ComfyUI Ad generation for client {request.client_id}")
    
    try:
        service = get_comfyui_service()
        
        if not await service.health_check():
            raise HTTPException(status_code=503, detail="ComfyUI server not responding")
        
        result = await service.generate_ad_impact(
            concept_ref=request.concept_ref,
            hook_element=request.hook_element,
            hook_prompt=request.hook_prompt,
            creativity_level=request.creativity_level,
            prompt=request.prompt,
            seed=request.seed,
        )
        
        return {
            "success": True,
            "images": result.get("images", []),
            "generation_time": result.get("generation_time", 0),
            "seed": result.get("seed", request.seed),
            "prompt_id": result.get("prompt_id"),
        }
        
    except ComfyUIError as e:
        logger.error(f"❌ ComfyUI error: {e}")
        return {"success": False, "error": str(e), "images": []}
    except Exception as e:
        logger.exception(f"❌ Error in ad generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comfyui/formats")
async def get_available_formats():
    """
    Retorna los formatos de publicación disponibles con sus inputs requeridos.
    """
    return {
        "formats": [
            {
                "id": "producto",
                "name": "Producto Hero",
                "description": "Imagen de producto con fondo premium generado",
                "endpoint": "/studio/comfyui/product",
                "required_inputs": ["product_image"],
                "optional_inputs": ["composition_ref", "surface_texture", "light_ref"],
            },
            {
                "id": "servicio",
                "name": "Servicio",
                "description": "Persona profesional en acción/contexto",
                "endpoint": "/studio/comfyui/service",
                "required_inputs": ["pose_ref"],
                "optional_inputs": ["face_photos", "demographic", "background"],
            },
            {
                "id": "experiencia",
                "name": "Experiencia",
                "description": "Lifestyle/POV con elemento humano parcial",
                "endpoint": "/studio/comfyui/experience",
                "required_inputs": ["space_image"],
                "optional_inputs": ["hands_feet", "mood_ref", "time_of_day"],
            },
            {
                "id": "promocional",
                "name": "Promocional",
                "description": "Imagen con espacio para texto/precios",
                "endpoint": "/studio/comfyui/promotional",
                "required_inputs": ["layout_mask", "product_image"],
                "optional_inputs": ["primary_color", "secondary_color"],
            },
            {
                "id": "anuncio",
                "name": "Anuncio",
                "description": "High impact/scroll stopper con efectos dramáticos",
                "endpoint": "/studio/comfyui/ad",
                "required_inputs": ["concept_ref"],
                "optional_inputs": ["hook_element", "hook_prompt", "creativity_level"],
            },
        ]
    }

