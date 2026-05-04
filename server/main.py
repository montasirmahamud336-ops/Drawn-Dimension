import asyncio
# Force reload for env update
import base64
import hashlib
import hmac
import json
import os
import re
import time
import smtplib
from difflib import SequenceMatcher
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from server.app.config import settings
from server.app.routes.auth_webhooks import router as auth_webhooks_router
from server.app.services.database import (
    count_records,
    delete_record_by_id,
    fetch_all,
    fetch_one,
    insert_record,
    is_database_configured,
    select_records,
    table_exists,
    update_record_by_id,
)
from server.app.services.media_storage import (
    ensure_media_bucket,
    normalize_object_path,
    store_uploaded_file,
)

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"), override=False)

CMS_BUCKET = settings.storage_bucket
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
USER_AUTH_TOKEN = os.getenv("USER_AUTH_TOKEN", "") or ADMIN_TOKEN

app = FastAPI(title="DrawnDimension Chat API")

origins = os.getenv("CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_webhooks_router)

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
    country: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = "draft"


class Review(BaseModel):
    name: str  # Client Name
    role: str  # Client Role
    company: Optional[str] = None
    country: Optional[str] = None
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
        "country": row.get("country"),
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
    if "country" in data and "country" in existing_row:
        mapped["country"] = data["country"]

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
    base_country = data.get("country")

    variants: list[dict[str, Any]] = [
        {
            "name": base_name,
            "role": base_role,
            "content": base_content,
            "rating": base_rating,
            "image_url": base_image,
            "service_tag": base_project,
            "country": base_country,
            "is_published": is_live,
        },
        {
            "name": base_name,
            "role": base_role,
            "review": base_content,
            "stars": base_rating,
            "avatar_url": base_image,
            "service_tag": base_project,
            "country": base_country,
            "is_published": is_live,
        },
        {
            "name": base_name,
            "role": base_role,
            "content": base_content,
            "rating": base_rating,
            "image_url": base_image,
            "project": base_project,
            "country": base_country,
            "status": "live" if is_live else "draft",
        },
        {
            "name": base_name,
            "role": base_role,
            "content": base_content,
            "rating": base_rating,
            "country": base_country,
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


def _contains_bangla(text: str) -> bool:
    return any("\u0980" <= ch <= "\u09FF" for ch in text)


def _prefers_bangla_reply(text: str) -> bool:
    if _contains_bangla(text):
        return True

    normalized = f" {_normalize_lookup_text(text)} "
    banglish_hints = (
        " ke ",
        " koi ",
        " kothay ",
        " kobe ",
        " kivabe ",
        " ki ",
        " koro ",
        " koren ",
        " ache ",
        " dao ",
        " bolo ",
        " bolen ",
        " malik ",
        " shuru ",
        " team e ",
    )
    return any(hint in normalized for hint in banglish_hints)


def _normalize_lookup_text(text: str) -> str:
    lowered = str(text or "").lower().replace("&", " and ")
    cleaned = re.sub(r"[^a-z0-9\u0980-\u09ff]+", " ", lowered)
    return " ".join(cleaned.split())


def _tokenize_lookup_text(text: str) -> tuple[str, ...]:
    normalized = _normalize_lookup_text(text)
    return tuple(token for token in normalized.split() if token)


COMPANY_FACT_LOOKUP: tuple[dict[str, Any], ...] = (
    {
        "id": "ceo",
        "group": "leadership",
        "keywords": (
            "ceo",
            "chief executive officer",
            "company ceo",
            "drawn dimension ceo",
            "owner",
            "company owner",
            "founder",
            "boss",
            "head of company",
            "who runs drawn dimension",
            "who is in charge",
            "owner ke",
            "ceo ke",
            "boss ke",
            "malik",
            "সিইও",
            "মালিক",
        ),
        "reply_en": "The CEO of Drawn Dimension is Faisal Piyash.",
        "reply_bn": "Drawn Dimension-এর CEO হলেন Faisal Piyash।",
        "context": "Leadership: The CEO of Drawn Dimension is Faisal Piyash.",
        "threshold": 4.0,
    },
    {
        "id": "cto",
        "group": "leadership",
        "keywords": (
            "cto",
            "chief technical officer",
            "technical head",
            "technology head",
            "tech lead",
            "cto ke",
            "টেকনিক্যাল অফিসার",
        ),
        "reply_en": "The CTO of Drawn Dimension is Muhammad Muntasir Mahamud.",
        "reply_bn": "Drawn Dimension-এর CTO হলেন Muhammad Muntasir Mahamud।",
        "context": "Leadership: The CTO of Drawn Dimension is Muhammad Muntasir Mahamud.",
        "threshold": 4.0,
    },
    {
        "id": "cmo",
        "group": "leadership",
        "keywords": (
            "cmo",
            "chief marketing officer",
            "marketing head",
            "marketing officer",
            "cmo ke",
            "মার্কেটিং অফিসার",
        ),
        "reply_en": "The CMO of Drawn Dimension is Mafruza Khanam Prottassha.",
        "reply_bn": "Drawn Dimension-এর CMO হলেন Mafruza Khanam Prottassha।",
        "context": "Leadership: The CMO of Drawn Dimension is Mafruza Khanam Prottassha.",
        "threshold": 4.0,
    },
    {
        "id": "leadership_team",
        "group": "team",
        "keywords": (
            "leadership team",
            "leadership",
            "leaders",
            "management team",
            "team members",
            "employee team",
            "staff",
            "employees",
            "our team",
            "team",
            "leadership kara",
            "team e ke ke ache",
            "টিম",
            "কর্মী",
            "এমপ্লয়ি",
        ),
        "reply_en": (
            "Leadership team:\n"
            "- CEO: Faisal Piyash\n"
            "- CTO: Muhammad Muntasir Mahamud\n"
            "- CMO: Mafruza Khanam Prottassha\n"
            "Employee team:\n"
            "- Sohel Rana, Process Engineer\n"
            "- Abidur Rahman, Mechanical Engineer\n"
            "- Md. Ashadu Hinu Sabbir, Graphics Design\n"
            "- Alif Anam, Web Design\n"
            "- Monir sahriyar, Process Engineer"
        ),
        "reply_bn": (
            "Leadership team:\n"
            "- CEO: Faisal Piyash\n"
            "- CTO: Muhammad Muntasir Mahamud\n"
            "- CMO: Mafruza Khanam Prottassha\n"
            "Employee team:\n"
            "- Sohel Rana, Process Engineer\n"
            "- Abidur Rahman, Mechanical Engineer\n"
            "- Md. Ashadu Hinu Sabbir, Graphics Design\n"
            "- Alif Anam, Web Design\n"
            "- Monir sahriyar, Process Engineer"
        ),
        "context": (
            "Leadership team: CEO Faisal Piyash, CTO Muhammad Muntasir Mahamud, "
            "CMO Mafruza Khanam Prottassha. Employees include Sohel Rana, "
            "Abidur Rahman, Md. Ashadu Hinu Sabbir, Alif Anam, and Monir sahriyar."
        ),
        "threshold": 5.0,
    },
    {
        "id": "contact",
        "group": "contact",
        "keywords": (
            "contact",
            "contact info",
            "contact details",
            "how to contact",
            "reach you",
            "reach out",
            "email",
            "mail",
            "gmail",
            "whatsapp",
            "phone",
            "number",
            "mobile number",
            "call you",
            "message you",
            "যোগাযোগ",
            "কন্টাক্ট",
            "ইমেইল",
            "হোয়াটসঅ্যাপ",
            "নাম্বার",
        ),
        "reply_en": (
            "Official contact details:\n"
            "- Email: drawndimensioninfo@gmail.com\n"
            "- WhatsApp: +880 1775-119416\n"
            "- Location: Dhaka, Bangladesh\n"
            "- Business hours: 9:00 AM - 6:00 PM, Sunday to Thursday\n"
            "- Contact page: /contact"
        ),
        "reply_bn": (
            "Official contact details:\n"
            "- Email: drawndimensioninfo@gmail.com\n"
            "- WhatsApp: +880 1775-119416\n"
            "- Location: Dhaka, Bangladesh\n"
            "- Business hours: 9:00 AM - 6:00 PM, Sunday to Thursday\n"
            "- Contact page: /contact"
        ),
        "context": (
            "Contact info: Email drawndimensioninfo@gmail.com, WhatsApp +880 1775-119416, "
            "location Dhaka, Bangladesh, business hours 9:00 AM - 6:00 PM Sunday to Thursday, "
            "contact page /contact."
        ),
        "threshold": 4.0,
    },
    {
        "id": "location",
        "group": "contact",
        "keywords": (
            "location",
            "address",
            "where are you",
            "where located",
            "office location",
            "based in",
            "from where",
            "office koi",
            "kothay",
            "ঠিকানা",
            "লোকেশন",
            "কোথায়",
        ),
        "reply_en": "Drawn Dimension is based in Dhaka, Bangladesh and serves clients worldwide.",
        "reply_bn": "Drawn Dimension Dhaka, Bangladesh-এ based এবং worldwide client-এর সাথে কাজ করে।",
        "context": "Location: Drawn Dimension is based in Dhaka, Bangladesh and offers global service.",
        "threshold": 4.0,
    },
    {
        "id": "hours",
        "group": "contact",
        "keywords": (
            "business hours",
            "working hours",
            "office hours",
            "opening hours",
            "open time",
            "close time",
            "office time",
            "koyta theke koyta",
            "office time ki",
            "business time",
            "সময়",
            "অফিস টাইম",
            "কয়টা থেকে",
        ),
        "reply_en": "Business hours are 9:00 AM to 6:00 PM, Sunday to Thursday.",
        "reply_bn": "Business hours হলো সকাল 9:00 AM থেকে 6:00 PM, Sunday to Thursday।",
        "context": "Business hours: 9:00 AM - 6:00 PM, Sunday to Thursday.",
        "threshold": 4.0,
    },
    {
        "id": "services",
        "group": "services",
        "keywords": (
            "services",
            "service list",
            "what do you do",
            "what do you offer",
            "what services",
            "offerings",
            "ki service",
            "ki ki koro",
            "ki offer koro",
            "সার্ভিস",
            "সেবা",
        ),
        "reply_en": (
            "Drawn Dimension offers Web Design & Development, Graphic Design & Branding, "
            "Process Flow Diagram (PFD), Piping and Instrumentation Diagram (P&ID), "
            "AutoCAD Technical Drawing, 3D SolidWorks Modeling, HAZOP Study & Risk Analysis, "
            "and small tools development and sales."
        ),
        "reply_bn": (
            "Drawn Dimension provides Web Design & Development, Graphic Design & Branding, "
            "PFD, P&ID, AutoCAD Technical Drawing, 3D SolidWorks Modeling, HAZOP Study & Risk Analysis, "
            "and small tools development and sales."
        ),
        "context": (
            "Core services: Web Design & Development, Graphic Design & Branding, Process Flow Diagram (PFD), "
            "Piping and Instrumentation Diagram (P&ID), AutoCAD Technical Drawing, 3D SolidWorks Modeling, "
            "HAZOP Study & Risk Analysis, and small tools development and sales."
        ),
        "threshold": 4.0,
    },
    {
        "id": "history",
        "group": "history",
        "keywords": (
            "when did you start",
            "when started",
            "company history",
            "journey",
            "timeline",
            "milestones",
            "origin story",
            "kobe start",
            "kokhon start",
            "kobe shuru",
            "history",
            "শুরু",
            "কখন শুরু",
            "ইতিহাস",
        ),
        "reply_en": (
            "Drawn Dimension started in 2022 with web design, added graphic design, PFD, P&ID, "
            "and AutoCAD technical drawing services in 2024, then expanded into 3D SolidWorks "
            "and small tools in 2025."
        ),
        "reply_bn": (
            "Drawn Dimension 2022 সালে web design দিয়ে শুরু করে, 2024 সালে graphic design, PFD, P&ID, "
            "আর AutoCAD services add করে, আর 2025 সালে 3D SolidWorks ও small tools-এ expand করে।"
        ),
        "context": (
            "Timeline: Started with web design in 2022, expanded into graphic design, PFD, P&ID, "
            "and AutoCAD services in 2024, and added 3D SolidWorks plus small tools in 2025."
        ),
        "threshold": 4.0,
    },
    {
        "id": "mission",
        "group": "mission",
        "keywords": (
            "mission",
            "vision",
            "core values",
            "company values",
            "why choose",
            "what drives you",
            "motive",
            "mission vision",
            "মিশন",
            "ভিশন",
            "ভ্যালু",
        ),
        "reply_en": (
            "Mission: Deliver every client project with clean execution, accurate technical detail, and dependable quality. "
            "Vision: Become a trusted leader in integrated engineering and creative services. "
            "Core values: Precision, Innovation, Collaboration, and Excellence."
        ),
        "reply_bn": (
            "Mission: প্রতিটি client project clean execution, accurate technical detail, আর dependable quality দিয়ে deliver করা। "
            "Vision: integrated engineering ও creative services-এ trusted leader হওয়া। "
            "Core values: Precision, Innovation, Collaboration, Excellence."
        ),
        "context": (
            "Mission: clean execution, accurate technical detail, dependable quality. "
            "Vision: trusted leader in integrated engineering and creative services. "
            "Core values: Precision, Innovation, Collaboration, Excellence."
        ),
        "threshold": 4.0,
    },
    {
        "id": "products",
        "group": "products",
        "keywords": (
            "products",
            "product categories",
            "what products",
            "digital products",
            "tools",
            "python tools",
            "ecommerce website",
            "wordpress website",
            "products page",
            "product ki",
            "প্রোডাক্ট",
            "টুলস",
        ),
        "reply_en": (
            "Drawn Dimension's main product focus is ready-to-use digital solutions and tools. "
            "Website product categories include WordPress Website, E-commerce Website, Portfolio Website, "
            "Realstate Website, and Python Tools. Products page: /products."
        ),
        "reply_bn": (
            "Drawn Dimension-এর main product focus হলো ready-to-use digital solutions and tools. "
            "Product categories include WordPress Website, E-commerce Website, Portfolio Website, "
            "Realstate Website, and Python Tools. Products page: /products."
        ),
        "context": (
            "Products: ready-to-use digital solutions and tools. Categories include WordPress Website, "
            "E-commerce Website, Portfolio Website, Realstate Website, and Python Tools. Products page /products."
        ),
        "threshold": 4.0,
    },
    {
        "id": "portfolio",
        "group": "portfolio",
        "keywords": (
            "portfolio",
            "our works",
            "previous work",
            "past work",
            "examples",
            "case studies",
            "work samples",
            "show work",
            "portfolio koi",
            "কাজ",
            "পোর্টফোলিও",
        ),
        "reply_en": "You can explore previous work and project examples on the portfolio page: /portfolio.",
        "reply_bn": "Previous work আর project examples দেখতে portfolio page-এ যাও: /portfolio.",
        "context": "Portfolio page: /portfolio for previous work and project examples.",
        "threshold": 4.0,
    },
)


def _score_lookup_keyword(normalized_query: str, query_tokens: tuple[str, ...], keyword: str) -> float:
    normalized_keyword = _normalize_lookup_text(keyword)
    if not normalized_keyword:
        return 0.0

    if normalized_keyword in normalized_query:
        return 7.0 + float(len(normalized_keyword.split()))

    keyword_tokens = normalized_keyword.split()
    if not keyword_tokens:
        return 0.0

    match_score = 0.0
    for keyword_token in keyword_tokens:
        if keyword_token in query_tokens:
            match_score += 1.0
            continue

        if len(keyword_token) < 4:
            continue

        for query_token in query_tokens:
            if len(query_token) < 4:
                continue
            if SequenceMatcher(None, keyword_token, query_token).ratio() >= 0.88:
                match_score += 0.7
                break

    required_score = 1.0 if len(keyword_tokens) == 1 else max(1.6, len(keyword_tokens) * 0.7)
    if match_score >= required_score:
        return match_score * 2.5

    return 0.0


def _match_company_facts(message: str) -> list[dict[str, Any]]:
    normalized_query = _normalize_lookup_text(message)
    query_tokens = _tokenize_lookup_text(message)
    if not normalized_query or not query_tokens:
        return []

    matches: list[dict[str, Any]] = []
    for item in COMPANY_FACT_LOOKUP:
        best_score = max(
            (_score_lookup_keyword(normalized_query, query_tokens, keyword) for keyword in item["keywords"]),
            default=0.0,
        )
        if best_score >= float(item.get("threshold", 4.0)):
            matches.append({"score": best_score, "item": item})

    matches.sort(key=lambda entry: entry["score"], reverse=True)
    return matches


def build_relevant_company_context(message: str, limit: int = 4) -> str:
    sections: list[str] = []
    used_groups: set[str] = set()

    for match in _match_company_facts(message):
        item = match["item"]
        group = str(item.get("group") or item["id"])
        if group in used_groups:
            continue
        used_groups.add(group)
        sections.append(f"- {item['context']}")
        if len(sections) >= limit:
            break

    return "\n".join(sections)


def get_company_fact_reply(message: str) -> str | None:
    is_bangla = _prefers_bangla_reply(message)
    responses: list[str] = []
    used_groups: set[str] = set()

    for match in _match_company_facts(message):
        item = match["item"]
        group = str(item.get("group") or item["id"])
        if group in used_groups:
            continue
        used_groups.add(group)
        responses.append(item["reply_bn"] if is_bangla else item["reply_en"])
        if len(responses) >= 3:
            break

    if responses:
        return "\n\n".join(responses)

    return None


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
            pass

    try:
        file_content = await file.read()
        ext = re.sub(r"[^A-Za-z0-9]", "", (os.path.splitext(file.filename or "")[1].lstrip("."))) or "bin"
        filename = normalize_object_path(f"misc/{int(time.time())}_{file.filename}", ext)
        saved = await asyncio.to_thread(
            store_uploaded_file,
            buffer=file_content,
            object_path=filename,
            bucket_name=CMS_BUCKET,
        )
        return {"url": saved["public_url"]}
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
    if not is_database_configured():
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")
    username = payload.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Missing username")
    if "@" in username:
        return {"email": username}
    try:
        rows = await asyncio.to_thread(
            fetch_all,
            """
            select email
            from public.profiles
            where email ilike %s or full_name ilike %s
            order by created_at desc nulls last
            limit 3
            """,
            (f"{username}@%", f"%{username}%"),
        )
        matches = [m for m in rows if m.get("email")]
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

    fact_reply = get_company_fact_reply(payload.message)
    if fact_reply:
        return {"reply": fact_reply}

    relevant_company_context = build_relevant_company_context(payload.message)

    company_knowledge = (
        "Company identity:\n"
        "- Brand: Drawn Dimension\n"
        "- Positioning: Premium engineering, design, and digital solutions company\n"
        "- Started in: 2022\n"
        "- Origin story: Started with web design in 2022 and expanded into engineering, 3D, and product-focused work based on client needs\n"
        "- Delivery focus: clean execution, accurate technical detail, and client-ready handover\n"
        "- Global service: The company works with clients worldwide from Dhaka, Bangladesh\n\n"
        "Official contact info:\n"
        "- Email: drawndimensioninfo@gmail.com\n"
        "- Response time: usually within 24 hours\n"
        "- WhatsApp: +880 1775-119416\n"
        "- WhatsApp link: https://wa.me/8801775119416\n"
        "- Location: Dhaka, Bangladesh\n"
        "- Business hours: 9:00 AM - 6:00 PM, Sunday to Thursday\n\n"
        "Website pages and navigation:\n"
        "- Home: /\n"
        "- About: /about\n"
        "- Services: /services\n"
        "- Our Works / Portfolio: /portfolio\n"
        "- Products: /products\n"
        "- Reviews: /testimonials\n"
        "- FAQ: /faq\n"
        "- Contact: /contact\n"
        "- Dashboard: /dashboard\n\n"
        "Company timeline and milestones:\n"
        "- 2022: Started with modern web design services\n"
        "- 2024: Added graphic design, PFD, P&ID, and AutoCAD technical drawing services\n"
        "- 2025: Added 3D SolidWorks workflows\n"
        "- 2025: Started building and selling small tools\n"
        "- Today: Focused on clean, accurate, premium project delivery\n\n"
        "Core services:\n"
        "- Web Design & Development\n"
        "- Graphic Design & Branding\n"
        "- Process Flow Diagram (PFD)\n"
        "- Piping and Instrumentation Diagram (P&ID)\n"
        "- AutoCAD Technical Drawing\n"
        "- 3D SolidWorks Modeling\n"
        "- HAZOP Study & Risk Analysis\n"
        "- Small tools development and sales\n\n"
        "What the company does:\n"
        "- Builds clean, responsive websites focused on communication and conversion\n"
        "- Creates brand-focused graphic design assets\n"
        "- Produces accurate technical drawings and documentation for practical execution\n"
        "- Develops detailed 3D models for validation, clarity, and planning\n"
        "- Builds and sells practical small tools with reliability and value in mind\n\n"
        "Mission, vision, and values:\n"
        "- Mission: Submit every client project with clean execution, accurate technical detail, and dependable quality from concept to final delivery\n"
        "- Vision: Be a trusted leader in integrated engineering and creative services, known for precision, reliability, and long-term client success\n"
        "- Core values: Precision, Innovation, Collaboration, Excellence\n\n"
        "Leadership team:\n"
        "- Faisal Piyash: Chief Executive Officer (CEO)\n"
        "- Muhammad Muntasir Mahamud: Chief Technical Officer (CTO)\n"
        "- Mafruza Khanam Prottassha: Chief Marketing Officer (CMO)\n\n"
        "Employee team:\n"
        "- Sohel Rana: Process Engineer\n"
        "- Abidur Rahman: Mechanical Engineer\n"
        "- Md. Ashadu Hinu Sabbir: Graphics Design\n"
        "- Alif Anam: Web Design\n"
        "- Monir sahriyar: Process Engineer\n\n"
        "Helpful FAQ facts:\n"
        "- The company provides web design, graphic design, PFD/P&ID, AutoCAD drawing, SolidWorks 3D modeling, and small tools development and sales\n"
        "- The team started in 2022 and expanded into engineering and product-focused services from 2024 onward\n"
        "- The company delivers client-ready files and practical project handover\n"
        "- Clients can discuss requirements, scope, timeline, and delivery format through the contact page or WhatsApp before starting\n\n"
        "Products and categories:\n"
        "- Main product focus: ready-to-use digital solutions and tools\n"
        "- Website product categories: WordPress Website, E-commerce Website, Portfolio Website, Realstate Website, Python Tools\n"
        "- Products page: /products\n"
    )

    system_prompt = (
        "You are NEMO AI assistant of Drawn Dimension.\n\n"
        "Primary goal:\n"
        "- Give professional, accurate, and helpful replies about the company, services, products, and contact process.\n\n"
        "Language rules:\n"
        "- If user writes Bangla, reply in Bangla.\n"
        "- If user writes English, reply in English.\n"
        "- If user mixes both, use the dominant language naturally.\n\n"
        "Tone and style:\n"
        "- Professional, respectful, concise, and human.\n"
        "- No slang and no decorative emoji.\n"
        "- Use short paragraphs or bullet points for clarity.\n"
        "- End with one clear next-step question when useful.\n\n"
        "Company knowledge to use:\n"
        f"{company_knowledge}\n"
        "Behavior instructions:\n"
        "- Before answering, check whether the question is about leadership, contact info, location, business hours, services, history, mission, team, products, or portfolio.\n"
        "- If the answer exists in the company knowledge or relevant company context, answer directly and never say the information is unavailable.\n"
        "- If user asks about the company, summarize the company identity, story, timeline, and delivery focus from the knowledge above.\n"
        "- If user asks about services, list the relevant services and briefly explain the best fit.\n"
        "- If user asks about products, explain the product focus and categories, then direct them to /products.\n"
        "- If user asks about contact info, provide email, WhatsApp, location, business hours, response time, and /contact.\n"
        "- If user asks about the CEO, CTO, CMO, leadership, or employees, provide the exact names and roles from the knowledge block.\n"
        "- If user asks about mission, vision, values, or company history, answer from the knowledge block in a concise way.\n"
        "- If user asks to see previous work or examples, provide /portfolio.\n"
        "- If user asks for reviews or testimonials, provide /testimonials.\n"
        "- If user asks something unknown, say you can connect them to the human team via email or WhatsApp.\n"
        "- Never invent pricing, exact delivery promises, addresses, names, or capabilities that are not in the knowledge block.\n"
    )

    messages = [{"role": "system", "content": system_prompt}]
    if relevant_company_context:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Most relevant company facts for this query:\n"
                    f"{relevant_company_context}\n"
                    "Use these facts directly if they answer the question."
                ),
            }
        )
    
    # Add history
    for message in payload.history:
        messages.append({"role": message.role, "content": message.content})
    
    # Add current user message
    messages.append({"role": "user", "content": payload.message})

    body = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
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


