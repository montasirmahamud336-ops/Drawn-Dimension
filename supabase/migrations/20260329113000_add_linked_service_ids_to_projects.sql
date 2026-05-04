ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS linked_service_ids INTEGER[] NOT NULL DEFAULT '{}';

UPDATE public.projects
SET linked_service_ids = '{}'
WHERE linked_service_ids IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'service_id'
  ) THEN
    EXECUTE '
      UPDATE public.projects
      SET linked_service_ids = ARRAY[service_id]
      WHERE service_id IS NOT NULL
        AND COALESCE(array_length(linked_service_ids, 1), 0) = 0
    ';
  END IF;
END $$;

ALTER TABLE public.projects
  ALTER COLUMN linked_service_ids SET DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_projects_linked_service_ids
  ON public.projects
  USING GIN (linked_service_ids);
