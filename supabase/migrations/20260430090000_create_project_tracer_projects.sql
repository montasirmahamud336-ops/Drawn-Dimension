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

CREATE TABLE IF NOT EXISTS public.project_tracer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_number TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL,
  amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tracer_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage project tracer projects"
  ON public.project_tracer_projects;
CREATE POLICY "Authenticated users can manage project tracer projects"
  ON public.project_tracer_projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_tracer_projects_order_number_unique
  ON public.project_tracer_projects (lower(order_number))
  WHERE order_number IS NOT NULL AND trim(order_number) <> '';

CREATE INDEX IF NOT EXISTS idx_project_tracer_projects_status_date
  ON public.project_tracer_projects (status, date DESC, created_at DESC);

DROP TRIGGER IF EXISTS update_project_tracer_projects_updated_at
  ON public.project_tracer_projects;
CREATE TRIGGER update_project_tracer_projects_updated_at
  BEFORE UPDATE ON public.project_tracer_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.project_tracer_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_assignments_project_created
  ON public.work_assignments (project_id, created_at DESC);
