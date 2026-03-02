from __future__ import annotations

from datetime import datetime, timezone


def escape_html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def format_registered_at(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return raw
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def build_welcome_email_html(
    *,
    company_name: str,
    user_name: str,
    user_email: str,
    dashboard_url: str,
    logo_url: str,
) -> str:
    safe_company = escape_html(company_name)
    safe_name = escape_html(user_name or "there")
    safe_email = escape_html(user_email)
    safe_logo = escape_html(logo_url)
    safe_dashboard_url = escape_html(dashboard_url)

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#111827;color:#fff;padding:20px;text-align:center;">
        <img src="{safe_logo}" alt="{safe_company} Logo" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;margin:0 auto 10px;">
        <h2 style="margin:0;font-size:22px;">Welcome to {safe_company}</h2>
      </div>
      <div style="padding:22px;">
        <p style="margin:0 0 12px;font-size:15px;">Hi {safe_name},</p>
        <p style="margin:0 0 12px;font-size:15px;">Your account has been created successfully.</p>
        <p style="margin:0 0 16px;font-size:14px;color:#374151;"><strong>Account:</strong> {safe_email}</p>
        <a href="{safe_dashboard_url}" style="display:inline-block;padding:10px 16px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Open Dashboard
        </a>
      </div>
    </div>
    """


def build_admin_notification_html(
    *,
    company_name: str,
    logo_url: str,
    user_name: str,
    user_email: str,
    provider: str,
    registered_at: str,
) -> str:
    safe_company = escape_html(company_name)
    safe_logo = escape_html(logo_url)
    safe_name = escape_html(user_name or "N/A")
    safe_email = escape_html(user_email)
    safe_provider = escape_html(provider.upper())
    safe_registered_at = escape_html(format_registered_at(registered_at))

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#111827;color:#fff;padding:20px;display:flex;align-items:center;gap:12px;">
        <img src="{safe_logo}" alt="{safe_company} Logo" width="44" height="44" style="border-radius:8px;object-fit:cover;">
        <div>
          <div style="font-size:16px;font-weight:700;">{safe_company}</div>
          <div style="font-size:12px;opacity:0.9;">New user registration</div>
        </div>
      </div>
      <div style="padding:22px;">
        <p style="margin:0 0 10px;font-size:15px;"><strong>User name:</strong> {safe_name}</p>
        <p style="margin:0 0 10px;font-size:15px;"><strong>User email:</strong> {safe_email}</p>
        <p style="margin:0 0 10px;font-size:15px;"><strong>Login provider:</strong> {safe_provider}</p>
        <p style="margin:0;font-size:15px;"><strong>Registration time:</strong> {safe_registered_at}</p>
      </div>
    </div>
    """

