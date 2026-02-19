
import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

if not supabase_key:
    print("Error: No Supabase key found in .env variable (SUPABASE_SERVICE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY).")
    exit(1)
    # Fallback to checking if the user has a service key in .env, otherwise we might fail on RLS if using anon key
    # But usually migrations are run via SQL editor. Here we are trying to simulate it.
    # Actually, we can't easily run DDL via client unless we use the Postgres connection or specific RPCs.
    # However, for the purpose of this environment, we might have to ask the user to run it, 
    # OR we can try to use the 'postgres' connection if available.
    # Given the constraints, I will try to use the Python client to insert the data (DML), 
    # but DDL (creating buckets) might be tricky if not enabled via API.
    # Wait, the bucket creation is in a keyed migration file. 
    # If I can't run it, I'll instruct the user. 
    # BUT, I can try to use the raw SQL via a helper if the backend allows it.
    # The server/main.py uses the client.
    pass

async def run_seed():
    print("Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)
    
    # We will read the seed.sql and parse inserts
    # Only useful if we can execute raw SQL. The JS/Python client usually doesn't support raw SQL for security.
    # ALTERNATIVE: Use the `bucket.create` method from the client for the bucket issue.
    
    print("Attempting to create bucket via API...")
    try:
        # It's 'create_bucket' in some versions, or via storage.create_bucket
        res = supabase.storage.create_bucket("cms-uploads", options={"public": True})
        print(f"Bucket creation response: {res}")
    except Exception as e:
        print(f"Bucket creation failed (might already exist): {e}")

    # Now let's seed data using standard inserts
    print("Seeding Projects...")
    projects = [
        {
            "title": 'Industrial Plant 3D Model',
            "description": 'Complete SolidWorks 3D model of a petrochemical processing facility with detailed equipment layouts.',
            "image_url": 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
            "category": 'CAD & 3D',
            "tags": ['solidworks', '3d-modeling', 'industrial'],
            "status": 'live',
            "client": "PETROGLOBAL INDUSTRIES",
            "live_link": "#"
        },
        {
            "title": 'Tech Startup Platform',
            "description": 'Modern SaaS platform with interactive features, dashboard analytics, and seamless user experience.',
            "image_url": 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
            "category": 'Web Design',
            "tags": ['react', 'dashboard', 'saas'],
            "status": 'live',
            "client": "INNOVATETECH SOLUTIONS",
            "live_link": "#"
        },
        {
            "title": 'Refinery P&ID Documentation',
            "description": 'Comprehensive piping and instrumentation diagrams for a 50,000 bpd oil refinery expansion project.',
            "image_url": 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
            "category": 'Engineering',
            "tags": ['autocad', 'pjd', 'piping'],
            "status": 'live',
            "client": "GULF REFINING CORP",
            "live_link": "#"
        },
        {
            "title": 'Corporate Brand Identity',
            "description": 'Complete visual identity system including logo, color palette, and brand guidelines for a Fortune 500 company.',
            "image_url": 'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&h=600&fit=crop',
            "category": 'Branding',
            "tags": ['branding', 'identity', 'design'],
            "status": 'live',
            "client": "NEXUS FINANCIAL GROUP",
            "live_link": "#"
        },
        {
            "title": 'AutoCAD Manufacturing Layout',
            "description": 'Detailed 2D technical drawings and equipment layouts for a pharmaceutical manufacturing facility.',
            "image_url": 'https://images.unsplash.com/photo-1581092336363-231a4030612c?w=800&h=600&fit=crop',
            "category": 'CAD & 3D',
            "tags": ['autocad', 'manufacturing', 'layout'],
            "status": 'live',
            "client": "PHARMATECH MANUFACTURING",
            "live_link": "#"
        },
        {
            "title": 'E-commerce Platform',
            "description": 'Full-stack e-commerce solution with payment integration, inventory management, and analytics dashboard.',
            "image_url": 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
            "category": 'Web Design',
            "tags": ['ecommerce', 'fullstack', 'retail'],
            "status": 'live',
            "client": "GLOBALMART RETAIL",
            "live_link": "#"
        }
    ]
    
    for p in projects:
        try:
            supabase.table("projects").insert(p).execute()
        except Exception as e:
            print(f"Error inserting project {p['title']}: {e}")

    print("Seeding Products...")
    products = [
        {
            "name": 'Premium Portfolio Theme',
            "description": 'A sleek, high-performance React portfolio template for creatives.',
            "price": 49.99,
            "image_url": 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=600&fit=crop',
            "category": 'Custom Code',
            "status": 'live'
        },
        {
            "name": 'AutoCAD Library Bundle',
            "description": 'A comprehensive collection of 500+ standard engineering blocks and symbols.',
            "price": 29.99,
            "image_url": 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&h=600&fit=crop',
            "category": 'Engineering',
            "status": 'live'
        }
    ]
    
    for p in products:
        try:
             supabase.table("products").insert(p).execute()
        except Exception as e:
             print(f"Error inserting product {p['name']}: {e}")
             
    print("Seed Complete.")

if __name__ == "__main__":
    asyncio.run(run_seed())
