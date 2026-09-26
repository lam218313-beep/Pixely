
import logging
import uuid
import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from .database import db
from .gemini_service import _call_gemini

logger = logging.getLogger(__name__)

# Enhanced Prompt for generating the monthly plan with Phase 1 Strategy Data
MONTHLY_PLAN_PROMPT = """
Eres un SOCIAL MEDIA MANAGER SENIOR con acceso a una estrategia de contenido profundamente detallada.
Tu tarea es generar el PLAN MENSUAL DE CONTENIDOS para {month_name} {year}.

═══════════════════════════════════════════════════════════════════════════════
📊 CONTEXTO DE MARCA
═══════════════════════════════════════════════════════════════════════════════

{brand_context}

═══════════════════════════════════════════════════════════════════════════════
🎯 ESTRATEGIA COMPLETA (Jerarquía con Datos Enriquecidos)
═══════════════════════════════════════════════════════════════════════════════

{strategy_hierarchy_json}

IMPORTANTE: Para cada concepto tienes disponible:
- ✅ **Razón Estratégica**: Por qué este concepto es crítico para el objetivo
- ✅ **Hooks Creativos**: 4-6 hooks específicos PRE-VALIDADOS y listos para usar
- ✅ **Guía de Ejecución**: Estructura narrativa, elementos clave, mejores prácticas y errores a evitar
- ✅ **Frecuencia Sugerida**: Cuántas veces usar este concepto en el mes
- ✅ **Tags**: Etiquetas temáticas para variación

═══════════════════════════════════════════════════════════════════════════════
📋 INSTRUCCIONES DE GENERACIÓN
═══════════════════════════════════════════════════════════════════════════════

**1. CUOTAS A CUMPLIR:**
   - Total de posts: {total_posts}
   - Posts/Carruseles: {quota_photo}
   - Reels/Videos: {quota_video}
   - Stories: {quota_story}

**2. DISTRIBUCIÓN TEMPORAL:**
   - Rango de fechas: {start_date} al {end_date}
   - Distribuir según frecuencia sugerida de cada concepto:
     * HIGH frequency: 3-4 veces en el mes
     * MEDIUM frequency: 1-2 veces en el mes
     * LOW frequency: 1 vez en el mes
   - NO repetir el mismo objetivo en días consecutivos
   - Balancear entre objetivos principales y secundarios

**3. PARA CADA POST DEBES GENERAR:**

   a) **Selección de Hook Específico:**
      - Elige UNO de los creative_hooks disponibles para el concepto
      - Debe ser el hook EXACTO (copia textual), no inventes uno nuevo
      - Si no hay hooks disponibles, crea uno basado en el strategic_rationale

   b) **Descripción Visual Detallada:**
      - Incluye TODOS los key_elements obligatorios del concepto
      - Usa la estructura narrativa recomendada (structure)
      - Sé específico sobre qué mostrar visualmente

   c) **Copy/Caption:**
      - Inicia con el hook seleccionado
      - Desarrolla según el strategic_rationale
      - Aplica los "dos" (mejores prácticas)
      - Evita los "donts" (errores comunes)
      - Incluye 3-5 hashtags relevantes

   d) **Propósito Estratégico:**
      - Explica brevemente cómo este post cumple el strategic_rationale del concepto

**4. CALIDAD OBLIGATORIA:**
   - ✅ Cada post debe tener un hook ESPECÍFICO (no genérico como "Hook emocional")
   - ✅ La descripción debe mencionar explícitamente los elementos clave
   - ✅ El copy debe reflejar claramente el propósito estratégico
   - ✅ NO inventes hooks nuevos si ya hay disponibles

═══════════════════════════════════════════════════════════════════════════════
📤 FORMATO JSON DE SALIDA
═══════════════════════════════════════════════════════════════════════════════

{{
  "posts": [
    {{
      "concept_id": "uuid_del_concepto",
      "date": "YYYY-MM-DD",
      "format": "reel" | "post" | "story",
      "title": "Título atractivo del post",
      "description": "Brief visual DETALLADO que incluye todos los key_elements. Ejemplo: 'Video de 45s mostrando [elemento 1], destacando [elemento 2], con [elemento 3] visible en pantalla...'",
      "copy": "Caption que inicia con el hook específico seleccionado, desarrolla el mensaje según strategic_rationale, y termina con CTA + hashtags",
      "selected_hook": "Hook EXACTO copiado de creative_hooks (texto completo)",
      "narrative_structure": "Estructura paso a paso copiada del concepto o adaptada. Ej: 'Hook emocional (5s) → Problema (10s) → Solución (20s) → CTA (5s)'",
      "key_elements": ["Elemento obligatorio 1", "Elemento obligatorio 2", "Elemento obligatorio 3"],
      "dos": ["Mejor práctica 1 del concepto", "Mejor práctica 2"],
      "donts": ["Error a evitar 1 del concepto", "Error a evitar 2"],
      "strategic_purpose": "Breve explicación de cómo este post cumple el strategic_rationale. Ej: 'Genera confianza mediante prueba social auténtica'"
    }}
  ]
}}

═══════════════════════════════════════════════════════════════════════════════
⚡ PRINCIPIOS DE EXCELENCIA
═══════════════════════════════════════════════════════════════════════════════

1. **USA HOOKS REALES**: Si el concepto tiene creative_hooks, DEBES usar uno de ellos textualmente
2. **SÉ ESPECÍFICO**: Los key_elements deben estar explícitamente mencionados en la description
3. **SÉ ESTRATÉGICO**: Cada post debe reflejar claramente su strategic_rationale
4. **SÉ ACCIONABLE**: Los dos/donts deben ser prácticos para el creador de contenido
5. **SÉ CONSISTENTE**: Respeta la estructura narrativa recomendada

¡Genera el plan mensual ahora!
"""

