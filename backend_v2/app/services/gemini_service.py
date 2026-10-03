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

# =============================================================================
# STRATEGIC PLAN GENERATOR (Tree Structure)
# =============================================================================

STRATEGY_PLAYBOOK_PROMPT = """
Eres un ESTRATEGA SENIOR DE CONTENIDOS con experiencia profunda en marketing digital y creación de contenido viral.
Tu misión es crear un PLAYBOOK ESTRATÉGICO INNOVADOR que servirá como la "Constitución" de contenido de la marca.

⚠️ CRÍTICO: NO generes posts específicos. Genera ARQUETIPOS DE CONTENIDO (plantillas reutilizables).

---

🎯 CONTEXTO ESTRATÉGICO:

**ENTREVISTA COMPLETA (Objetivos, Audiencia, Diferenciadores):**
{interview_context}

**INTELIGENCIA DE MERCADO (estudio de mercado, vigilancia de la competencia y voz de marca):**
{market_insights}

**NOMBRE DE LA MARCA:** {brand_name}

---

🧠 TU TAREA (Pensamiento Estratégico Profundo):

1. **OBJETIVOS ESTRATÉGICOS:**
   - Extrae TODOS los objetivos de negocio de la entrevista
   - Ponle a cada uno un título concreto en lenguaje del dueño del negocio (ej: "Llenar el local de lunes a jueves"), nunca "Objetivo Principal"
   - Marca el MÁS CRÍTICO con priority "principal" y los demás con "secundario"
   - Para cada objetivo, explica POR QUÉ es importante (cruce con datos)

2. **ESTRATEGIAS TÁCTICAS (2-3 por objetivo):**
   - Cada estrategia debe ser ACCIONABLE y ESPECÍFICA
   - Debe tener un ángulo DIFERENCIADOR
   - Incluye el "por qué" estratégico en `rationale` (1-2 frases), no solo el "qué"

3. **ARQUETIPOS DE CONTENIDO (3-4 por estrategia):**
   
   Para cada arquetipo, define:
   
   **A. IDENTIDAD DEL CONCEPTO:**
   - `label`: Nombre memorable y específico (2-4 palabras)
   - `description`: Qué es y qué logra (2-3 frases DESCRIPTIVAS)
   - `strategic_rationale`: Por qué este concepto es CRÍTICO para el objetivo (1-2 frases)
   
   **B. GUÍA DE EJECUCIÓN DETALLADA:**
   - `execution_guidelines`:
     * `structure`: Estructura narrativa paso a paso (ej: "Hook emocional (3s) → Problema (10s) → Solución (20s) → CTA (5s)")
     * `key_elements`: 3-4 elementos OBLIGATORIOS que debe tener el contenido
     * `dos`: 3-4 mejores prácticas ESPECÍFICAS
     * `donts`: 3-4 errores ESPECÍFICOS a evitar
   
   **C. CREATIVIDAD E INNOVACIÓN:**
   - `creative_hooks`: 4-6 hooks/ángulos creativos ESPECÍFICOS y USABLES para captar atención
     (Ejemplo: "Pensé que era imposible hasta que probé [producto]..." NO "Hook emocional")
   
   **D. FORMATOS Y FRECUENCIA:**
   - `suggested_format`: post | story | reel | carousel | video | live
   - `suggested_frequency`: high (3-4/semana) | medium (1-2/semana) | low (1-2/mes)
   - `tags`: 2-3 etiquetas temáticas

---

📋 FORMATO JSON ESTRICTO:

{{
  "root_label": "{brand_name}",
  "objectives": [
    {{
      "title": "Convertir a los visitantes de fin de semana en clientes fijos",
      "priority": "principal",
      "rationale": "Por qué es crítico según el cruce entrevista + mercado (2-3 frases)",
      "strategies": [
        {{
          "title": "[Nombre Específico y Accionable, sin el prefijo 'Estrategia:']",
          "rationale": "Por qué esta estrategia mueve el objetivo (1-2 frases)",
          "concepts": [
            {{
              "label": "Testimonio Cliente Transformador",
              "description": "Video de 45-60s mostrando la experiencia real de un cliente, enfocado en el viaje emocional desde el problema hasta el resultado medible, usando su lenguaje auténtico y mostrando pruebas visuales del cambio.",
              "strategic_rationale": "Genera confianza mediante prueba social auténtica y supera objeciones de compra al mostrar resultados reales de personas similares a la audiencia objetivo.",
              "execution_guidelines": {{
                "structure": "Hook emocional con problema (5s) → Presentación del cliente y contexto (10s) → Descubrimiento de la solución (15s) → Proceso y experiencia (15s) → Resultado medible con emoción (10s) → CTA sutil (5s)",
                "key_elements": [
                  "Cliente real identificable con nombre y contexto",
                  "Métrica concreta de resultado (ej: 'aumenté ventas 40% en 2 meses')",
                  "Quote auténtico destacado visualmente",
                  "Antes/Después visual o narrativo claro"
                ],
                "dos": [
                  "Capturar emoción genuina del cliente (no actuada)",
                  "Usar lenguaje natural y cotidiano del cliente",
                  "Mostrar resultados medibles y específicos",
                  "Incluir contexto del cliente para identificación"
                ],
                "donts": [
                  "Sonar a publicidad forzada o guión sobre-producido",
                  "Usar jerga técnica o lenguaje corporativo",
                  "Exagerar resultados sin pruebas",
                  "Hacer el video demasiado largo (máx 60s)"
                ]
              }},
              "creative_hooks": [
                "Pensé que era imposible hasta que probé [producto] y todo cambió...",
                "En solo 30 días logré [resultado específico] que llevaba años intentando",
                "Mi mayor error fue no hacer esto antes. Ahora [resultado positivo]",
                "Nadie me dijo que sería TAN fácil conseguir [beneficio]",
                "De [estado negativo específico] a [estado positivo específico] en [tiempo concreto]",
                "Lo que más me sorprendió no fue [beneficio obvio], sino [beneficio inesperado]"
              ],
              "suggested_format": "reel",
              "suggested_frequency": "medium",
              "tags": ["social-proof", "testimonios", "resultados"]
            }}
          ]
        }}
      ]
    }},
    {{
      "title": "[Otro objetivo concreto]",
      "priority": "secundario",
      "rationale": "Segundo objetivo más importante...",
      "strategies": [...]
    }}
  ]
}}

---

🎨 PRINCIPIOS DE EXCELENCIA:

1. **SÉ ESPECÍFICO:** Evita conceptos genéricos. "Post Motivacional" ❌ → "Micro-Lección de 30s con Aplicación Inmediata" ✅
2. **SÉ DESCRIPTIVO:** La description debe pintar una imagen clara del contenido
3. **SÉ ACCIONABLE:** Los execution_guidelines deben ser tan claros que cualquiera pueda crear el contenido
4. **SÉ CREATIVO:** Los creative_hooks deben ser USABLES, no genéricos
5. **SÉ ESTRATÉGICO:** Cada concepto debe tener un propósito claro alineado al objetivo

---

⚡ REGLAS CRÍTICAS:

- El root_label DEBE ser el nombre de la marca: "{brand_name}"
- El primer objetivo es el principal (priority "principal"); los demás, priority "secundario"
- Los títulos de objetivos y estrategias son concretos y entendibles por el dueño del negocio
- Los labels de conceptos NO deben incluir el prefijo "Concepto:", solo el nombre
- Mínimo 3 objetivos (1 principal + 2 secundarios)
- Mínimo 2 estrategias por objetivo
- Mínimo 3 conceptos por estrategia (para dar opciones)
- TODOS los campos solicitados son OBLIGATORIOS
- Los creative_hooks deben ser ESPECÍFICOS y DIRECTAMENTE USABLES
- Los execution_guidelines deben ser PASO A PASO y ACCIONABLES
- NUNCA generes títulos de posts específicos, solo arquetipos reutilizables
"""

