from __future__ import annotations

import logging
from dataclasses import dataclass

from app.config import Settings
from app.models.auth_events import AuthUserCreatedEvent
from app.services.email.client import SMTPEmailClient
from app.services.email.templates import (
    build_admin_notification_html,
    build_welcome_email_html,
)
from app.services.supabase_admin import get_supabase_admin_client

logger = logging.getLogger(__name__)

WELCOME_EVENT_TYPE = "welcome_email_sent_v1"
ADMIN_EVENT_TYPE = "admin_notification_sent_v1"


@dataclass(frozen=True)
class NotificationDispatchResult:
    user_welcome_sent: bool
    admin_notification_sent: bool
    skipped_as_duplicate: bool


class AuthNotificationService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.email_client = SMTPEmailClient(settings)
        self.supabase_admin = get_supabase_admin_client(settings)

    def _event_already_recorded(self, *, user_id: str, event_type: str) -> bool:
        try:
            response = (
                self.supabase_admin.table("auth_event_notifications")
                .select("id")
                .eq("user_id", user_id)
                .eq("event_type", event_type)
                .limit(1)
                .execute()
            )
            return bool(response.data)
        except Exception as exc:
            raise RuntimeError(
                "Failed to read auth_event_notifications. Ensure migration is applied."
            ) from exc

    def _record_event(self, *, user_id: str, event_type: str) -> None:
        try:
            (
                self.supabase_admin.table("auth_event_notifications")
                .insert({"user_id": user_id, "event_type": event_type})
                .execute()
            )
        except Exception as exc:
            message = str(exc).lower()
            if "duplicate" in message or "unique" in message:
                return
            raise RuntimeError("Failed to record auth notification event") from exc

    async def dispatch_new_user_emails(
        self,
        event: AuthUserCreatedEvent,
    ) -> NotificationDispatchResult:
        if not self.settings.email_notifications_enabled:
            raise RuntimeError(
                "SMTP is not fully configured. Check SMTP_* and ADMIN_NOTIFICATION_EMAIL env vars."
            )

        if not event.email:
            raise RuntimeError("User email is missing in auth webhook payload")

        base_url = self.settings.site_base_url.rstrip("/")
        dashboard_url = f"{base_url}/dashboard" if base_url else ""
        user_name = event.full_name or event.email.split("@")[0]

        welcome_already_sent = self._event_already_recorded(
            user_id=event.user_id,
            event_type=WELCOME_EVENT_TYPE,
        )
        admin_already_sent = self._event_already_recorded(
            user_id=event.user_id,
            event_type=ADMIN_EVENT_TYPE,
        )

        user_welcome_sent = False
        admin_notification_sent = False

        if not welcome_already_sent:
            welcome_html = build_welcome_email_html(
                company_name=self.settings.company_name,
                user_name=user_name,
                user_email=event.email,
                dashboard_url=dashboard_url,
                logo_url=self.settings.brand_logo_url,
            )
            await self.email_client.send_html_email(
                to_email=event.email,
                subject=f"Welcome to {self.settings.company_name}",
                html_body=welcome_html,
            )
            self._record_event(user_id=event.user_id, event_type=WELCOME_EVENT_TYPE)
            user_welcome_sent = True

        if not admin_already_sent:
            admin_html = build_admin_notification_html(
                company_name=self.settings.company_name,
                logo_url=self.settings.brand_logo_url,
                user_name=user_name,
                user_email=event.email,
                provider=event.provider,
                registered_at=event.registered_at,
            )
            await self.email_client.send_html_email(
                to_email=self.settings.admin_notification_email,
                subject="New User Registered",
                html_body=admin_html,
            )
            self._record_event(user_id=event.user_id, event_type=ADMIN_EVENT_TYPE)
            admin_notification_sent = True

        skipped = welcome_already_sent and admin_already_sent
        if skipped:
            logger.info("Duplicate webhook skipped for user_id=%s", event.user_id)

        return NotificationDispatchResult(
            user_welcome_sent=user_welcome_sent,
            admin_notification_sent=admin_notification_sent,
            skipped_as_duplicate=skipped,
        )

