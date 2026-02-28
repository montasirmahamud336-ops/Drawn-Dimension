INSERT INTO public.services (
  name,
  slug,
  status,
  short_description,
  hero_badge,
  hero_title,
  hero_description,
  features,
  feature_cards,
  meta_title,
  meta_description
)
VALUES
  (
    'Web Design & Development',
    'web-design',
    'live',
    'Stunning, responsive websites built with modern technologies. From landing pages to complex web applications.',
    'Digital Solutions',
    'Web Design & Development',
    'Transform your online presence with stunning, high-performance websites that drive results.',
    ARRAY['Custom Design', 'React/Next.js', 'E-commerce', 'CMS Integration'],
    '[
      {"title":"Custom Development","description":"Tailored solutions built with modern frameworks and scalable architecture."},
      {"title":"Responsive Design","description":"Pixel-perfect layouts that perform smoothly across desktop, tablet, and mobile."},
      {"title":"Performance Optimized","description":"Fast-loading pages with clean code, optimization, and SEO-focused structure."}
    ]'::jsonb,
    'Web Design & Development Services | Drawn Dimension',
    'Professional web design and development services with modern UI, responsive build, and SEO-ready performance.'
  ),
  (
    'AutoCAD Technical Drawings',
    'autocad',
    'live',
    'Precise 2D technical drawings and documentation for engineering, architecture, and manufacturing projects.',
    'Engineering CAD',
    'AutoCAD Technical Drawings',
    'Accurate technical drafting services prepared for practical execution and submission.',
    ARRAY['2D Drafting', 'As-Built Drawings', 'Shop Drawings', 'Detail Plans'],
    '[
      {"title":"2D Drafting","description":"High-accuracy AutoCAD drafting for industrial and architectural requirements."},
      {"title":"As-Built Documents","description":"Field-verified drawings reflecting final implementation with clear revisions."},
      {"title":"Submission Ready Files","description":"Organized deliverables formatted for client and authority approval workflows."}
    ]'::jsonb,
    'AutoCAD Technical Drawings Services | Drawn Dimension',
    'Professional AutoCAD technical drawings including 2D drafting, as-built plans, and submission-ready documentation.'
  ),
  (
    '3D SolidWorks Modeling',
    'solidworks',
    'live',
    'Advanced 3D modeling and simulation for product design, prototyping, and mechanical engineering.',
    '3D Engineering',
    '3D SolidWorks Modeling',
    'From concept to production-ready model, we deliver precise and practical SolidWorks outputs.',
    ARRAY['3D Modeling', 'Assembly Design', 'FEA Analysis', 'Rendering'],
    '[
      {"title":"Parametric Modeling","description":"Accurate 3D part and assembly models prepared for design iteration."},
      {"title":"Assembly Engineering","description":"Robust assembly structures with tolerances and manufacturability alignment."},
      {"title":"Simulation Support","description":"Performance checks and visual validation to reduce prototype risk."}
    ]'::jsonb,
    '3D SolidWorks Modeling Services | Drawn Dimension',
    '3D SolidWorks modeling services for product design, assembly engineering, and technical simulation support.'
  ),
  (
    'PFD & P&ID Diagrams',
    'pfd-pid',
    'live',
    'Comprehensive process flow diagrams and piping & instrumentation diagrams for industrial applications.',
    'Process Engineering',
    'PFD & P&ID Diagram Services',
    'Clear process documentation and instrumentation layout for industrial operations and compliance.',
    ARRAY['Process Design', 'P&ID Standards', 'Equipment Specs', 'Control Systems'],
    '[
      {"title":"Process Flow Clarity","description":"Well-structured PFDs that map system flow and equipment relation clearly."},
      {"title":"P&ID Accuracy","description":"Detailed instrumentation and control representation aligned with standards."},
      {"title":"Project Documentation","description":"Submission-ready technical sheets for execution, audit, and client review."}
    ]'::jsonb,
    'PFD & P&ID Diagram Services | Drawn Dimension',
    'Industrial PFD and P&ID diagram services with clear process flow, control systems mapping, and technical compliance.'
  ),
  (
    'HAZOP Study & Risk Analysis',
    'hazop',
    'live',
    'Thorough hazard and operability studies to ensure safety and compliance in industrial processes.',
    'Safety Engineering',
    'HAZOP Study & Risk Analysis',
    'Structured hazard review and actionable recommendations to strengthen process safety.',
    ARRAY['Risk Assessment', 'Safety Analysis', 'Compliance', 'Documentation'],
    '[
      {"title":"Hazard Identification","description":"Systematic review of process nodes to identify and classify key risks."},
      {"title":"Operability Review","description":"Evaluation of process deviations with prevention and mitigation strategy."},
      {"title":"Compliance Reporting","description":"Clear documentation for internal safety control and regulatory submission."}
    ]'::jsonb,
    'HAZOP Study & Risk Analysis Services | Drawn Dimension',
    'HAZOP study and risk analysis services for safer industrial process design and compliance documentation.'
  ),
  (
    'Graphic Design & Branding',
    'graphic-design',
    'live',
    'Creative visual solutions from marketing materials to complete brand identities that captivate audiences.',
    'Creative Studio',
    'Graphic Design & Branding',
    'Premium visual communication designed for strong brand recall and business growth.',
    ARRAY['Brand Identity', 'Marketing Materials', 'Social Media', 'Print Design'],
    '[
      {"title":"Brand Identity","description":"Strategic visual identity system tailored to brand positioning and audience."},
      {"title":"Marketing Collateral","description":"High-quality design assets for digital and print communication."},
      {"title":"Campaign Visuals","description":"Consistent creative language across social, web, and offline touchpoints."}
    ]'::jsonb,
    'Graphic Design & Branding Services | Drawn Dimension',
    'Graphic design and branding services including brand identity, marketing materials, and campaign visuals.'
  )
ON CONFLICT (name) DO UPDATE
SET
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  short_description = EXCLUDED.short_description,
  hero_badge = EXCLUDED.hero_badge,
  hero_title = EXCLUDED.hero_title,
  hero_description = EXCLUDED.hero_description,
  features = EXCLUDED.features,
  feature_cards = EXCLUDED.feature_cards,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

