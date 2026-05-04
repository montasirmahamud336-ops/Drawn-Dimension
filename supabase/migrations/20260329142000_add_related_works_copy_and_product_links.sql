ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS live_link TEXT,
  ADD COLUMN IF NOT EXISTS github_link TEXT;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS related_works_badge TEXT,
  ADD COLUMN IF NOT EXISTS related_works_title TEXT,
  ADD COLUMN IF NOT EXISTS related_works_description TEXT,
  ADD COLUMN IF NOT EXISTS related_works_button_label TEXT,
  ADD COLUMN IF NOT EXISTS related_works_button_link TEXT,
  ADD COLUMN IF NOT EXISTS related_works_empty_text TEXT;

UPDATE public.services
SET related_works_badge = 'Our Work'
WHERE related_works_badge IS NULL OR btrim(related_works_badge) = '';

UPDATE public.services
SET related_works_title = 'Related {{service}} Projects'
WHERE related_works_title IS NULL OR btrim(related_works_title) = '';

UPDATE public.services
SET related_works_description = 'Live works linked from CMS for this service page appear here automatically.'
WHERE related_works_description IS NULL OR btrim(related_works_description) = '';

UPDATE public.services
SET related_works_button_label = 'View All Works'
WHERE related_works_button_label IS NULL OR btrim(related_works_button_label) = '';

UPDATE public.services
SET related_works_button_link = '/portfolio'
WHERE related_works_button_link IS NULL OR btrim(related_works_button_link) = '';

UPDATE public.services
SET related_works_empty_text = 'No live works are linked to this service yet. Select this service while posting from CMS Live Work to show it here.'
WHERE related_works_empty_text IS NULL OR btrim(related_works_empty_text) = '';
