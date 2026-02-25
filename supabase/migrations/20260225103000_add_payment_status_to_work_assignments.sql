ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

UPDATE public.work_assignments
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

ALTER TABLE public.work_assignments
  ALTER COLUMN payment_status SET DEFAULT 'unpaid',
  ALTER COLUMN payment_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_assignments_payment_status_check'
      AND conrelid = 'public.work_assignments'::regclass
  ) THEN
    ALTER TABLE public.work_assignments
      ADD CONSTRAINT work_assignments_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_work_assignments_payment_status_created
  ON public.work_assignments (payment_status, created_at DESC);
