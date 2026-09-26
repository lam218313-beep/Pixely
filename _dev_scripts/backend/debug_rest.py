import sys
import os
import requests

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')

# Read .env manually to get key
key = None
try:
    with open(".env", "r") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                key = line.strip().split("=", 1)[1]
                break
except Exception as e:
    print(f"Error reading .env: {e}")
    sys.exit(1)

if not key:
    print("Key not found in .env")
    sys.exit(1)

print(f"Testing API with key ending in ...{key[-4:]}")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

try:
    r = requests.get(url)
    print(f"Status Code: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print("Models found:")
        for m in data.get('models', [])[:5]:
             print(f" - {m['name']}")
    else:
        print(f"Response: {r.text}")
except Exception as e:
    print(f"Request failed: {e}")
