
import os
import asyncio
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def list_tables():
    result = {}
    tables = ["testimonials", "reviews", "projects", "products", "team_members", "profiles"] 
    
    for table in tables:
        try:
            response = supabase.table(table).select("*", count="exact").execute()
            result[table] = {
                "count": len(response.data),
                "sample": response.data[0] if response.data else None
            }
        except Exception as e:
            result[table] = {"error": str(e)}

    with open("tables_dump.json", "w") as f:
        json.dump(result, f, indent=2, default=str)
    print("Dumped to tables_dump.json")

if __name__ == "__main__":
    asyncio.run(list_tables())
