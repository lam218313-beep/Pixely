import sys
import os
import asyncio
import json

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.getcwd())

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

async def test_generation():
    try:
        from app.services.gemini_service import generate_brand_identity
        print("Imported service. Starting generation...")
        
        identity = await generate_brand_identity(MOCK_DATA)
        print("✅ Generation Successful!")
        print(json.dumps(identity, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ Error during generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_generation())
