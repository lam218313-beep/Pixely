"""
ComfyUI Service - Conexión con RunPod para generación de imágenes.

Este servicio maneja la comunicación con ComfyUI corriendo en RunPod,
incluyendo carga de workflows, envío de prompts y descarga de imágenes.
"""

import os
import json
import time
import httpx
import base64
import asyncio
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime

from ..config import settings

# Configuración desde variables de entorno
COMFYUI_URL = f"http://{settings.COMFYUI_HOST}:{settings.COMFYUI_PORT}"
if settings.RUNPOD_POD_ID:
    COMFYUI_URL = f"https://{settings.RUNPOD_POD_ID}-8188.proxy.runpod.net"

# Directorio de workflows
WORKFLOWS_DIR = Path(__file__).parent.parent / "workflows"


class ComfyUIError(Exception):
    """Error específico de ComfyUI."""
    pass


class ComfyUIService:
    """
    Servicio para interactuar con ComfyUI via API.
    
    Uso:
        service = ComfyUIService()
        result = await service.generate_product_hero(
            product_image="base64...",
            composition_ref="base64...",
            prompt="Premium skincare product on marble surface"
        )
    """
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or COMFYUI_URL
        self.client = httpx.AsyncClient(timeout=300.0, verify=False)  # 5 min timeout
        self._workflows_cache: Dict[str, dict] = {}
        
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    # =========================================================================
    # API de Generación de Alto Nivel
    # =========================================================================
    
    async def generate_product_hero(
        self,
        product_image: str,  # Base64 PNG sin fondo
        composition_ref: Optional[str] = None,  # Base64 imagen de referencia
        surface_texture: Optional[str] = None,  # Base64 textura
        light_ref: Optional[str] = None,  # Base64 referencia de luz
        prompt: str = "Professional product photography, premium, studio lighting",
        negative_prompt: str = "text, watermark, logo, blurry, deformed",
        seed: int = -1,  # -1 = random
        steps: int = 30,
        cfg_scale: float = 7.0,
        width: int = 1024,
        height: int = 1024,
    ) -> Dict[str, Any]:
        """
        Genera imagen de producto tipo "hero" usando el template correspondiente.
        
        Args:
            product_image: Imagen del producto en base64 (PNG con transparencia)
            composition_ref: Referencia de composición para ControlNet Depth
            surface_texture: Textura de la superficie (madera, mármol, etc.)
            light_ref: Referencia de iluminación para IP-Adapter
            prompt: Prompt de generación
            negative_prompt: Lo que queremos evitar
            seed: Semilla (-1 para random)
            steps: Pasos de generación
            cfg_scale: Adherencia al prompt
            width: Ancho de la imagen
            height: Alto de la imagen
            
        Returns:
            Dict con:
                - images: Lista de URLs de imágenes generadas
                - seed: Semilla usada
                - generation_time: Tiempo en segundos
        """
        # Cargar workflow template
        workflow = await self._load_workflow("product_hero")
        
        # Subir imágenes a ComfyUI
        product_filename = await self._upload_image(product_image, "product")
        
        composition_filename = None
        if composition_ref:
            composition_filename = await self._upload_image(composition_ref, "composition")
        
        texture_filename = None
        if surface_texture:
            texture_filename = await self._upload_image(surface_texture, "texture")
        
        light_filename = None
        if light_ref:
            light_filename = await self._upload_image(light_ref, "light")
        
        # Llenar variables del workflow
        workflow = self._fill_workflow_variables(workflow, {
            "PRODUCT_IMAGE": product_filename,
            "COMPOSITION_REF": composition_filename,
            "SURFACE_TEXTURE": texture_filename,
            "LIGHT_REF": light_filename,
            "PROMPT": prompt,
            "NEGATIVE_PROMPT": negative_prompt,
            "SEED": seed if seed >= 0 else int(time.time() * 1000) % (2**32),
            "STEPS": steps,
            "CFG_SCALE": cfg_scale,
            "WIDTH": width,
            "HEIGHT": height,
        })
        
        # Ejecutar workflow
        start_time = time.time()
        result = await self._execute_workflow(workflow)
        generation_time = time.time() - start_time
        
        return {
            "images": result["images"],
            "seed": result.get("seed", seed),
            "generation_time": round(generation_time, 2),
        }
    
    async def generate_service(
        self,
        face_photos: Optional[List[str]] = None,  # 3 fotos para FaceID
        demographic: Optional[str] = None,  # "Mujer, 30s, doctora..."
        pose_ref: str = "",  # Referencia de pose
        background: Optional[str] = None,  # Foto del entorno real
        background_prompt: str = "Modern office, bright, professional",
        prompt: str = "Professional service photography",
        **kwargs
    ) -> Dict[str, Any]:
        """Genera imagen para formato SERVICIO."""
        workflow = await self._load_workflow("service")
        
        # Subir imágenes
        pose_filename = await self._upload_image(pose_ref, "pose") if pose_ref else None
        bg_filename = await self._upload_image(background, "background") if background else None
        
        face_filenames = []
        if face_photos:
            for i, photo in enumerate(face_photos[:3]):
                filename = await self._upload_image(photo, f"face_{i}")
                face_filenames.append(filename)
        
        workflow = self._fill_workflow_variables(workflow, {
            "FACE_PHOTOS": face_filenames,
            "DEMOGRAPHIC": demographic or "",
            "POSE_REF": pose_filename,
            "BACKGROUND_IMAGE": bg_filename,
            "BACKGROUND_PROMPT": background_prompt if not background else "",
            "PROMPT": prompt,
            **kwargs
        })
        
        return await self._execute_workflow(workflow)
    
    async def generate_experience(
        self,
        space_image: str,  # Foto del lugar
        hands_feet: Optional[str] = None,  # Elemento humano parcial
        mood_ref: Optional[str] = None,  # Color grading reference
        time_of_day: str = "golden_hour",  # "dawn", "midday", "golden_hour", "night"
        prompt: str = "Immersive lifestyle photography, POV",
        **kwargs
    ) -> Dict[str, Any]:
        """Genera imagen para formato EXPERIENCIA."""
        workflow = await self._load_workflow("experience")
        
        space_filename = await self._upload_image(space_image, "space")
        hands_filename = await self._upload_image(hands_feet, "hands") if hands_feet else None
        mood_filename = await self._upload_image(mood_ref, "mood") if mood_ref else None
        
        # Mapear hora del día a parámetros de luz
        lighting_params = {
            "dawn": {"temperature": 4500, "intensity": 0.6, "angle": 15},
            "midday": {"temperature": 5500, "intensity": 1.0, "angle": 90},
            "golden_hour": {"temperature": 3500, "intensity": 0.8, "angle": 25},
            "night": {"temperature": 6500, "intensity": 0.3, "angle": 0},
        }.get(time_of_day, {"temperature": 5000, "intensity": 0.7, "angle": 45})
        
        workflow = self._fill_workflow_variables(workflow, {
            "SPACE_IMAGE": space_filename,
            "HANDS_FEET": hands_filename,
            "MOOD_REF": mood_filename,
            "LIGHTING_TEMPERATURE": lighting_params["temperature"],
            "LIGHTING_INTENSITY": lighting_params["intensity"],
            "LIGHTING_ANGLE": lighting_params["angle"],
            "PROMPT": prompt,
            **kwargs
        })
        
        return await self._execute_workflow(workflow)
    
    async def generate_promotional(
        self,
        layout_mask: str,  # Máscara B/N de zonas de texto
        product_image: str,  # Producto PNG
        brand_colors: Dict[str, str],  # {"primary": "#E63946", "secondary": "#F1FAEE"}
        prompt: str = "Clean promotional image, solid background",
        **kwargs
    ) -> Dict[str, Any]:
        """Genera imagen para formato PROMOCIONAL."""
        workflow = await self._load_workflow("promotional")
        
        mask_filename = await self._upload_image(layout_mask, "mask")
        product_filename = await self._upload_image(product_image, "product")
        
        workflow = self._fill_workflow_variables(workflow, {
            "LAYOUT_MASK": mask_filename,
            "PRODUCT_IMAGE": product_filename,
            "PRIMARY_COLOR": brand_colors.get("primary", "#FFFFFF"),
            "SECONDARY_COLOR": brand_colors.get("secondary", "#000000"),
            "ACCENT_COLOR": brand_colors.get("accent", "#FF0000"),
            "PROMPT": prompt,
            **kwargs
        })
        
        return await self._execute_workflow(workflow)
    
    async def generate_ad_impact(
        self,
        concept_ref: str,  # Referencia de concepto visual
        hook_element: Optional[str] = None,  # Elemento disruptivo (PNG)
        hook_prompt: str = "",  # "fire explosion, neon glow"
        creativity_level: float = 0.7,  # 0.3 = realista, 1.0 = surrealista
        prompt: str = "High impact advertising, dramatic",
        **kwargs
    ) -> Dict[str, Any]:
        """Genera imagen para formato ANUNCIO."""
        workflow = await self._load_workflow("ad_impact")
        
        concept_filename = await self._upload_image(concept_ref, "concept")
        hook_filename = await self._upload_image(hook_element, "hook") if hook_element else None
        
        # Calcular parámetros según creatividad
        cfg_scale = 7.5 - (creativity_level * 2)  # Menor CFG = más creativo
        denoise = 0.4 + (creativity_level * 0.5)  # Mayor denoise = más cambios
        
        workflow = self._fill_workflow_variables(workflow, {
            "CONCEPT_REF": concept_filename,
            "HOOK_ELEMENT": hook_filename,
            "HOOK_PROMPT": hook_prompt,
            "CFG_SCALE": cfg_scale,
            "DENOISE_STRENGTH": denoise,
            "PROMPT": prompt,
            **kwargs
        })
        
        return await self._execute_workflow(workflow)

    async def generate_from_prompt(
        self,
        prompt: str,
        negative_prompt: str = "text, watermark",
        steps: int = 20,
        cfg_scale: float = 7.0,
        width: int = 1024,
        height: int = 1024,
        seed: int = -1
    ) -> Dict[str, Any]:
        """Generación genérica texto-a-imagen (FLUX/SDXL)."""
        # Intentar cargar workflow de FLUX, si no usar placeholder
        workflow_name = "flux_schnell" # Asurar que este archivo exista
        try:
            workflow = await self._load_workflow(workflow_name)
        except Exception:
            # Fallback simple
            workflow = self._get_placeholder_workflow()

        workflow = self._fill_workflow_variables(workflow, {
            "PROMPT": prompt,
            "NEGATIVE_PROMPT": negative_prompt,
            "SEED": seed if seed >= 0 else int(time.time() * 1000) % (2**32),
            "STEPS": steps,
            "CFG_SCALE": cfg_scale,
            "WIDTH": width,
            "HEIGHT": height,
        })
        
        return await self._execute_workflow(workflow)
    
    # =========================================================================
    # API de Bajo Nivel
    # =========================================================================
    
    async def _load_workflow(self, name: str) -> dict:
        """Carga un workflow desde archivo JSON."""
        if name in self._workflows_cache:
            return self._workflows_cache[name].copy()
        
        workflow_path = WORKFLOWS_DIR / f"{name}.json"
        if not workflow_path.exists():
            # Si no existe el archivo, usar un workflow placeholder
            print(f"⚠️ Workflow '{name}' no encontrado, usando placeholder")
            return self._get_placeholder_workflow()
        
        with open(workflow_path, "r", encoding="utf-8") as f:
            workflow = json.load(f)
        
        self._workflows_cache[name] = workflow
        return workflow.copy()
    
    async def _upload_image(self, image_b64: str, name_prefix: str) -> str:
        """
        Sube una imagen a ComfyUI.
        
        Args:
            image_b64: Imagen en base64
            name_prefix: Prefijo para el nombre del archivo
            
        Returns:
            Nombre del archivo en ComfyUI
        """
        # Decodificar base64
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        image_data = base64.b64decode(image_b64)
        
        # Generar nombre único
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{name_prefix}_{timestamp}.png"
        
        # Subir a ComfyUI
        files = {"image": (filename, image_data, "image/png")}
        response = await self.client.post(
            f"{self.base_url}/upload/image",
            files=files
        )
        
        if response.status_code != 200:
            raise ComfyUIError(f"Error subiendo imagen: {response.text}")
        
        result = response.json()
        return result.get("name", filename)
    
    def _fill_workflow_variables(self, workflow: dict, variables: Dict[str, Any]) -> dict:
        """
        Llena las variables placeholder en el workflow.
        
        Los workflows tienen placeholders como "{{PROMPT}}" que se reemplazan
        con los valores reales.
        """
        workflow_str = json.dumps(workflow)
        
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"  # {{KEY}}
            
            if value is None:
                # Para valores None, eliminamos el nodo o ponemos vacío
                workflow_str = workflow_str.replace(f'"{placeholder}"', '""')
            elif isinstance(value, (int, float)):
                workflow_str = workflow_str.replace(f'"{placeholder}"', str(value))
            elif isinstance(value, list):
                workflow_str = workflow_str.replace(f'"{placeholder}"', json.dumps(value))
            else:
                workflow_str = workflow_str.replace(placeholder, str(value))
        
        return json.loads(workflow_str)
    
    async def _execute_workflow(self, workflow: dict) -> Dict[str, Any]:
        """
        Ejecuta un workflow en ComfyUI y espera el resultado.
        
        Returns:
            Dict con imágenes generadas y metadata
        """
        # Enviar a la cola
        response = await self.client.post(
            f"{self.base_url}/prompt",
            json={"prompt": workflow}
        )
        
        if response.status_code != 200:
            raise ComfyUIError(f"Error enviando workflow: {response.text}")
        
        result = response.json()
        prompt_id = result.get("prompt_id")
        
        if not prompt_id:
            raise ComfyUIError(f"No se obtuvo prompt_id: {result}")
        
        print(f"📤 Workflow enviado. Prompt ID: {prompt_id}")
        
        # Esperar resultado
        images = await self._wait_for_result(prompt_id)
        
        return {
            "images": images,
            "prompt_id": prompt_id,
        }
    
    async def _wait_for_result(
        self,
        prompt_id: str,
        timeout: int = 300,
        poll_interval: float = 1.0
    ) -> List[str]:
        """
        Espera a que el workflow termine y descarga las imágenes.
        
        Returns:
            Lista de URLs de imágenes generadas
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Consultar historial
            response = await self.client.get(f"{self.base_url}/history/{prompt_id}")
            
            if response.status_code != 200:
                await asyncio.sleep(poll_interval)
                continue
            
            history = response.json()
            
            if prompt_id in history:
                outputs = history[prompt_id].get("outputs", {})
                images = []
                
                # Buscar nodos de imagen en los outputs
                for node_id, output in outputs.items():
                    if "images" in output:
                        for img_info in output["images"]:
                            filename = img_info.get("filename")
                            subfolder = img_info.get("subfolder", "")
                            img_type = img_info.get("type", "output")
                            
                            # Construir URL de descarga
                            img_url = f"{self.base_url}/view?filename={filename}"
                            if subfolder:
                                img_url += f"&subfolder={subfolder}"
                            img_url += f"&type={img_type}"
                            
                            images.append(img_url)
                
                print(f"✅ Generación completada. {len(images)} imagen(es)")
                return images
            
            # Verificar si hay error
            queue_response = await self.client.get(f"{self.base_url}/queue")
            if queue_response.status_code == 200:
                queue = queue_response.json()
                # Si el prompt ya no está en la cola y no hay resultado, hubo error
                running = queue.get("queue_running", [])
                pending = queue.get("queue_pending", [])
                
                if not any(p[1] == prompt_id for p in running + pending):
                    if prompt_id not in history:
                        # Posible error, pero esperamos un poco más
                        pass
            
            await asyncio.sleep(poll_interval)
        
        raise ComfyUIError(f"Timeout esperando resultado de {prompt_id}")
    
    async def download_image(self, image_url: str) -> bytes:
        """Descarga una imagen desde ComfyUI."""
        response = await self.client.get(image_url)
        if response.status_code != 200:
            raise ComfyUIError(f"Error descargando imagen: {response.status_code}")
        return response.content
    
    async def download_image_base64(self, image_url: str) -> str:
        """Descarga una imagen y la retorna en base64."""
        image_data = await self.download_image(image_url)
        return base64.b64encode(image_data).decode("utf-8")
    
    # =========================================================================
    # Utilidades
    # =========================================================================
    
    async def health_check(self) -> bool:
        """Verifica que ComfyUI esté respondiendo."""
        try:
            response = await self.client.get(f"{self.base_url}/system_stats")
            return response.status_code == 200
        except Exception:
            return False
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Obtiene el estado de la cola de generación."""
        response = await self.client.get(f"{self.base_url}/queue")
        if response.status_code != 200:
            raise ComfyUIError(f"Error obteniendo cola: {response.text}")
        return response.json()
    
    def _get_placeholder_workflow(self) -> dict:
        """
        Retorna un workflow placeholder básico para testing.
        
        Este workflow genera una imagen simple con un color sólido.
        Se usa cuando el workflow real aún no está disponible.
        """
        return {
            "3": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 1
                }
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": "v1-5-pruned-emaonly.safetensors"
                }
            },
            "5": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": "{{PROMPT}}",
                    "clip": ["4", 1]
                }
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": "{{NEGATIVE_PROMPT}}",
                    "clip": ["4", 1]
                }
            },
            "7": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": "{{SEED}}",
                    "steps": "{{STEPS}}",
                    "cfg": "{{CFG_SCALE}}",
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["4", 0],
                    "positive": ["5", 0],
                    "negative": ["6", 0],
                    "latent_image": ["3", 0]
                }
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["7", 0],
                    "vae": ["4", 2]
                }
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {
                    "filename_prefix": "pixely_output",
                    "images": ["8", 0]
                }
            }
        }


