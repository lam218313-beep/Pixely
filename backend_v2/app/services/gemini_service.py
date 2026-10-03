"""
Gemini Classification Service (REST Implementation)
===================================================
Batch classification and generation using Gemini REST API via httpx.
Bypasses SDK versioning/gRPC issues.
"""

import json
import logging
import httpx
import asyncio
from typing import Any

from ..config import settings

logger = logging.getLogger(__name__)

# 10 Tópicos de Comercio General
COMMERCE_TOPICS = [
    "Precio",           # Costo, promociones, descuentos
    "Calidad",          # Durabilidad, materiales, acabados
    "Servicio",         # Atención al cliente, trato
    "Entrega",          # Envío, tiempos, logística
    "Experiencia",      # UX general, satisfacción
    "Producto",         # Características, funcionalidad
    "Garantía",         # Devoluciones, soporte post-venta
    "Comunicación",     # Marketing, contenido, redes
    "Confianza",        # Reputación, seguridad, credibilidad
    "Recomendación",    # Boca a boca, referencias
]

async def _call_gemini(prompt: str, temperature: float = 0.7, model: str = "gpt-5-mini") -> Any:
    """
    Unified LLM caller using OpenAI SDK.
    Uses async context manager for proper resource cleanup.
    """
    
    if not model.startswith("gpt"):
        raise ValueError("Only GPT models are supported (Gemini removed)")
    
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    
    # Use context manager to ensure proper cleanup (prevents zombie connections)
    async with openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY) as client:
        completion_args = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }
        
        if model != "gpt-5-mini":
            completion_args["temperature"] = temperature
        
        try:
            response = await client.chat.completions.create(**completion_args)
            content = response.choices[0].message.content
            
            # Clean markdown if present
            if "```" in content:
                content = content.replace("```json", "").replace("```", "").strip()
            content = content.strip()
            
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ JSON parse failed, attempting repair: {e}")
                
                # Repair strategies
                if '"results"' in content and not content.startswith("{"):
                    try:
                        return json.loads("{" + content + "}")
                    except:
                        pass
                
                if content.startswith("["):
                    try:
                        return {"results": json.loads(content)}
                    except:
                        pass
                
                raise ValueError(f"JSON Parse Error: {content[:300]}...")
                
        except openai.APIError as e:
            logger.error(f"❌ OpenAI API Error: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ OpenAI call failed: {e}")
            raise
