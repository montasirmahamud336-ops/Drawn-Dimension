CREATE TABLE IF NOT EXISTS public.employee_advance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason VARCHAR(600) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_advance_requests_employee_status
  ON public.employee_advance_requests (employee_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_advance_requests_pending
  ON public.employee_advance_requests (status, requested_at DESC);
