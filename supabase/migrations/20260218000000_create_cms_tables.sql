
-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Public read access for live products"
  ON public.products FOR SELECT
  USING (status = 'live' OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage products"
  ON public.products FOR ALL
  USING (auth.role() = 'authenticated');


-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Team Members policies
CREATE POLICY "Public read access for live team members"
  ON public.team_members FOR SELECT
  USING (status = 'live' OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage team members"
  ON public.team_members FOR ALL
  USING (auth.role() = 'authenticated');


-- Update projects table for CMS
-- Use DO block to check for column existence and add if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        CREATE TABLE public.projects (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            category TEXT,
            tags TEXT[],
            live_link TEXT,
            github_link TEXT,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Public read access for live projects"
          ON public.projects FOR SELECT
          USING (status = 'live' OR auth.role() = 'authenticated');
          
        CREATE POLICY "Authenticated users can manage projects"
          ON public.projects FOR ALL
          USING (auth.role() = 'authenticated');
    ELSE
        -- If table exists, ensure status column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'status') THEN
            ALTER TABLE public.projects ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live'));
        END IF;
    END IF;
END $$;

-- Create storage bucket for cms-uploads if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-uploads', 'cms-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload cms files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cms-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Public read access for cms files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cms-uploads');

CREATE POLICY "Authenticated users can update/delete cms files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cms-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete cms files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cms-uploads' AND auth.role() = 'authenticated');
