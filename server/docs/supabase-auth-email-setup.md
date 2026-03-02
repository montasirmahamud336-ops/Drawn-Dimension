# Supabase Auth Email Setup (FastAPI)

This setup sends all auth emails from your backend using your official mailbox (`info@drawndimension.com`) and never from frontend code.

## 1. What this implementation does

- Trigger source: Supabase auth user creation webhook
- Trigger target: `POST /api/webhooks/supabase/auth-user-created`
- Backend sends:
  - Branded welcome email to the new user
  - Admin notification email to `ADMIN_NOTIFICATION_EMAIL`
- Admin notification subject: `New User Registered`
- Included fields:
  - User name
  - User email
  - Login provider
  - Registration time
- Dedupe:
  - Uses `public.auth_event_notifications` to avoid duplicate sends

## 2. Required environment variables

Use [`.env.example`](/C:/DrawnDimension/server/.env.example) as the source of truth.

Critical variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_AUTH_WEBHOOK_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL=info@drawndimension.com`
- `ADMIN_NOTIFICATION_EMAIL=drawndimensioninfo@gmail.com`

## 3. Supabase configuration steps

1. In Supabase Dashboard, keep Google OAuth enabled in `Authentication > Providers > Google`.
2. In `Authentication > URL Configuration`, set correct site URL and redirects.
3. Configure a webhook for auth user creation:
   - Preferred: Database webhook on `auth.users` insert
   - URL: `https://YOUR_API_DOMAIN/api/webhooks/supabase/auth-user-created`
   - Method: `POST`
   - Header: `Authorization: Bearer <SUPABASE_AUTH_WEBHOOK_SECRET>`
4. Enable webhook retries on non-2xx responses.

If your project UI does not allow `auth.users` webhook directly, use a DB trigger that mirrors auth inserts to a public table, then webhook that public table.

## 4. DNS and sender authentication

For `info@drawndimension.com`, configure:

- SPF TXT record for your SMTP provider
- DKIM record(s) from your SMTP provider
- DMARC policy (`p=none` initially, then tighten to `quarantine/reject`)

Without SPF/DKIM, delivery will be poor or spam-filtered.

## 5. Backend file map

- Config:
  - [config.py](/C:/DrawnDimension/server/app/config.py)
- Webhook route:
  - [auth_webhooks.py](/C:/DrawnDimension/server/app/routes/auth_webhooks.py)
- Webhook security verification:
  - [webhook.py](/C:/DrawnDimension/server/app/security/webhook.py)
- Payload parsing:
  - [auth_events.py](/C:/DrawnDimension/server/app/models/auth_events.py)
- Email service:
  - [client.py](/C:/DrawnDimension/server/app/services/email/client.py)
  - [templates.py](/C:/DrawnDimension/server/app/services/email/templates.py)
- Notification orchestration + dedupe:
  - [auth_notification_service.py](/C:/DrawnDimension/server/app/services/auth_notification_service.py)

## 6. HTML template examples

Welcome email template:

- Function: `build_welcome_email_html(...)`
- File: [templates.py](/C:/DrawnDimension/server/app/services/email/templates.py)

Admin notification template:

- Function: `build_admin_notification_html(...)`
- File: [templates.py](/C:/DrawnDimension/server/app/services/email/templates.py)

## 7. API endpoint behavior

`POST /api/webhooks/supabase/auth-user-created`

- Verifies webhook auth (`Authorization` or `x-webhook-secret` or HMAC signature)
- Parses user payload safely
- Sends welcome + admin emails
- Returns dedupe-aware response:
  - `user_welcome_sent`
  - `admin_notification_sent`
  - `skipped_as_duplicate`

