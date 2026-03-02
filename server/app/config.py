from __future__ import annotations

import os
from dataclasses import dataclass


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_key: str
    webhook_secret: str
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_use_tls: bool
    smtp_use_ssl: bool
    smtp_from_email: str
    smtp_from_name: str
    admin_notification_email: str
    company_name: str
    site_base_url: str
    brand_logo_url: str

    @property
    def smtp_from(self) -> str:
        from_name = self.smtp_from_name.strip()
        from_email = self.smtp_from_email.strip()
        if not from_email:
            return ""
        if from_name:
            return f"{from_name} <{from_email}>"
        return from_email

    @property
    def email_notifications_enabled(self) -> bool:
        return bool(
            self.smtp_host.strip()
            and self.smtp_port > 0
            and self.smtp_username.strip()
            and self.smtp_password.strip()
            and self.smtp_from_email.strip()
            and self.admin_notification_email.strip()
        )

    @classmethod
    def from_env(cls) -> "Settings":
        site_base_url = os.getenv("SITE_BASE_URL", "https://drawndimension.com").strip()
        default_logo = f"{site_base_url.rstrip('/')}/images/logo.png" if site_base_url else ""

        return cls(
            supabase_url=(
                os.getenv("SUPABASE_URL")
                or os.getenv("VITE_SUPABASE_URL")
                or ""
            ).strip(),
            supabase_service_key=(os.getenv("SUPABASE_SERVICE_KEY") or "").strip(),
            webhook_secret=(os.getenv("SUPABASE_AUTH_WEBHOOK_SECRET") or "").strip(),
            smtp_host=(os.getenv("SMTP_HOST") or "").strip(),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_username=(os.getenv("SMTP_USERNAME") or "").strip(),
            smtp_password=(os.getenv("SMTP_PASSWORD") or "").strip(),
            smtp_use_tls=_to_bool(os.getenv("SMTP_USE_TLS"), default=True),
            smtp_use_ssl=_to_bool(os.getenv("SMTP_USE_SSL"), default=False),
            smtp_from_email=(
                os.getenv("SMTP_FROM_EMAIL")
                or os.getenv("SMTP_USER")
                or ""
            ).strip(),
            smtp_from_name=(os.getenv("SMTP_FROM_NAME") or "DrawnDimension").strip(),
            admin_notification_email=(
                os.getenv("ADMIN_NOTIFICATION_EMAIL")
                or "drawndimensioninfo@gmail.com"
            ).strip(),
            company_name=(os.getenv("COMPANY_NAME") or "DrawnDimension").strip(),
            site_base_url=site_base_url,
            brand_logo_url=(os.getenv("BRAND_LOGO_URL") or default_logo).strip(),
        )


settings = Settings.from_env()

