import logging
import re
import unicodedata
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from ..services.database import db
from ..services.auth_service import verify_client_access
from ..services.market_report import build_market_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["Market"])

# This phase is read-only from the app's side: the génesis study and the
# recurring competitive scan are run by hand from Claude Desktop (see
# lam218313-beep/Pixely_Automatizaciones), never triggered from here, and
# write directly to market_studies / market_findings in Supabase.

@router.get("/{client_id}/study")
async def get_market_study(client_id: str, _user: dict = Depends(verify_client_access)):
    study = db.get_market_study(client_id)
    if not study:
        return {"status": "empty", "data": None}
    return {"status": "success", "data": study}


@router.get("/{client_id}/findings")
async def get_market_findings(client_id: str, _user: dict = Depends(verify_client_access)):
    findings = db.get_market_findings(client_id)
    return {"status": "success", "data": findings}


@router.get("/{client_id}/report.pdf")
async def download_market_report(client_id: str, _user: dict = Depends(verify_client_access)):
    """What the client sees in Mercado, as a PDF to keep and share (built on the fly, always current)."""
    client = db.get_client(client_id) or {}
    study = db.get_market_study(client_id)
    findings = db.get_market_findings(client_id, limit=200)
    if not study and not findings:
        raise HTTPException(status_code=404, detail="Todavía no hay información de mercado para descargar")
    nombre = client.get("nombre") or "Tu marca"
    try:
        pdf = build_market_report(nombre, study, findings)
    except Exception as e:
        logger.error(f"Failed to build market report for {client_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo generar el PDF")
    plain = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", plain).strip("-") or "marca"
    filename = f"mercado-{slug}-{date.today().isoformat()}.pdf"
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
