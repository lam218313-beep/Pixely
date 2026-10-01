import logging
from fastapi import APIRouter, Depends

from ..services.database import db
from ..services.auth_service import verify_client_access

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
