ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS process_badge TEXT,
  ADD COLUMN IF NOT EXISTS process_title TEXT,
  ADD COLUMN IF NOT EXISTS pricing_badge TEXT,
  ADD COLUMN IF NOT EXISTS pricing_title TEXT,
  ADD COLUMN IF NOT EXISTS pricing_description TEXT,
  ADD COLUMN IF NOT EXISTS cta_title_prefix TEXT,
  ADD COLUMN IF NOT EXISTS cta_title_highlight TEXT,
  ADD COLUMN IF NOT EXISTS cta_description TEXT,
  ADD COLUMN IF NOT EXISTS cta_primary_label TEXT,
  ADD COLUMN IF NOT EXISTS cta_primary_link TEXT,
  ADD COLUMN IF NOT EXISTS cta_secondary_label TEXT,
  ADD COLUMN IF NOT EXISTS cta_secondary_link TEXT;

UPDATE public.services
SET process_badge = 'Our Process'
WHERE process_badge IS NULL OR btrim(process_badge) = '';

UPDATE public.services
SET process_title = 'How We Work'
WHERE process_title IS NULL OR btrim(process_title) = '';

UPDATE public.services
SET pricing_badge = 'Pricing Plans'
WHERE pricing_badge IS NULL OR btrim(pricing_badge) = '';

UPDATE public.services
SET pricing_title = 'Choose Your Plan'
WHERE pricing_title IS NULL OR btrim(pricing_title) = '';

UPDATE public.services
SET pricing_description = 'All plans require payment before service delivery begins. Custom quotes available for complex projects.'
WHERE pricing_description IS NULL OR btrim(pricing_description) = '';

UPDATE public.services
SET cta_title_prefix = 'Ready to Transform Your'
WHERE cta_title_prefix IS NULL OR btrim(cta_title_prefix) = '';

UPDATE public.services
SET cta_title_highlight = 'Vision Into Reality?'
WHERE cta_title_highlight IS NULL OR btrim(cta_title_highlight) = '';

UPDATE public.services
SET cta_description = 'Let''s discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.'
WHERE cta_description IS NULL OR btrim(cta_description) = '';

UPDATE public.services
SET cta_primary_label = 'Get Free Consultation'
WHERE cta_primary_label IS NULL OR btrim(cta_primary_label) = '';

UPDATE public.services
SET cta_primary_link = '/contact'
WHERE cta_primary_link IS NULL OR btrim(cta_primary_link) = '';

UPDATE public.services
SET cta_secondary_label = 'View Our Portfolio'
WHERE cta_secondary_label IS NULL OR btrim(cta_secondary_label) = '';

UPDATE public.services
SET cta_secondary_link = '/portfolio'
WHERE cta_secondary_link IS NULL OR btrim(cta_secondary_link) = '';
