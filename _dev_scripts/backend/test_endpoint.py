"""
Test the image generation endpoint
"""
import httpx
import json
import asyncio

async def test_endpoint():
    print("Testing image generation endpoint...")
    print("="*60)
    
    payload = {
        "client_id": "test_client",
        "user_additions": "Un paisaje minimalista con montanas nevadas y un lago cristalino al atardecer",
        "style_preset": "minimalist",
        "aspect_ratio": "16:9",
        "mood_tone": "calmado y sereno"
    }
    
    print(f"Request payload:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("\nSending request (this may take 10-30 seconds)...")
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "http://localhost:8001/images/generate",
            json=payload
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n" + "="*60)
            print("SUCCESS!")
            print("="*60)
            
            image = data.get("image", {})
            print(f"\nImage ID: {image.get('id')}")
            print(f"Client ID: {image.get('client_id')}")
            print(f"Model: {image.get('generation_model')}")
            print(f"Style: {image.get('style_preset')}")
            print(f"Aspect Ratio: {image.get('aspect_ratio')}")
            print(f"Mood: {image.get('mood_tone')}")
            
            # Show URL (truncated)
            url = image.get('image_url', '')
            if url:
                if url.startswith('data:'):
                    print(f"\nImage URL: [Base64 Data URL - {len(url)} chars]")
                else:
                    print(f"\nImage URL: {url[:100]}...")
            
            # Show prompts
            print(f"\nOriginal Prompt (truncated): {image.get('prompt', '')[:200]}...")
            print(f"\nRevised Prompt: {image.get('revised_prompt', 'N/A')[:200]}...")
            
            print("\n" + "="*60)
            print("IMAGE GENERATION WORKING CORRECTLY!")
            print("="*60)
        else:
            print(f"\nError: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_endpoint())
