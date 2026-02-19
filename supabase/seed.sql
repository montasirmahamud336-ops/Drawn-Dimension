-- Seed data for Projects (Works)
INSERT INTO public.projects (title, description, image_url, category, tags, status, created_at)
VALUES 
(
    'Modern Corporate Website', 
    'A complete brand overhaul and website redesign for a leading tech firm, focusing on user experience and conversion optimization.', 
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop', 
    'Web Design', 
    '{react,typescript,tailwind}', 
    'live',
    NOW()
),
(
    'Industrial Piping System', 
    'Detailed PFD and P&ID diagrams for a large-scale chemical processing plant, ensuring safety and compliance with international standards.', 
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop', 
    'Engineering', 
    '{autocad,pjd,industrial}', 
    'live',
    NOW() - INTERVAL '1 day'
),
(
    'Mechanical Gear Assembly', 
    'Complex 3D modeling and stress analysis of a high-performance transmission system for automotive applications.', 
    'https://images.unsplash.com/photo-1537462713505-9e691461d411?w=800&h=600&fit=crop', 
    'CAD & 3D', 
    '{solidworks,3d-modeling,mechanical}', 
    'live',
    NOW() - INTERVAL '2 days'
),
(
    'Eco-Friendly Brand Identity', 
    'Logo design, packaging, and visual identity for a sustainable lifestyle brand.', 
    'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&h=600&fit=crop', 
    'Branding', 
    '{design,branding,logo}', 
    'live',
    NOW() - INTERVAL '3 days'
);

-- Seed data for Products
INSERT INTO public.products (name, description, price, image_url, category, status, created_at)
VALUES
(
    'Premium Portfolio Theme',
    'A sleek, high-performance React portfolio template for creatives.',
    49.99,
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=600&fit=crop',
    'Custom Code',
    'live',
    NOW()
),
(
    'AutoCAD Library Bundle',
    'A comprehensive collection of 500+ standard engineering blocks and symbols.',
    29.99,
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&h=600&fit=crop',
    'Engineering',
    'live',
    NOW() - INTERVAL '1 day'
);

-- Seed data for Team Members
INSERT INTO public.team_members (name, role, bio, image_url, status, created_at)
VALUES
(
    'Alex Morgan',
    'Lead Engineer',
    '10+ years of experience in industrial design and mechanical engineering.',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
    'live',
    NOW()
),
(
    'Sarah Chen',
    'Senior Web Developer',
    'Full-stack wizard specializing in React and modern web architectures.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    'live',
    NOW() - INTERVAL '1 day'
);
