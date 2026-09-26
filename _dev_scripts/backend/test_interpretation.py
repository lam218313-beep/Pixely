"""Quick test script for interpretation generation"""
import asyncio
import sys
sys.path.insert(0, '.')

from app.services import gemini_service
from app.config import settings

async def test_interpretation():
    print("=" * 50)
    print("TESTING INTERPRETATION GENERATION")
    print("=" * 50)
    
    print(f"OPENAI_API_KEY: {settings.OPENAI_API_KEY[:15] if settings.OPENAI_API_KEY else 'NOT SET'}...")
    
    # Simple test data
    test_data = {
        "Q1": {"emociones": [{"name": "Alegría", "value": 50}]},
        "Q2": {"resumen_global_personalidad": {"Sinceridad": 50}}
    }
    
    test_context = {
        "interview": {"businessName": "Test Brand"},
        "brand": {"mission": "Ayudar a las personas"}
    }
    
    print("\nCalling generate_interpretations...")
    try:
        result = await gemini_service.generate_interpretations(test_data, context=test_context)
        print(f"\nRESULT TYPE: {type(result)}")
        print(f"RESULT KEYS: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
        print(f"\nFULL RESULT:\n{result}")
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_interpretation())
