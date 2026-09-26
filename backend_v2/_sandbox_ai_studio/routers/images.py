"""
Image Generation Router
=======================
API endpoints for AI image generation with Google Imagen 3.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

from ..services.image_generator import image_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/images", tags=["Image Generation"])


# --- Request/Response Models ---

class GenerateImageRequest(BaseModel):
    """Request to generate an image."""
    client_id: str
    task_id: Optional[str] = None
    concept_id: Optional[str] = None
    user_additions: str = ""
    style_preset: str = "realistic"  # realistic, illustration, 3d_render, minimalist, vintage
    aspect_ratio: str = "1:1"  # 1:1, 16:9, 9:16, 4:3
    mood_tone: str = ""
    color_suggestions: str = ""
    negative_prompt: str = "text, watermark, blurry, low quality, distorted"


class SelectImageRequest(BaseModel):
    """Request to select an image for a task."""
    task_id: str


class ImageResponse(BaseModel):
    """Image metadata response."""
    id: str
    client_id: str
    task_id: Optional[str]
    image_url: str
    style_preset: str
    aspect_ratio: str
    is_selected: bool
    cost_usd: float
    generation_time_ms: int
    created_at: str


# --- Endpoints ---

@router.post("/generate")
async def generate_image(request: GenerateImageRequest):
    """
    Generate an AI image with context inheritance.
    
    This endpoint:
    1. Collects context from interview, strategy, and task data
    2. Builds an enriched prompt
    3. Calls Google Imagen 3 API
    4. Saves image to Supabase Storage
    5. Stores metadata in database
    """
    try:
        logger.info(f"📸 Image generation request for client {request.client_id}")
        
        result = await image_service.generate_image(
            client_id=request.client_id,
            task_id=request.task_id,
            concept_id=request.concept_id,
            user_additions=request.user_additions,
            style_preset=request.style_preset,
            aspect_ratio=request.aspect_ratio,
            mood_tone=request.mood_tone,
            color_suggestions=request.color_suggestions,
            negative_prompt=request.negative_prompt
        )
        
        return result
        
    except NotImplementedError as e:
        # API not yet configured
        logger.warning(f"⚠️ API not configured: {e}")
        raise HTTPException(
            status_code=501,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Image generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Image generation error: {str(e)}"
        )


@router.get("/task/{task_id}")
async def get_task_images(task_id: str):
    """
    Get all generated images for a specific task.
    
    Returns images ordered by creation date (newest first).
    """
    try:
        images = await image_service.get_images_for_task(task_id)
        
        return {
            "status": "success",
            "count": len(images),
            "images": images
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch task images: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/client/{client_id}")
async def get_client_images(client_id: str, limit: int = 50):
    """
    Get recent generated images for a client (for gallery view).
    
    Args:
        client_id: Client identifier
        limit: Maximum number of images to return (default: 50)
    """
    try:
        images = await image_service.get_images_for_client(client_id, limit)
        
        return {
            "status": "success",
            "count": len(images),
            "images": images
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch client images: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{image_id}/select")
async def select_image(image_id: str, request: SelectImageRequest):
    """
    Select an image as the final choice for a task.
    
    This will:
    1. Unselect any previously selected images for the task
    2. Mark this image as selected
    3. Update the task's selected_image_id field
    """
    try:
        success = await image_service.select_image_for_task(image_id, request.task_id)
        
        if success:
            return {
                "status": "success",
                "message": f"Image {image_id} selected for task {request.task_id}"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to select image")
            
    except Exception as e:
        logger.error(f"❌ Failed to select image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{image_id}")
async def delete_image(image_id: str):
    """
    Delete a generated image.
    
    This will:
    1. Remove the image from Supabase Storage
    2. Delete the database record
    """
    try:
        # TODO: Implement deletion logic
        # 1. Get image record to find storage_path
        # 2. Delete from storage
        # 3. Delete from database
        
        raise HTTPException(
            status_code=501,
            detail="Image deletion not yet implemented"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to delete image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage/{client_id}")
async def get_usage_stats(client_id: str, month: Optional[str] = None):
    """
    Get image generation usage statistics for a client.
    
    Args:
        client_id: Client identifier
        month: Optional month filter (YYYY-MM format)
    
    Returns usage metrics including:
    - Total images generated
    - Total cost
    - Average generation time
    """
    try:
        from ..services.database import db
        
        # Query the usage view
        query = db.client.table("image_generation_usage")\
            .select("*")\
            .eq("client_id", client_id)
        
        if month:
            query = query.eq("month", month)
        
        response = query.execute()
        
        return {
            "status": "success",
            "usage": response.data if response.data else []
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch usage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
