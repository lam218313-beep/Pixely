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



BRAND_VOICE_PROMPT = """
Actúa como un Director Creativo y redactor publicitario senior en Perú.
Tu tarea es definir la VOZ DE MARCA de este negocio: las reglas con las que se escribirá
cada publicación de sus redes. No inventes identidad visual, misión ni visión: el negocio
ya existe y tiene su propia marca.

DATOS DE LA ENTREVISTA DEL CLIENTE:
{interview_json}

INSTRUCCIONES:
1. Basa todo en lo que el cliente respondió (su negocio, su cliente ideal, su mercado, sus objetivos).
   Nada genérico: cada rasgo y cada ejemplo debe sonar a ESTE negocio y nombrar lo que vende.
2. Define 3 o 4 rasgos de tono. Para cada uno: una descripción breve, un ejemplo de frase que SÍ
   suena a la marca y uno que NO (el error típico que hay que evitar).
3. Lista 6 a 10 palabras o expresiones que la marca SÍ usa y 6 a 10 que NO usa.
4. Elige el arquetipo de Jung que mejor encaja y explica en una frase por qué, con datos del negocio.
5. Escribe un ejemplo de publicación de Instagram (máx. 60 palabras) escrita con esta voz.
Escribe en español neutro peruano.

GENERA UN JSON ESTRICTO CON ESTE ESQUEMA:
{{
    "tone_traits": [{{"trait": "Cercano", "description": "Cómo se aplica", "ejemplo_si": "Frase que sí", "ejemplo_no": "Frase que no"}}],
    "palabras_si": ["..."],
    "palabras_no": ["..."],
    "archetype": "Nombre del arquetipo",
    "arquetipo_razon": "Por qué encaja con este negocio",
    "ejemplo_post": "Texto del ejemplo de publicación"
}}
"""

VOICE_FIELDS = ("tone_traits", "palabras_si", "palabras_no", "archetype", "arquetipo_razon", "ejemplo_post")


async def generate_brand_identity(interview_data: dict) -> dict:
    """
    Generate the brand VOICE (tone with examples, words to use/avoid, archetype, sample post)
    from the client's interview. Accepts the stored client_interviews row or its `data`.
    """
    # The stored row nests the answers under "data"; reading the row's top level is what
    # produced generic manuals with every field empty.
    if isinstance(interview_data.get("data"), dict):
        interview_data = interview_data["data"]

    clean_data = {
        "negocio": interview_data.get("businessName"),
        "historia": interview_data.get("history"),
        "diferenciadores": interview_data.get("differentiator"),
        "vision_del_dueno": interview_data.get("vision"),
        "cliente_ideal": interview_data.get("audience"),
        "mercado": interview_data.get("market"),
        "situacion_actual": interview_data.get("brand"),
        "objetivos": interview_data.get("goals"),
        "catalogo": (interview_data.get("product_context") or "")[:3000] or None,
    }
    clean_data = {k: v for k, v in clean_data.items() if v}
    if not clean_data.get("negocio") and len(clean_data) < 2:
        raise ValueError("La entrevista está vacía: no hay con qué definir la voz de marca.")

    prompt = BRAND_VOICE_PROMPT.format(interview_json=json.dumps(clean_data, indent=2, ensure_ascii=False))

    try:
        logger.info(f"🎨 Generating Brand Voice for {clean_data.get('negocio')}...")
        voice = await _call_gemini(prompt, temperature=0.7, model="gpt-5-mini")
        logger.info("✅ Brand Voice generated successfully")
        return {k: voice.get(k) for k in VOICE_FIELDS if voice.get(k) is not None}
    except Exception as e:
        logger.error(f"❌ Error generating brand voice: {e}")
        raise
