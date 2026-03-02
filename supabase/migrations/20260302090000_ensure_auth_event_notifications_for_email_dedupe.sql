-- Ensures dedupe storage exists for backend auth email notifications.

CREATE TABLE IF NOT EXISTS public.auth_event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_auth_event_notifications_user_event
  ON public.auth_event_notifications (user_id, event_type);

