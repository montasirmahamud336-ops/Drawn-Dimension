CREATE TABLE IF NOT EXISTS public.employee_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'employee')),
  sender_label TEXT,
  message_text TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  read_by_admin_at TIMESTAMPTZ,
  read_by_employee_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_chat_messages_content_check CHECK (
    COALESCE(length(trim(message_text)), 0) > 0
    OR COALESCE(length(trim(attachment_url)), 0) > 0
  )
);

ALTER TABLE public.employee_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee can read own chat messages" ON public.employee_chat_messages;
CREATE POLICY "Employee can read own chat messages"
  ON public.employee_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_chat_messages.employee_id
        AND (
          e.linked_user_id = auth.uid()
          OR lower(coalesce(e.linked_user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_employee_chat_messages_employee_created
  ON public.employee_chat_messages (employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_chat_messages_employee_read_admin
  ON public.employee_chat_messages (employee_id, read_by_admin_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_chat_messages_employee_read_employee
  ON public.employee_chat_messages (employee_id, read_by_employee_at, created_at DESC);

DROP TRIGGER IF EXISTS update_employee_chat_messages_updated_at ON public.employee_chat_messages;
CREATE TRIGGER update_employee_chat_messages_updated_at
  BEFORE UPDATE ON public.employee_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
