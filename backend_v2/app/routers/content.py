import logging
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
# cliente: aprobar cada idea del plan y luego cada pieza final; nunca automáticas.


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