# Instancia singleton para uso en la aplicación
_comfyui_service: Optional[ComfyUIService] = None


def get_comfyui_service() -> ComfyUIService:
    """Obtiene la instancia singleton del servicio ComfyUI."""
    global _comfyui_service
    if _comfyui_service is None:
        _comfyui_service = ComfyUIService()
    return _comfyui_service


# ============================================================================
# Funciones de Conveniencia
# ============================================================================

async def generate_product_image(**kwargs) -> Dict[str, Any]:
    """Genera imagen de producto (shortcut)."""
    async with ComfyUIService() as service:
        return await service.generate_product_hero(**kwargs)


async def generate_service_image(**kwargs) -> Dict[str, Any]:
    """Genera imagen de servicio (shortcut)."""
    async with ComfyUIService() as service:
        return await service.generate_service(**kwargs)


async def generate_experience_image(**kwargs) -> Dict[str, Any]:
    """Genera imagen de experiencia (shortcut)."""
    async with ComfyUIService() as service:
        return await service.generate_experience(**kwargs)


async def generate_promotional_image(**kwargs) -> Dict[str, Any]:
    """Genera imagen promocional (shortcut)."""
    async with ComfyUIService() as service:
        return await service.generate_promotional(**kwargs)


async def generate_ad_image(**kwargs) -> Dict[str, Any]:
    """Genera imagen de anuncio (shortcut)."""
    async with ComfyUIService() as service:
        return await service.generate_ad_impact(**kwargs)
