-- Create payment_settings table for dynamic payment gateway management
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  stripe_publishable_key TEXT NOT NULL DEFAULT '',
  stripe_secret_key TEXT NOT NULL DEFAULT '',
  stripe_webhook_secret TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  mode VARCHAR(10) NOT NULL DEFAULT 'test',
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure initial configuration row exists
INSERT INTO public.payment_settings (id, stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, is_active, mode, currency)
VALUES (1, '', '', '', true, 'test', 'usd')
ON CONFLICT (id) DO NOTHING;
