# Add this endpoint to admin.py

@router.post("/brands/{brand_id}/reset-strategy")
async def reset_brand_strategy(brand_id: str):
    """
    Reset the strategy for a brand (Admin only).
    Deletes all existing nodes and creates only the root node.
    """
    try:
        # Get brand info to get the brand name
        brand = db.get_client(brand_id)
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand_name = brand.get("nombre", "Marca")
        
        # Create only the root node
        import uuid
        root_node = {
            "id": str(uuid.uuid4()),
            "type": "main",
            "label": f"Proyecto: {brand_name} Marketing",
            "description": "Estrategia General",
            "parent_id": None,
            "x": 0,
            "y": 0,
            "client_id": brand_id,
            "suggested_format": None,
            "suggested_frequency": None,
            "tags": []
        }
        
        # Sync (this will delete all existing nodes and create the new one)
        db.sync_strategy_nodes(brand_id, [root_node])
        
        logger.info(f"✅ Strategy reset for brand {brand_name} ({brand_id})")
        
        return {
            "status": "success",
            "message": f"Strategy reset for {brand_name}",
            "nodes_created": 1
        }
        
    except Exception as e:
        logger.error(f"❌ Error resetting strategy for brand {brand_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
