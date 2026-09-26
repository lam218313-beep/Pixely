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

CLASSIFICATION_PROMPT = """
IMPORTANT: Your response MUST be ONLY a valid JSON object.
Do NOT add any text, explanation, or markdown before or after the JSON.
Start directly with {{ and end with }}.

Eres un clasificador experto de comentarios de redes sociales para marcas comerciales.

CONTEXTO DE LA MARCA (Usa esto para entender mejor la relevancia de los comentarios):
{brand_context}

Tu trabajo es ETIQUETAR cada comentario con los siguientes campos:

1. **emotion**: Una emoción de Plutchik (exactamente una):
   Alegría, Confianza, Miedo, Sorpresa, Tristeza, Aversión, Ira, Anticipación

2. **personality**: Rasgo de personalidad proyectado según Aaker:
   Sinceridad, Emocion, Competencia, Sofisticacion, Robustez

3. **topic**: Tema principal. PRIMERO intenta usar uno de estos 10 tópicos comerciales:
   Precio, Calidad, Servicio, Entrega, Experiencia, Producto, Garantía, Comunicación, Confianza, Recomendación
   
   Si el comentario NO encaja en ninguno de los anteriores, usa una categoría descriptiva 
   de máximo 2 palabras que capture el tema (ej: "Aprendizaje", "Entretenimiento", "Comunidad").

4. **sentiment_score**: Número de -1.0 (muy negativo) a 1.0 (muy positivo)

FORMATO DE SALIDA (OBLIGATORIO):
- Devuelve ÚNICAMENTE un objeto JSON válido.
- La raíz DEBE ser un objeto con la clave "results".
- Cada ítem debe tener: idx, emotion, personality, topic, sentiment_score
- El campo "idx" corresponde al índice del comentario en la lista de entrada.

Ejemplo de salida EXACTA:
{{"results": [{{"idx": 0, "emotion": "Alegría", "personality": "Sinceridad", "topic": "Calidad", "sentiment_score": 0.8}}, {{"idx": 1, "emotion": "Anticipación", "personality": "Emocion", "topic": "Aprendizaje", "sentiment_score": 0.7}}]}}

COMENTARIOS A CLASIFICAR:
{comments_json}
"""


# Initialize OpenAI Client (Lazy or Global)
import openai

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



async def classify_comments_batch(comments: list[str], brand_context: str = "", batch_size: int = 50) -> list[dict[str, Any]]:
    """
    Classify a list of comments using Gemini/OpenAI via REST in parallel.
    """
    all_results: list[dict] = []
    
    # Concurrency Control (e.g. 5 concurrent batches)
    sem = asyncio.Semaphore(5)
    
    async def process_batch(batch_subset, batch_idx):
        async with sem:
            logger.info(f"🧠 Classifying batch {batch_idx + 1} ({len(batch_subset)} comments)...")
            
            # Prepare input
            comments_for_prompt = [
                {"idx": idx_offset + j, "text": text}
                for j, text in enumerate(batch_subset)
                for idx_offset in [batch_idx * batch_size] # Capture offset
            ]
            
            prompt = CLASSIFICATION_PROMPT.format(
                brand_context=brand_context or "No context provided.",
                comments_json=json.dumps(comments_for_prompt, ensure_ascii=False)
            )
            
            try:
                batch_results = await _call_gemini(prompt, temperature=0.2, model="gpt-5-mini")
                
                # Robust parsing
                results_list = []
                if isinstance(batch_results, dict):
                    results_list = batch_results.get("results") or batch_results.get("classifications") or []
                    if not results_list:
                        for v in batch_results.values():
                            if isinstance(v, list):
                                results_list = v
                                break
                elif isinstance(batch_results, list):
                    results_list = batch_results
                
                if results_list:
                    logger.info(f"✅ Batch {batch_idx + 1} finished: {len(results_list)} results")
                    return results_list
                else:
                    logger.error(f"❌ Batch {batch_idx + 1} failed: No list found in response")
                    return []
                    
            except Exception as e:
                logger.error(f"❌ Batch {batch_idx + 1} error: {e}")
                return []

    # Create tasks
    tasks = []
    num_batches = (len(comments) + batch_size - 1) // batch_size
    
    for i in range(num_batches):
        start = i * batch_size
        end = start + batch_size
        batch = comments[start:end]
        tasks.append(process_batch(batch, i))
    
    logger.info(f"🚀 Starting parallel classification of {num_batches} batches...")
    
    # Run all
    results_lists = await asyncio.gather(*tasks)
    
    # Check for failures
    errors = []
    
    # Flatten
    for r in results_lists:
        if isinstance(r, list):
            all_results.extend(r)
        else:
            # If we change process_batch to return error/empty, handle here.
            # Currently process_batch returns [] on error.
            # We need to capture the errors? 
            # Ideally process_batch should return (result, error) tuple or we track errors separately.
            pass

    if not all_results:
        # If no results, try to provide a specific reason
        raise Exception("Classification failed for all batches. Check logs for details.")

    return all_results


