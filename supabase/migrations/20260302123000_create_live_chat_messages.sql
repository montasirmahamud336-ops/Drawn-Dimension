-- Store persistent live chat conversation messages and attachments.

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

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.live_chat_requests(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_label TEXT,
  message_text TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  attachment_size BIGINT,
  read_by_admin_at TIMESTAMPTZ,
  read_by_user_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT live_chat_messages_content_check CHECK (
    COALESCE(length(trim(message_text)), 0) > 0
    OR COALESCE(length(trim(attachment_url)), 0) > 0
  )
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own live chat messages" ON public.live_chat_messages;
CREATE POLICY "Users can read own live chat messages"
  ON public.live_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.live_chat_requests r
      WHERE r.id = live_chat_messages.request_id
        AND (
          r.user_id = auth.uid()
          OR lower(coalesce(r.user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_request_created
  ON public.live_chat_messages (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_request_sender_read_admin
  ON public.live_chat_messages (request_id, sender_type, read_by_admin_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_request_sender_read_user
  ON public.live_chat_messages (request_id, sender_type, read_by_user_at, created_at DESC);

DROP TRIGGER IF EXISTS update_live_chat_messages_updated_at ON public.live_chat_messages;
CREATE TRIGGER update_live_chat_messages_updated_at
  BEFORE UPDATE ON public.live_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
