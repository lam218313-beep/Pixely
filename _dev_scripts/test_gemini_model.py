import asyncio
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend_v2/.env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try looking in parent dir
    load_dotenv(dotenv_path="../backend_v2/.env")
    api_key = os.getenv("GEMINI_API_KEY")

print(f"API Key present: {bool(api_key)}")

async def test_model(model_name):
    print(f"Testing model: {model_name}")
    try:
        client = genai.Client(api_key=api_key)
        response = await client.aio.models.generate_content(
            model=model_name,
            contents="Say 'Hello World' if you can hear me.",
        )
        print(f"SUCCESS with {model_name}: {response.text}")
        return True
    except Exception as e:
        print(f"FAILED with {model_name}: {e}")
        return False

async def main():
    # Test 3.0 (User request)
    await test_model("gemini-3.0-flash")
    # Test 2.0 (Backup)
    await test_model("gemini-2.0-flash-exp")
    # Test 1.5 (Standard)
    await test_model("gemini-1.5-flash")

if __name__ == "__main__":
    asyncio.run(main())
