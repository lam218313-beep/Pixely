import requests
import sys

try:
    print("Testing GET http://localhost:8000/admin/brands")
    r = requests.get("http://localhost:8000/admin/brands")
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")
    
    print("\nTesting GET http://localhost:8000/admin/brands/")
    r = requests.get("http://localhost:8000/admin/brands/")
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")

    print("\nTesting GET http://localhost:8001/direct-admin-test")
    r = requests.get("http://localhost:8001/direct-admin-test")
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")

    print("\nTesting POST http://localhost:8001/api/admin/brands")
    payload = {"nombre": "Debug Brand", "plan": "free_trial"}
    r = requests.post("http://localhost:8001/api/admin/brands", json=payload)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")

except Exception as e:
    print(f"Error: {e}")
