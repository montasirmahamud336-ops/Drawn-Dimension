-- Add ordering support for CMS card drag-and-drop.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

ALTER TABLE public.projects
  ALTER COLUMN display_order SET DEFAULT 0;

ALTER TABLE public.products
  ALTER COLUMN display_order SET DEFAULT 0;

ALTER TABLE public.team_members
  ALTER COLUMN display_order SET DEFAULT 0;

WITH ranked_projects AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC, id) - 1 AS position
  FROM public.projects
)
UPDATE public.projects p
SET display_order = ranked_projects.position
FROM ranked_projects
WHERE p.id = ranked_projects.id
  AND p.display_order IS NULL;

WITH ranked_products AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC, id) - 1 AS position
  FROM public.products
)
UPDATE public.products p
SET display_order = ranked_products.position
FROM ranked_products
WHERE p.id = ranked_products.id
  AND p.display_order IS NULL;

WITH ranked_team AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC, id) - 1 AS position
  FROM public.team_members
)
UPDATE public.team_members t
SET display_order = ranked_team.position
FROM ranked_team
WHERE t.id = ranked_team.id
  AND t.display_order IS NULL;

ALTER TABLE public.projects
  ALTER COLUMN display_order SET NOT NULL;

ALTER TABLE public.products
  ALTER COLUMN display_order SET NOT NULL;

ALTER TABLE public.team_members
  ALTER COLUMN display_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_status_display_order
  ON public.projects (status, display_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_status_display_order
  ON public.products (status, display_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_members_status_display_order
  ON public.team_members (status, display_order, created_at DESC);

DO $$
DECLARE
  has_custom_testimonial_order BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.testimonials
    WHERE display_order <> 0
  ) INTO has_custom_testimonial_order;

  IF NOT has_custom_testimonial_order THEN
    WITH ranked_testimonials AS (
      SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY is_published ORDER BY created_at DESC, id) - 1 AS position
      FROM public.testimonials
    )
    UPDATE public.testimonials t
    SET display_order = ranked_testimonials.position
    FROM ranked_testimonials
    WHERE t.id = ranked_testimonials.id;
  END IF;
END
$$;
