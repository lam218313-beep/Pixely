"""
NanoBanana Image Generation Service V2
======================================
Uses Google Gemini's native image generation (NanoBanana) correctly.

Models:
- gemini-2.5-flash-image (NanoBanana Flash) - Fast, high-volume
- gemini-3-pro-image-preview (NanoBanana Pro) - Professional with thinking mode

Features from documentation:
- Up to 14 reference images (6 high-fidelity objects + 5 humans + 3 style)
- Aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- Resolutions: 1K, 2K, 4K
- Thinking mode for complex prompts (Pro only)
- Google Search grounding (Pro only)
"""

import logging
import uuid
import base64
import httpx
import os
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from PIL import Image
import io

from .database import db
from ..config import settings

logger = logging.getLogger(__name__)


# =============================================================================
# PROMPT TEMPLATES (based on nanobananapro.md best practices)
# =============================================================================

PROMPT_TEMPLATES = {
    # Photorealistic commercial photography
    'product_hero': {
        'template': """A high-resolution, studio-lit product photograph of {subject}. 
The product is presented on {background}.
The lighting is {lighting_setup} to create {lighting_purpose}.
The camera angle is {camera_angle} to showcase {feature_focus}.
Ultra-realistic, with sharp focus on {detail_focus}.
{mood} atmosphere. {aspect_format}.""",
        'defaults': {
            'background': 'a clean, minimalist surface',
            'lighting_setup': 'a three-point softbox setup',
            'lighting_purpose': 'soft, diffused highlights and eliminate harsh shadows',
            'camera_angle': 'a slightly elevated 45-degree shot',
            'feature_focus': 'the product details and texture',
            'detail_focus': 'the product surface and branding elements',
            'mood': 'Professional and premium',
            'aspect_format': 'Square composition'
        }
    },
    
    # Lifestyle/aspirational 
    'lifestyle': {
        'template': """A photorealistic {shot_type} of {subject}, {action_or_context}.
Set in {environment}.
The scene is illuminated by {lighting}, creating a {mood} atmosphere.
Captured with {camera_details}, emphasizing {textures_details}.
{style_notes}. {aspect_format}.""",
        'defaults': {
            'shot_type': 'wide shot',
            'action_or_context': 'in a natural, candid moment',
            'environment': 'a modern, aspirational setting',
            'lighting': 'soft, natural golden hour light',
            'mood': 'warm and inviting',
            'camera_details': 'a 35mm lens with shallow depth of field',
            'textures_details': 'natural textures and ambient details',
            'style_notes': 'Lifestyle photography aesthetic',
            'aspect_format': 'Vertical composition'
        }
    },
    
    # Promotional/sale
    'promotional': {
        'template': """A vibrant, eye-catching {composition_type} featuring {subject}.
The visual style is {visual_style} with {color_emphasis} color palette.
{energy_level} energy composition with {visual_elements}.
{lighting} lighting creates {lighting_effect}.
{call_to_action_visual}. {aspect_format}.""",
        'defaults': {
            'composition_type': 'promotional image',
            'visual_style': 'bold and dynamic',
            'color_emphasis': 'high-contrast, saturated',
            'energy_level': 'High',
            'visual_elements': 'dynamic angles and movement',
            'lighting': 'Dramatic',
            'lighting_effect': 'emphasis on the main subject',
            'call_to_action_visual': 'Strong focal point drawing attention',
            'aspect_format': 'Square composition'
        }
    },
    
    # Minimalist/clean
    'minimalist': {
        'template': """A minimalist composition featuring {subject}.
{negative_space_description}.
The background is {background_description}.
{lighting} from {light_direction}.
{color_palette}. Clean, balanced aesthetic.
{aspect_format}.""",
        'defaults': {
            'negative_space_description': 'Significant negative space creating breathing room',
            'background_description': 'a vast, empty canvas in neutral tones',
            'lighting': 'Soft, diffused lighting',
            'light_direction': 'above and slightly to the side',
            'color_palette': 'Muted, sophisticated color palette',
            'aspect_format': 'Square composition'
        }
    },
    
    # Editorial/storytelling
    'editorial': {
        'template': """An editorial-style photograph of {subject}.
{narrative_context}.
Shot in {location_style} with {compositional_approach}.
The mood is {mood} with {tonal_quality} tones.
{lighting}. {camera_perspective}.
{aspect_format}.""",
        'defaults': {
            'narrative_context': 'Telling a visual story',
            'location_style': 'a carefully styled environment',
            'compositional_approach': 'rule of thirds and leading lines',
            'mood': 'sophisticated and intentional',
            'tonal_quality': 'rich, cinematic',
            'lighting': 'Natural directional light with subtle shadows',
            'camera_perspective': 'Eye-level perspective creating intimacy',
            'aspect_format': 'Horizontal composition'
        }
    }
}

# Camera/composition options (from doc best practices)
CAMERA_OPTIONS = {
    'angles': ['eye-level', '45-degree elevated', 'low-angle', 'high-angle', 'birds-eye', 'worms-eye'],
    'shots': ['close-up', 'macro', 'medium shot', 'wide shot', 'extreme close-up', 'full shot'],
    'lenses': ['35mm', '50mm portrait', '85mm bokeh', '24mm wide-angle', '100mm macro', 'telephoto'],
    'perspectives': ['frontal', 'three-quarter', 'profile', 'overhead', 'isometric']
}

