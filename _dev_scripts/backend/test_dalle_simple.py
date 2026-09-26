"""
Simple test for DALL-E 3 API
"""
import os
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_dalle():
    """Test DALL-E 3 API directly"""
    from openai import AsyncOpenAI
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found in environment")
        return
    
    print(f"API Key found: {api_key[:20]}...{api_key[-10:]}")
    print("\nTesting DALL-E 3 API...")
    
    try:
        async with AsyncOpenAI(api_key=api_key) as client:
            print("Creating image with DALL-E 3...")
            response = await client.images.generate(
                model="dall-e-3",
                prompt="A simple red apple on a white background, minimalist style",
                size="1024x1024",
                quality="standard",
                n=1,
                response_format="url"
            )
            
            print("\n=== SUCCESS ===")
            print(f"Image URL: {response.data[0].url[:100]}...")
            print(f"Revised Prompt: {response.data[0].revised_prompt}")
            print("\nDALL-E 3 is working correctly!")
            
    except Exception as e:
        print(f"\n=== ERROR ===")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_dalle())
