from app.services.database import db
import logging
from dotenv import load_dotenv

load_dotenv("backend_v2/.env")

# Configure logging to print to console
logging.basicConfig(level=logging.INFO)

def check_brands():
    print("Checking Brand Identities...")
    try:
        # Get all clients first to check IDs
        clients = db.client.table("clients").select("id, nombre").execute()
        
        for client in clients.data:
            print(f"\nChecking Client: {client['nombre']} ({client['id']})")
            
            # Check Identity
            identity = db.get_brand_identity(client['id'])
            if identity:
                print(f"✅ Found Identity: {identity.keys()}")
                if 'mission' in identity: print(f"   - Mission: {identity['mission'][:50]}...")
            else:
                print("❌ No Brand Identity found.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_brands()
