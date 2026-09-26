import sys
import os
import uuid
import logging

# Set stdout encoding and path
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.getcwd())
logging.basicConfig(level=logging.INFO)

from app.services.database import db

def seed_brand():
    try:
        # 1. CREATE CLIENT
        client_id = f"{uuid.uuid4()}"
        client_name = "Nike Demo"
        
        print(f"Checking for existing client '{client_name}'...")
        existing = db.client.table("clients").select("*").eq("nombre", client_name).execute()
        
        if existing.data and len(existing.data) > 0:
            client_id = existing.data[0]['id']
            print(f"✅ Client exists: {client_id}")
        else:
            print("Creating new client...")
            new_client = {
                "id": client_id,
                "nombre": client_name,
                "industry": "Sports & Fashion",
                "is_active": True
            }
            db.client.table("clients").insert(new_client).execute()
            print(f"✅ Created client: {client_id}")

        # 2. SEED INTERVIEW (Required for context)
        print("Seeding Interview Data...")
        interview_data = {
            "businessName": "Nike",
            "industry": "Deporte y Moda",
            "challenges": "Mantener liderazgo en sostenibilidad e innovación digital.",
            "goals": "Expandir presencia en metaverso y moda regenerativa.",
            "values": "Just Do It, Innovación, Inspiración, Diversidad.",
            "targetAudience": "Atletas de todo el mundo, Gen Z.",
            "competitors": "Adidas, Puma, Under Armour",
            "uniqueSellingPoint": "Historia legendaria y tecnología de punta."
        }
        
        # Check interview
        existing_int = db.client.table("client_interviews").select("*").eq("client_id", client_id).execute()
        if existing_int.data:
            db.client.table("client_interviews").update({"data": interview_data}).eq("client_id", client_id).execute()
        else:
            db.client.table("client_interviews").insert({"client_id": client_id, "data": interview_data}).execute()
        print("✅ Interview seeded.")

        # 3. SEED BRAND VISUAL DNA (NanoBanana requirement)
        print("Seeding Brand Visual DNA...")
        dna_data = {
            "client_id": client_id,
            "color_primary_name": "Nike Black",
            "color_primary_hex": "#000000",
            "color_secondary_name": "Tech Volt",
            "color_secondary_hex": "#ccff00",
            "color_accent_name": "Pure White",
            "color_accent_hex": "#ffffff",
            "default_style": "natural",
            "default_lighting": "studio",
            "default_mood": "energetic",
            "default_resolution": "2K",
            "preferred_archetypes": ["lifestyle", "product_hero"],
            "always_exclude": ["text", "logos", "watermark", "blurry", "deformed"],
            "brand_essence": "Athletic excellence and urban innovation",
            "visual_keywords": ["dynamic", "sharp", "contrast", "motion"],
            "industry_leader_instagram": "nike",
            "industry_leader_name": "Nike",
            "is_configured": True
        }
        
        # Check DNA
        existing_dna = db.client.table("brand_visual_dna").select("*").eq("client_id", client_id).execute()
        if existing_dna.data:
            print("✅ DNA already configured.")
        else:
            db.client.table("brand_visual_dna").insert(dna_data).execute()
            print("✅ Brand Visual DNA seeded.")

        print("\n🎉 SUCCESS! You can now check the frontend.")
        print(f"Client ID: {client_id}")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    seed_brand()
