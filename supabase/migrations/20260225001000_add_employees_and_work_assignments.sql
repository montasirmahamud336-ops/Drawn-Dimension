-- Create employees and work assignments tables for CMS workflow
-- and notification dedupe table for first-time Google signup emails.

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

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  profession TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_user_email TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  work_title TEXT NOT NULL,
  work_details TEXT,
  work_duration TEXT NOT NULL,
  revision_due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'done', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auth_event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type)
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee can read own profile" ON public.employees;
CREATE POLICY "Employee can read own profile"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    linked_user_id = auth.uid()
    OR lower(coalesce(linked_user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Employee can read own work assignments" ON public.work_assignments;
CREATE POLICY "Employee can read own work assignments"
  ON public.work_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = work_assignments.employee_id
        AND (
          e.linked_user_id = auth.uid()
          OR lower(coalesce(e.linked_user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_employees_status_created_at
  ON public.employees (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employees_linked_user_id
  ON public.employees (linked_user_id);

CREATE INDEX IF NOT EXISTS idx_employees_linked_user_email
  ON public.employees (lower(linked_user_email));

CREATE INDEX IF NOT EXISTS idx_work_assignments_employee_status_created
  ON public.work_assignments (employee_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_assignments_status_created
  ON public.work_assignments (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_event_notifications_user_event
  ON public.auth_event_notifications (user_id, event_type);

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_assignments_updated_at ON public.work_assignments;
CREATE TRIGGER update_work_assignments_updated_at
  BEFORE UPDATE ON public.work_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
