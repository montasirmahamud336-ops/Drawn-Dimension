from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.models.auth_events import parse_auth_user_created_webhook
from app.security.webhook import verify_webhook_request
from app.services.auth_notification_service import AuthNotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@lru_cache(maxsize=1)
def get_notification_service() -> AuthNotificationService:
    return AuthNotificationService(settings)


@router.get("/health")
async def webhook_health() -> dict[str, Any]:
    return {"status": "ok"}


@router.post("/supabase/auth-user-created")
async def supabase_auth_user_created(request: Request) -> dict[str, Any]:
    raw_body = await request.body()
    verify_webhook_request(request, raw_body, settings.webhook_secret)

    try:
        payload = json.loads(raw_body.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Payload must be an object")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    parsed = parse_auth_user_created_webhook(payload)
    if not parsed.should_process or not parsed.event:
        return {
            "status": "ignored",
            "reason": parsed.reason,
        }

    try:
        service = get_notification_service()
        result = await service.dispatch_new_user_emails(parsed.event)
    except Exception as exc:
        logger.exception("Failed to dispatch auth notification emails")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "processed",
        "user_id": parsed.event.user_id,
        "user_welcome_sent": result.user_welcome_sent,
        "admin_notification_sent": result.admin_notification_sent,
        "skipped_as_duplicate": result.skipped_as_duplicate,
    }