LIGHTING_PRESETS = {
    'studio': 'professional three-point studio lighting with softboxes',
    'natural': 'soft, natural window light',
    'golden_hour': 'warm golden hour sunlight with long shadows',
    'dramatic': 'dramatic chiaroscuro lighting with strong shadows',
    'soft': 'flat, even editorial lighting',
    'neon': 'colorful neon accent lighting',
    'ring': 'ring light creating even, flattering illumination',
    'backlit': 'backlit silhouette with rim lighting'
}

MOOD_DESCRIPTORS = {
    'luxurious': 'luxurious, premium, and aspirational',
    'playful': 'playful, friendly, and approachable',
    'professional': 'professional, clean, and trustworthy',
    'energetic': 'energetic, dynamic, and exciting',
    'calm': 'calm, serene, and peaceful',
    'bold': 'bold, disruptive, and attention-grabbing',
    'elegant': 'elegant, refined, and sophisticated',
    'warm': 'warm, inviting, and comfortable'
}


class NanoBananaServiceV2:
    """
    NanoBanana Image Generation Service using Gemini Native Image Generation.
    
    Based on official documentation: nanobananapro.md
    """
    
    # Model configurations (from nanobananapro.md documentation)
    # Flash: gemini-2.5-flash-image
    # Pro: gemini-3-pro-image-preview
    MODELS = {
        'flash': {
            'id': 'gemini-2.5-flash-image',  # NanoBanana Flash
            'name': 'NanoBanana Flash',
            'description': 'Fast generation for high volume, optimized for speed',
            'max_references': 3,  # Flash works best with up to 3 images
            'supports_thinking': False,
            'supports_search': False,
            'cost_per_image': 0.02,
        },
        'pro': {
            'id': 'gemini-3-pro-image-preview',  # NanoBanana Pro
            'name': 'NanoBanana Pro',
            'description': 'Professional asset production with thinking mode',
            'max_references': 14,  # Pro supports up to 14 (6 objects + 5 humans + 3 style)
            'supports_thinking': True,
            'supports_search': True,
            'cost_per_image': 0.08,
        }
    }
    
    # Valid aspect ratios (from nanobananapro.md line 578)
    VALID_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
    
    # Format to aspect ratio mapping
    FORMAT_TO_RATIO = {
        'post': '1:1',        # Instagram/Facebook square post
        'story': '9:16',      # Instagram/TikTok story
        'reel': '9:16',       # Instagram/TikTok reel
        'cover': '16:9',      # YouTube/Facebook cover
        'portrait': '4:5',    # Instagram portrait
        'landscape': '3:2',   # Standard landscape
        'pinterest': '2:3',   # Pinterest pin
        'ultra_wide': '21:9', # Ultra-wide cinematic
    }
    
    # Valid resolutions
    VALID_RESOLUTIONS = ['1K', '2K', '4K']
    
    def __init__(self):
        self.client = None
        self._configure_client()
    
    def _configure_client(self):
        """Configure the Google GenAI client (new google.genai package)"""
        try:
            from google import genai
            
            api_key = settings.GEMINI_API_KEY or os.getenv('GEMINI_API_KEY')
            if not api_key:
                logger.warning("⚠️ GEMINI_API_KEY not configured - NanoBanana will not work")
                return
            
            # New API uses Client() with api_key parameter
            self.client = genai.Client(api_key=api_key)
            logger.info("✅ NanoBanana client configured (google.genai native image generation)")
            
        except Exception as e:
            logger.error(f"❌ Failed to configure NanoBanana client: {e}")
    
    async def generate_for_task(
        self,
        task_id: str,
        template_id: Optional[str] = None,
        reference_image_ids: List[str] = [],
        product_image_id: Optional[str] = None,
        custom_prompt: str = "",
        aspect_ratio: Optional[str] = None,
        resolution: str = "2K",
        use_pro_model: bool = False,
        archetype: Optional[str] = None,
        camera_settings: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Generate an image for a specific task using NanoBanana.
        
        Args:
            task_id: Required - links generation to planning task
            template_id: Optional template to use (deprecated, use archetype)
            reference_image_ids: Style reference images from image bank
            product_image_id: Product image for high-fidelity preservation
            custom_prompt: Override prompt (highest priority)
            aspect_ratio: Override aspect ratio (otherwise from task format)
            resolution: 1K, 2K, or 4K
            use_pro_model: Use NanoBanana Pro (slower but better)
            archetype: Visual archetype (product_hero, lifestyle, promotional, minimalist, editorial)
            camera_settings: Optional camera/composition overrides
        
        Returns:
            Dict with generated image data and metadata
        """
        if not self.client:
            raise ValueError("NanoBanana client not configured. Check GEMINI_API_KEY.")
        
        logger.info(f"🎨 Starting NanoBanana generation for task: {task_id}")
        
        # 1. Load task data
        task = await self._load_task(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")
        
        client_id = task.get('client_id')
        logger.info(f"   Task: {task.get('title', 'Untitled')}")
        
        # 2. Load brand DNA
        brand_dna = await self._load_brand_dna(client_id) if client_id else {}
        
        # 3. Load reference images
        reference_images = await self._load_reference_images(reference_image_ids)
        product_image = await self._load_product_image(product_image_id) if product_image_id else None
        
        # 4. Determine archetype from task or explicit parameter
        if not archetype:
            archetype = self._infer_archetype(task, brand_dna)
        
        # 5. Build the prompt using templates and context
        final_prompt = self._build_prompt_v2(
            task=task,
            brand_dna=brand_dna,
            archetype=archetype,
            custom_prompt=custom_prompt,
            camera_settings=camera_settings
        )
        
        # 6. Determine aspect ratio
        if not aspect_ratio:
            task_format = task.get('format', 'post')
            aspect_ratio = self.FORMAT_TO_RATIO.get(task_format, '1:1')
        
        # Validate aspect ratio
        if aspect_ratio not in self.VALID_ASPECT_RATIOS:
            logger.warning(f"Invalid aspect ratio {aspect_ratio}, using 1:1")
            aspect_ratio = '1:1'
        
        # Validate resolution
        if resolution not in self.VALID_RESOLUTIONS:
            resolution = '2K'
        
        # 7. Select model
        model_key = 'pro' if use_pro_model else 'flash'
        model_config = self.MODELS[model_key]
        
        # Check reference limits
        total_refs = len(reference_images) + (1 if product_image else 0)
        if total_refs > model_config['max_references']:
            logger.warning(f"Too many references ({total_refs}), limiting to {model_config['max_references']}")
            reference_images = reference_images[:model_config['max_references'] - (1 if product_image else 0)]
        
        # 8. Call NanoBanana API
        start_time = datetime.now()
        
        image_data, thinking_images, revised_prompt = await self._call_gemini_image_api(
            prompt=final_prompt,
            reference_images=reference_images,
            product_image=product_image,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            model_key=model_key
        )
        
        generation_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        logger.info(f"   Generation took: {generation_time_ms}ms")
        
        # 9. Save to storage
        image_id = str(uuid.uuid4())
        storage_path = f"generated_images/{client_id}/{task_id}/{image_id}.png"
        image_url = await self._save_to_storage(image_data, storage_path)
        
        # 10. Save to database
        image_record = await self._save_to_database(
            image_id=image_id,
            client_id=client_id,
            task_id=task_id,
            template_id=template_id,
            archetype=archetype,
            base_prompt=final_prompt[:500],
            final_prompt=final_prompt,
            revised_prompt=revised_prompt,
            image_url=image_url,
            storage_path=storage_path,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            model_used=model_config['id'],
            reference_image_ids=reference_image_ids,
            product_image_id=product_image_id,
            thinking_images=thinking_images,
            generation_time_ms=generation_time_ms,
            brand_dna=brand_dna
        )
        
        # 11. Update task status
        await self._update_task_status(task_id, "generated")
        
        return {
            "status": "success",
            "image": image_record,
            "thinking_images": thinking_images,
            "model_used": model_config['name'],
            "archetype_used": archetype,
            "generation_time_ms": generation_time_ms
        }
    
    def _infer_archetype(self, task: Dict[str, Any], brand_dna: Dict[str, Any]) -> str:
        """Infer the best archetype based on task and brand context"""
        # Check brand preferred archetypes first
        preferred = brand_dna.get('preferred_archetypes', [])
        
        # Analyze task content
        title = (task.get('title') or '').lower()
        description = (task.get('description') or '').lower()
        hook = (task.get('selected_hook') or '').lower()
        purpose = (task.get('strategic_purpose') or '').lower()
        
        content = f"{title} {description} {hook} {purpose}"
        
        # Keywords for each archetype
        archetype_keywords = {
            'promotional': ['oferta', 'descuento', 'sale', 'promo', 'compra', 'ahorra', 'gratis', 'limitado'],
            'product_hero': ['producto', 'product', 'lanzamiento', 'nuevo', 'feature', 'característica', 'detalle'],
            'lifestyle': ['lifestyle', 'vida', 'momento', 'experiencia', 'uso', 'cotidiano', 'real'],
            'minimalist': ['minimal', 'clean', 'simple', 'elegante', 'sofisticado', 'zen'],
            'editorial': ['historia', 'story', 'behind', 'proceso', 'editorial', 'narrativa', 'artículo']
        }
        
        # Score each archetype
        scores = {}
        for archetype, keywords in archetype_keywords.items():
            score = sum(1 for kw in keywords if kw in content)
            if archetype in preferred:
                score += 2  # Boost preferred archetypes
            scores[archetype] = score
        
        # Return highest scoring or default
        best = max(scores, key=scores.get) if any(scores.values()) else 'lifestyle'
        logger.info(f"   Inferred archetype: {best} (scores: {scores})")
        return best
    
    def _build_prompt_v2(
        self,
        task: Dict[str, Any],
        brand_dna: Dict[str, Any],
        archetype: str,
        custom_prompt: str,
        camera_settings: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Build prompt using templates and cascading context.
        
        Priority:
        1. Custom prompt (if meaningful)
        2. Template-based from archetype
        3. Fallback to direct description
        """
        
        # Check if custom prompt has meaningful content
        if custom_prompt and len(custom_prompt.strip()) > 15:
            # Enrich custom prompt with technical specs
            return self._enrich_prompt(custom_prompt, brand_dna, camera_settings)
        
        # Get template for archetype
        template_data = PROMPT_TEMPLATES.get(archetype, PROMPT_TEMPLATES['lifestyle'])
        template = template_data['template']
        defaults = template_data['defaults'].copy()
        
        # Extract context from task
        subject = self._extract_subject(task)
        
        # Override defaults with task/brand context
        context = {
            'subject': subject,
            **defaults
        }
        
        # Apply brand DNA
        mood = brand_dna.get('default_mood', 'professional')
        if mood in MOOD_DESCRIPTORS:
            context['mood'] = MOOD_DESCRIPTORS[mood]
        
        lighting = brand_dna.get('default_lighting', 'studio')
        if lighting in LIGHTING_PRESETS:
            context['lighting'] = LIGHTING_PRESETS[lighting]
            context['lighting_setup'] = LIGHTING_PRESETS[lighting]
        
        # Apply camera settings
        if camera_settings:
            if camera_settings.get('angle'):
                context['camera_angle'] = camera_settings['angle']
            if camera_settings.get('shot'):
                context['shot_type'] = camera_settings['shot']
            if camera_settings.get('lens'):
                context['camera_details'] = f"a {camera_settings['lens']} lens"
        
        # Apply brand colors
        colors = self._format_colors(brand_dna)
        if colors:
            context['color_palette'] = f"Color palette featuring {colors}"
            context['color_emphasis'] = colors
        
        # Apply brand keywords
        keywords = brand_dna.get('visual_keywords', [])
        if keywords:
            context['style_notes'] = f"Visual style: {', '.join(keywords)}"
            context['visual_style'] = ', '.join(keywords[:3])
        
        # Format aspect ratio
        context['aspect_format'] = self._get_aspect_format_description(
            task.get('format', 'post')
        )
        
        # Build prompt from template
        try:
            prompt = template.format(**context)
        except KeyError as e:
            logger.warning(f"Template formatting failed: {e}")
            prompt = f"Create a professional photograph of {subject}. {context.get('mood', 'Professional')} atmosphere."
        
        # Add strategic context
        hook = task.get('selected_hook')
        if hook and len(hook) > 10:
            prompt += f"\n\nThe image should convey: {hook}"
        
        purpose = task.get('strategic_purpose')
        if purpose and len(purpose) > 10:
            prompt += f"\nPurpose: {purpose}"
        
        # Add key visual elements (filtered for non-text items)
        key_elements = task.get('key_elements', [])
        visual_elements = self._filter_text_elements(key_elements)
        if visual_elements:
            prompt += f"\nInclude these visual elements: {', '.join(visual_elements)}"
        
        # Add quality requirements
        prompt += "\n\nProfessional commercial photography quality, high resolution, sharp focus, magazine-worthy."
        
        # Add exclusions (semantic negative prompts)
        exclusions = brand_dna.get('always_exclude', ['text', 'watermarks', 'logos'])
        donts = task.get('donts', [])
        all_exclusions = list(set(exclusions + self._filter_text_elements(donts)))
        
        # Use semantic negative prompts (describe what we WANT instead)
        prompt += "\n\nThe image is clean with no visible text, words, letters, numbers, watermarks, or logos."
        
        if all_exclusions:
            prompt += f" Specifically avoid: {', '.join(all_exclusions[:5])}"
        
        logger.info(f"📝 Built prompt ({len(prompt)} chars) using {archetype} template")
        logger.debug(f"Prompt preview: {prompt[:300]}...")
        
        return prompt
    
    def _extract_subject(self, task: Dict[str, Any]) -> str:
        """Extract the main subject from task data"""
        # Priority: description > title > hook
        description = task.get('description', '').strip()
        if description and len(description) > 20:
            return description
        
        title = task.get('title', '').strip()
        hook = task.get('selected_hook', '').strip()
        
        if title and hook:
            return f"{title} - {hook}"
        elif title:
            return title
        elif hook:
            return hook
        
        return "a professional commercial scene"
    
    def _filter_text_elements(self, elements: List[Any]) -> List[str]:
        """Filter out elements that would require text generation"""
        TEXT_KEYWORDS = [
            'text', 'quote', 'word', 'letter', 'number', 'caption', 'headline',
            'title', 'subtitle', 'cta', 'call to action', 'rating', 'star',
            'estadística', 'métrica', 'cifra', 'testimonio', 'reseña'
        ]
        
        if not elements:
            return []
        
        filtered = []
        for elem in elements:
            if not elem or not isinstance(elem, str):
                continue
            lower = elem.lower()
            if not any(kw in lower for kw in TEXT_KEYWORDS):
                filtered.append(elem)
        
        return filtered
    
    def _enrich_prompt(
        self,
        prompt: str,
        brand_dna: Dict[str, Any],
        camera_settings: Optional[Dict[str, str]] = None
    ) -> str:
        """Enrich a custom prompt with technical specifications"""
        enrichments = []
        
        # Add mood if not in prompt
        mood = brand_dna.get('default_mood', 'professional')
        if mood in MOOD_DESCRIPTORS and mood not in prompt.lower():
            enrichments.append(MOOD_DESCRIPTORS[mood])
        
        # Add lighting if not in prompt
        lighting = brand_dna.get('default_lighting', 'studio')
        lighting_words = ['light', 'lighting', 'lit', 'illuminat']
        if not any(word in prompt.lower() for word in lighting_words):
            if lighting in LIGHTING_PRESETS:
                enrichments.append(LIGHTING_PRESETS[lighting])
        
        # Add camera settings
        if camera_settings:
            cam_parts = []
            if camera_settings.get('shot'):
                cam_parts.append(camera_settings['shot'])
            if camera_settings.get('angle'):
                cam_parts.append(f"{camera_settings['angle']} angle")
            if camera_settings.get('lens'):
                cam_parts.append(f"shot with {camera_settings['lens']} lens")
            if cam_parts:
                enrichments.append(', '.join(cam_parts))
        
        # Add brand colors
        colors = self._format_colors(brand_dna)
        if colors and 'color' not in prompt.lower():
            enrichments.append(f"Color palette: {colors}")
        
        # Build final prompt
        if enrichments:
            prompt += ". " + ". ".join(enrichments)
        
        # Add quality requirements
        prompt += ". Professional commercial photography quality, high resolution, sharp focus."
        
        # Add exclusions
        prompt += " No text, words, letters, numbers, watermarks, or logos visible."
        
        return prompt
    
    def _format_colors(self, brand_dna: Dict[str, Any]) -> str:
        """Format brand colors for prompt"""
        colors = []
        for field in ['color_primary_name', 'color_secondary_name', 'color_accent_name']:
            color = brand_dna.get(field)
            if color:
                colors.append(color)
        return ', '.join(colors) if colors else ''
    
    def _get_aspect_format_description(self, format_type: str) -> str:
        """Get composition description for format type"""
        descriptions = {
            'post': 'Square composition, clean and balanced',
            'story': 'Vertical composition optimized for mobile viewing, subject centered',
            'reel': 'Dynamic vertical composition with motion-friendly framing',
            'cover': 'Horizontal cinematic composition suitable for headers',
            'portrait': 'Vertical portrait composition with subject as focal point',
            'landscape': 'Horizontal landscape composition with depth',
            'pinterest': 'Tall vertical composition ideal for scrolling',
            'ultra_wide': 'Ultra-wide cinematic composition'
        }
        return descriptions.get(format_type, 'Balanced composition')
    
    async def _call_gemini_image_api(
        self,
        prompt: str,
        reference_images: List[Dict[str, Any]],
        product_image: Optional[Dict[str, Any]],
        aspect_ratio: str,
        resolution: str,
        model_key: str
    ) -> Tuple[bytes, List[str], str]:
        """
        Call the Gemini API for native image generation.
        
        Uses new google.genai package (replacing deprecated google.generativeai)
        """
        model_config = self.MODELS[model_key]
        model_id = model_config['id']
        
        logger.info(f"🖼️ Calling Gemini {model_config['name']}: {model_id}")
        logger.info(f"   Aspect ratio: {aspect_ratio}, Resolution: {resolution}")
        logger.info(f"   References: {len(reference_images)}, Product: {product_image is not None}")
        
        try:
            from google.genai import types
            from PIL import Image as PILImage
            
            if not self.client:
                raise ValueError("NanoBanana client not initialized")
            
            # Build content parts for the new API
            content_parts = []
            
            # Add reference images first (so model can see them before prompt)
            for ref in reference_images:
                if ref.get('data'):
                    # New API uses types.Part.from_bytes()
                    content_parts.append(
                        types.Part.from_bytes(
                            data=ref['data'],
                            mime_type=ref.get('mime_type', 'image/jpeg')
                        )
                    )
            
            # Add product image with high-fidelity instruction
            if product_image and product_image.get('data'):
                product_name = product_image.get('name', 'the product')
                content_parts.append(
                    types.Part.from_bytes(
                        data=product_image['data'],
                        mime_type=product_image.get('mime_type', 'image/jpeg')
                    )
                )
                # Add instruction for high-fidelity preservation
                prompt = f"Keep this product ({product_name}) with perfect high-fidelity detail preservation in the generated image. {prompt}"
            
            # Add the text prompt
            content_parts.append(prompt)
            
            # Configure generation with new API types
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE', 'TEXT'],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=resolution  # '1K', '2K', or '4K'
                )
            )
            
            # Generate using the new client.models.generate_content API
            response = self.client.models.generate_content(
                model=model_id,
                contents=content_parts,
                config=config
            )
            
            # Extract image from response
            image_data = None
            thinking_images = []
            revised_prompt = ""
            
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # This is an image - new API stores data directly as bytes
                        if hasattr(part.inline_data, 'data'):
                            image_bytes = part.inline_data.data
                            if isinstance(image_bytes, str):
                                # If it's base64 encoded string
                                image_bytes = base64.b64decode(image_bytes)
                            if not image_data:
                                image_data = image_bytes
                            else:
                                # Additional images could be "thinking" images
                                img_b64 = base64.b64encode(image_bytes).decode('utf-8')
                                mime = getattr(part.inline_data, 'mime_type', 'image/png')
                                thinking_images.append(f"data:{mime};base64,{img_b64}")
                    elif hasattr(part, 'text') and part.text:
                        revised_prompt = part.text
            
            # Also check for as_image() helper method (new API)
            if not image_data and hasattr(response, 'parts'):
                for part in response.parts:
                    if part.inline_data is not None:
                        img = part.as_image()
                        if img:
                            buf = io.BytesIO()
                            img.save(buf, format='PNG')
                            image_data = buf.getvalue()
                            break
                    elif part.text is not None:
                        revised_prompt = part.text
            
            if not image_data:
                raise ValueError("No image returned from Gemini API")
            
            logger.info(f"✅ Gemini returned image: {len(image_data)} bytes")
            
            return image_data, thinking_images, revised_prompt
            
        except Exception as e:
            logger.error(f"❌ Gemini image generation failed: {e}")
            logger.error(f"   Error type: {type(e).__name__}")
            raise ValueError(f"Image generation failed: {str(e)}")
    
    # =========================================================================
    # DATABASE OPERATIONS (largely unchanged from v1)
    # =========================================================================
    
    async def _load_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Load task data from database"""
        if not db.client:
            logger.warning("Database client not configured")
            return None
        
        try:
            response = db.client.table("tasks")\
                .select("*")\
                .eq("id", task_id)\
                .single()\
                .execute()
            
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Failed to load task {task_id}: {e}")
            return None
    
    async def _load_brand_dna(self, client_id: str) -> Dict[str, Any]:
        """Load brand visual DNA for a client"""
        if not db.client or not client_id:
            return {}
        
        try:
            response = db.client.table("brand_visual_dna")\
                .select("*")\
                .eq("client_id", client_id)\
                .single()\
                .execute()
            
            return response.data if response.data else {}
        except Exception as e:
            logger.warning(f"Could not fetch brand DNA: {e}")
            return {}
    
    async def _load_reference_images(self, image_ids: List[str]) -> List[Dict[str, Any]]:
        """Load reference images from the image bank"""
        if not image_ids or not db.client:
            return []
        
        try:
            response = db.client.table("brand_image_bank")\
                .select("id, image_url, category, storage_path")\
                .in_("id", image_ids)\
                .execute()
            
            images = []
            for img in (response.data or []):
                img_data = await self._download_image(img['image_url'])
                if img_data:
                    images.append({
                        'id': img['id'],
                        'data': img_data,
                        'category': img['category'],
                        'mime_type': 'image/jpeg'
                    })
            
            return images
        except Exception as e:
            logger.error(f"Failed to load reference images: {e}")
            return []
    
    async def _load_product_image(self, image_id: str) -> Optional[Dict[str, Any]]:
        """Load a product image for high-fidelity preservation"""
        if not image_id or not db.client:
            return None
        
        try:
            response = db.client.table("brand_image_bank")\
                .select("id, image_url, category, storage_path, name")\
                .eq("id", image_id)\
                .single()\
                .execute()
            
            if response.data:
                img_data = await self._download_image(response.data['image_url'])
                if img_data:
                    return {
                        'id': response.data['id'],
                        'data': img_data,
                        'name': response.data.get('name', 'Product'),
                        'mime_type': 'image/jpeg'
                    }
            return None
        except Exception as e:
            logger.error(f"Failed to load product image: {e}")
            return None
    
    async def _download_image(self, url: str) -> Optional[bytes]:
        """Download image from URL"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                return response.content
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {e}")
            return None
    
    async def _save_to_storage(self, image_data: bytes, storage_path: str) -> str:
        """Save generated image to Supabase Storage"""
        try:
            storage_client = db.admin_client or db.client
            
            if not storage_client:
                data_url = f"data:image/png;base64,{base64.b64encode(image_data).decode()}"
                logger.warning("⚠️ No Supabase client, returning data URL")
                return data_url
            
            response = storage_client.storage.from_("generated-images").upload(
                path=storage_path,
                file=image_data,
                file_options={"content-type": "image/png", "upsert": "true"}
            )
            
            public_url = storage_client.storage.from_("generated-images").get_public_url(storage_path)
            
            logger.info(f"✅ Image saved to storage: {storage_path}")
            return public_url
            
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            data_url = f"data:image/png;base64,{base64.b64encode(image_data).decode()}"
            return data_url
    
    async def _save_to_database(
        self,
        image_id: str,
        client_id: str,
        task_id: str,
        template_id: Optional[str],
        archetype: str,
        base_prompt: str,
        final_prompt: str,
        revised_prompt: str,
        image_url: str,
        storage_path: str,
        aspect_ratio: str,
        resolution: str,
        model_used: str,
        reference_image_ids: List[str],
        product_image_id: Optional[str],
        thinking_images: List[str],
        generation_time_ms: int,
        brand_dna: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Save image metadata to database"""
        
        reference_images_json = []
        for ref_id in reference_image_ids:
            reference_images_json.append({
                'image_bank_id': ref_id,
                'role': 'style'
            })
        if product_image_id:
            reference_images_json.append({
                'image_bank_id': product_image_id,
                'role': 'product'
            })
        
        record = {
            "id": image_id,
            "client_id": client_id,
            "task_id": task_id,
            "template_id": template_id,
            "archetype": archetype,
            "base_prompt": base_prompt,
            "final_prompt": final_prompt,
            "revised_prompt": revised_prompt,
            "image_url": image_url,
            "storage_path": storage_path,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "model_used": model_used,
            "reference_images": reference_images_json,
            "thinking_images": thinking_images,
            "generation_model": model_used,
            "cost_usd": self.MODELS.get('flash', {}).get('cost_per_image', 0.02),
            "generation_time_ms": generation_time_ms,
            "is_selected": False,
            "mood_tone": brand_dna.get('default_mood', ''),
            "style_preset": brand_dna.get('default_style', ''),
            "generation_params": {
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "model": model_used,
                "archetype": archetype,
                "reference_count": len(reference_image_ids),
                "has_product": product_image_id is not None
            },
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            if db.client:
                response = db.client.table("generated_images").insert(record).execute()
                logger.info(f"✅ Image metadata saved: {record['id']}")
                return response.data[0] if response.data else record
            else:
                return record
        except Exception as e:
            logger.error(f"Database save failed: {e}")
            return record
    
    async def _update_task_status(self, task_id: str, status: str) -> None:
        """Update task generation status"""
        if not db.client:
            return
        
        try:
            db.client.table("tasks").update({
                "generation_status": status,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", task_id).execute()
            
            logger.info(f"✅ Task status updated: {task_id} -> {status}")
        except Exception as e:
            logger.warning(f"Failed to update task status: {e}")
    
    async def get_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available generation templates (now returns archetypes)"""
        # Return archetypes as "templates" for backwards compatibility
        archetypes = [
            {
                'id': 'product_hero',
                'name': 'Product Hero',
                'display_name': 'Producto Héroe',
                'description': 'Fotografía profesional de producto con fondo limpio',
                'category': 'product',
                'requires_product_image': True,
                'requires_style_reference': False,
                'recommended_model': 'pro',
                'default_aspect_ratio': '1:1'
            },
            {
                'id': 'lifestyle',
                'name': 'Lifestyle',
                'display_name': 'Lifestyle',
                'description': 'Escenas aspiracionales y momentos de uso',
                'category': 'lifestyle',
                'requires_product_image': False,
                'requires_style_reference': True,
                'recommended_model': 'flash',
                'default_aspect_ratio': '4:5'
            },
            {
                'id': 'promotional',
                'name': 'Promotional',
                'display_name': 'Promocional',
                'description': 'Visuales llamativos para ofertas y campañas',
                'category': 'promotional',
                'requires_product_image': False,
                'requires_style_reference': False,
                'recommended_model': 'flash',
                'default_aspect_ratio': '1:1'
            },
            {
                'id': 'minimalist',
                'name': 'Minimalist',
                'display_name': 'Minimalista',
                'description': 'Composiciones limpias con espacio negativo',
                'category': 'minimalist',
                'requires_product_image': False,
                'requires_style_reference': False,
                'recommended_model': 'pro',
                'default_aspect_ratio': '1:1'
            },
            {
                'id': 'editorial',
                'name': 'Editorial',
                'display_name': 'Editorial',
                'description': 'Estilo narrativo y storytelling visual',
                'category': 'editorial',
                'requires_product_image': False,
                'requires_style_reference': True,
                'recommended_model': 'pro',
                'default_aspect_ratio': '3:2'
            }
        ]
        
        if category:
            return [a for a in archetypes if a['category'] == category]
        return archetypes
    
    async def get_pending_tasks(self, client_id: str) -> List[Dict[str, Any]]:
        """Get tasks that need image generation"""
        if not db.client:
            return []

        try:
            response = db.client.rpc(
                "get_pending_generation_tasks",
                {"p_client_id": client_id}
            ).execute()
            if response.data:
                return response.data
        except Exception as e:
            logger.warning(f"RPC get_pending_generation_tasks failed: {e}")

        try:
            response = db.client.table("tasks")\
                .select("*")\
                .eq("client_id", client_id)\
                .in_("generation_status", ["pending", "rejected"])\
                .neq("status", "HECHO")\
                .order("execution_date", nullsfirst=False)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to fetch pending tasks: {e}")
            return []
    
    def get_camera_options(self) -> Dict[str, List[str]]:
        """Get available camera/composition options"""
        return CAMERA_OPTIONS
    
    def get_lighting_presets(self) -> Dict[str, str]:
        """Get available lighting presets"""
        return LIGHTING_PRESETS
    
    def get_mood_options(self) -> Dict[str, str]:
        """Get available mood options"""
        return MOOD_DESCRIPTORS
    
    def get_valid_aspect_ratios(self) -> List[str]:
        """Get valid aspect ratios"""
        return self.VALID_ASPECT_RATIOS
    
    def get_format_mappings(self) -> Dict[str, str]:
        """Get format to aspect ratio mappings"""
        return self.FORMAT_TO_RATIO
    
    # =========================================================================
    # STYLE ANALYSIS (Copy Style feature)
    # =========================================================================
    
    STYLE_ANALYSIS_PROMPT = """Analiza esta imagen de referencia para extraer los parámetros de estilo y composición.
Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:

{
    "scene_type": "product_hero|lifestyle|editorial|minimal|promotional",
    "composition": {
        "camera_angle": "eye_level|low_angle|high_angle|birds_eye|worms_eye|dutch",
        "shot_type": "extreme_close_up|close_up|medium_shot|full_shot|wide_shot|establishing",
        "lens_style": "wide|standard|telephoto|macro|fisheye",
        "aspect_ratio": "1:1|2:3|3:2|3:4|4:3|4:5|5:4|9:16|16:9|21:9",
        "focal_point": "descripción breve del punto focal principal"
    },
    "lighting": {
        "type": "natural|studio|dramatic|soft|hard|rim|split|butterfly|rembrandt",
        "direction": "front|side|back|top|bottom|mixed",
        "quality": "soft|hard|diffused|direct",
        "color_temperature": "warm|neutral|cool|golden_hour|blue_hour"
    },
    "color_palette": {
        "primary": "#hex del color dominante",
        "secondary": "#hex del segundo color más presente",
        "accent": "#hex del color de acento (si existe)",
        "mood": "descripción del mood cromático"
    },
    "style": {
        "aesthetic": "modern|vintage|minimal|luxurious|organic|technical|editorial|lifestyle",
        "mood": "energetic|calm|dramatic|playful|sophisticated|raw|dreamy",
        "texture_emphasis": "smooth|textured|mixed|glossy|matte",
        "background_type": "solid|gradient|textured|environmental|blurred"
    },
    "archetype_suggestion": "product_hero|lifestyle|promotional|minimalist|editorial",
    "reconstruction_summary": "Prompt en español de 2-3 oraciones para recrear esta imagen con NanoBanana"
}

Analiza la imagen proporcionada y devuelve el JSON con valores reales basados en lo que ves."""

    async def analyze_style_image(
        self,
        image_data: bytes,
        mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Analyze a reference image to extract style and composition parameters.
        Returns a structured JSON with all visual parameters detected.
        
        This enables the "Copy Style" feature - users can select a reference
        and automatically configure generation settings from it.
        """
        logger.info("🔍 Analyzing reference image for style extraction...")
        
        try:
            from google.genai import types
            
            if not self.client:
                raise ValueError("NanoBanana client not initialized")
            
            # Build content with image + analysis prompt
            content_parts = [
                types.Part.from_bytes(
                    data=image_data,
                    mime_type=mime_type
                ),
                self.STYLE_ANALYSIS_PROMPT
            ]
            
            # Use Pro model for better analysis (text-only response)
            config = types.GenerateContentConfig(
                response_modalities=['TEXT'],  # Text only for analysis
                temperature=0.2,  # Lower temperature for consistent JSON
            )
            
            # Call the API
            response = self.client.models.generate_content(
                model="gemini-2.5-pro-preview-05-06",  # Pro for analysis
                contents=content_parts,
                config=config
            )
            
            # Extract text response
            response_text = ""
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_text += part.text
            
            if not response_text:
                # Fallback if response.parts is used
                if hasattr(response, 'text'):
                    response_text = response.text
            
            logger.info(f"📄 Raw analysis response length: {len(response_text)}")
            
            # Clean and parse JSON
            json_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            elif json_text.startswith("```"):
                json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
            
            json_text = json_text.strip()
            
            try:
                result = json.loads(json_text)
                logger.info(f"✅ Style analysis complete: archetype={result.get('archetype_suggestion', 'unknown')}")
                return result
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse analysis JSON: {e}")
                logger.error(f"Raw response: {json_text[:500]}")
                
                # Return a minimal default response
                return {
                    "scene_type": "lifestyle",
                    "composition": {
                        "camera_angle": "eye_level",
                        "shot_type": "medium_shot",
                        "lens_style": "standard",
                        "aspect_ratio": "1:1",
                        "focal_point": "centro de la imagen"
                    },
                    "lighting": {
                        "type": "natural",
                        "direction": "front",
                        "quality": "soft",
                        "color_temperature": "neutral"
                    },
                    "color_palette": {
                        "primary": "#FFFFFF",
                        "secondary": "#808080",
                        "accent": "#000000",
                        "mood": "neutral"
                    },
                    "style": {
                        "aesthetic": "modern",
                        "mood": "calm",
                        "texture_emphasis": "smooth",
                        "background_type": "solid"
                    },
                    "archetype_suggestion": "lifestyle",
                    "reconstruction_summary": "Imagen de estilo contemporáneo con iluminación natural.",
                    "_parse_error": str(e)
                }
                
        except Exception as e:
            logger.error(f"❌ Style analysis failed: {e}")
            raise ValueError(f"Style analysis failed: {str(e)}")


# Singleton instance
nanobanana_service_v2 = NanoBananaServiceV2()
