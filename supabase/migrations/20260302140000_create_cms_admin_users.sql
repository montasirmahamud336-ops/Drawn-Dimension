-- CMS admin users for owner-controlled dashboard access.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.cms_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_admin_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cms_admin_users_role_active
  ON public.cms_admin_users (role, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_admin_users_email_lower
  ON public.cms_admin_users (lower(email));

CREATE INDEX IF NOT EXISTS idx_cms_admin_users_username_lower
  ON public.cms_admin_users (lower(username));

DROP TRIGGER IF EXISTS update_cms_admin_users_updated_at ON public.cms_admin_users;
CREATE TRIGGER update_cms_admin_users_updated_at
  BEFORE UPDATE ON public.cms_admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cms_admin_users (
  full_name,
  email,
  username,
  password_hash,
  role,
  is_active
)
VALUES (
  'Muhammad Muntasir Mahmud',
  'montasirmahamud336@gmail.com',
  'montasirmahamud336',
  '$2a$10$RMOfMm/Psz4m2dX5WJqS2ugWwNZtWVgb2aZIgvgbLEzA46IP75lam',
  'owner',
  true
)
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  role = 'owner',
  is_active = true,
  updated_at = now();
