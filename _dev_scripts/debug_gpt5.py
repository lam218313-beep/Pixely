import os
from openai import OpenAI
from dotenv import load_dotenv
import json

load_dotenv("backend_v2/.env")

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

print(f"Testing 'gpt-5-mini' compatibility...")

# Test 1: Minimal call (No Params)
try:
    print("\n--- Test 1: Minimal Call ---")
    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": "Hello, are you functional?"}]
    )
    print("SUCCESS")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"FAILED: {e}")

# Test 2: With Temperature (Common cause of failure for reasoning models)
try:
    print("\n--- Test 2: With Temperature ---")
    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": "Hello"}],
        temperature=0.7
    )
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")

# Test 3: JSON Mode
try:
    print("\n--- Test 3: JSON Mode ---")
    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": "Return a JSON with key 'status': 'ok'"}],
        response_format={"type": "json_object"}
    )
    print("SUCCESS")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"FAILED: {e}")
