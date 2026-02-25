ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'leadership';

UPDATE public.team_members
SET member_type = 'leadership'
WHERE member_type IS NULL
   OR member_type NOT IN ('leadership', 'employee');

ALTER TABLE public.team_members
  ALTER COLUMN member_type SET DEFAULT 'leadership',
  ALTER COLUMN member_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_member_type_check'
      AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_member_type_check
      CHECK (member_type IN ('leadership', 'employee'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_team_members_status_type_display_order
  ON public.team_members (status, member_type, display_order, created_at DESC);
