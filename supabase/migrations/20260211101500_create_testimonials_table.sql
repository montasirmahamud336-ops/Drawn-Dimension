-- Reviews/testimonials displayed publicly on the website.
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  image_url TEXT,
  content TEXT NOT NULL,
  rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  service_tag TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_published_order_idx
  ON public.testimonials (is_published, display_order, created_at DESC);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published testimonials are viewable by everyone" ON public.testimonials;
CREATE POLICY "Published testimonials are viewable by everyone"
  ON public.testimonials
  FOR SELECT
  USING (is_published = true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS update_testimonials_updated_at ON public.testimonials;
    CREATE TRIGGER update_testimonials_updated_at
      BEFORE UPDATE ON public.testimonials
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;
