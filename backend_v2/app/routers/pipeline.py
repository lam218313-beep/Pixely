
import logging
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from ..services import apify_service, gemini_service, aggregator
from ..services.database import db
from ..services.auth_service import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pipeline", tags=["Pipeline"])

# Modelos
class PipelineStartRequest(BaseModel):
    client_id: str
    instagram_url: str
    comments_limit: int = 1000

class PipelineStartResponse(BaseModel):
    status: str
    report_id: str
    message: str

class PipelineStatusResponse(BaseModel):
    report_id: str
    status: str
    progress: int
    message: Optional[str] = None

# Endpoints
@router.post("/start", response_model=PipelineStartResponse)
async def start_pipeline(request: PipelineStartRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin" and user.get("client_id") != request.client_id:
        raise HTTPException(status_code=403, detail="Not authorized for this client")

    import uuid
    report_id = str(uuid.uuid4())
    
    # 1. Crear registro en Supabase
    db.create_report(report_id, request.client_id, status="PROCESSING")

    # 2. Lanzar tarea en background (Pasando argumentos explícitos)
    background_tasks.add_task(
        _run_full_pipeline, 
        report_id=report_id,
        client_id=request.client_id,  # <-- CRITICAL: Pass client_id for task generation
        instagram_url=request.instagram_url, 
        comments_limit=request.comments_limit
    )

    return PipelineStartResponse(
        report_id=report_id,
        status="PROCESSING",
        message="Pipeline started successfully"
    )

@router.get("/status/{report_id}")
async def get_pipeline_status(report_id: str):
    return {"status": "Please check /semantic/analysis/{client_id} for results"}

@router.get("/result/{report_id}")
async def get_pipeline_result(report_id: str):
    return {"status": "Please use /semantic/analysis/{client_id}"}

# Tarea Background (Limpia de memoria local)
async def _run_full_pipeline(report_id: str, client_id: str, instagram_url: str, comments_limit: int = 1000):
    try:
        logger.info(f"🚀 [{report_id}] Pipeline STARTED for {instagram_url}")
        
        # PASO 1: SCRAPING
        logger.info(f"📥 [{report_id}] Scraping Instagram...")
        # Con latestComments (~8-10 por post), 12 posts = ~100 comentarios
        # Esto garantiza 50-100 comentarios con 1 sola llamada a Apify
        scrape_result = await apify_service.scrape_instagram_profile_with_posts_and_comments(
            profile_url=instagram_url,
            posts_limit=12,  # 12 posts * ~8-10 latestComments = 50-100 comentarios
            comments_per_post=0  # No se usa, latestComments viene incluido
        )
        
        all_content = scrape_result.get("all_comments", [])
        if not all_content:
            raise ValueError("No content retrieved from Instagram.")
            
        logger.info(f"📦 [{report_id}] Scraped {len(all_content)} items")

        # PASO 1.5: RECUPERAR CONTEXTO DE ENTREVISTA (Integración)
        brand_context = ""
        try:
            logger.info(f"🔍 [{report_id}] Fetching Interview Context for {client_id}...")
            interview_record = db.get_interview(client_id)
            if interview_record and interview_record.get("data"):
                idata = interview_record.get("data", {})
                
                # Construir string de contexto rico
                parts = []
                if "Q1" in idata: parts.append(f"Misión/Descripción: {idata['Q1']}")
                if "Q2" in idata: parts.append(f"Público Objetivo: {idata['Q2']}")
                if "Q3" in idata: parts.append(f"Propuesta de Valor: {idata['Q3']}")
                if "type" in idata: parts.append(f"Tipo de Producto: {idata['type']}")
                if "competitors" in idata: parts.append(f"Competidores: {idata['competitors']}")
                if "tone" in idata: parts.append(f"Tono deseado: {idata['tone']}")
                
                if "product_context" in idata:
                    parts.append(f"--- Contexto Adicional (Archivo) ---\n{idata['product_context'][:2000]}...") # Limit context
                
                brand_context = "\n".join(parts)
                logger.info(f"✅ [{report_id}] Context Loaded ({len(brand_context)} chars)")
            else:
                logger.warning(f"⚠️ [{report_id}] No Interview Data found. Analysis will be generic.")
        except Exception as e:
            logger.error(f"❌ [{report_id}] Failed to load interview context: {e}")

        # PASO 2: CLASIFICACIÓN
        db.update_report_status(report_id, "CLASSIFYING")
        normalized_items = [
            apify_service.normalize_comment_for_classification(item)
            for item in all_content
        ]
        texts_to_classify = [item["content"] for item in normalized_items if item["content"]]
        
        logger.info(f"🧠 [{report_id}] Classifying {len(texts_to_classify)} items...")
        
        # Pass brand_context to Gemini
        classifications = await gemini_service.classify_comments_batch(
            texts_to_classify, 
            brand_context=brand_context
        )
        
        # Merge
        raw_items = []
        classification_map = {c["idx"]: c for c in classifications}
        for i, normalized in enumerate(normalized_items):
            if i in classification_map:
                c = classification_map[i]
                raw_items.append({
                    **normalized,
                    "ai_emotion": c.get("emotion", "Otro"),
                    "ai_personality": c.get("personality", "Sinceridad"),
                    "ai_topic": c.get("topic", "Otro"),
                    "ai_sentiment_score": c.get("sentiment_score", 0.0)
                })

        # PASO 3: AGREGACIÓN
        db.update_report_status(report_id, "AGGREGATING")
        if not raw_items: # Changed from classified_items to raw_items
             # Fallback if classification failed but scraping worked?
             # For now, we need items.
             raise Exception("No items classified to aggregate")

        result_json = aggregator.build_frontend_compatible_json(raw_items)
        
        # =========================================
        # PASO 4: GENERACIÓN DE INTERPRETACIONES (NEW!)
        # =========================================
        logger.info(f"🗣️ [{report_id}] Translating data to human language...")
        
        # 4.1 Fetch Context (Interview + Brand Identity)
        interview_record = db.get_interview(client_id)
        interview_data = interview_record.get("data") if interview_record else {}
        
        brand_record = db.get_brand_identity(client_id)
        # Ensure we have a dict
        if not brand_record: brand_record = {}

        full_context = {
            "interview": interview_data,
            "brand": brand_record
        }
        
        try:
            interpretations = await gemini_service.generate_interpretations(result_json, context=full_context)
        except Exception as e:
            import traceback
            print(f"❌ [DEBUG] INTERPRETATION ERROR: {type(e).__name__}: {e}")
            print(f"❌ [DEBUG] TRACEBACK:\n{traceback.format_exc()}")
            logger.warning(f"⚠️ [{report_id}] Interpretation generation failed: {e}")
            interpretations = {}

        if not interpretations:
            logger.warning(f"⚠️ [{report_id}] No interpretations generated. Using fallback.")
            # Helper to get fallback from gemini_service or hardcoded
            from ..services.gemini_service import _get_fallback_interpretations
            interpretations = _get_fallback_interpretations()

        # Inject interpretation_text into each Q block
        count_injected = 0
        print(f"🔍 [DEBUG] Interpretations received keys: {list(interpretations.keys())}")
        print(f"🔍 [DEBUG] result_json keys: {list(result_json.keys())}")
        
        for q_key, q_data in result_json.items():
            interpretation_key = f"{q_key}_interpretation"
            if interpretation_key in interpretations:
                # Handle both dict and nested dict structures
                if isinstance(q_data, dict):
                    q_data["interpretation_text"] = interpretations[interpretation_key]
                    count_injected += 1
                    print(f"✅ [DEBUG] Injected {interpretation_key} -> {interpretations[interpretation_key][:50]}...")
        
        print(f"🔍 [DEBUG] Total injected: {count_injected}")
        logger.info(f"✅ [{report_id}] Interpretations injected: {count_injected} blocks updated")
        

        # =========================================================================
        # PASO 5: GENERACIÓN AUTOMÁTICA DE ESTRATEGIA (CASCADA)
        # =========================================================================
        try:
            logger.info("🧠 Generando Plan Estratégico con IA (Tree Structure)...")

            # 1. Contexto completo de Entrevista (reutilizando variable interview_data ya cargada arriba o DB)
            # Nota: interview_data ya se cargó en línea 155, usamos esa.

            # 2. Generar Árbol
            strategy_tree = await gemini_service.generate_strategic_plan(
                interview_data=interview_data, # Usamos la variable local ya cargada
                analysis_json=result_json
            )
            
            # 4. Convertir a Nodos Visuales para Frontend
            strategy_nodes = aggregator.convert_tree_to_nodes(client_id, strategy_tree)
            
            # 5. Guardar en Base de Datos (Sobreescribe cualquier anterior)
            db.sync_strategy_nodes(client_id, strategy_nodes)
            
            logger.info(f"✅ Estrategia Generada y Guardada: {len(strategy_nodes)} nodos.")
            
            # (Opcional) Marcar en el JSON que existe estrategia
            if "Q10" in result_json:
                    if "results" not in result_json["Q10"]: result_json["Q10"]["results"] = {}
                    result_json["Q10"]["results"]["estrategia_generada"] = True

        except Exception as e:
            # NO detenemos el pipeline si falla la estrategia, es un módulo "extra"
            logger.error(f"⚠️ Error generando estrategia (Non-blocking): {e}")
        
        # =========================================
        # FINAL: AUDITORÍA Y GUARDADO
        # =========================================
        from datetime import datetime
        
        # Check for fallback dates in Q8
        q8_data = result_json.get("Q8", {}).get("results", {})
        has_fallback_dates = any("Grupo" in w.get("fecha_semana", "") for w in q8_data.get("serie_temporal_semanal", []))
        
        audit_log = {
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "INSTAGRAM_SCRAPE_APIFY",
            "data_integrity": {
                "scraped_count": len(all_content),
                "classified_count": len(classifications),
                "date_range_start": all_content[0].get("timestamp") if all_content else None,
                "date_range_end": all_content[-1].get("timestamp") if all_content else None,
                "has_imputed_dates": has_fallback_dates,
                "sampling_ratio": f"{len(classifications)}/{len(all_content)}"
            },
            "execution_checks": {
                "gemini_classification_success": len(classifications) > 0,
                "interpretation_generated": "interpretation_text" in (result_json.get("Q1") or {})
            },
            "flags": ["REAL_DATA"] + (["MISSING_DATES"] if has_fallback_dates else ["VERIFIED_DATES"])
        }

        db.update_report_status(report_id, "COMPLETED", result=result_json, audit_log=audit_log)
        logger.info(f"✅ [{report_id}] Pipeline FINISHED and saved with Audit Log.")

    except Exception as e:
        logger.error(f"❌ [{report_id}] Pipeline FAILED: {e}", exc_info=True)
        # Guardar error en DB
        db.update_report_status(report_id, "ERROR", error=str(e))
