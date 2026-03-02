-- Store website contact form submissions for CMS review.

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

CREATE TABLE IF NOT EXISTS public.contact_form_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service TEXT NOT NULL,
  details TEXT NOT NULL,
  source_page TEXT,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_form_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contact_form_messages_status_created
  ON public.contact_form_messages (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_form_messages_email_created
  ON public.contact_form_messages (lower(email), created_at DESC);

DROP TRIGGER IF EXISTS update_contact_form_messages_updated_at ON public.contact_form_messages;
CREATE TRIGGER update_contact_form_messages_updated_at
  BEFORE UPDATE ON public.contact_form_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

