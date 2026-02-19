
import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

async def check_schema():
    print("Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        # Try to insert a dummy project with client field to see if it fails
        # Actually, let's just try to select headers or use a specific query if possible.
        # But for 'projects', let's try to simple select and inspect keys if data exists.
        
        print("Checking 'projects' table columns via introspection (if possible) or dummy insert...")
        
        # Method 1: Insert dummy with client to see if it errors
        dummy = {
            "title": "Schema Test",
            "client": "Test Client",
            "status": "draft"
        }
        
        try:
            # We use 'dry run' essentially by intending to delete it immediately or relying on error
            print("Attempting to insert test record with 'client' field...")
            res = supabase.table("projects").insert(dummy).execute()
            print("✅ Insert successful! 'client' column exists.")
            
            # Cleanup
            if res.data:
                pid = res.data[0]['id']
                supabase.table("projects").delete().eq("id", pid).execute()
                print("Test record cleaned up.")
                
        except Exception as e:
            print(f"❌ Insert failed: {e}")
            if "column" in str(e) and "client" in str(e):
                print("Diagnosis: The 'client' column is MISSING from the 'projects' table.")
            elif "policy" in str(e):
                print("Diagnosis: RLS Policy violation. Check your policies.")
            else:
                print("Diagnosis: Unknown database error.")

    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