def map_classification_to_raw_item(
    comment: dict[str, Any],
    classification: dict[str, Any]
) -> dict[str, Any]:
    """
    Merge original comment data with classification results.
    """
    return {
        "platform": "instagram",
        "platform_id": comment.get("id", ""),
        "content": comment.get("text", ""),
        "author": comment.get("ownerUsername", ""),
        "posted_at": comment.get("timestamp"),
        "ai_emotion": classification.get("emotion", "Otro"),
        "ai_personality": classification.get("personality", "Sinceridad"),
        "ai_topic": classification.get("topic", "Otro"),
        "ai_sentiment_score": classification.get("sentiment_score", 0.0),
    }


# =============================================================================
# INTERPRETATION GENERATOR
# =============================================================================

INTERPRETATION_PROMPT = """
Actúa como un Consultor Senior de Estrategia de Marca. Tu cliente no es técnico.

CONTEXTO ESTRATÉGICO DEL CLIENTE:
{context_str}

TIENES EL SIGUIENTE REPORTE DE DATOS (Q1-Q10):
{aggregated_json}

INSTRUCCIONES CRÍTICAS:
Tu tarea es generar una interpretación breve (máximo 3 frases) para CADA bloque (Q1 a Q10).
Para cada interpretación, DEBES cruzar los datos encontrados con la IDENTIDAD DE MARCA definida en el contexto.

1. **Alineación**: ¿Los resultados reflejan la Misión, Visión o Valores de la marca? Si no, señálalo suavemente.
2. **Personalidad**: ¿El tono de los comentarios coincide con el Arquetipo de la marca?
3. **Accionable**: Explica qué significa el dato para SU negocio específico.
4. **Formato**: Usa un lenguaje alentador pero estratégico. Usa **negritas** para conceptos clave.

Devuelve un JSON estricto con este formato:
{{
    "Q1_interpretation": "Texto explicativo aquí...",
    "Q2_interpretation": "Texto explicativo aquí...",
    ...
    "Q10_interpretation": "Texto explicativo aquí..."
}}
"""


