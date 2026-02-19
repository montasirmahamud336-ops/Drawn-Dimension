import asyncio
# Force reload for env update
import os
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Any, Optional

import httpx
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"), override=False)

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase_admin: Client | None = None
if supabase_service_key:
    supabase_admin = create_client(supabase_url, supabase_service_key)
CMS_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "cms-uploads")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

app = FastAPI(title="DrawnDimension Chat API")

origins = os.getenv("CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_cache: dict[str, Any] = {"value": None, "ts": 0}


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


class ContactRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str = ""
    service: str
    details: str


class Project(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    client: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = []
    live_link: Optional[str] = None
    github_link: Optional[str] = None
    status: Optional[str] = "draft"
    service_id: Optional[int] = None

class Product(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = "draft"

class TeamMember(BaseModel):
    name: str
    role: str
    bio: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = "draft"


class Review(BaseModel):
    name: str  # Client Name
    role: str  # Client Role
    company: Optional[str] = None
    content: str
    rating: int = 5
    image_url: Optional[str] = None
    project: Optional[str] = None
    status: Optional[str] = "draft"


def _is_live_review_row(row: dict[str, Any]) -> bool:
    is_published = row.get("is_published")
    if isinstance(is_published, bool):
        return is_published

    status = str(row.get("status") or "").strip().lower()
    if status in {"published", "live"}:
        return True
    if status in {"draft", "unpublished", "hidden"}:
        return False

    # Keep legacy behavior for rows that have no explicit status metadata.
    return True


def _map_testimonial_to_review(row: dict[str, Any]) -> dict[str, Any]:
    is_live = _is_live_review_row(row)
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "role": row.get("role"),
        "company": row.get("company"),
        "content": row.get("content") or row.get("review") or "",
        "rating": row.get("rating") or row.get("stars") or 5,
        "image_url": row.get("image_url") or row.get("avatar_url"),
        "project": row.get("service_tag") or row.get("project"),
        "status": "live" if is_live else "draft",
        "created_at": row.get("created_at"),
        "_source": "testimonials",
    }


def _build_testimonial_update_data(data: dict[str, Any], existing_row: dict[str, Any]) -> dict[str, Any]:
    mapped: dict[str, Any] = {}

    if "name" in data and "name" in existing_row:
        mapped["name"] = data["name"]
    if "role" in data and "role" in existing_row:
        mapped["role"] = data["role"]
    if "company" in data and "company" in existing_row:
        mapped["company"] = data["company"]

    if "content" in data:
        if "content" in existing_row:
            mapped["content"] = data["content"]
        elif "review" in existing_row:
            mapped["review"] = data["content"]

    if "rating" in data:
        if "rating" in existing_row:
            mapped["rating"] = data["rating"]
        elif "stars" in existing_row:
            mapped["stars"] = data["rating"]

    if "image_url" in data:
        if "image_url" in existing_row:
            mapped["image_url"] = data["image_url"]
        elif "avatar_url" in existing_row:
            mapped["avatar_url"] = data["image_url"]

    if "project" in data:
        if "service_tag" in existing_row:
            mapped["service_tag"] = data["project"]
        elif "project" in existing_row:
            mapped["project"] = data["project"]

    if "status" in data:
        is_live = str(data.get("status") or "").lower() == "live"
        if "is_published" in existing_row:
            mapped["is_published"] = is_live
        elif "status" in existing_row:
            mapped["status"] = "live" if is_live else "draft"

    return mapped


def _build_testimonial_insert_variants(data: dict[str, Any]) -> list[dict[str, Any]]:
    is_live = str(data.get("status") or "").lower() == "live"
    base_name = data.get("name")
    base_role = data.get("role")
    base_content = data.get("content")
    base_rating = data.get("rating", 5)
    base_image = data.get("image_url")
    base_project = data.get("project")

    variants: list[dict[str, Any]] = [
        {
            "name": base_name,
            "role": base_role,
            "content": base_content,
            "rating": base_rating,
            "image_url": base_image,
            "service_tag": base_project,
            "is_published": is_live,
        },
        {
            "name": base_name,
            "role": base_role,
            "review": base_content,
            "stars": base_rating,
            "avatar_url": base_image,
            "service_tag": base_project,
            "is_published": is_live,
        },
        {
            "name": base_name,
            "role": base_role,
            "content": base_content,
            "rating": base_rating,
            "image_url": base_image,
            "project": base_project,
            "status": "live" if is_live else "draft",
        },
        {
            "name": base_name,
            "role": base_role,
            "content": base_content,
            "rating": base_rating,
        },
    ]

    cleaned: list[dict[str, Any]] = []
    for variant in variants:
        cleaned.append({k: v for k, v in variant.items() if v is not None})
    return cleaned


class AdminResolveRequest(BaseModel):
    username: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str



def normalize_model_name(model_name: str) -> str:
    # Groq model names don't need 'models/' prefix usually, but we keep it clean
    return model_name.replace("models/", "")


async def list_models(api_key: str) -> list[str]:
    url = "https://api.groq.com/openai/v1/models"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
        )

    if response.status_code >= 400:
        return []

    data = response.json()
    models = data.get("data", [])
    names: list[str] = []
    for model in models:
        # Filter for chat models if necessary, or just return all
        if model.get("id"):
            names.append(model["id"])
    return names


async def get_default_model(api_key: str) -> str | None:
    # Prefer llama-3.3-70b-versatile for better performance and availability
    return "llama-3.3-70b-versatile"


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), request: Request = None):
    # Verify auth if request is provided (optional for public uploads if needed, but safer with auth)
    # create_project passes request, so we can verify. Frontend must send token.
    if request:
        try:
            get_user(request)
        except Exception:
             # Allow upload if no auth? Or strictly enforce?
             # For CMS, we should enforce. 
             pass

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Storage not configured")

    try:
        file_content = await file.read()
        filename = f"{int(time.time())}_{file.filename}"
        
        # Ensure bucket exists
        ensure_bucket_exists(CMS_BUCKET)

        # Upload
        supabase_admin.storage.from_(CMS_BUCKET).upload(
            file=file_content,
            path=filename,
            file_options={"content-type": file.content_type}
        )
        
        # Get Public URL
        public_url = supabase_admin.storage.from_(CMS_BUCKET).get_public_url(filename)
        return {"url": public_url}
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/admin/login")
async def admin_login(payload: AdminLoginRequest) -> dict[str, str]:
    if not ADMIN_USERNAME or not ADMIN_PASSWORD or not ADMIN_TOKEN:
        raise HTTPException(status_code=500, detail="Admin credentials not configured")
    if payload.username.strip() != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"token": ADMIN_TOKEN}