def _decode_base64url_json(segment: str) -> dict[str, Any]:
    padded = segment + "=" * ((4 - len(segment) % 4) % 4)
    decoded = base64.urlsafe_b64decode(padded.encode("utf-8"))
    parsed = json.loads(decoded.decode("utf-8"))
    return parsed if isinstance(parsed, dict) else {}


def _verify_hs256_jwt(token: str, secret: str) -> dict[str, Any] | None:
    if not token or not secret:
        return None

    parts = token.split(".")
    if len(parts) != 3:
        return None

    header_segment, payload_segment, signature_segment = parts
    try:
        header = _decode_base64url_json(header_segment)
        payload = _decode_base64url_json(payload_segment)
    except Exception:
        return None

    if str(header.get("alg") or "").upper() != "HS256":
        return None

    signed = f"{header_segment}.{payload_segment}".encode("utf-8")
    expected_signature = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).digest()
    ).decode("utf-8").rstrip("=")

    if not hmac.compare_digest(expected_signature, signature_segment):
        return None

    exp = payload.get("exp")
    if exp is not None:
        try:
            if float(exp) <= time.time():
                return None
        except Exception:
            return None

    return payload


def _require_database() -> None:
    if not is_database_configured():
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")


# --- Helper to Verify Auth ---
def get_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
         raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header.split(" ")[1]

    if ADMIN_TOKEN and token == ADMIN_TOKEN:
        return {"admin": True}

    admin_payload = _verify_hs256_jwt(token, ADMIN_TOKEN)
    if admin_payload and str(admin_payload.get("username") or "").strip():
        return {"admin": True, **admin_payload}

    site_payload = _verify_hs256_jwt(token, USER_AUTH_TOKEN)
    if site_payload and str(site_payload.get("scope") or "").strip().lower() == "site_user":
        return site_payload

    raise HTTPException(status_code=401, detail="Invalid token")

