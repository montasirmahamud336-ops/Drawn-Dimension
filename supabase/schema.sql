CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('draft', 'live')),
  short_description TEXT,
  hero_badge TEXT,
  hero_title TEXT,
  hero_description TEXT,
  features TEXT[] DEFAULT '{}',
  feature_cards JSONB DEFAULT '[]'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_live BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_media (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects (category);
CREATE INDEX IF NOT EXISTS idx_projects_is_live ON projects (is_live);
CREATE INDEX IF NOT EXISTS idx_project_media_project_id ON project_media (project_id);
CREATE INDEX IF NOT EXISTS idx_services_name ON services (name);
CREATE INDEX IF NOT EXISTS idx_services_status ON services (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_slug_unique ON services (slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_faqs (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('draft', 'live')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_blogs (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_faqs_service_id ON service_faqs (service_id);
CREATE INDEX IF NOT EXISTS idx_service_faqs_status ON service_faqs (status);
CREATE INDEX IF NOT EXISTS idx_service_faqs_display_order ON service_faqs (display_order);

CREATE INDEX IF NOT EXISTS idx_service_blogs_service_id ON service_blogs (service_id);
CREATE INDEX IF NOT EXISTS idx_service_blogs_status ON service_blogs (status);
CREATE INDEX IF NOT EXISTS idx_service_blogs_published_at ON service_blogs (published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_blogs_slug_unique ON service_blogs (slug);

CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  contact_info TEXT,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_created_at ON team_members (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members (is_active);

-- Seed services (safe to run multiple times)
INSERT INTO services (name) VALUES
  ('Web Design'),
  ('AutoCAD'),
  ('SolidWorks'),
  ('PFD & P&ID'),
  ('HAZOP'),
  ('Graphic Design')
ON CONFLICT (name) DO NOTHING;
