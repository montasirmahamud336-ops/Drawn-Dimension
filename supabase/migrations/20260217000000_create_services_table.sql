CREATE TABLE IF NOT EXISTS public.services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('draft', 'live')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_name ON public.services (name);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services (status);

