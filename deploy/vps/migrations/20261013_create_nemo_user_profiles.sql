-- Migration: Create Nemo Roast AI User Profiles and Sessions
-- Ensures each user has an isolated profile and chat memory in PostgreSQL

CREATE TABLE IF NOT EXISTS public.nemo_user_profiles (
  user_id UUID PRIMARY KEY,
  name TEXT,
  age INTEGER,
  profession TEXT,
  relationship_status TEXT,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  insults_received INTEGER NOT NULL DEFAULT 0,
  custom_memory JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nemo_chat_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Roast Chat',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nemo_chat_sessions_user_id ON public.nemo_chat_sessions(user_id);