async def generate_monthly_plan(
    client_id: str,
    year: int,
    month: int,
    quotas: Dict[str, int]
) -> List[Dict[str, Any]]:
    """
    Generates a monthly content plan based on strategy concepts and quotas.
    Returns a list of generated tasks (not yet saved to DB).
    """
    # 1. Fetch Strategy Nodes (ALL nodes for hierarchy)
    nodes = db.get_strategy_nodes(client_id)
    concepts = [n for n in nodes if n.get("type") == "concept"]
    
    if not concepts:
        logger.warning(f"No strategy concepts found for client {client_id}")
        # Fallback concepts if none exist
        concepts = [
            {"id": "fallback_1", "label": "Educativo", "description": "Contenido de valor"},
            {"id": "fallback_2", "label": "Promocional", "description": "Ofertas y productos"},
            {"id": "fallback_3", "label": "Social Proof", "description": "Testimonios"}
        ]

    # 2. Get Brand Context (Interview)
    interview = db.get_interview(client_id)
    brand_context = f"Cliente ID: {client_id}"
    if interview:
        data = interview.get("data", {})
        brand_context = (
            f"Marca: {data.get('businessName', 'La Marca')}\n"
            f"Industria: {data.get('industry', 'General')}\n"
            f"Audiencia: {data.get('targetAudience', 'General')}\n"
            f"Objetivos: {data.get('goals', 'Ventas')}"
        )

    # 3. Build Enriched Strategy Hierarchy
    # Group nodes by type
    main_nodes = [n for n in nodes if n.get("type") == "main"]
    objective_nodes = [n for n in nodes if n.get("type") == "secondary" and n.get("parent_id") in [m["id"] for m in main_nodes]]
    strategy_nodes = [n for n in nodes if n.get("type") == "secondary" and n.get("parent_id") not in [m["id"] for m in main_nodes]]
    
    # Build hierarchy with full Phase 1 data
    hierarchy = {
        "project": main_nodes[0]["label"] if main_nodes else "Proyecto Marketing",
        "objectives": []
    }
    
    for obj in objective_nodes:
        # Find strategies for this objective
        obj_strategies = [s for s in strategy_nodes if s.get("parent_id") == obj["id"]]
        
        objective_data = {
            "id": obj["id"],
            "title": obj["label"],
            "rationale": obj.get("description", ""),
            "strategies": []
        }
        
        for strat in obj_strategies:
            # Find concepts for this strategy
            strat_concepts = [c for c in concepts if c.get("parent_id") == strat["id"]]
            
            strategy_data = {
                "id": strat["id"],
                "title": strat["label"],
                "concepts": []
            }
            
            for concept in strat_concepts:
                # Include ALL Phase 1 fields
                concept_data = {
                    "id": concept["id"],
                    "label": concept["label"],
                    "description": concept.get("description", ""),
                    "suggested_format": concept.get("suggested_format", "post"),
                    "suggested_frequency": concept.get("suggested_frequency", "medium"),
                    "tags": concept.get("tags", []),
                    # Phase 1 Enhancement Fields
                    "strategic_rationale": concept.get("strategic_rationale", ""),
                    "creative_hooks": concept.get("creative_hooks", []),
                    "execution_guidelines": concept.get("execution_guidelines", {}),
                    # Context for reference
                    "objective_context": obj["label"],
                    "strategy_context": strat["label"]
                }
                strategy_data["concepts"].append(concept_data)
            
            if strategy_data["concepts"]:  # Only add if has concepts
                objective_data["strategies"].append(strategy_data)
        
        if objective_data["strategies"]:  # Only add if has strategies
            hierarchy["objectives"].append(objective_data)

    # 4. Prepare Prompt Variables
    import calendar
    month_name = calendar.month_name[month]
    
    # Calculate dates
    start_date = datetime(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = datetime(year, month, last_day)
    
    total_posts = sum(quotas.values())

    prompt = MONTHLY_PLAN_PROMPT.format(
        month_name=month_name,
        year=year,
        brand_context=brand_context,
        strategy_hierarchy_json=json.dumps(hierarchy, ensure_ascii=False, indent=2),
        total_posts=total_posts,
        quota_photo=quotas.get("photo", 0),
        quota_video=quotas.get("video", 0),
        quota_story=quotas.get("story", 0),
        start_date=start_date.strftime("%Y-%m-%d"),
        end_date=end_date.strftime("%Y-%m-%d")
    )

    # 5. Call AI (using gpt-5-mini for better reasoning)
    try:
        response = await _call_gemini(prompt, temperature=0.7, model="gpt-5-mini")
        
        # Robust parsing
        posts = []
        if isinstance(response, dict):
            posts = response.get("posts", [])
        elif isinstance(response, list):
            posts = response
            
        logger.info(f"Generated {len(posts)} posts for {client_id}")
        
        # 6. Transform to Task format with enriched fields
        tasks = []
        month_group = f"{year}-{month:02d}"
        
        for p in posts:
            # Validate date
            post_date = p.get("date")
            if not post_date:
                day = random.randint(1, last_day)
                post_date = f"{year}-{month:02d}-{day:02d}"
            
            # Find concept for context
            concept = next((c for c in concepts if c["id"] == p.get("concept_id")), None)
            concept_label = concept["label"] if concept else "General"
            
            task = {
                "id": str(uuid.uuid4()),
                "client_id": client_id,
                "title": p.get("title") or f"{concept_label}: {p.get('format', 'post')}",
                "description": p.get("description", ""),
                "status": "PENDIENTE",
                "priority": "Media",
                "week": _get_week_of_month(post_date),
                "area_estrategica": "Contenido",
                "format": p.get("format", "post"),
                "month_group": month_group,
                "concept_id": p.get("concept_id"),
                "execution_date": post_date,
                "copy_suggestion": p.get("copy", ""),
                # NEW ENRICHED FIELDS from Phase 1
                "selected_hook": p.get("selected_hook", ""),
                "narrative_structure": p.get("narrative_structure", ""),
                "key_elements": p.get("key_elements", []),
                "dos": p.get("dos", []),
                "donts": p.get("donts", []),
                "strategic_purpose": p.get("strategic_purpose", ""),
                # Metadata
                "score_impacto": 7,
                "score_esfuerzo": 5,
                "created_at": datetime.utcnow().isoformat()
            }
            tasks.append(task)
            
        return tasks

    except Exception as e:
        logger.error(f"Error generating monthly plan: {e}")
        raise e

def _get_week_of_month(date_str: str) -> int:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return (dt.day - 1) // 7 + 1
    except:
        return 1

async def save_monthly_plan(client_id: str, tasks: List[Dict[str, Any]]):
    """
    Saves the generated tasks to the database.
    """
    if not tasks:
        return
    
    # We could delete existing tasks for this month_group if requested ("Regenerate")
    # For now, just append/create
    
    db.create_tasks_batch(tasks)
    logger.info(f"Saved {len(tasks)} tasks to DB for {client_id}")
