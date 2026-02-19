
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def migrate():
    print("Checking 'testimonials' table...")
    try:
        # Fetch existing testimonials
        response = supabase.table("testimonials").select("*").execute()
        testimonials = response.data
        
        print(f"Found {len(testimonials)} records in 'testimonials'.")
        
        if not testimonials:
            print("No data to migrate.")
            return

        migrated_count = 0
        for item in testimonials:
            # Map fields to new schema
            # Old schema might have diverse fields, checking reviews.ts mapReviewRow for clues
            # reviews.ts checks: name, role, image_url/image, content/review/message, rating/stars, service_tag/project
            
            new_review = {
                "name": item.get("name") or "Anonymous",
                "role": item.get("role") or "Client",
                "company": item.get("company") or "", # Might not exist
                "content": item.get("content") or item.get("review") or item.get("message") or "",
                "rating": item.get("rating") or item.get("stars") or 5,
                "image_url": item.get("image_url") or item.get("image") or item.get("avatar_url"),
                "status": "live" # Default to live since they were visible
            }
            
            # Check if already exists? (Maybe by content match to avoid dupes if run twice)
            # For simplicity, just insert.
            
            try:
                supabase.table("reviews").insert(new_review).execute()
                print(f"Migrated: {new_review['name']}")
                migrated_count += 1
            except Exception as e:
                print(f"Failed to migrate {new_review['name']}: {e}")

        print(f"Migration complete. {migrated_count} records migrated.")

    except Exception as e:
        print(f"Error accessing 'testimonials' table: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
