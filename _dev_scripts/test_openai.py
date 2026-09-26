import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv("backend_v2/.env")

api_key = os.getenv("OPENAI_API_KEY")

print(f"Testing Model: gpt-5-mini")
print(f"API Key found: {'Yes' if api_key else 'No'}")

client = OpenAI(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=10
    )
    print("SUCCESS: Model works!")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"FAILURE: {e}")
