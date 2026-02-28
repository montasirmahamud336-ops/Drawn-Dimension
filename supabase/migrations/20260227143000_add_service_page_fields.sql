ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS hero_badge TEXT,
  ADD COLUMN IF NOT EXISTS hero_title TEXT,
  ADD COLUMN IF NOT EXISTS hero_description TEXT,
  ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS feature_cards JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

UPDATE public.services
SET slug = regexp_replace(
  regexp_replace(
    lower(regexp_replace(replace(name, '&', ' and '), '[^a-z0-9]+', '-', 'g')),
    '-{2,}',
    '-',
    'g'
  ),
  '(^-+|-+$)',
  '',
  'g'
)
WHERE slug IS NULL OR btrim(slug) = '';

UPDATE public.services
SET hero_title = name
WHERE hero_title IS NULL OR btrim(hero_title) = '';

UPDATE public.services
SET hero_description = short_description
WHERE (hero_description IS NULL OR btrim(hero_description) = '')
  AND short_description IS NOT NULL
  AND btrim(short_description) <> '';

UPDATE public.services
SET features = '{}'
WHERE features IS NULL;

UPDATE public.services
SET feature_cards = '[]'::jsonb
WHERE feature_cards IS NULL;

ALTER TABLE public.services
  ALTER COLUMN features SET DEFAULT '{}',
  ALTER COLUMN feature_cards SET DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_services_slug_unique
  ON public.services (slug)
  WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_set_updated_at ON public.services;
CREATE TRIGGER services_set_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.set_services_updated_at();

