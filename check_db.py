
import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

if not supabase_key:
    print("Error: No Supabase key found.")
    exit(1)

async def check_db():
    print("Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        response = supabase.table("projects").select("*", count="exact").execute()
        print(f"Total Projects found: {len(response.data)}")
        for p in response.data:
            print(f"- {p.get('title')} ({p.get('status')})")
    except Exception as e:
        print(f"Error fetching projects: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