async def generate_interpretations(aggregated_json: dict, context: dict = None) -> dict:
    """
    Takes the aggregated Q1-Q10 data AND full client context (Interview + Brand) 
    to generate human-readable explanations via REST.
    """
    print("🔍 [DEBUG] generate_interpretations CALLED")
    print(f"🔍 [DEBUG] OPENAI_API_KEY present: {bool(settings.OPENAI_API_KEY)}")
    print(f"🔍 [DEBUG] OPENAI_API_KEY prefix: {settings.OPENAI_API_KEY[:10] if settings.OPENAI_API_KEY else 'NONE'}...")
    
    if not settings.OPENAI_API_KEY:
        print("❌ [DEBUG] OPENAI_API_KEY NOT CONFIGURED - RETURNING EMPTY")
        logger.warning("OPENAI_API_KEY not configured, skipping interpretations")
        return {}
    
    # Format Context String
    context_str = "No hay información estratégica previa disponible. Asume un e-commerce general."
    
    if context:
        # Extract parts with type safety
        interview = context.get("interview") or {}
        brand = context.get("brand") or {}
        
        # Ensure interview is dict
        if isinstance(interview, str):
            interview = {}
        
        # Interview Data with safety
        business = interview.get("businessName", "La Marca") if isinstance(interview, dict) else "La Marca"
        history_raw = interview.get("history", "") if isinstance(interview, dict) else ""
        history = str(history_raw)[:300] if history_raw else ""
        
        audience_obj = interview.get("audience", {}) if isinstance(interview, dict) else {}
        if isinstance(audience_obj, str):
            audience_str = audience_obj
        elif isinstance(audience_obj, dict):
            audience_str = f"{audience_obj.get('ageRange', '')}, {audience_obj.get('gender', '')}. Intereses: {audience_obj.get('interests', '')}"
        else:
            audience_str = ""
        
        goals_obj = interview.get("goals", {}) if isinstance(interview, dict) else {}
        if isinstance(goals_obj, dict):
            goals = ", ".join(goals_obj.get("brandGoals", []))
        elif isinstance(goals_obj, list):
            goals = ", ".join(str(g) for g in goals_obj)
        else:
            goals = str(goals_obj) if goals_obj else ""
        
        # Brand Book Data with safety
        mission = brand.get("mission", "No definida") if isinstance(brand, dict) else "No definida"
        vision = brand.get("vision", "No definida") if isinstance(brand, dict) else "No definida"
        archetype = brand.get("archetype", "No definido") if isinstance(brand, dict) else "No definido"
        
        # Values can be list of dicts OR list of strings
        values_raw = brand.get("values", []) if isinstance(brand, dict) else []
        values_list = []
        for v in values_raw:
            if isinstance(v, dict):
                values_list.append(v.get("title", ""))
            elif isinstance(v, str):
                values_list.append(v)
        values_str = ", ".join(filter(None, values_list))
        
        # Parse Tone with safety
        tone_traits = brand.get("tone_traits", []) if isinstance(brand, dict) else []
        tone_str = ""
        if tone_traits:
            if isinstance(tone_traits[0], dict):
                tone_str = ", ".join([t.get("trait", "") for t in tone_traits if isinstance(t, dict)])
            else:
                tone_str = ", ".join(str(t) for t in tone_traits)

        context_str = (
            f"--- PERFIL DE NEGOCIO ---\n"
            f"Nombre: {business}\n"
            f"Historia/Contexto: {history}\n"
            f"Audiencia Objetivo: {audience_str}\n"
            f"Objetivos: {goals}\n\n"
            f"--- IDENTIDAD DE MARCA (BRAND BOOK) ---\n"
            f"Misión: {mission}\n"
            f"Visión: {vision}\n"
            f"Valores Centrales: {values_str}\n"
            f"Arquetipo: {archetype}\n"
            f"Tono de Voz: {tone_str}\n"
        )

    try:
        prompt = INTERPRETATION_PROMPT.format(
            context_str=context_str,
            aggregated_json=json.dumps(aggregated_json, indent=2, ensure_ascii=False)
        )
        
        print(f"🔍 [DEBUG] Prompt length: {len(prompt)} chars")
        logger.info(f"🗣️ Generating interpretations with context ({len(context_str)} chars)...")
        
        interpretations = await _call_gemini(prompt, temperature=0.7, model="gpt-5-mini")
        
        print(f"✅ [DEBUG] Interpretations received: {type(interpretations)}, keys: {list(interpretations.keys()) if isinstance(interpretations, dict) else 'NOT A DICT'}")
        logger.info(f"✅ Generated {len(interpretations)} interpretations")
        return interpretations
        
    except Exception as e:
        print(f"❌ [DEBUG] EXCEPTION in generate_interpretations: {e}")
        logger.error(f"❌ Error generating interpretations: {e}")
        return _get_fallback_interpretations()


def _get_fallback_interpretations() -> dict:
    """Return generic interpretations when AI generation fails."""
    fallback = "Los datos muestran tendencias que ameritan análisis más profundo. Consulta con tu equipo de estrategia."
    return {f"Q{i}_interpretation": fallback for i in range(1, 11)}


# =============================================================================
# BRAND IDENTITY GENERATOR
# =============================================================================

BRAND_IDENTITY_PROMPT = """
Actúa como un Director Creativo y Estratega de Marca experto.
Basado en las respuestas de la entrevista inicial del cliente, define la Identidad de Marca completa.

DATOS DE ENTREVISTA:
{interview_json}

INSTRUCCIONES:
1. Analiza profundamente el negocio, audiencia y objetivos.
2. Define una Misión y Visión inspiradoras.
3. Elige 3-5 Valores corporativos sólidos.
4. Define el Arquetipo de Jung que mejor encaje (ej: El Creador, El Héroe, El Sabio).
5. Define rasgos de Tonalidad de voz.
6. Sugiere una paleta de colores (hex codes) y tipografías que transmitan la psicología de la marca.

GENERA UN JSON ESTRICTO CON ESTE ESQUEMA:
{{
    "mission": "Texto de la misión",
    "vision": "Texto de la visión",
    "values": [{{"title": "Valor", "desc": "Explicación breve"}}],
    "archetype": "Nombre del Arquetipo",
    "tone_traits": [{{"trait": "Rasgo (ej: Cercano)", "description": "Cómo se aplica"}}],
    "colors": {{
        "primary": "#HEX",
        "secondary": "#HEX",
        "accent": "#HEX",
        "background": "#HEX"
    }},
    "typography": {{
        "heading": "Nombre de Fuente Serif/Sans sugerida",
        "body": "Nombre de Fuente sugerida"
    }}
}}
"""

