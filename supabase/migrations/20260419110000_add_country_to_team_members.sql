-- Add optional country for public team members so employee cards can show "From Country Name".
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS country TEXT;
