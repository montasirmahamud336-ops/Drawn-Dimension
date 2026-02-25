ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2) DEFAULT 0;

UPDATE public.work_assignments
SET payment_amount = 0
WHERE payment_amount IS NULL;

ALTER TABLE public.work_assignments
  ALTER COLUMN payment_amount SET DEFAULT 0,
  ALTER COLUMN payment_amount SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_assignments_payment_amount_check'
      AND conrelid = 'public.work_assignments'::regclass
  ) THEN
    ALTER TABLE public.work_assignments
      ADD CONSTRAINT work_assignments_payment_amount_check
      CHECK (payment_amount >= 0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_work_assignments_payment_amount_created
  ON public.work_assignments (payment_amount, created_at DESC);
