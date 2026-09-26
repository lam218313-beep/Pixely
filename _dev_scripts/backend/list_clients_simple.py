import sys
import os

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')

# Hack to avoid relative import issues if running as script from backend_v2
sys.path.append(os.getcwd())

# Disable logging to prevent encoding errors
import logging
logging.disable(logging.CRITICAL)

# Disable logging to prevent encoding errors
import logging
logging.disable(logging.CRITICAL)

try:
    from app.services.database import db
    
    if not db.client:
        print("ERROR: DB Client not initialized")
        sys.exit(1)
        
    response = db.client.table("clients").select("id, nombre, created_at").order("created_at", desc=True).limit(5).execute()
    
    print("CLIENTS_LIST_START")
    for row in response.data:
        print(f"{row['id']} | {row['nombre']} | {row['created_at']}")
    print("CLIENTS_LIST_END")
except Exception as e:
    print(f"ERROR: {e}")
