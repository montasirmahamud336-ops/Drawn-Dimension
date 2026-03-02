-- Store website live chat requests for CMS and admin email alerts.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.live_chat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT NOT NULL,
  first_message TEXT NOT NULL,
  page_path TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'contacted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_chat_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_live_chat_requests_status_created
  ON public.live_chat_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_chat_requests_email_created
  ON public.live_chat_requests (lower(user_email), created_at DESC);

DROP TRIGGER IF EXISTS update_live_chat_requests_updated_at ON public.live_chat_requests;
CREATE TRIGGER update_live_chat_requests_updated_at
  BEFORE UPDATE ON public.live_chat_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

