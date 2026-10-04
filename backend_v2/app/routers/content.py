import logging
from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..services.database import db
from ..services.auth_service import verify_client_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Content"])

# Planificación, Validación, Publicación y Repositorio leen content_pieces, que llena
# a mano el pipeline de Claude Desktop (lam218313-beep/Pixely_Automatizaciones:
# 05_planificacion crea las filas, 03_generar el copy, 04_ensamblar el render y
# 05_publicar la publicación). Las únicas escrituras desde la app son decisiones del
# cliente: aprobar el plan del mes y revisar cada pieza; nunca automáticas.


class PieceReview(BaseModel):
    estado: Literal["Aprobado", "Cambios solicitados"]
    comentario: Optional[str] = None


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

    try:
        piece = db.review_content_piece(client_id, str(piece_id), review.estado, comentario, user.get("email") or user["id"])
    except Exception as e:
        logger.error(f"Failed to review piece {piece_id} for {client_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar la revisión")

    if not piece:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")
    return {"status": "success", "data": piece}


# --- Approval of the month's plan (written by /05_planificacion), before production ---

MONTH = r"^\d{4}-(0[1-9]|1[0-2])$"


class PlanReview(BaseModel):
    estado: Literal["Aprobado", "Cambios solicitados"]
    comentario: Optional[str] = None


@router.get("/{client_id}/plan-review")
async def get_plan_review(
    client_id: str,
    month: str = Query(..., pattern=MONTH),
    _user: dict = Depends(verify_client_access),
):
    review = db.get_plan_review(client_id, month) or {"estado": "Pendiente", "comentario": None, "revisada_at": None, "revisada_por": None}
    return {"status": "success", "data": review}


@router.patch("/{client_id}/plan-review")
async def review_plan(
    client_id: str,
    review: PlanReview,
    month: str = Query(..., pattern=MONTH),
    user: dict = Depends(verify_client_access),
):
    """The client approves the month's plan or sends it back with a comment."""
    comentario = (review.comentario or "").strip() or None
    if review.estado == "Cambios solicitados" and not comentario:
        raise HTTPException(status_code=422, detail="Cuéntanos qué cambiarías del plan")
    if not db.get_content_pieces(client_id, month):
        raise HTTPException(status_code=404, detail="Este mes aún no tiene plan")
    data = {
        "estado": review.estado,
        "comentario": comentario,
        "revisada_at": datetime.now(timezone.utc).isoformat(),
        "revisada_por": user.get("email") or user.get("id"),
    }
    try:
        db.save_plan_review(client_id, month, data)
    except Exception as e:
        logger.error(f"Failed to save plan review for {client_id} {month}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar la revisión del plan")
    return {"status": "success", "data": data}
