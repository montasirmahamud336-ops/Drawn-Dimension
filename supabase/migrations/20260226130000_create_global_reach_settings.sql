CREATE TABLE IF NOT EXISTS public.global_reach_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  country_codes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_reach_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.global_reach_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.global_reach_settings TO authenticated;

DROP POLICY IF EXISTS "Public can read world map settings" ON public.global_reach_settings;
DROP POLICY IF EXISTS "Authenticated can insert world map settings" ON public.global_reach_settings;
DROP POLICY IF EXISTS "Authenticated can update world map settings" ON public.global_reach_settings;

CREATE POLICY "Public can read world map settings"
  ON public.global_reach_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can insert world map settings"
  ON public.global_reach_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update world map settings"
  ON public.global_reach_settings
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

INSERT INTO public.global_reach_settings (id, country_codes)
VALUES (1, '{}'::TEXT[])
ON CONFLICT (id) DO NOTHING;
