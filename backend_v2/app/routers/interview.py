
import logging
import json
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from ..services.database import db
from ..services.auth_service import verify_client_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clients", tags=["Interview"])

@router.put("/{client_id}/interview")
async def save_interview_data(
    client_id: str,
    data: str = Form(...),  # Expecting JSON string
    file: Optional[UploadFile] = File(None),
    _user: dict = Depends(verify_client_access)
):
    """
    Receives interview data as JSON string and an optional file.
    Saves to Supabase.
    """
    try:
        # 1. Parse JSON data
        try:
            parsed_data = json.loads(data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format in 'data' field")

        # 2. Handle File (Read content for Context)
        if file:
            logger.info(f"Processing file: {file.filename} ({file.content_type})")
            file_content = ""
            
            try:
                contents = await file.read()
                
                if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
                    import pandas as pd
                    from io import BytesIO
                    df = pd.read_excel(BytesIO(contents))
                    # Convert full dataframe to string for context
                    file_content = df.to_string()
                elif file.filename.endswith('.pdf'):
                    # Basic PDF text extraction (Placeholder - requires pypdf or similar if strictly needed)
                    # For now we skip complex PDF parsing to avoid extra heavy deps unless requested
                    file_content = f"[PDF File: {file.filename} uploaded. Content extraction pending.]"
                else:
                    # Generic text decoding
                    file_content = contents.decode('utf-8', errors='ignore')
                
                # Ingest into context
                parsed_data["product_context"] = file_content[:10000] # Limit context size
                parsed_data["attached_file_name"] = file.filename
                
            except Exception as file_err:
                logger.error(f"Error reading file {file.filename}: {file_err}")
                parsed_data["file_error"] = str(file_err)

        # 3. Save to DB
        db.save_interview(client_id, parsed_data, None)

        return {"status": "success", "message": "Interview data saved successfully"}

    except Exception as e:
        logger.error(f"Error saving interview for client {client_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{client_id}/interview")
async def get_interview_data(client_id: str, _user: dict = Depends(verify_client_access)):
    """
    Retrieves the latest interview data.
    """
    result = db.get_interview(client_id)
    if not result:
        # Return empty structure if not found, to avoid frontend crashes
        return {"data": {}}
    
    return {
        "id": result.get("id"),
        "data": result.get("data"),
        "created_at": result.get("created_at")
    }
