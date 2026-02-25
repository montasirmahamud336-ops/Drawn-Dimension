ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS employee_submission_status TEXT,
  ADD COLUMN IF NOT EXISTS employee_submission_note TEXT,
  ADD COLUMN IF NOT EXISTS employee_submission_file_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_submission_at TIMESTAMPTZ;

UPDATE public.work_assignments
SET employee_submission_status = 'pending'
WHERE employee_submission_status IS NULL;

ALTER TABLE public.work_assignments
  ALTER COLUMN employee_submission_status SET DEFAULT 'pending',
  ALTER COLUMN employee_submission_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_assignments_employee_submission_status_check'
      AND conrelid = 'public.work_assignments'::regclass
  ) THEN
    ALTER TABLE public.work_assignments
      ADD CONSTRAINT work_assignments_employee_submission_status_check
      CHECK (employee_submission_status IN ('pending', 'submitted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_assignments_submission_status_created
  ON public.work_assignments (employee_submission_status, created_at DESC);
