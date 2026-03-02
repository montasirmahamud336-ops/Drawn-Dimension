from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.config import Settings, settings


@lru_cache(maxsize=1)
def get_supabase_admin_client(config: Settings = settings) -> Client:
    if not config.supabase_url or not config.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")
    return create_client(config.supabase_url, config.supabase_service_key)

