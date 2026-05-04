CREATE TABLE IF NOT EXISTS public.project_inquiries (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  project_title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_inquiries
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS project_title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.project_inquiries
SET status = 'active'
WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_inquiries_status_check'
      AND conrelid = 'public.project_inquiries'::regclass
  ) THEN
    ALTER TABLE public.project_inquiries
      ADD CONSTRAINT project_inquiries_status_check
      CHECK (status IN ('active', 'draft'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.project_inquiry_files (
  id SERIAL PRIMARY KEY,
  inquiry_id INTEGER NOT NULL REFERENCES public.project_inquiries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_inquiries_status_created_at
  ON public.project_inquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_inquiry_files_inquiry_id
  ON public.project_inquiry_files (inquiry_id);
