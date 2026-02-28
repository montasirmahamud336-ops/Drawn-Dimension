ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.services
SET status = 'live'
WHERE status IS NULL;

ALTER TABLE public.services
ALTER COLUMN status SET DEFAULT 'live';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_status_check'
  ) THEN
    ALTER TABLE public.services
    ADD CONSTRAINT services_status_check
    CHECK (status IN ('draft', 'live'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_services_status ON public.services (status);