def _format_interview_data(data: dict) -> str:
    """Convierte el JSON de entrevista en texto narrativo para el prompt."""
    if not data:
        return "Información de entrevista no disponible."
    
    # Mapeo de campos clave para darle orden (priorizando los más importantes)
    priority_fields = [
        "businessName", "industry", "description", "history", # Quiénes son
        "goals", "objectives", # Qué quieren
        "audience", "targetAudience", # A quién le hablan
        "challenges", "painPoints", # Qué les duele
        "competitors", "differentiator", # Entorno
        "tone", "values" # Identidad
    ]
    
    lines = []
    # 1. Procesar campos prioritarios conocidos
    for key in priority_fields:
        if val := data.get(key):
            # Si es un diccionario o lista, convertirlo a string limpio
            val_str = json.dumps(val, ensure_ascii=False) if isinstance(val, (dict, list)) else str(val)
            lines.append(f"- {key.upper()}: {val_str}")
            
    # 2. Agregar cualquier otro campo "Q" (Q1, Q2...) que venga del frontend
    for k, v in data.items():
        if k.startswith("Q") and v:
             lines.append(f"- PREGUNTA {k}: {v}")
             
    return "\n".join(lines)


async def generate_strategic_plan(interview_data: dict, market_insights: str) -> dict:
    """
    Genera el árbol estratégico cruzando la entrevista completa (Ficha) con la
    inteligencia de mercado (estudio, vigilancia y voz de marca).
    """
    # The stored row nests the answers under "data"; formatting the row itself loses them.
    if isinstance(interview_data.get("data"), dict):
        interview_data = interview_data["data"]
    interview_context_str = _format_interview_data(interview_data)
    brand_name = interview_data.get("businessName") or interview_data.get("brand_name") or "Marca"

    prompt = STRATEGY_PLAYBOOK_PROMPT.format(
        interview_context=interview_context_str,
        market_insights=market_insights,
        brand_name=brand_name,
    )

    # Use gpt-5-mini for better reasoning and more detailed strategy generation
    return await _call_gemini(prompt, temperature=0.7, model="gpt-5-mini")
