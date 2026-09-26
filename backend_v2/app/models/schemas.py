"""
Pydantic Schemas
================
Request/Response models for API validation.
"""

from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


# ============================================================================
# Client Schemas
# ============================================================================

class ClientBase(BaseModel):
    """Base client properties."""
    brand_name: str
    industry: Optional[str] = None


class ClientCreate(ClientBase):
    """Schema for creating a client."""
    pass


class ClientResponse(ClientBase):
    """Schema for client responses."""
    id: str
    nombre: str  # Alias for frontend compatibility
    is_active: bool = True
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Pipeline Schemas
# ============================================================================

class PipelineStartRequest(BaseModel):
    """Request to start analysis pipeline."""
    client_id: str
    instagram_url: str
    comments_limit: int = 1000


class PipelineStatusResponse(BaseModel):
    """Response for pipeline status."""
    report_id: str
    status: str  # PROCESSING, COMPLETED, ERROR
    progress: int
    message: Optional[str] = None


# ============================================================================
# Raw Item Schemas
# ============================================================================

class RawItemBase(BaseModel):
    """Base schema for classified items."""
    platform: str
    platform_id: str
    content: str
    author: str
    posted_at: Optional[datetime] = None
    
    # AI Classifications
    ai_emotion: str
    ai_personality: str
    ai_topic: str
    ai_sentiment_score: float


class RawItemCreate(RawItemBase):
    """Schema for creating raw items."""
    report_id: str


class RawItemResponse(RawItemBase):
    """Schema for raw item responses."""
    id: str
    report_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Analysis Report Schemas
# ============================================================================

class AnalysisReportBase(BaseModel):
    """Base schema for analysis reports."""
    client_id: str
    status: str = "PROCESSING"


class AnalysisReportCreate(AnalysisReportBase):
    """Schema for creating reports."""
    pass


class AnalysisReportResponse(AnalysisReportBase):
    """Schema for report responses."""
    id: str
    frontend_compatible_json: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: str = "client"
    client_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

