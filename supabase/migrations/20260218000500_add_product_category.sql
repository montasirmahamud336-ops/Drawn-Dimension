
-- Add category column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;
