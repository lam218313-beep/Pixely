
import asyncio
import os
import json
import logging
from dotenv import load_dotenv
from typing import Any

# Mock settings
class Settings:
    OPENAI_API_KEY = ""
    GEMINI_API_KEY = "dummy" 

settings = Settings()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env
load_dotenv("d:\\0.- Pixely\\4.- Pixely Frontend\\backend_v2\\.env")
settings.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Import _call_gemini code directly to avoid dependencies
import openai

async def _call_gemini(prompt: str, temperature: float = 0.7, model: str = "gpt-5-mini") -> Any:
    # Copied logic
    if not settings.OPENAI_API_KEY:
         raise ValueError("OPENAI_API_KEY not configured")
         
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    completion_args = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    
    if model != "gpt-5-mini":
            completion_args["temperature"] = temperature
    
    try:
        response = await client.chat.completions.create(**completion_args)
        content = response.choices[0].message.content
        print(f"RAW CONTENT: {content[:200]}...")
        return json.loads(content)
        
    except Exception as e:
        logger.error(f"❌ OpenAI Error: {e}")
        raise e

CLASSIFICATION_PROMPT = """
Eres un clasificador experto.
Devuelve ÚNICAMENTE un JSON Array válido.
Ejemplo: [{"idx": 0, "topic": "Test"}]

COMENTARIOS:
{comments_json}
"""

async def test_classification():
    comments = [{"idx": 0, "text": "Me encanta este producto, es excelente"}]
    prompt = CLASSIFICATION_PROMPT.format(comments_json=json.dumps(comments))
    
    try:
        print("Testing classification response structure...")
        result = await _call_gemini(prompt, temperature=0.2, model="gpt-5-mini")
        print(f"Result Type: {type(result)}")
        print(f"Result Content: {result}")
        
        if isinstance(result, list):
            print("Status: ✅ LIST - OK")
        elif isinstance(result, dict):
             print("Status: ⚠️ DICT - FAIL (Expected List)")
        else:
             print("Status: ❌ OTHER - FAIL")
             
    except Exception as e:
        print(f"Execution Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_classification())
