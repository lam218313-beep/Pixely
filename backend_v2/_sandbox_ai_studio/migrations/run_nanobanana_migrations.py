"""
Execute NanoBanana migrations on Supabase
Run this script to create all necessary tables for the new image generation system
"""
import os
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found")
    print("   Make sure .env file exists with these variables")
    sys.exit(1)

# Create admin client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Migration files to execute (in order)
MIGRATIONS = [
    "migrations/002_create_brand_visual_dna.sql",
    "migrations/003_create_brand_image_bank.sql",
    "migrations/004_create_generation_templates.sql",
    "migrations/005_update_generated_images_for_nanobanana.sql",
]

def execute_migration(file_path: str):
    """Execute a single migration file"""
    print(f"\n📄 Executing: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    try:
        # Supabase doesn't have direct SQL execute via Python client
        # We need to use the REST API or the SQL editor
        # For now, print the SQL for manual execution
        print(f"   ⚠️  SQL migrations need to be executed via Supabase Dashboard SQL Editor")
        print(f"   📋 SQL content length: {len(sql)} characters")
        return True
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("🍌 NanoBanana Migrations")
    print("=" * 60)
    print(f"📡 Supabase URL: {SUPABASE_URL[:40]}...")
    print()
    
    print("⚠️  IMPORTANT: Supabase Python client doesn't support raw SQL execution.")
    print("   You need to execute these migrations via the Supabase Dashboard.")
    print()
    print("📋 Steps:")
    print("   1. Go to https://supabase.com/dashboard")
    print("   2. Select your project")
    print("   3. Go to SQL Editor")
    print("   4. Copy and paste each migration file content")
    print("   5. Run each one in order")
    print()
    
    print("📁 Migration files to execute (in order):")
    for i, migration in enumerate(MIGRATIONS, 1):
        file_path = Path(__file__).parent / migration
        if file_path.exists():
            print(f"   {i}. ✅ {migration}")
        else:
            print(f"   {i}. ❌ {migration} (NOT FOUND)")
    
    print()
    print("=" * 60)
    print("📝 Generating combined SQL for easy copy-paste...")
    print("=" * 60)
    
    combined_sql = []
    for migration in MIGRATIONS:
        file_path = Path(__file__).parent / migration
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                combined_sql.append(f"-- ========================================")
                combined_sql.append(f"-- FILE: {migration}")
                combined_sql.append(f"-- ========================================")
                combined_sql.append(f.read())
                combined_sql.append("")
    
    # Write combined SQL to a file
    output_file = Path(__file__).parent / "migrations" / "COMBINED_NANOBANANA_MIGRATIONS.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(combined_sql))
    
    print(f"\n✅ Combined SQL written to: {output_file}")
    print("   Copy this file's content to Supabase SQL Editor and run it.")
    print()
    
    # Also print summary
    print("📊 Summary:")
    print(f"   - Total migrations: {len(MIGRATIONS)}")
    print(f"   - Total SQL: {sum(len(s) for s in combined_sql)} characters")
    print()
    print("🎯 After running migrations, you'll have:")
    print("   - brand_visual_dna table")
    print("   - brand_image_bank table") 
    print("   - generation_templates table (with 6 default templates)")
    print("   - Updated generated_images table")
    print("   - Updated tasks table with generation_status")

if __name__ == "__main__":
    main()