async def generate_brand_identity(interview_data: dict) -> dict:
    """
    Generate complete Brand Identity from Interview data via REST.
    """
    # Extract nested sections (support both real frontend structure and test flat structure)
    market = interview_data.get("market", {})
    brand = interview_data.get("brand", {})
    audience = interview_data.get("audience", {}) or {}
    goals = interview_data.get("goals", {})

    # Helper to merge lists or strings
    def get_list_or_str(obj, key):
        val = obj.get(key)
        if isinstance(val, list):
            return ", ".join(val)
        return val

    # Clean interview data to meaningful parts with fallbacks
    clean_data = {
        "business": interview_data.get("businessName"),
        "history": interview_data.get("history"),
        "vision": interview_data.get("vision"),
        
        # Audience & Values
        "audience": audience or interview_data.get("targetAudience"),
        "values": audience.get("values") or interview_data.get("values"), # Audience values mostly
        
        # Market & Competitors
        "industry": interview_data.get("industry") or "General Commerce",
        "competitors": market.get("competitors") or interview_data.get("competitors"),
        "market_position": market.get("priceRange"),
        
        # USP / Differentiator
        "unique_selling_point": get_list_or_str(interview_data, "differentiator") or interview_data.get("uniqueSellingPoint"),
        
        # Challenges (Aggregated)
        "challenges": interview_data.get("challenges") or (
            f"Pain Points: {audience.get('painPoints', '')}. "
            f"Bad Exp: {brand.get('badExperiences', '')}. "
            f"Worst Sellers: {get_list_or_str(market, 'worstSellers')}"
        ),
        
        # Goals
        "goals": goals if goals else interview_data.get("goals"),
        
        "inspiration": interview_data.get("inspiration")
    }
    
    prompt = BRAND_IDENTITY_PROMPT.format(
        interview_json=json.dumps(clean_data, indent=2, ensure_ascii=False)
    )
    
    try:
        logger.info(f"🎨 Generating Brand Identity for {clean_data['business']}...")
        
        identity = await _call_gemini(prompt, temperature=0.8, model="gpt-5-mini")
        
        logger.info("✅ Brand Identity generated successfully")
        return identity
        
    except Exception as e:
        logger.error(f"❌ Error generating brand identity: {e}")
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

**ANÁLISIS DE DATOS (Insights de Redes Sociales):**
{analysis_insights}

**NOMBRE DE LA MARCA:** {brand_name}

---

🧠 TU TAREA (Pensamiento Estratégico Profundo):

1. **OBJETIVOS ESTRATÉGICOS:**
   - Extrae TODOS los objetivos de negocio de la entrevista
   - Prioriza el MÁS CRÍTICO como "Objetivo Principal"
   - Clasifica los demás como "Objetivos Secundarios"
   - Para cada objetivo, explica POR QUÉ es importante (cruce con datos)

2. **ESTRATEGIAS TÁCTICAS (2-3 por objetivo):**
   - Cada estrategia debe ser ACCIONABLE y ESPECÍFICA
   - Debe tener un ángulo DIFERENCIADOR
   - Incluye el "por qué" estratégico, no solo el "qué"

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
  "root_label": "Proyecto Marketing",
  "objectives": [
    {{
      "title": "Objetivo Principal",
      "rationale": "Por qué es crítico según cruce entrevista+análisis (2-3 frases)",
      "strategies": [
        {{
          "title": "Estrategia: [Nombre Específico y Accionable]",
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
      "title": "Objetivo Secundario",
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

- El root_label DEBE ser exactamente: "Proyecto Marketing"
- El primer objetivo DEBE tener title: "Objetivo Principal"
- Los demás objetivos DEBEN tener title: "Objetivo Secundario"
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


async def generate_strategic_plan(interview_data: dict, analysis_json: dict) -> dict:
    """
    Genera el árbol estratégico usando TODO el contexto de la entrevista.
    """
    # 1. Formatear la Entrevista completa (No solo objetivos)
    interview_context_str = _format_interview_data(interview_data)
    
    # Extract brand name from interview data
    brand_name = interview_data.get("businessName") or interview_data.get("brand_name") or "Marca"

    # 2. Extraer Insights del Análisis
    q9_recs = analysis_json.get("Q9", {}).get("results", {}).get("lista_recomendaciones", [])
    q10_alert = analysis_json.get("Q10", {}).get("results", {}).get("alerta_prioritaria", "N/A")
    
    # Resumen de Análisis
    insights_str = (
        f"ESTADO ACTUAL: {q10_alert}\n"
        f"RECOMENDACIONES CRÍTICAS (Data-Driven): {json.dumps(q9_recs[:5], ensure_ascii=False)}"
    )
    
    # 3. Llamar a la IA con el nuevo Playbook Prompt
    prompt = STRATEGY_PLAYBOOK_PROMPT.format(
        interview_context=interview_context_str, # <--- Aquí va TODO
        analysis_insights=insights_str,
        brand_name=brand_name  # Pass brand name to prompt
    )
    
    # Use gpt-5-mini for better reasoning and more detailed strategy generation
    return await _call_gemini(prompt, temperature=0.7, model="gpt-5-mini")
