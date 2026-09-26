import asyncio
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    api_key = os.getenv("OPENAI_API_KEY")
    print(f"🔑 Probando con Key: {api_key[:15] if api_key else 'NOT SET'}...")
    
    if not api_key:
        print("❌ ERROR: OPENAI_API_KEY no está configurada")
        return
    
    async with AsyncOpenAI(api_key=api_key) as client:
        try:
            print("🚀 Enviando petición a gpt-5-mini...")
            response = await client.chat.completions.create(
                model="gpt-5-mini",
                messages=[{"role": "user", "content": "Responde solo JSON: {\"status\": \"ok\", \"message\": \"test\"}"}],
                response_format={"type": "json_object"}
            )
            print("✅ ÉXITO:")
            print(response.choices[0].message.content)
        except Exception as e:
            print("\n❌ ERROR REAL DETECTADO:")
            print(f"Type: {type(e).__name__}")
            print(f"Message: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
