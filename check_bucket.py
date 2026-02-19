
import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

async def check_bucket():
    print("Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        buckets = supabase.storage.list_buckets()
        print("Buckets found:")
        found = False
        for b in buckets:
            print(f"- {b.name}")
            if b.name == "cms-uploads":
                found = True
        
        if not found:
            print("\n❌ 'cms-uploads' bucket NOT found.")
        else:
            print("\n✅ 'cms-uploads' bucket exists.")
            
    except Exception as e:
        print(f"Error fetching buckets: {e}")

if __name__ == "__main__":
    asyncio.run(check_bucket())
