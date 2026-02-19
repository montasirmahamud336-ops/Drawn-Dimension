-- Seed initial published testimonials if none exist.
INSERT INTO public.testimonials (
  name,
  role,
  image_url,
  content,
  rating,
  service_tag,
  is_published,
  display_order
)
SELECT
  seeded.name,
  seeded.role,
  seeded.image_url,
  seeded.content,
  seeded.rating,
  seeded.service_tag,
  true,
  seeded.display_order
FROM (
  VALUES
    (
      'Sarah Mitchell',
      'CEO, TechVentures Inc',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      'Drawn Dimension transformed our online presence completely. Their web development team created a stunning platform that increased our conversions by 200%. Their attention to detail and commitment to quality is unmatched.',
      5,
      'Web Development',
      1
    ),
    (
      'Michael Chen',
      'Plant Manager, PetroGlobal',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      'The P&ID documentation delivered by Drawn Dimension was exceptional. Their engineers understood our complex processes and delivered accurate, compliant diagrams that have been praised by our auditors.',
      5,
      'P&ID Engineering',
      2
    ),
    (
      'Emily Rodriguez',
      'Marketing Director, Nexus Financial',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      'The brand identity they created for us perfectly captures our corporate values while feeling modern and innovative. Our stakeholders were impressed, and we''ve received countless compliments on our new look.',
      5,
      'Brand Identity',
      3
    ),
    (
      'David Thompson',
      'Engineering Lead, FlowDynamics',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      'The 3D SolidWorks models delivered were incredibly detailed and accurate. The FEA analysis helped us identify potential issues before manufacturing, saving us significant costs and time.',
      5,
      '3D Modeling',
      4
    ),
    (
      'Jennifer Park',
      'Safety Manager, Gulf Refining',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
      'Their HAZOP study was thorough and professionally conducted. The team identified critical safety improvements that we had overlooked. They truly understand process safety.',
      5,
      'HAZOP Study',
      5
    ),
    (
      'Robert Williams',
      'Founder, CloudSync Tech',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      'From logo design to social media templates, Drawn Dimension delivered a complete brand package that helped us launch successfully. Their creative team is talented and responsive.',
      5,
      'Graphic Design',
      6
    )
) AS seeded(name, role, image_url, content, rating, service_tag, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.testimonials LIMIT 1);
