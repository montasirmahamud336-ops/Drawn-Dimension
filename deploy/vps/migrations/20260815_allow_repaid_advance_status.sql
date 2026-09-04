-- Migration: Allow 'repaid' and 'settled' statuses for employee_advance_requests
-- Run on VPS PostgreSQL with:
-- psql "$DATABASE_URL" -f deploy/vps/migrations/20260815_allow_repaid_advance_status.sql

ALTER TABLE public.employee_advance_requests DROP CONSTRAINT IF EXISTS employee_advance_requests_status_check;
ALTER TABLE public.employee_advance_requests ADD CONSTRAINT employee_advance_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'repaid', 'settled'));
