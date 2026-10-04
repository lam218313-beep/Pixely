import logging
import time
from typing import List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from ..services.database import db
from ..services.auth_service import verify_client_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Content"])

# Planificación, Validación, Publicación y Repositorio leen content_pieces, que llena
# a mano el pipeline de Claude Desktop (lam218313-beep/Pixely_Automatizaciones:
# 05_planificacion crea las filas, 03_generar el copy, 04_ensamblar el render y
# 05_publicar la publicación). Las únicas escrituras desde la app son decisiones del
# cliente: aprobar cada idea del plan y luego cada pieza final; nunca automáticas.


class PieceReview(BaseModel):
    estado: Literal["Aprobado", "Cambios solicitados"]
    comentario: Optional[str] = None
    # What the client wants changed: the image goes back to the designer, the text to /03_generar
    cambio_tipo: Optional[Literal["imagen", "texto", "ambos"]] = None


@router.get("/{client_id}/pieces")
async def list_pieces(
    client_id: str,
    month: Optional[str] = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    _user: dict = Depends(verify_client_access),
):
    return {"status": "success", "data": db.get_content_pieces(client_id, month)}


@router.patch("/{client_id}/pieces/{piece_id}/review")
async def review_piece(
    client_id: str,
    piece_id: UUID,
    review: PieceReview,
    user: dict = Depends(verify_client_access),
):
    comentario = (review.comentario or "").strip() or None
    if review.estado == "Cambios solicitados" and not comentario:
        raise HTTPException(status_code=422, detail="Explica qué cambios necesitas en la pieza")
    if review.estado == "Cambios solicitados" and not review.cambio_tipo:
        raise HTTPException(status_code=422, detail="Dinos si quieres cambiar la imagen, el texto o ambos")
    cambio_tipo = review.cambio_tipo if review.estado == "Cambios solicitados" else None

    try:
        piece = db.review_content_piece(client_id, str(piece_id), review.estado, comentario, user.get("email") or user["id"], cambio_tipo)
    except Exception as e:
        logger.error(f"Failed to review piece {piece_id} for {client_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar la revisión")

    if not piece:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")
    return {"status": "success", "data": piece}


# --- Approval of the plan, piece by piece (ideas written by /05_planificacion), before production ---

MONTH = r"^\d{4}-(0[1-9]|1[0-2])$"
IN_PRODUCTION = "Esta pieza ya está en producción: los cambios se piden en Validación, sobre la pieza final"


class PlanPieceReview(BaseModel):
    estado: Literal["Aprobada", "Cambios solicitados"]
    comentario: Optional[str] = None


@router.patch("/{client_id}/pieces/{piece_id}/plan-review")
async def review_plan_piece(
    client_id: str,
    piece_id: UUID,
    review: PlanPieceReview,
    user: dict = Depends(verify_client_access),
):
    """The client approves one idea of the plan, or sends it back with a comment."""
    comentario = (review.comentario or "").strip() or None
    if review.estado == "Cambios solicitados" and not comentario:
        raise HTTPException(status_code=422, detail="Cuéntanos qué cambiarías de esta pieza")
    piece = db.get_content_piece(client_id, str(piece_id))
    if not piece:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")
    if piece.get("estado_copy") != "Pendiente":
        raise HTTPException(status_code=409, detail=IN_PRODUCTION)
    try:
        updated = db.review_plan_pieces(client_id, [str(piece_id)], review.estado, comentario, user.get("email") or user.get("id"))
    except Exception as e:
        logger.error(f"Failed to review plan piece {piece_id} for {client_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar tu revisión")
    return {"status": "success", "data": updated[0] if updated else piece}


@router.post("/{client_id}/plan-review/approve-pending")
async def approve_pending_plan(
    client_id: str,
    month: str = Query(..., pattern=MONTH),
    user: dict = Depends(verify_client_access),
):
    """Approves at once every idea of the month still waiting for the client (never the ones sent back for changes)."""
    pending = [p["id"] for p in db.get_content_pieces(client_id, month)
               if p.get("plan_estado", "Pendiente") == "Pendiente" and p.get("estado_copy") == "Pendiente"]
    if not pending:
        return {"status": "success", "data": []}
    try:
        updated = db.review_plan_pieces(client_id, pending, "Aprobada", None, user.get("email") or user.get("id"))
    except Exception as e:
        logger.error(f"Failed to approve plan for {client_id} {month}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo aprobar el plan")
    return {"status": "success", "data": updated}


