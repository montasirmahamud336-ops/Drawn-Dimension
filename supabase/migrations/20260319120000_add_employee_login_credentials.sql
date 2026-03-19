CREATE TABLE IF NOT EXISTS public.employee_login_credentials (
  employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  login_password_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_login_credentials ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_employee_login_credentials_updated_at ON public.employee_login_credentials;
CREATE TRIGGER update_employee_login_credentials_updated_at
  BEFORE UPDATE ON public.employee_login_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
