import sys
import os
import json
import logging

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')
logging.disable(logging.CRITICAL)

sys.path.append(os.getcwd())

CLIENT_ID = "9f15d808-d39e-477b-8258-2cc20bbd46e7"

MOCK_DATA = {
  "businessName": "Nike",
  "industry": "Deporte y Moda",
  "challenges": "Mantener liderazgo en sostenibilidad e innovación digital.",
  "goals": "Expandir presencia en metaverso y moda regenerativa.",
  "values": "Just Do It, Innovación, Inspiración, Diversidad.",
  "targetAudience": "Atletas de todo el mundo, Gen Z.",
  "competitors": "Adidas, Puma, Under Armour",
  "uniqueSellingPoint": "Historia legendaria y tecnología de punta."
}

try:
    from app.services.database import db
    
    if not db.client:
        print("ERROR: DB Client not initialized")
        sys.exit(1)
        
    print(f"Seeding interview for client: {CLIENT_ID}")
    
    # Check if exists
    existing = db.client.table("client_interviews").select("*").eq("client_id", CLIENT_ID).execute()
    
    payload = {
        "client_id": CLIENT_ID,
        "data": MOCK_DATA
    }
    
    if existing.data and len(existing.data) > 0:
        print("Interview already exists. Updating...")
        db.client.table("client_interviews").update({"data": MOCK_DATA}).eq("client_id", CLIENT_ID).execute()
    else:
        print("Creating new interview record...")
        db.client.table("client_interviews").insert(payload).execute()
        
    print("✅ Interview seeded successfully!")

except Exception as e:
    print(f"ERROR: {e}")
