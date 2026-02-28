ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS section_badge TEXT,
  ADD COLUMN IF NOT EXISTS section_title TEXT,
  ADD COLUMN IF NOT EXISTS section_description TEXT,
  ADD COLUMN IF NOT EXISTS section_left_items TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS section_panel_title TEXT,
  ADD COLUMN IF NOT EXISTS section_panel_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS section_panel_items TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS process_steps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb;

UPDATE public.services
SET section_badge = 'What You Get'
WHERE section_badge IS NULL OR btrim(section_badge) = '';

UPDATE public.services
SET section_title = concat('Complete ', name, ' Solutions')
WHERE section_title IS NULL OR btrim(section_title) = '';

UPDATE public.services
SET section_description = concat(
  'We deliver structured and professional ',
  lower(name),
  ' support from planning to final handover.'
)
WHERE section_description IS NULL OR btrim(section_description) = '';

UPDATE public.services
SET section_panel_title = 'Professional Delivery Stack'
WHERE section_panel_title IS NULL OR btrim(section_panel_title) = '';

UPDATE public.services
SET section_panel_subtitle = 'Built for clarity and dependable output'
WHERE section_panel_subtitle IS NULL OR btrim(section_panel_subtitle) = '';

UPDATE public.services
SET section_left_items = COALESCE(features, '{}'::text[])
WHERE section_left_items IS NULL;

UPDATE public.services
SET section_panel_items = COALESCE(section_left_items, '{}'::text[])
WHERE section_panel_items IS NULL;

UPDATE public.services
SET process_steps = '[]'::jsonb
WHERE process_steps IS NULL;

UPDATE public.services
SET pricing_tiers = '[]'::jsonb
WHERE pricing_tiers IS NULL;

ALTER TABLE public.services
  ALTER COLUMN section_left_items SET DEFAULT '{}',
  ALTER COLUMN section_panel_items SET DEFAULT '{}',
  ALTER COLUMN process_steps SET DEFAULT '[]'::jsonb,
  ALTER COLUMN pricing_tiers SET DEFAULT '[]'::jsonb;
