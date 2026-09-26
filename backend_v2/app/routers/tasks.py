
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..services.database import db
from ..services.auth_service import get_current_user

router = APIRouter(
    prefix="/api/v1",
    tags=["Tasks"]
)

# --- Pydantic Models ---

class TaskNote(BaseModel):
    id: str
    task_id: str
    content: str
    created_at: str

class Task(BaseModel):
    id: str
    ficha_cliente_id: str = None  # Alias for client_id compatible with frontend
    client_id: str
    title: str
    description: Optional[str] = None
    area_estrategica: Optional[str] = None
    urgencia: Optional[str] = None
    score_impacto: Optional[int] = None
    score_esfuerzo: Optional[int] = None
    prioridad: Optional[str] = None   # "Alta", "Media", "Baja"
    week: int
    status: str
    created_at: str
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None
    notes: List[TaskNote] = []

    class Config:
        populate_by_name = True

class TaskUpdate(BaseModel):
    status: str

# --- Endpoints ---

@router.get("/fichas/{client_id}/tasks", response_model=dict)
async def get_tasks(client_id: str):
    """Get all tasks for a client, grouped by week."""
    tasks = db.get_tasks(client_id)
    
    # Transform to frontend structure
    week_1 = []
    week_2 = []
    week_3 = []
    week_4 = []
    
    for t in tasks:
        # Map DB urgency/priority to frontend expected
        # DB: title, description, status, priority, urgency, week...
        t_out = {
            **t,
            "ficha_cliente_id": t["client_id"], # Alias
            "notes": [] # TODO: fetch notes if needed
        }
        
        w = t.get("week", 4)
        if w == 1: week_1.append(t_out)
        elif w == 2: week_2.append(t_out)
        elif w == 3: week_3.append(t_out)
        else: week_4.append(t_out)
        
    return {
        "week_1": week_1,
        "week_2": week_2,
        "week_3": week_3,
        "week_4": week_4,
        "total_tasks": len(tasks),
        "completed_tasks": len([t for t in tasks if t["status"] == "HECHO"])
    }

@router.patch("/tasks/{task_id}")
async def update_task_status(task_id: str, update: TaskUpdate, user: dict = Depends(get_current_user)):
    if not db.client:
        raise HTTPException(status_code=500, detail="DB not connected")

    # Ownership check: only an admin or a user belonging to the task's own
    # client_id may update it (previously anyone could update any task_id).
    existing_task = db.get_task(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user.get("role") != "admin" and existing_task.get("client_id") != user.get("client_id"):
        raise HTTPException(status_code=403, detail="Not authorized to modify this task")

    try:
        # Update status
        updated = db.client.table("tasks").update({"status": update.status}).eq("id", task_id).execute()
        if not updated.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Return complete task object (mocking fetching it again or using returned)
        t = updated.data[0]
        return {
            **t,
            "ficha_cliente_id": t["client_id"],
            "notes": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
