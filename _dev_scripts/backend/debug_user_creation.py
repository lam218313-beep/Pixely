import requests
import json
import sys

# Replace with a valid brand ID from the previous list_brands call or fetch one
# I'll first fetch brands to get a valid ID
try:
    print("Fetching brands...")
    r = requests.get("http://localhost:8001/api/admin/brands")
    if r.status_code != 200:
        print(f"Failed to fetch brands: {r.text}")
        sys.exit(1)
    
    brands = r.json()
    if not brands:
        print("No brands found. Please create a brand first (you can use debug_request.py's POST test).")
        # Attempt to create one if missing
        print("Creating temp brand...")
        r = requests.post("http://localhost:8001/api/admin/brands", json={"nombre": "Debug Brand User", "plan": "free_trial"})
        brand_id = r.json()["id"]
    else:
        brand_id = brands[0]["id"]
    
    print(f"Using Brand ID: {brand_id}")
    
    # User data that likely exists or we want to test
    user_data = {
        "email": "test_user_conflict@pixely.pe",
        "password": "Password123!",
        "full_name": "Test User"
    }
    
    print(f"Attempting to create user: {user_data['email']}")
    url = f"http://localhost:8001/api/admin/brands/{brand_id}/users"
    r = requests.post(url, json=user_data)
    
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")
    
    # Try again to force conflict
    print("\nAttempting to create SAME user again (expecting conflict/error)...")
    r = requests.post(url, json=user_data)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")

except Exception as e:
    print(f"Error: {e}")
