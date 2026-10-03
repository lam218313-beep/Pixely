import logging
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..services.database import db
from ..services.auth_service import verify_client_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Content"])

# Repositorio, Validación y Publicación leen content_pieces, que llena a mano el
# pipeline de Claude Desktop (lam218313-beep/Pixely_Automatizaciones: 02 crea las
# filas, 03 el copy, 04 el render, 05 la publicación). La única escritura desde la
# app es la revisión del cliente: una decisión humana, nunca automática.


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