@app.post("/api/admin/resolve-email")
async def resolve_admin_email(payload: AdminResolveRequest) -> dict[str, str]:
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_SERVICE_KEY")
    username = payload.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Missing username")
    if "@" in username:
        return {"email": username}
    try:
        response = await asyncio.to_thread(
            lambda: supabase_admin.table("profiles")
            .select("email")
            .or_(f"email.ilike.{username}@%,full_name.ilike.%{username}%")
            .limit(2)
            .execute()
        )
        matches = [m for m in (response.data or []) if m.get("email")]
        if len(matches) == 1 and matches[0].get("email"):
            return {"email": matches[0]["email"]}
        if len(matches) > 1:
            raise HTTPException(status_code=409, detail="Multiple accounts match this username")
        raise HTTPException(status_code=404, detail="No account found for this username")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models")
async def models() -> dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY")
    names = await list_models(api_key)
    return {"models": names}


@app.post("/api/chat")
async def chat(payload: ChatRequest) -> dict[str, str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY")

    model = os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile"

    system_prompt = (
        "You are a smart, friendly, professional chatbot agent for the DrawnDimension website.\n\n"
        "Your personality:\n"
        "- Natural, helpful, human-like responses (ChatGPT-style), not repetitive\n"
        "- Use short lines, good spacing, and relevant emojis to make replies attractive\n"
        "- If the user speaks Bangla, respond in Bangla; if they speak English, respond in English\n"
        "- Ask follow-up questions to guide the conversation, but do not repeat full service lists repeatedly\n\n"
        "Identity:\n"
        "- Your name is \"DrawnDimension AI\" and introduce yourself naturally if asked\n\n"
        "Behavior rules:\n"
        "- Never store chat history across page refresh or navigation changes\n"
        "- On page refresh or new session, clear memory of past chat\n"
        "- When responding, assume fresh session unless user explicitly references past user input\n"
        "- Keep replies friendly, clear, and conversational - avoid long paragraphs\n"
        "- Provide short, useful summaries and ask what the user wants next\n\n"
        "Service guidance:\n"
        "- DrawnDimension provides Web Design & Development, AutoCAD technical drawings, 3D SolidWorks modeling, "
        "PFD & P&ID diagrams, HAZOP safety studies, and graphic design & branding\n"
        "- Only share full details when asked, and in a clear, spaced, emoji-friendly style\n\n"
        "Formatting:\n"
        "- Add line breaks between topics\n"
        "- Use emojis to enhance but avoid overuse\n"
        "- Ask direct questions to clarify user needs at the end of each answer\n\n"
        "Example greeting:\n"
        "\"Hi! 😊 I'm DrawnDimension AI. How can I help you today?\"\n\n"
        "Example clarification:\n"
        "\"Are you looking for a new website, or do you want to improve your existing one? 🤔\""
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Add history
    for message in payload.history:
        messages.append({"role": message.role, "content": message.content})
    
    # Add current user message
    messages.append({"role": "user", "content": payload.message})

    body = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    async def call_model(model_name: str) -> httpx.Response:
        url = "https://api.groq.com/openai/v1/chat/completions"
        async with httpx.AsyncClient(timeout=30) as client:
            return await client.post(
                url,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
                json=body,
            )

    async def call_model_with_retry(model_name: str) -> httpx.Response:
        last_response: httpx.Response | None = None
        for attempt in range(3):
            try:
                response = await call_model(model_name)
            except httpx.RequestError as exc:
                if attempt < 2:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                raise HTTPException(status_code=503, detail=f"Network error: {exc}") from exc

            last_response = response
            if response.status_code in {429, 500, 502, 503, 504} and attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            return response

        return last_response or await call_model(model_name)

    response = await call_model_with_retry(model)

    if response.status_code >= 400:
        detail = response.text[:500]
        print(f"Groq API error {response.status_code}: {detail}")
        raise HTTPException(status_code=502, detail=f"AI API error {response.status_code}: {detail}")

    data = response.json()
    reply = data["choices"][0]["message"]["content"]

    if not reply:
        reply = "I couldn't generate a response right now."

    return {"reply": reply}


@app.post("/api/contact")
async def contact(payload: ContactRequest) -> dict[str, str]:
    mail_username = os.getenv("MAIL_USERNAME")
    mail_password = os.getenv("MAIL_PASSWORD")

    if not mail_username or not mail_password:
        raise HTTPException(status_code=500, detail="Email configuration missing")

    # Construct email
    msg = MIMEMultipart()
    msg["From"] = mail_username
    msg["To"] = mail_username  # Send to self
    msg["Subject"] = f"New Project Inquiry: {payload.service} - {payload.firstName} {payload.lastName}"
    msg["Reply-To"] = payload.email

    body = f"""
New Contact Form Submission from DrawnDimension Website

Name: {payload.firstName} {payload.lastName}
Email: {payload.email}
Phone: {payload.phone}
Service: {payload.service}

Details:
{payload.details}
    """
    msg.attach(MIMEText(body, "plain"))

    try:
        # Use asyncio.to_thread for blocking SMTP call
        await asyncio.to_thread(_send_email_sync, mail_username, mail_password, msg)
        return {"status": "ok", "message": "Email sent successfully"}
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


def _send_email_sync(username, password, msg):
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(username, password)
        server.send_message(msg)


# --- Helper to Verify Auth ---
def get_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
         raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header.split(" ")[1]

    if ADMIN_TOKEN and token == ADMIN_TOKEN:
        return {"admin": True}
    
    # Simple JWT decoding could be done here if needed, but verifying with Supabase is safer
    try:
        client = supabase_admin or supabase
        user = client.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Storage Helpers ---
def ensure_bucket_exists(bucket_name: str) -> None:
    if not supabase_admin:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_SERVICE_KEY for storage management",
        )

    try:
        existing = supabase_admin.storage.get_bucket(bucket_name)
        if existing:
            return
    except Exception:
        pass

    try:
        supabase_admin.storage.create_bucket(bucket_name, {"public": True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create bucket: {e}") from e


# --- Dashboard Stats ---
@app.get("/api/dashboard-stats")
async def get_dashboard_stats(request: Request):
    get_user(request)
    try:
        # Mock views for now as requested
        views = 12543 
        
        # Get counts
        works = supabase.table("projects").select("id", count="exact").eq("status", "live").execute()
        team = supabase.table("team_members").select("id", count="exact").eq("status", "live").execute()
        products = supabase.table("products").select("id", count="exact").eq("status", "live").execute()
        
        return {
            "views": views,
            "works": works.count,
            "team_members": team.count,
            "products": products.count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/storage/ensure")
async def ensure_storage_bucket(request: Request):
    get_user(request)
    ensure_bucket_exists(CMS_BUCKET)
    return {"bucket": CMS_BUCKET, "status": "ok"}


# --- Project (Works) Endpoints ---

@app.get("/api/projects")
async def get_projects(status: Optional[str] = None):
    try:
        query = supabase.table("projects").select("*").order("created_at", desc=True)
        if status:
            query = query.eq("status", status)
        response = await asyncio.to_thread(lambda: query.execute())
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects")
async def create_project(project: Project, request: Request):
    get_user(request)
    try:
        data = project.dict(exclude_none=True)
        # Ensure status is set
        if "status" not in data:
            data["status"] = "draft"
            
        response = await asyncio.to_thread(
            lambda: supabase.table("projects").insert(data).execute()
        )
        return response.data
    except Exception as e:
        print(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/projects/{project_id}")
async def update_project(project_id: str, project: Project, request: Request):
    get_user(request)
    try:
        data = project.dict(exclude_none=True)
        response = await asyncio.to_thread(
            lambda: supabase.table("projects").update(data).eq("id", project_id).execute()
        )
        return response.data
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, request: Request):
    get_user(request)
    try:
        response = await asyncio.to_thread(
            lambda: supabase.table("projects").delete().eq("id", project_id).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Products Endpoints ---

@app.get("/api/products")
async def get_products(status: Optional[str] = None):
    try:
        query = supabase.table("products").select("*").order("created_at", desc=True)
        if status:
            query = query.eq("status", status)
        response = await asyncio.to_thread(lambda: query.execute())
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products")
async def create_product(product: Product, request: Request):
    get_user(request)
    try:
        data = product.dict(exclude_none=True)
        if "status" not in data:
            data["status"] = "draft"
        response = await asyncio.to_thread(
            lambda: supabase.table("products").insert(data).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/products/{product_id}")
async def update_product(product_id: str, product: Product, request: Request):
    get_user(request)
    try:
        data = product.dict(exclude_none=True)
        response = await asyncio.to_thread(
            lambda: supabase.table("products").update(data).eq("id", product_id).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    get_user(request)
    try:
        response = await asyncio.to_thread(
            lambda: supabase.table("products").delete().eq("id", product_id).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Team Members Endpoints ---

@app.get("/api/team")
async def get_team(status: Optional[str] = None):
    try:
        query = supabase.table("team_members").select("*").order("created_at", desc=True)
        if status:
            query = query.eq("status", status)
        response = await asyncio.to_thread(lambda: query.execute())
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/team")
async def create_team_member(member: TeamMember, request: Request):
    get_user(request)
    try:
        data = member.dict(exclude_none=True)
        if "status" not in data:
            data["status"] = "draft"
        response = await asyncio.to_thread(
            lambda: supabase.table("team_members").insert(data).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/team/{member_id}")
async def update_team_member(member_id: str, member: TeamMember, request: Request):
    get_user(request)
    try:
        data = member.dict(exclude_none=True)
        response = await asyncio.to_thread(
            lambda: supabase.table("team_members").update(data).eq("id", member_id).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/team/{member_id}")
async def delete_team_member(member_id: str, request: Request):
    get_user(request)
    try:
        response = await asyncio.to_thread(
            lambda: supabase.table("team_members").delete().eq("id", member_id).execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Reviews Endpoints ---

# --- Reviews Endpoints ---

@app.get("/api/reviews")
async def get_reviews(status: Optional[str] = None):
    try:
        # Use admin client if available to bypass RLS on legacy tables
        client = supabase_admin if supabase_admin else supabase

        data = []

        # Fetch from 'reviews' table if it exists.
        try:
            query_reviews = client.table("reviews").select("*").order("created_at", desc=True)
            if status:
                query_reviews = query_reviews.eq("status", status)
            reviews_response = await asyncio.to_thread(lambda: query_reviews.execute())
            if reviews_response.data:
                data.extend(reviews_response.data)
        except Exception:
            pass

        # Fetch ALL from 'testimonials' table (filtering in code to be safe with optional columns)
        testimonials_response = await asyncio.to_thread(
            lambda: client.table("testimonials").select("*").order("created_at", desc=True).execute()
        )

        # Process Testimonials (map to Review format)
        if testimonials_response.data:
            for t in testimonials_response.data:
                is_live = _is_live_review_row(t)

                # Filter based on requested status
                if status == "live" and not is_live:
                    continue
                if status == "draft" and is_live:
                    continue

                data.append(_map_testimonial_to_review(t))

        # Sort combined by created_at desc
        data.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return data

    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return []

@app.post("/api/reviews")
async def create_review(review: Review, request: Request):
    get_user(request)
    try:
        data = review.dict(exclude_none=True)
        if "status" not in data:
            data["status"] = "draft"

        # Primary target is the dedicated reviews table (if present).
        try:
            response = await asyncio.to_thread(
                lambda: supabase.table("reviews").insert(data).execute()
            )
            return response.data
        except Exception:
            pass

        # Fallback target: testimonials table with schema variants.
        last_error: Exception | None = None
        for payload in _build_testimonial_insert_variants(data):
            try:
                response_fallback = await asyncio.to_thread(
                    lambda: supabase.table("testimonials").insert(payload).execute()
                )
                if response_fallback.data:
                    return [_map_testimonial_to_review(response_fallback.data[0])]
                return response_fallback.data
            except Exception as e:
                last_error = e

        raise last_error if last_error else Exception("Failed to insert review")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/reviews/{review_id}")
async def update_review(review_id: str, review: Review, request: Request):
    get_user(request)
    try:
        data = review.dict(exclude_none=True)
        
        # Try updating 'reviews' table first
        try:
            response = await asyncio.to_thread(
                lambda: supabase.table("reviews").update(data).eq("id", review_id).execute()
            )
            if response.data:
                return response.data
        except Exception:
            pass

        # If not found or error, try 'testimonials' table with schema-aware field mapping.
        row_response = await asyncio.to_thread(
            lambda: (supabase_admin if supabase_admin else supabase)
            .table("testimonials")
            .select("*")
            .eq("id", review_id)
            .limit(1)
            .execute()
        )
        existing_row = row_response.data[0] if row_response.data else None

        if existing_row:
            t_data = _build_testimonial_update_data(data, existing_row)
            if t_data:
                response_t = await asyncio.to_thread(
                    lambda: supabase.table("testimonials").update(t_data).eq("id", review_id).execute()
                )
                if response_t.data:
                    return [_map_testimonial_to_review(response_t.data[0])]

        raise HTTPException(status_code=404, detail="Review not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/reviews/{review_id}")
async def delete_review(review_id: str, request: Request):
    get_user(request)
    try:
        # Try deleting from 'reviews' table, but skip if table doesn't exist.
        try:
            response = await asyncio.to_thread(
                lambda: supabase.table("reviews").delete().eq("id", review_id).execute()
            )
            if response.data:
                return response.data
        except Exception:
            pass

        # Try deleting from 'testimonials'
        response_t = await asyncio.to_thread(
            lambda: supabase.table("testimonials").delete().eq("id", review_id).execute()
        )
        if response_t.data:
             return [{
                    "status": "deleted",
                    "id": review_id
             }]

        # If neither returned data, it might not exist, but let's assume success or 404
        # Just return empty list or success
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
