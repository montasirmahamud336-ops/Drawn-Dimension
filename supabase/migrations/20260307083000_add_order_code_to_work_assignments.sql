ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS order_code TEXT;

ALTER TABLE public.work_assignments
  ALTER COLUMN order_code SET DEFAULT (
    'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  );

UPDATE public.work_assignments
SET order_code = 'ORD-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE coalesce(trim(order_code), '') = '';

ALTER TABLE public.work_assignments
  ALTER COLUMN order_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_assignments_order_code_check'
      AND conrelid = 'public.work_assignments'::regclass
  ) THEN
    ALTER TABLE public.work_assignments
      ADD CONSTRAINT work_assignments_order_code_check
      CHECK (char_length(trim(order_code)) > 0);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_assignments_order_code_unique
  ON public.work_assignments (lower(order_code));