# --- Storage Helpers ---
def ensure_bucket_exists(bucket_name: str) -> None:
    try:
        ensure_media_bucket(bucket_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to prepare storage: {e}") from e


# --- Dashboard Stats ---
@app.get("/api/dashboard-stats")
async def get_dashboard_stats(request: Request):
    get_user(request)
    try:
        _require_database()
        # Mock views for now as requested
        views = 12543 
        
        # Get counts
        works = await asyncio.to_thread(count_records, "projects", status="live")
        team = await asyncio.to_thread(count_records, "team_members", status="live")
        products = await asyncio.to_thread(count_records, "products", status="live")
        
        return {
            "views": views,
            "works": works,
            "team_members": team,
            "products": products
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
        _require_database()
        return await asyncio.to_thread(select_records, "projects", status=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects")
async def create_project(project: Project, request: Request):
    get_user(request)
    try:
        _require_database()
        data = project.dict(exclude_none=True)
        # Ensure status is set
        if "status" not in data:
            data["status"] = "draft"
            
        return await asyncio.to_thread(insert_record, "projects", data)
    except Exception as e:
        print(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/projects/{project_id}")
async def update_project(project_id: str, project: Project, request: Request):
    get_user(request)
    try:
        _require_database()
        data = project.dict(exclude_none=True)
        return await asyncio.to_thread(update_record_by_id, "projects", project_id, data)
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, request: Request):
    get_user(request)
    try:
        _require_database()
        return await asyncio.to_thread(delete_record_by_id, "projects", project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Products Endpoints ---

@app.get("/api/products")
async def get_products(status: Optional[str] = None):
    try:
        _require_database()
        return await asyncio.to_thread(select_records, "products", status=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products")
async def create_product(product: Product, request: Request):
    get_user(request)
    try:
        _require_database()
        data = product.dict(exclude_none=True)
        if "status" not in data:
            data["status"] = "draft"
        return await asyncio.to_thread(insert_record, "products", data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/products/{product_id}")
async def update_product(product_id: str, product: Product, request: Request):
    get_user(request)
    try:
        _require_database()
        data = product.dict(exclude_none=True)
        return await asyncio.to_thread(update_record_by_id, "products", product_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    get_user(request)
    try:
        _require_database()
        return await asyncio.to_thread(delete_record_by_id, "products", product_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Team Members Endpoints ---

@app.get("/api/team")
async def get_team(status: Optional[str] = None):
    try:
        _require_database()
        return await asyncio.to_thread(select_records, "team_members", status=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/team")
async def create_team_member(member: TeamMember, request: Request):
    get_user(request)
    try:
        _require_database()
        data = member.dict(exclude_none=True)
        if "status" not in data:
            data["status"] = "draft"
        return await asyncio.to_thread(insert_record, "team_members", data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/team/{member_id}")
async def update_team_member(member_id: str, member: TeamMember, request: Request):
    get_user(request)
    try:
        _require_database()
        data = member.dict(exclude_none=True)
        return await asyncio.to_thread(update_record_by_id, "team_members", member_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/team/{member_id}")
async def delete_team_member(member_id: str, request: Request):
    get_user(request)
    try:
        _require_database()
        return await asyncio.to_thread(delete_record_by_id, "team_members", member_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Reviews Endpoints ---

# --- Reviews Endpoints ---

@app.get("/api/reviews")
async def get_reviews(status: Optional[str] = None):
    try:
        _require_database()
        data: list[dict[str, Any]] = []

        if await asyncio.to_thread(table_exists, "reviews"):
            try:
                data.extend(await asyncio.to_thread(select_records, "reviews", status=status))
            except Exception:
                pass

        if await asyncio.to_thread(table_exists, "testimonials"):
            testimonials = await asyncio.to_thread(select_records, "testimonials", status=None)
            for t in testimonials:
                is_live = _is_live_review_row(t)

                if status == "live" and not is_live:
                    continue
                if status == "draft" and is_live:
                    continue

                data.append(_map_testimonial_to_review(t))

        data.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return data

    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return []

@app.post("/api/reviews")
async def create_review(review: Review, request: Request):
    get_user(request)
    try:
        _require_database()
        data = review.dict(exclude_none=True)
        if "status" not in data:
            data["status"] = "draft"

        if await asyncio.to_thread(table_exists, "reviews"):
            try:
                return await asyncio.to_thread(insert_record, "reviews", data)
            except Exception:
                pass

        last_error: Exception | None = None
        for payload in _build_testimonial_insert_variants(data):
            try:
                response_fallback = await asyncio.to_thread(insert_record, "testimonials", payload)
                if response_fallback:
                    return [_map_testimonial_to_review(response_fallback[0])]
                return response_fallback
            except Exception as e:
                last_error = e

        raise last_error if last_error else Exception("Failed to insert review")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/reviews/{review_id}")
async def update_review(review_id: str, review: Review, request: Request):
    get_user(request)
    try:
        _require_database()
        data = review.dict(exclude_none=True)
        
        if await asyncio.to_thread(table_exists, "reviews"):
            try:
                response = await asyncio.to_thread(update_record_by_id, "reviews", review_id, data)
                if response:
                    return response
            except Exception:
                pass

        existing_row = None
        if await asyncio.to_thread(table_exists, "testimonials"):
            existing_row = await asyncio.to_thread(
                fetch_one,
                "select * from public.testimonials where id = %s limit 1",
                (review_id,),
            )

        if existing_row:
            t_data = _build_testimonial_update_data(data, existing_row)
            if t_data:
                response_t = await asyncio.to_thread(update_record_by_id, "testimonials", review_id, t_data)
                if response_t:
                    return [_map_testimonial_to_review(response_t[0])]

        raise HTTPException(status_code=404, detail="Review not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/reviews/{review_id}")
async def delete_review(review_id: str, request: Request):
    get_user(request)
    try:
        _require_database()
        if await asyncio.to_thread(table_exists, "reviews"):
            try:
                response = await asyncio.to_thread(delete_record_by_id, "reviews", review_id)
                if response:
                    return response
            except Exception:
                pass

        if await asyncio.to_thread(table_exists, "testimonials"):
            response_t = await asyncio.to_thread(delete_record_by_id, "testimonials", review_id)
            if response_t:
                 return [{
                        "status": "deleted",
                        "id": review_id
                 }]

        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

