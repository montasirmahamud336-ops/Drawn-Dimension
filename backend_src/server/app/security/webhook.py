from __future__ import annotations

import hashlib
import hmac

from fastapi import HTTPException, Request


def verify_webhook_request(request: Request, raw_body: bytes, shared_secret: str) -> None:
    if not shared_secret:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_AUTH_WEBHOOK_SECRET is not configured",
        )

    secret = shared_secret.strip()
    auth_header = request.headers.get("authorization", "").strip()
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if hmac.compare_digest(token, secret):
            return

    header_secret = request.headers.get("x-webhook-secret", "").strip()
    if header_secret and hmac.compare_digest(header_secret, secret):
        return

    signature = request.headers.get("x-supabase-signature", "").strip()
    if signature:
        expected = hmac.new(
            key=secret.encode("utf-8"),
            msg=raw_body,
            digestmod=hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(signature, expected):
            return

    raise HTTPException(status_code=401, detail="Invalid webhook authentication")

