CREATE TABLE IF NOT EXISTS public.home_page_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.home_page_settings
  ADD COLUMN IF NOT EXISTS id SMALLINT,
  ADD COLUMN IF NOT EXISTS settings JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.home_page_settings
SET
  id = COALESCE(id, 1),
  settings = COALESCE(settings, '{}'::jsonb),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE
  id IS NULL
  OR settings IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

ALTER TABLE public.home_page_settings
  ALTER COLUMN id SET DEFAULT 1,
  ALTER COLUMN settings SET DEFAULT '{}'::jsonb,
  ALTER COLUMN settings SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'home_page_settings_pkey'
      AND conrelid = 'public.home_page_settings'::regclass
  ) THEN
    ALTER TABLE public.home_page_settings
      ADD CONSTRAINT home_page_settings_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'home_page_settings_singleton_check'
      AND conrelid = 'public.home_page_settings'::regclass
  ) THEN
    ALTER TABLE public.home_page_settings
      ADD CONSTRAINT home_page_settings_singleton_check
      CHECK (id = 1);
  END IF;
END
$$;

ALTER TABLE public.home_page_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.home_page_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.home_page_settings TO authenticated;

DROP POLICY IF EXISTS "Public can read home page settings" ON public.home_page_settings;
DROP POLICY IF EXISTS "Authenticated can insert home page settings" ON public.home_page_settings;
DROP POLICY IF EXISTS "Authenticated can update home page settings" ON public.home_page_settings;

CREATE POLICY "Public can read home page settings"
  ON public.home_page_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can insert home page settings"
  ON public.home_page_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update home page settings"
  ON public.home_page_settings
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
