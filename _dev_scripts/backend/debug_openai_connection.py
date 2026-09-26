
import asyncio
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI
import logging

# Configure logging to console
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env directly to be sure
load_dotenv("d:\\0.- Pixely\\4.- Pixely Frontend\\backend_v2\\.env")

api_key = os.getenv("OPENAI_API_KEY")
logger.info(f"API Key found: {'Yes' if api_key else 'No'}")
if api_key:
    logger.info(f"API Key prefix: {api_key[:10]}...")

async def test_openai():
    try:
        client = AsyncOpenAI(api_key=api_key)
        model = "gpt-5-mini"
        logger.info(f"Testing model: {model}")
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Hello, say hi in json"}],
            response_format={"type": "json_object"}
        )
        print("Success!")
        print(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_openai())