# --- Final files, uploaded by the team after post-production (Canva, CapCut…) ---
# /04_ensamblar only leaves a guide; a person finishes each piece and uploads it here.
# Uploading is what moves a piece into Validación.

BUCKET = "content-pieces"
MAX_BYTES = 50 * 1024 * 1024  # Supabase Storage's per-file limit on this plan
IMAGE_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
VIDEO_TYPES = {"video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm"}


def _check_finals(formato: Optional[str], files: List[UploadFile]) -> None:
    kinds = {"video" if f.content_type in VIDEO_TYPES else "image" if f.content_type in IMAGE_TYPES else "other" for f in files}
    if "other" in kinds:
        raise HTTPException(status_code=422, detail="Solo se aceptan imágenes PNG, JPG o WEBP y videos MP4, MOV o WEBM")
    if formato == "Reel":
        if len(files) != 1 or kinds != {"video"}:
            raise HTTPException(status_code=422, detail="Un Reel lleva un solo video")
    elif formato == "Carrusel":
        if not 2 <= len(files) <= 10 or kinds != {"image"}:
            raise HTTPException(status_code=422, detail="Un carrusel lleva de 2 a 10 imágenes, en orden")
    elif len(files) != 1 or kinds != {"image"}:
        raise HTTPException(status_code=422, detail="Esta pieza lleva una sola imagen")


@router.post("/{client_id}/pieces/{piece_id}/finals")
async def upload_finals(
    client_id: str,
    piece_id: UUID,
    files: List[UploadFile] = File(...),
    generada_con_ia: bool = Form(...),
    user: dict = Depends(verify_client_access),
):
    """The team uploads the finished files of a piece; it then appears in Validación for the client."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo el equipo de Pixely sube las piezas finales")
    piece = db.get_content_piece(client_id, str(piece_id))
    if not piece:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")
    if piece.get("plan_estado") != "Aprobada":
        raise HTTPException(status_code=409, detail="El cliente aún no aprueba esta idea en Planificación")
    if piece.get("estado_copy") != "Listo":
        raise HTTPException(status_code=409, detail="Falta el copy de esta pieza: corre /03_generar antes de subirla")
    if piece.get("estado_publicado") not in (None, "Pendiente"):
        raise HTTPException(status_code=409, detail="Esta pieza ya está programada o publicada")
    _check_finals(piece.get("formato"), files)

    stamp = int(time.time())
    urls: List[str] = []
    try:
        for n, f in enumerate(files, start=1):
            data = await f.read()
            if len(data) > MAX_BYTES:
                raise HTTPException(status_code=413, detail=f"{f.filename} pesa más de 50 MB; comprímelo y vuelve a subirlo")
            ext = IMAGE_TYPES.get(f.content_type) or VIDEO_TYPES[f.content_type]
            # A new name on every delivery, so browsers never show the previous version
            path = f"{client_id}/{piece_id}/final-{stamp}-{n}.{ext}"
            urls.append(db.upload_public_file(BUCKET, path, data, f.content_type))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload finals for piece {piece_id} ({client_id}): {e}")
        raise HTTPException(status_code=500, detail="No se pudieron subir los archivos")

    updated = db.save_piece_finals(client_id, str(piece_id), urls, generada_con_ia, user.get("email") or user.get("id"),
                                   back_to_review=piece.get("estado_aprobacion") == "Cambios solicitados")
    return {"status": "success", "data": updated or piece}


# --- Results of what was published (Metricool), read by Publicaciones ---
# /05_publicar (modo resultados) writes piece_metrics; /01 and /03 write competitor_benchmarks.

@router.get("/{client_id}/results")
async def get_results(
    client_id: str,
    month: str = Query(..., pattern=MONTH),
    _user: dict = Depends(verify_client_access),
):
    pieces = db.get_content_pieces(client_id, month)
    metrics = db.get_piece_metrics(client_id, [p["id"] for p in pieces])
    return {"status": "success", "data": {"metrics": metrics, "competitors": db.get_competitor_benchmarks(client_id, month)}}
