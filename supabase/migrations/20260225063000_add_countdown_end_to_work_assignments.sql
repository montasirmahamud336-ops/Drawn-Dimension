ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS countdown_end_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_work_assignments_countdown_end_at
  ON public.work_assignments (countdown_end_at);
