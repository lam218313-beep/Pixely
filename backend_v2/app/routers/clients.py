"""
Clients Router
==============
CRUD endpoints for client management.
Uses Supabase for persistence.
"""

import logging
from typing import Optional, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..services.database import db
from ..services.auth_service import require_admin, verify_client_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clients", tags=["Clients"])


# ============================================================================
# Models
# ============================================================================

class ClientCreate(BaseModel):
    """Request to create a new client."""
    brand_name: str
    industry: Optional[str] = None


class ClientResponse(BaseModel):
    """Client response model."""
    id: str
    nombre: str  # Frontend compatibility
    industry: Optional[str] = None
    is_active: bool = True
    created_at: Optional[Any] = None  # Allow any for datetime serialization

    class Config:
        from_attributes = True


class ClientUpdate(BaseModel):
    """Request to update client info."""
    nombre: Optional[str] = None
    industry: Optional[str] = None
    is_active: Optional[bool] = None


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=list[ClientResponse], dependencies=[Depends(require_admin)])
async def list_clients():
    """List all clients from Supabase. Admin only — this is a cross-tenant listing."""
    return db.list_clients()


@router.post("", response_model=ClientResponse, dependencies=[Depends(require_admin)])
async def create_client(request: ClientCreate):
    """Create a new client in Supabase."""
    import uuid
    client_id = str(uuid.uuid4())
    
    # Prepare data for DB
    client_data = {
        "id": client_id,
        "nombre": request.brand_name,
        "industry": request.industry,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        # Insert using service
        result = db.create_client(client_data)
        logger.info(f"✅ Created client persistent: {request.brand_name} (ID: {client_id})")
        return client_data
    except Exception as e:
        logger.error(f"❌ Failed to create client: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating client: {str(e)}")


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, _user: dict = Depends(verify_client_access)):
    """Get a specific client from Supabase."""
    client = db.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, request: ClientUpdate, _user: dict = Depends(verify_client_access)):
    """Update client information."""
    existing = db.get_client(client_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Prepare updates
    updates = request.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    db.update_client(client_id, updates)
    logger.info(f"✏️ Updated client: {client_id}")
    
    # Return updated client
    updated = db.get_client(client_id)
    return updated


@router.delete("/{client_id}")
async def delete_client(client_id: str):
    """Delete a client from Supabase."""
    existing = db.get_client(client_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete_client(client_id)
    logger.info(f"🗑️ Deleted client persistent: {client_id}")
    
    return {"message": "Client deleted successfully"}
