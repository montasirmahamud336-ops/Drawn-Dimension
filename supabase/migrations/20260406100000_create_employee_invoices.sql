ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.work_assignments
SET completed_at = COALESCE(completed_at, updated_at, created_at)
WHERE status = 'done'
  AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_assignments_completed_at_status
  ON public.work_assignments (completed_at DESC, employee_id, status);

CREATE TABLE IF NOT EXISTS public.employee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_month DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  emailed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.employee_invoices(id) ON DELETE CASCADE,
  work_assignment_id UUID REFERENCES public.work_assignments(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL DEFAULT 'assignment' CHECK (item_type IN ('assignment', 'custom')),
  order_code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_invoices_invoice_number
  ON public.employee_invoices (lower(invoice_number));

CREATE INDEX IF NOT EXISTS idx_employee_invoices_employee_month
  ON public.employee_invoices (employee_id, invoice_month DESC, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_invoices_month_sent
  ON public.employee_invoices (invoice_month DESC, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_invoice_line_items_invoice
  ON public.employee_invoice_line_items (invoice_id, display_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_employee_invoice_line_items_assignment
  ON public.employee_invoice_line_items (work_assignment_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_invoice_line_items_amount_check'
      AND conrelid = 'public.employee_invoice_line_items'::regclass
  ) THEN
    ALTER TABLE public.employee_invoice_line_items
      ADD CONSTRAINT employee_invoice_line_items_amount_check
      CHECK (amount >= 0);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_employee_invoices_updated_at ON public.employee_invoices;
CREATE TRIGGER update_employee_invoices_updated_at
  BEFORE UPDATE ON public.employee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
