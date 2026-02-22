-- Keep RLS enabled and make project access explicit:
-- - Public users: read-only (live projects)
-- - Authenticated users: full write access (insert/update/delete)

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Remove legacy/conflicting policies.
DROP POLICY IF EXISTS "Public read access for live projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Public can read live projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

-- Explicit grants for PostgREST roles.
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;

CREATE POLICY "Public can read live projects"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (status = 'live' OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');
