
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from pydantic import BaseModel
from datetime import datetime

from ..services.database import db
from ..services import content_generator
from ..services.auth_service import get_current_user, verify_client_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/planning", tags=["Planning"])

# --- Models ---
class Quotas(BaseModel):
    photo: int = 0
    video: int = 0
    story: int = 0

class GenerateMonthRequest(BaseModel):
    client_id: str
    year: int
    month: int
    quotas: Quotas
    
class SaveMonthRequest(BaseModel):
    client_id: str
    tasks: List[Dict[str, Any]]

# --- Endpoints ---

@router.post("/generate-month")
async def generate_monthly_plan(request: GenerateMonthRequest, user: dict = Depends(get_current_user)):
    """
    Generate a monthly content plan based on Strategy and Quotas.
    Returns the generated tasks for preview (does not save to DB immediately).
    """
    if user.get("role") != "admin" and user.get("client_id") != request.client_id:
        raise HTTPException(status_code=403, detail="Not authorized for this client")

    try:
        tasks = await content_generator.generate_monthly_plan(
            client_id=request.client_id,
            year=request.year,
            month=request.month,
            quotas=request.quotas.dict()
        )
        return {"status": "success", "tasks": tasks}
        
    except Exception as e:
        logger.error(f"Failed to generate monthly plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-month")
async def save_monthly_plan(request: SaveMonthRequest, user: dict = Depends(get_current_user)):
    """
    Save the confirmed monthly plan (list of tasks) to the database.
    """
    if user.get("role") != "admin" and user.get("client_id") != request.client_id:
        raise HTTPException(status_code=403, detail="Not authorized for this client")

    try:
        await content_generator.save_monthly_plan(request.client_id, request.tasks)
        return {"status": "saved", "count": len(request.tasks)}
        
    except Exception as e:
        logger.error(f"Failed to save monthly plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{client_id}/history")
async def get_planning_history(client_id: str, month_group: Optional[str] = None, _user: dict = Depends(verify_client_access)):
    """
    Get planning history (tasks) for a specific month or all time.
    """
    # Use existing db.get_tasks but filter by month_group if possible
    # For now, we fetch all and filter in python as get_tasks might not support filtering
    tasks = db.get_tasks(client_id)
    
    if month_group:
        tasks = [t for t in tasks if t.get("month_group") == month_group]
        
    return {"tasks": tasks}
