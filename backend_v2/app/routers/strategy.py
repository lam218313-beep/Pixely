
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from ..services.database import db
from ..services.auth_service import get_current_user, verify_client_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/strategy", tags=["Strategy"])

# --- Models ---
class StrategyNode(BaseModel):
    id: str
    type: str # 'main', 'secondary', 'concept'
    label: str
    description: Optional[str] = ""
    parentId: Optional[str] = None # Frontend sends 'parentId', DB col is 'parent_id'
    x: float
    y: float
    
    # New fields for Strategy v2
    suggested_format: Optional[str] = None
    suggested_frequency: Optional[str] = None
    tags: Optional[List[str]] = []
    # Concept detail written by the generator; must round-trip or every autosave erases it
    strategic_rationale: Optional[str] = None
    creative_hooks: Optional[List[str]] = None
    execution_guidelines: Optional[Dict[str, Any]] = None

class StrategySyncRequest(BaseModel):
    client_id: str
    nodes: List[StrategyNode]

# --- Endpoints ---

@router.get("/{client_id}", response_model=List[dict])
async def get_strategy(client_id: str, _user: dict = Depends(verify_client_access)):
    """
    Get the full strategy map for a client.
    """
    logger.info(f"🔍 GET /strategy/{client_id}")
    
    nodes = db.get_strategy_nodes(client_id)
    
    # Transform DB snake_case to Frontend camelCase
    frontend_nodes = []
    for n in nodes:
        frontend_nodes.append({
            "id": n["id"],
            "type": n["type"],
            "label": n["label"],
            "description": n["description"],
            "parentId": n["parent_id"],
            "x": n["x"],
            "y": n["y"],
            "suggested_format": n.get("suggested_format"),
            "suggested_frequency": n.get("suggested_frequency"),
            "tags": n.get("tags", []),
            "strategic_rationale": n.get("strategic_rationale"),
            "creative_hooks": n.get("creative_hooks") or [],
            "execution_guidelines": n.get("execution_guidelines") or {},
        })
    
    logger.info(f"📤 Returning {len(frontend_nodes)} nodes for client {client_id}")
    return frontend_nodes

@router.post("/sync")
async def sync_strategy(request: StrategySyncRequest, user: dict = Depends(get_current_user)):
    """
    Save the full state of the strategy map.
    NOTE: Strategy v2 does NOT auto-create tasks effectively.
    Planning is now handled by the Planning Module.
    """
    if user.get("role") != "admin" and user.get("client_id") != request.client_id:
        raise HTTPException(status_code=403, detail="Not authorized for this client")

    logger.info(f"💾 POST /strategy/sync for client_id: {request.client_id} ({len(request.nodes)} nodes)")
    
    # 1. Transform Frontend camelCase to DB snake_case for Strategy Nodes
    db_nodes = []
    
    for n in request.nodes:
        # Prepare for DB persistence
        db_nodes.append({
            "id": n.id,
            "type": n.type,
            "label": n.label,
            "description": n.description,
            "parent_id": n.parentId,
            "x": n.x,
            "y": n.y,
            "client_id": request.client_id,
            "suggested_format": n.suggested_format,
            "suggested_frequency": n.suggested_frequency,
            "tags": n.tags,
            "strategic_rationale": n.strategic_rationale,
            "creative_hooks": n.creative_hooks or [],
            "execution_guidelines": n.execution_guidelines or {},
        })
        
    try:
        # 2. Persist Strategy Nodes
        # The db.sync_strategy_nodes method will handle the transaction
        db.sync_strategy_nodes(request.client_id, db_nodes)
        
        logger.info(f"✅ Strategy synced successfully for client {request.client_id}")
        return {"status": "synced", "count": len(db_nodes)}
        
    except Exception as e:
        logger.error(f"❌ Strategy Sync Failed for client {request.client_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
