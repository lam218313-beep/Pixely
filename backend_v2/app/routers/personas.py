
import logging
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..services.database import db
from ..services.gemini_service import _call_gemini
from ..services.auth_service import verify_client_access

router = APIRouter(prefix="/clients", tags=["Personas"])
logger = logging.getLogger(__name__)

class PersonaRequest(BaseModel):
    audience_data: dict
    market_data: dict = {}
    brand_data: dict = {}
    business_context: dict = {}  # Contains businessName, history, vision, differentiator

@router.post("/{client_id}/personas")
async def generate_personas(client_id: str, request: PersonaRequest, _user: dict = Depends(verify_client_access)):
    """
    Generates Anti-Persona and Ideal Persona based on Interview Data.
    Uses the SAME fields as the regular customer profile.
    """
    try:
        logger.info(f"Generating personas for client {client_id}")
        
        # Try to get additional context from stored interview
        interview_context = ""
        try:
            interview_data = db.get_interview(client_id)
            if interview_data and interview_data.get("data"):
                stored = interview_data["data"]
                interview_context = f"""
                Nombre del Negocio: {stored.get('businessName', 'N/A')}
                Historia: {stored.get('history', 'N/A')}
                Visión: {stored.get('vision', 'N/A')}
                Diferenciadores: {stored.get('differentiator', [])}
                Catálogo de Productos: {stored.get('product_context', 'No disponible')[:3000]}
                """
        except Exception as e:
            logger.warning(f"Could not fetch interview context: {e}")
        
        prompt = f"""
        Actúa como un Psicólogo del Consumidor y Estratega de Marca Senior.
        Tu objetivo es construir perfiles psicográficos profundos y realistas (Personas) basados en datos limitados.
        
        AVISO IMPORTANTE:
        - EVITA nombres genéricos como "Juan Pérez" o "María García". Usa nombres que evoquen un arquetipo (ej: "Sofía, la Emprendedora Digital", "Carlos, el Purista del Audio").
        - NO inventes datos demográficos aleatorios si no encajan con la narrativa.
        - Céntrate en las MOTIVACIONES OCULTAS y los MIEDOS reales.
        - La respuesta debe ser "Insightful", no obvia.

        1. CONTEXTO DEL NEGOCIO:
        {interview_context if interview_context else "No disponible"}
        
        Input Adicional:
        {request.business_context}
        
        2. DATOS DE AUDIENCIA (Base):
        {json.dumps(request.audience_data, indent=2, ensure_ascii=False)}
        
        3. MERCADO Y MARCA:
        {json.dumps(request.market_data, indent=2, ensure_ascii=False)}
        {json.dumps(request.brand_data, indent=2, ensure_ascii=False)}
        
        ---
        
        GENERA ESTOS DOS PERFILES (En Español Neutro):
        
        **A. ANTI-PERSONA (El cliente "tóxico" o incompatible)**
        ¿Quién consume recursos sin dar valor? ¿Quién odiaría tu propuesta de valor?
        - Pain Point: ¿Por qué se queja siempre?
        - Desires: ¿Qué busca que tú NO das?
        - Avoid Reason: ¿Por qué es un riesgo financiero o de reputación?
        
        **B. CLIENTE IDEAL (El "Evangelista")**
        ¿Quién obtendría un valor transformacional de tu producto?
        - Pain Point: El problema agudo que le quita el sueño.
        - Ideal Reason: Por qué su LTV (Lifetime Value) sería altísimo.
        
        FORMATO JSON OBLIGATORIO:
        {{
            "anti_persona": {{
                "name": "Arquetipo + Nombre",
                "ageRange": "Rango estimado",
                "gender": "Género principal",
                "location": "Contexto geográfico (ej: Urbano densamente poblado)",
                "occupation": "Rol profesional específico",
                "maritalStatus": "Estado civil probable",
                "interests": "Intereses psicográficos (no solo hobbies)",
                "values": "Valores profundos (ej: Status, Seguridad, Libertad)",
                "painPoints": "Su queja principal",
                "desires": "Lo que realmente quiere (y no le vas a dar)",
                "lifestyle": "Descripción de su día a día",
                "incomeLevel": "Nivel (Bajo/Medio/Alto)",
                "priceSensitivity": "Sensibilidad (Alta/Baja)",
                "spendingHabits": "Cómo gasta su dinero",
                "frequency": "Frecuencia de interacción",
                "loyalty": "Nivel de lealtad esperado (Bajo)",
                "decisionRole": "Rol en la compra",
                "usage": "Cómo usaría el producto (mal)",
                "avoid_reason": "Razón estratégica para evitarlo"
            }},
            "ideal_persona": {{
                "name": "Arquetipo + Nombre",
                "ageRange": "Rango",
                "gender": "Género",
                "location": "Ubicación",
                "occupation": "Fofesión",
                "maritalStatus": "Estado",
                "interests": "Intereses clave",
                "values": "Valores alineados con la marca",
                "painPoints": "Dolor que tú curas",
                "desires": "Transformación que busca",
                "lifestyle": "Estilo de vida",
                "incomeLevel": "Nivel",
                "priceSensitivity": "Sensibilidad",
                "spendingHabits": "Hábitos de inversión",
                "frequency": "Frecuencia",
                "loyalty": "Lealtad potencial (Alta)",
                "decisionRole": "Rol",
                "usage": "Caso de uso perfecto",
                "ideal_reason": "Por qué es rentable"
            }}
        }}
        """
        
        # Use Unified LLM Service (OpenAI or Gemini)
        logger.info(f"Generating personas with model: gpt-4o-mini")
        result = await _call_gemini(
            prompt=prompt, 
            temperature=0.85, 
            model="gpt-5-mini"
        )
        
        logger.info(f"Successfully generated personas for client {client_id}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error parsing AI response: {e}")
    except Exception as e:
        logger.error(f"Error generating personas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


