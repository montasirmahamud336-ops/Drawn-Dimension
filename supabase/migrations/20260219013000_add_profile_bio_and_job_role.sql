alter table public.profiles
  add column if not exists bio text,
  add column if not exists job_role text;
