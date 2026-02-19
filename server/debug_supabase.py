
import os
from dotenv import load_dotenv
from supabase import create_client

# Load env from parent dir
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
public_key = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

print(f"URL: {url}")
print(f"Service Key present: {bool(key)}")
print(f"Public Key present: {bool(public_key)}")

if key:
    try:
        admin = create_client(url, key)
        print("Admin client created.")
        res = admin.table("testimonials").select("*", count="exact").execute()
        print(f"Admin: Testimonials count: {len(res.data)}")
        if len(res.data) > 0:
            print("Sample:", res.data[0])
            
        res_reviews = admin.table("reviews").select("*", count="exact").execute()
        print(f"Admin: Reviews count: {len(res_reviews.data)}")
    except Exception as e:
        print(f"Admin client error: {e}")

if public_key:
    try:
        public = create_client(url, public_key)
        print("Public client created.")
        res = public.table("testimonials").select("*", count="exact").execute()
        print(f"Public: Testimonials count: {len(res.data)}")
    except Exception as e:
        print(f"Public client error: {e}")
