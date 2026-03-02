-- Add optional country field for review/testimonial records used by CMS.

ALTER TABLE IF EXISTS public.testimonials
  ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE IF EXISTS public.reviews
  ADD COLUMN IF NOT EXISTS country TEXT;
