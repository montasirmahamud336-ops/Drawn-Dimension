from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AuthUserCreatedEvent:
    user_id: str
    email: str
    full_name: str
    provider: str
    registered_at: str


@dataclass(frozen=True)
class AuthWebhookParseResult:
    should_process: bool
    reason: str
    event: AuthUserCreatedEvent | None = None


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return {}
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return {}
    return {}


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def parse_auth_user_created_webhook(payload: dict[str, Any]) -> AuthWebhookParseResult:
    event_type = _as_str(payload.get("type") or payload.get("event") or payload.get("eventType")).upper()
    if event_type in {"UPDATE", "DELETE"}:
        return AuthWebhookParseResult(
            should_process=False,
            reason=f"ignored_event_type:{event_type.lower()}",
        )

    record = _as_dict(payload.get("record"))
    if not record:
        # Generic webhook fallback shapes.
        data = _as_dict(payload.get("data"))
        record = _as_dict(data.get("record")) or _as_dict(data.get("user")) or _as_dict(payload.get("user"))
    if not record:
        # Some systems may directly send user fields at root.
        record = payload

    user_id = _as_str(record.get("id") or record.get("user_id"))
    email = _as_str(record.get("email")).lower()
    if not user_id:
        return AuthWebhookParseResult(should_process=False, reason="missing_user_id")
    if not email:
        return AuthWebhookParseResult(should_process=False, reason="missing_email")

    app_metadata = _as_dict(record.get("app_metadata"))
    raw_user_meta_data = _as_dict(record.get("raw_user_meta_data"))
    user_metadata = _as_dict(record.get("user_metadata"))

    provider = (
        _as_str(app_metadata.get("provider"))
        or _as_str(record.get("provider"))
        or "email"
    ).lower()

    full_name = (
        _as_str(raw_user_meta_data.get("full_name"))
        or _as_str(raw_user_meta_data.get("name"))
        or _as_str(user_metadata.get("full_name"))
        or _as_str(user_metadata.get("name"))
    )

    registered_at = _as_str(record.get("created_at") or record.get("createdAt"))

    event = AuthUserCreatedEvent(
        user_id=user_id,
        email=email,
        full_name=full_name,
        provider=provider,
        registered_at=registered_at,
    )
    return AuthWebhookParseResult(should_process=True, reason="ok", event=event)

