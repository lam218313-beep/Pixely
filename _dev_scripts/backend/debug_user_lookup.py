import sys
from app.services.database import db

try:
    print("Testing Supabase Admin List Users...")
    if not db.admin_client:
        print("Error: db.admin_client is not initialized")
        sys.exit(1)

    email_to_find = "test_user_conflict@pixely.pe"
    
    # Supabase Python client usually exposes auth.admin.list_users
    # Check if we can filter or if we have to iterate
    print(f"Listing users to find {email_to_find}...")
    
    # Try generic list
    users_response = db.admin_client.auth.admin.list_users()
    # It returns a UserList object typically
    
    found_user = None
    for user in users_response:
        if user.email == email_to_find:
            found_user = user
            break
            
    if found_user:
        print(f"FOUND USER! ID: {found_user.id}")
    else:
        print("User NOT found in list.")

except Exception as e:
    print(f"Error: {e}")
