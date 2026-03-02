from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from app.config import Settings


class EmailDeliveryError(RuntimeError):
    """Raised when SMTP delivery fails."""


class SMTPEmailClient:
    def __init__(self, settings: Settings):
        self._settings = settings

    async def send_html_email(
        self,
        *,
        to_email: str,
        subject: str,
        html_body: str,
    ) -> None:
        await asyncio.to_thread(
            self._send_html_email_sync,
            to_email,
            subject,
            html_body,
        )

    def _send_html_email_sync(self, to_email: str, subject: str, html_body: str) -> None:
        settings = self._settings
        message = EmailMessage()
        message["From"] = settings.smtp_from
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content("This email requires an HTML-capable email client.")
        message.add_alternative(html_body, subtype="html")

        try:
            if settings.smtp_use_ssl:
                with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
                    smtp.login(settings.smtp_username, settings.smtp_password)
                    smtp.send_message(message)
                return

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
                smtp.ehlo()
                if settings.smtp_use_tls:
                    smtp.starttls()
                    smtp.ehlo()
                smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(message)
        except Exception as exc:  # pragma: no cover - network interaction
            raise EmailDeliveryError(str(exc)) from exc

