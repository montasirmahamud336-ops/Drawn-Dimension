CREATE TABLE IF NOT EXISTS public.service_faqs (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('draft', 'live')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_blogs (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES public.services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_faqs_service_id ON public.service_faqs(service_id);
CREATE INDEX IF NOT EXISTS idx_service_faqs_status ON public.service_faqs(status);
CREATE INDEX IF NOT EXISTS idx_service_faqs_display_order ON public.service_faqs(display_order);

CREATE INDEX IF NOT EXISTS idx_service_blogs_service_id ON public.service_blogs(service_id);
CREATE INDEX IF NOT EXISTS idx_service_blogs_status ON public.service_blogs(status);
CREATE INDEX IF NOT EXISTS idx_service_blogs_published_at ON public.service_blogs(published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_blogs_slug_unique ON public.service_blogs(slug);

CREATE OR REPLACE FUNCTION public.set_generic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_faqs_set_updated_at ON public.service_faqs;
CREATE TRIGGER service_faqs_set_updated_at
BEFORE UPDATE ON public.service_faqs
FOR EACH ROW
EXECUTE FUNCTION public.set_generic_updated_at();

DROP TRIGGER IF EXISTS service_blogs_set_updated_at ON public.service_blogs;
CREATE TRIGGER service_blogs_set_updated_at
BEFORE UPDATE ON public.service_blogs
FOR EACH ROW
EXECUTE FUNCTION public.set_generic_updated_at();
