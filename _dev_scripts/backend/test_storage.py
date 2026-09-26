"""
Test Supabase Storage bucket
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print(f"URL: {url}")
print(f"Key: {key[:30]}...")

client = create_client(url, key)

# List buckets
print("\n=== Checking Buckets ===")
try:
    buckets = client.storage.list_buckets()
    print(f"Found {len(buckets)} buckets:")
    for b in buckets:
        print(f"  - {b.name} (public: {b.public})")
except Exception as e:
    print(f"Error listing buckets: {e}")

# Test upload
print("\n=== Testing Upload ===")
try:
    # Create a simple test image (1x1 red pixel PNG)
    test_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    
    response = client.storage.from_("generated-images").upload(
        path="test/test_upload.png",
        file=test_data,
        file_options={"content-type": "image/png", "upsert": "true"}
    )
    print(f"Upload response: {response}")
    
    # Get public URL
    public_url = client.storage.from_("generated-images").get_public_url("test/test_upload.png")
    print(f"Public URL: {public_url}")
    
    print("\n=== SUCCESS: Storage is working! ===")
    
except Exception as e:
    print(f"Upload error: {type(e).__name__}: {e}")
    print("\nPossible issues:")
    print("1. Bucket 'generated-images' doesn't exist")
    print("2. Bucket is not public")
    print("3. RLS policies blocking uploads")
