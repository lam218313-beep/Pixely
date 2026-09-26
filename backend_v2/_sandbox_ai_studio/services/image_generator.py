"""
Image Generation Service
========================
Handles AI image generation using OpenAI DALL-E 3 with context inheritance.
"""

import logging
import uuid
import base64
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime
from openai import AsyncOpenAI

from .database import db
from .comfyui_service import get_comfyui_service
from ..config import settings

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Service for generating images with OpenAI DALL-E 3"""
    
    def __init__(self):
        self.model_name = "dall-e-3"
        self.cost_per_image = 0.04  # USD for 1024x1024 standard
        self.cost_hd = 0.08  # USD for 1024x1024 HD
    
    def _get_dalle_size(self, aspect_ratio: str) -> str:
        """
        Map aspect ratio to DALL-E 3 supported sizes.
        DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
        """
        size_map = {
            "1:1": "1024x1024",      # Square (post)
            "16:9": "1792x1024",     # Landscape (cover)
            "9:16": "1024x1792",     # Portrait (story/reel)
            "4:3": "1024x1024",      # Fallback to square
        }
        return size_map.get(aspect_ratio, "1024x1024")
    
    async def generate_image(
        self,
        client_id: str,
        task_id: Optional[str] = None,
        concept_id: Optional[str] = None,
        user_additions: str = "",
        style_preset: str = "realistic",
        aspect_ratio: str = "1:1",
        mood_tone: str = "",
        color_suggestions: str = "",
        negative_prompt: str = "text, watermark, blurry, low quality, distorted"
    ) -> Dict[str, Any]:
        """
        Generate an image using OpenAI DALL-E 3 with full context inheritance.
        """
        try:
            logger.info(f"🎨 Starting DALL-E 3 image generation for client {client_id}")
            
            # 1. Build context from inherited data
            context = await self._build_context(client_id, task_id, concept_id)
            
            # 2. Build final prompt
            base_prompt = self._build_base_prompt(
                context, user_additions, style_preset, 
                aspect_ratio, mood_tone, color_suggestions
            )
            
            # 3. Generate image based on provider
            start_time = datetime.now()
            
            if settings.IMAGE_PROVIDER == "comfyui":
                logger.info(f"🎨 Starting ComfyUI generation (FLUX)...")
                comfy_service = get_comfyui_service()
                
                # Determine steps/cfg based on style (basic mapping)
                steps = 4 if "schnell" in settings.IMAGE_PROVIDER or True else 20 # Defaulting to schnell speed
                
                result = await comfy_service.generate_from_prompt(
                    prompt=base_prompt,
                    negative_prompt=negative_prompt,
                    steps=steps,
                    width=1024, # simplified logic, should resolve generic resolution
                    height=1024
                )
                
                # Extract first image
                images = result.get("images", [])
                if not images:
                    raise Exception("ComfyUI returned no images")
                    
                # ComfyUI returns a URL accessible from the backend (proxy/direct)
                # We need to download it to save to Supabase, OR usage direct URL if public
                # For persistence, we download and upload to Supabase
                image_url_source = images[0]
                image_data = await comfy_service.download_image(image_url_source)
                revised_prompt = base_prompt # FLUX doesn't revise prompts like DALL-E
                
                self.model_name = "flux-schnell" # Update model name for record
                
            else:
                # Default to DALL-E 3
                image_data, revised_prompt = await self._call_dalle_api(
                    prompt=base_prompt,
                    aspect_ratio=aspect_ratio,
                    style_preset=style_preset
                )
                self.model_name = "dall-e-3"

            generation_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # 4. Save to Supabase Storage
            image_id = str(uuid.uuid4())
            storage_path = f"generated_images/{client_id}/{image_id}.png"
            image_url = await self._save_to_storage(image_data, storage_path)
            
            # 5. Save metadata to database
            image_record = await self._save_to_database(
                image_id=image_id,
                client_id=client_id,
                task_id=task_id,
                concept_id=concept_id,
                base_prompt=context.get("base_prompt_summary", ""),
                user_additions=user_additions,
                final_prompt=base_prompt,
                revised_prompt=revised_prompt,
                image_url=image_url,
                storage_path=storage_path,
                style_preset=style_preset,
                aspect_ratio=aspect_ratio,
                mood_tone=mood_tone,
                negative_prompt=negative_prompt,
                generation_time_ms=generation_time_ms,
                objective_context=context.get("objective_context", ""),
                strategy_context=context.get("strategy_context", "")
            )
            
            logger.info(f"✅ Image generated successfully: {image_record['id']}")
            
            return {
                "status": "success",
                "image": image_record
            }
            
        except Exception as e:
            logger.error(f"❌ Image generation failed: {e}")
            raise Exception(f"Image generation error: {str(e)}")
    
    async def _build_context(
        self,
        client_id: str,
        task_id: Optional[str],
        concept_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Build context from interview, strategy, and task data.
        """
        context = {
            "business_name": "La Marca",
            "industry": "General",
            "target_audience": "Audiencia General",
            "brand_voice": "Profesional",
            "objective_context": "",
            "strategy_context": "",
            "concept_label": "",
            "strategic_rationale": "",
            "content_format": "post",
            "selected_hook": "",
            "key_elements_list": "",
            "narrative_structure": "",
            "visual_description": "",
            "base_prompt_summary": ""
        }
        
        # Get interview data
        try:
            interview = db.get_interview(client_id)
            if interview and interview.get("data"):
                data = interview["data"]
                context["business_name"] = data.get("businessName", context["business_name"])
                context["industry"] = data.get("industry", context["industry"])
                context["target_audience"] = data.get("targetAudience", context["target_audience"])
                context["brand_voice"] = data.get("brandVoice", context["brand_voice"])
                logger.info(f"📋 Loaded interview context for {context['business_name']}")
        except Exception as e:
            logger.warning(f"Could not fetch interview data: {e}")
        
        # Get task data
        if task_id:
            try:
                task = db.get_task(task_id)
                if task:
                    context["content_format"] = task.get("format", "post")
                    context["selected_hook"] = task.get("selected_hook", "")
                    key_elements = task.get("key_elements", [])
                    if isinstance(key_elements, list):
                        context["key_elements_list"] = ", ".join(key_elements)
                    else:
                        context["key_elements_list"] = str(key_elements) if key_elements else ""
                    context["narrative_structure"] = task.get("narrative_structure", "")
                    context["visual_description"] = task.get("description", "")
                    # Override concept_id if task has one
                    concept_id = task.get("concept_id") or concept_id
                    logger.info(f"📋 Loaded task context: {task.get('title', 'N/A')}")
            except Exception as e:
                logger.warning(f"Could not fetch task data: {e}")
        
        # Get strategy/concept data
        if concept_id:
            try:
                nodes = db.get_strategy_nodes(client_id)
                concept = next((n for n in nodes if n["id"] == concept_id), None)
                
                if concept:
                    context["concept_label"] = concept.get("label", "")
                    context["strategic_rationale"] = concept.get("strategic_rationale", concept.get("description", ""))
                    
                    # Find parent strategy
                    parent_id = concept.get("parent_id") or concept.get("parentId")
                    strategy = next((n for n in nodes if n["id"] == parent_id), None)
                    if strategy:
                        context["strategy_context"] = strategy.get("label", "")
                        
                        # Find grandparent objective
                        grandparent_id = strategy.get("parent_id") or strategy.get("parentId")
                        objective = next((n for n in nodes if n["id"] == grandparent_id), None)
                        if objective:
                            context["objective_context"] = objective.get("label", "")
                    
                    logger.info(f"📋 Loaded strategy context: {context['concept_label']}")
            except Exception as e:
                logger.warning(f"Could not fetch strategy data: {e}")
        
        # Create summary for database
        context["base_prompt_summary"] = f"Brand: {context['business_name']}, Concept: {context['concept_label']}, Format: {context['content_format']}"
        
        return context
    
    def _build_base_prompt(
        self,
        context: Dict[str, Any],
        user_additions: str,
        style_preset: str,
        aspect_ratio: str,
        mood_tone: str,
        color_suggestions: str
    ) -> str:
        """
        Build the final prompt from context and user inputs.
        Optimized for DALL-E 3 which prefers concise, descriptive prompts.
        """
        # Map style presets to descriptive terms
        style_descriptions = {
            "realistic": "photorealistic, professional photography",
            "illustration": "digital illustration, artistic, vibrant",
            "3d_render": "3D rendered, modern, cinematic lighting",
            "minimalist": "minimalist, clean, simple, elegant",
            "vintage": "vintage aesthetic, retro, nostalgic tones"
        }
        
        style_desc = style_descriptions.get(style_preset, "professional")
        
        # Build a concise prompt for DALL-E 3
        prompt_parts = []
        
        # Core visual description
        if context.get("visual_description"):
            prompt_parts.append(context["visual_description"])
        
        # Brand context (condensed)
        brand_context = f"for {context['business_name']}"
        if context.get("industry") and context["industry"] != "General":
            brand_context += f" ({context['industry']})"
        prompt_parts.append(brand_context)
        
        # Concept/purpose
        if context.get("concept_label"):
            prompt_parts.append(f"representing '{context['concept_label']}'")
        
        # Key elements
        if context.get("key_elements_list"):
            prompt_parts.append(f"featuring: {context['key_elements_list']}")
        
        # Mood and colors
        mood = mood_tone or context.get("brand_voice", "professional")
        prompt_parts.append(f"Mood: {mood}")
        
        if color_suggestions:
            prompt_parts.append(f"Color palette: {color_suggestions}")
        
        # User additions
        if user_additions:
            prompt_parts.append(user_additions)
        
        # Style
        prompt_parts.append(f"Style: {style_desc}")
        
        # Technical requirements
        prompt_parts.append("High quality, suitable for social media. No text, watermarks, or logos.")
        
        final_prompt = ". ".join(prompt_parts)
        
        logger.info(f"📝 Built prompt ({len(final_prompt)} chars)")
        
        return final_prompt
    
    async def _call_dalle_api(
        self,
        prompt: str,
        aspect_ratio: str,
        style_preset: str
    ) -> tuple[bytes, str]:
        """
        Call OpenAI DALL-E 3 API to generate image.
        
        Returns:
            Tuple of (image_bytes, revised_prompt)
        """
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured in environment")
        
        try:
            # Determine size from aspect ratio
            size = self._get_dalle_size(aspect_ratio)
            
            # Determine quality (use standard for faster generation)
            quality = "standard"  # Options: "standard" or "hd"
            
            # DALL-E 3 style parameter
            # "vivid" = hyper-real and dramatic
            # "natural" = more natural, less hyper-real
            dalle_style = "natural" if style_preset in ["realistic", "minimalist"] else "vivid"
            
            logger.info(f"🖼️ Calling DALL-E 3: size={size}, quality={quality}, style={dalle_style}")
            
            async with AsyncOpenAI(api_key=settings.OPENAI_API_KEY) as client:
                response = await client.images.generate(
                    model="dall-e-3",
                    prompt=prompt,
                    size=size,
                    quality=quality,
                    style=dalle_style,
                    n=1,
                    response_format="url"
                )
            
            # Get the image URL and revised prompt
            image_url = response.data[0].url
            revised_prompt = response.data[0].revised_prompt or prompt
            
            logger.info(f"📥 DALL-E 3 returned image, downloading...")
            
            # Download the image
            async with httpx.AsyncClient() as http_client:
                img_response = await http_client.get(image_url, timeout=60.0)
                img_response.raise_for_status()
                image_data = img_response.content
            
            logger.info(f"✅ Image downloaded: {len(image_data)} bytes")
            
            return image_data, revised_prompt
            
        except Exception as e:
            logger.error(f"❌ DALL-E 3 API call failed: {e}")
            raise
    
    async def _save_to_storage(self, image_data: bytes, storage_path: str) -> str:
        """
        Save generated image to Supabase Storage.
        Uses admin_client (service role) to bypass RLS.
        """
        try:
            # Use admin_client for storage operations (bypasses RLS)
            storage_client = db.admin_client or db.client
            
            if not storage_client:
                # Fallback: return a data URL if no storage configured
                data_url = f"data:image/png;base64,{base64.b64encode(image_data).decode()}"
                logger.warning("⚠️ No Supabase client, returning data URL")
                return data_url
            
            # Upload to Supabase Storage
            response = storage_client.storage.from_("generated-images").upload(
                path=storage_path,
                file=image_data,
                file_options={"content-type": "image/png", "upsert": "true"}
            )
            
            # Get public URL
            public_url = storage_client.storage.from_("generated-images").get_public_url(storage_path)
            
            logger.info(f"✅ Image saved to storage: {storage_path}")
            return public_url
            
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            # Fallback to data URL
            data_url = f"data:image/png;base64,{base64.b64encode(image_data).decode()}"
            logger.warning("⚠️ Using data URL fallback")
            return data_url
    
    async def _save_to_database(
        self,
        image_id: str,
        client_id: str,
        task_id: Optional[str],
        concept_id: Optional[str],
        base_prompt: str,
        user_additions: str,
        final_prompt: str,
        revised_prompt: str,
        image_url: str,
        storage_path: str,
        style_preset: str,
        aspect_ratio: str,
        mood_tone: str,
        negative_prompt: str,
        generation_time_ms: int,
        objective_context: str,
        strategy_context: str
    ) -> Dict[str, Any]:
        """
        Save image metadata to database.
        """
        record = {
            "id": image_id,
            "client_id": client_id,
            "task_id": task_id,
            "concept_id": concept_id,
            "base_prompt": base_prompt,
            "user_additions": user_additions,
            "final_prompt": final_prompt,
            "revised_prompt": revised_prompt,
            "image_url": image_url,
            "storage_path": storage_path,
            "style_preset": style_preset,
            "aspect_ratio": aspect_ratio,
            "mood_tone": mood_tone,
            "negative_prompt": negative_prompt,
            "generation_model": self.model_name,
            "cost_usd": self.cost_per_image,
            "generation_time_ms": generation_time_ms,
            "is_selected": False,
            "objective_context": objective_context,
            "strategy_context": strategy_context,
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            if db.client:
                response = db.client.table("generated_images").insert(record).execute()
                logger.info(f"✅ Image metadata saved to database: {record['id']}")
                return response.data[0] if response.data else record
            else:
                logger.warning("⚠️ No database client, returning record without persistence")
                return record
        except Exception as e:
            logger.error(f"Database save failed: {e}")
            return record
    
    async def get_images_for_task(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all generated images for a specific task."""
        try:
            if not db.client:
                return []
            response = db.client.table("generated_images")\
                .select("*")\
                .eq("task_id", task_id)\
                .order("created_at", desc=True)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch images for task {task_id}: {e}")
            return []
    
    async def get_images_for_client(
        self,
        client_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get recent generated images for a client (for gallery)."""
        try:
            if not db.client:
                return []
            response = db.client.table("generated_images")\
                .select("*")\
                .eq("client_id", client_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch images for client {client_id}: {e}")
            return []
    
    async def select_image_for_task(self, image_id: str, task_id: str) -> bool:
        """Mark an image as selected for a task."""
        try:
            if not db.client:
                return False
                
            # Unselect any previously selected images for this task
            db.client.table("generated_images")\
                .update({"is_selected": False})\
                .eq("task_id", task_id)\
                .execute()
            
            # Select the new image
            db.client.table("generated_images")\
                .update({"is_selected": True})\
                .eq("id", image_id)\
                .execute()
            
            # Update task with selected_image_id
            db.client.table("tasks")\
                .update({"selected_image_id": image_id})\
                .eq("id", task_id)\
                .execute()
            
            logger.info(f"✅ Image {image_id} selected for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to select image: {e}")
            return False
    
    async def delete_image(self, image_id: str) -> bool:
        """Delete an image from storage and database."""
        try:
            if not db.client:
                return False
            
            # Get image record to find storage path
            response = db.client.table("generated_images")\
                .select("storage_path")\
                .eq("id", image_id)\
                .single()\
                .execute()
            
            if response.data:
                storage_path = response.data.get("storage_path")
                
                # Delete from storage
                if storage_path and not storage_path.startswith("data:"):
                    try:
                        db.client.storage.from_("generated-images").remove([storage_path])
                    except Exception as e:
                        logger.warning(f"Could not delete from storage: {e}")
                
                # Delete from database
                db.client.table("generated_images")\
                    .delete()\
                    .eq("id", image_id)\
                    .execute()
                
                logger.info(f"✅ Image {image_id} deleted")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete image: {e}")
            return False


# Singleton instance
image_service = ImageGenerationService()
