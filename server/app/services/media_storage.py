from __future__ import annotations

import os
import random
import re
import time
from pathlib import Path
from urllib.parse import quote

from server.app.config import settings


def normalize_object_path(raw_path: str | None, fallback_ext: str) -> str:
    value = str(raw_path or "").strip().replace("\\", "/").lstrip("/")
    safe_parts: list[str] = []

    for part in value.split("/"):
        clean = part.strip()
        if not clean or clean in {".", ".."}:
            continue
        safe_parts.append(re.sub(r"[^A-Za-z0-9._-]", "-", clean))

    if not safe_parts:
        return f"misc/{int(time.time())}-{random.randint(1000, 9999)}.{fallback_ext}"

    return "/".join(safe_parts)


def ensure_media_bucket(bucket_name: str | None = None) -> Path:
    bucket = (bucket_name or settings.storage_bucket).strip() or "cms-uploads"
    bucket_path = Path(settings.media_root).joinpath(bucket)
    bucket_path.mkdir(parents=True, exist_ok=True)
    return bucket_path


def build_public_media_url(object_path: str, bucket_name: str | None = None) -> str:
    bucket = (bucket_name or settings.storage_bucket).strip() or "cms-uploads"
    encoded_path = "/".join(quote(part) for part in object_path.split("/"))
    return f"{settings.media_base_url.rstrip('/')}/{quote(bucket)}/{encoded_path}"


def store_uploaded_file(
    *,
    buffer: bytes,
    object_path: str,
    bucket_name: str | None = None,
) -> dict[str, str]:
    bucket = (bucket_name or settings.storage_bucket).strip() or "cms-uploads"
    bucket_root = ensure_media_bucket(bucket)
    absolute_path = bucket_root.joinpath(*object_path.split("/"))
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(buffer)

    return {
        "path": object_path,
        "absolute_path": os.fspath(absolute_path),
        "public_url": build_public_media_url(object_path, bucket),
    }
