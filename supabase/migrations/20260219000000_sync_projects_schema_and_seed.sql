-- Ensure projects table has the CMS-required columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS client TEXT,
  ADD COLUMN IF NOT EXISTS live_link TEXT,
  ADD COLUMN IF NOT EXISTS github_link TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT;

-- If legacy is_live exists, backfill status from it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'is_live'
  ) THEN
    UPDATE public.projects
    SET status = CASE WHEN is_live THEN 'live' ELSE 'draft' END
    WHERE status IS NULL;
  END IF;
END $$;

-- Default status for rows that still don't have it
UPDATE public.projects
SET status = 'live'
WHERE status IS NULL;

-- Add status constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_status_check'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_status_check
      CHECK (status IN ('draft', 'live'));
  END IF;
END $$;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status);

-- Seed demo projects if they don't exist (for CMS + Portfolio sync)
INSERT INTO public.projects (title, description, image_url, category, tags, status, client, live_link)
SELECT
  'Industrial Plant 3D Model',
  'Complete SolidWorks 3D model of a petrochemical processing facility with detailed equipment layouts.',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop',
  'CAD & 3D',
  ARRAY['solidworks','3d-modeling','industrial'],
  'live',
  'PETROGLOBAL INDUSTRIES',
  '#'
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'Industrial Plant 3D Model');

INSERT INTO public.projects (title, description, image_url, category, tags, status, client, live_link)
SELECT
  'Tech Startup Platform',
  'Modern SaaS platform with interactive features, dashboard analytics, and seamless user experience.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
  'Web Design',
  ARRAY['react','dashboard','saas'],
  'live',
  'INNOVATETECH SOLUTIONS',
  '#'
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'Tech Startup Platform');

INSERT INTO public.projects (title, description, image_url, category, tags, status, client, live_link)
SELECT
  'Refinery P&ID Documentation',
  'Comprehensive piping and instrumentation diagrams for a 50,000 bpd oil refinery expansion project.',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  'Engineering',
  ARRAY['autocad','pid','piping'],
  'live',
  'GULF REFINING CORP',
  '#'
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'Refinery P&ID Documentation');

INSERT INTO public.projects (title, description, image_url, category, tags, status, client, live_link)
SELECT
  'Corporate Brand Identity',
  'Complete visual identity system including logo, color palette, and brand guidelines for a Fortune 500 company.',
  'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&h=600&fit=crop',
  'Branding',
  ARRAY['branding','identity','design'],
  'live',
  'NEXUS FINANCIAL GROUP',
  '#'
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'Corporate Brand Identity');

INSERT INTO public.projects (title, description, image_url, category, tags, status, client, live_link)
SELECT
  'AutoCAD Manufacturing Layout',
  'Detailed 2D technical drawings and equipment layouts for a pharmaceutical manufacturing facility.',
  'https://images.unsplash.com/photo-1581092336363-231a4030612c?w=800&h=600&fit=crop',
  'CAD & 3D',
  ARRAY['autocad','manufacturing','layout'],
  'live',
  'PHARMATECH MANUFACTURING',
  '#'
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'AutoCAD Manufacturing Layout');

INSERT INTO public.projects (title, description, image_url, category, tags, status, client, live_link)
SELECT
  'E-commerce Platform',
  'Full-stack e-commerce solution with payment integration, inventory management, and analytics dashboard.',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
  'Web Design',
  ARRAY['ecommerce','fullstack','retail'],
  'live',
  'GLOBALMART RETAIL',
  '#'
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'E-commerce Platform');
