export type HomeSectionId =
  | "hero"
  | "key-metrics"
  | "trusted-logos"
  | "services"
  | "portfolio"
  | "global-reach"
  | "testimonials"
  | "about"
  | "why-choose-us"
  | "cta";

export const HOME_SECTION_ORDER: HomeSectionId[] = [
  "hero",
  "key-metrics",
  "trusted-logos",
  "services",
  "portfolio",
  "global-reach",
  "testimonials",
  "about",
  "why-choose-us",
  "cta",
];

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  hero: "Hero",
  "key-metrics": "Key Metrics",
  "trusted-logos": "Trusted Logos",
  services: "Services",
  portfolio: "Portfolio",
  "global-reach": "Global Reach",
  testimonials: "Testimonials",
  about: "About",
  "why-choose-us": "Why Choose Us",
  cta: "CTA",
};

export const MAX_HOME_TRUSTED_LOGOS = 12;
export const MAX_HOME_HERO_SOFTWARE_LOGOS = 5;

const LEGACY_HOME_SECTION_ORDER: HomeSectionId[] = [
  "hero",
  "services",
  "portfolio",
  "global-reach",
  "testimonials",
  "about",
  "why-choose-us",
  "cta",
  "trusted-logos",
];

const PRE_TRUSTED_LOGOS_SECTION_ORDER: HomeSectionId[] = [
  "hero",
  "services",
  "portfolio",
  "global-reach",
  "testimonials",
  "about",
  "why-choose-us",
  "cta",
];

export type HomeHeroCard = {
  id: string;
  icon: string;
  title: string;
  description: string;
  link: string;
};

export type HomeHeroSoftwareItem = {
  id: string;
  name: string;
  image_url: string;
};

export type HomeHeroSoftwareStrip = {
  enabled: boolean;
  items: HomeHeroSoftwareItem[];
};

export type HomeHeroSection = {
  enabled: boolean;
  badge: string;
  title_line_1: string;
  title_line_2: string;
  description: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  cards: HomeHeroCard[];
  software_strip: HomeHeroSoftwareStrip;
};

export type HomeServiceCard = {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  link: string;
};

export type HomeServicesSection = {
  enabled: boolean;
  badge: string;
  title: string;
  title_highlight: string;
  description: string;
  items: HomeServiceCard[];
  cta_title: string;
  cta_description: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
};

export type HomePortfolioSection = {
  enabled: boolean;
  badge: string;
  title: string;
  title_highlight: string;
  description: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
};

export type HomeGlobalReachSection = {
  enabled: boolean;
  badge: string;
  title: string;
  title_highlight: string;
  description: string;
  empty_title: string;
  empty_description: string;
};

export type HomeTestimonialsSection = {
  enabled: boolean;
  badge: string;
  title: string;
};

export type HomeTrustedLogoItem = {
  id: string;
  name: string;
  image_url: string;
  link: string;
};

export type HomeTrustedLogosSection = {
  enabled: boolean;
  badge: string;
  title: string;
  description: string;
  logos: HomeTrustedLogoItem[];
};

export type HomeValueCard = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export type HomeAboutSection = {
  enabled: boolean;
  badge: string;
  title: string;
  title_highlight: string;
  description: string;
  description_secondary: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  values: HomeValueCard[];
};

export type HomeReasonCard = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export type HomeStatItem = {
  id: string;
  value: string;
  label: string;
};

export type HomeMetricItem = {
  id: string;
  label: string;
  value: string;
  label_font_size_px: number;
  label_color: string;
  value_font_size_px: number;
  value_color: string;
};

export type HomeKeyMetricsSection = {
  enabled: boolean;
  items: HomeMetricItem[];
};

export type HomeWhyChooseSection = {
  enabled: boolean;
  badge: string;
  title: string;
  title_highlight: string;
  description: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  reasons: HomeReasonCard[];
  stats: HomeStatItem[];
};

export type HomeCTASection = {
  enabled: boolean;
  compact: boolean;
  title_prefix: string;
  title_highlight: string;
  description: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
};

export type HomePageSections = {
  hero: HomeHeroSection;
  "key-metrics": HomeKeyMetricsSection;
  "trusted-logos": HomeTrustedLogosSection;
  services: HomeServicesSection;
  portfolio: HomePortfolioSection;
  "global-reach": HomeGlobalReachSection;
  testimonials: HomeTestimonialsSection;
  about: HomeAboutSection;
  "why-choose-us": HomeWhyChooseSection;
  cta: HomeCTASection;
};

export type HomePageSettings = {
  section_order: HomeSectionId[];
  sections: HomePageSections;
  updated_at: string | null;
  needs_migration?: boolean;
};

const buildId = (value: unknown, fallback: string, index: number) => {
  const raw = typeof value === "string" ? value.trim() : "";
  const base =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `${fallback}-${index + 1}`;
  return base;
};

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const preferText = (value: unknown, fallback: string) => normalizeText(value) || fallback;
export const normalizeProjectCtaHref = (label: unknown, href: unknown) => {
  const target = normalizeText(href) || "/start-project";
  const text = normalizeText(label).toLowerCase();
  const isProjectCta =
    text.includes("start") ||
    text.includes("project") ||
    text.includes("consultation") ||
    text.includes("quote") ||
    text.includes("get started");

  return target === "/contact" && isProjectCta ? "/start-project" : target;
};
const normalizeBool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;
const normalizeNumber = (value: unknown, fallback: number, min = 1, max = 120) => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
};
const normalizeHexColor = (value: unknown, fallback: string) => {
  const trimmed = normalizeText(value);
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(trimmed) ? trimmed : fallback;
};

type NormalizeHomePageSettingsOptions = {
  preserveIncompleteHeroCards?: boolean;
};

const normalizeList = (value: unknown, fallback: string[], limit = 12) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, limit);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  return fallback;
};

const normalizeHeroCards = (
  value: unknown,
  fallback: HomeHeroCard[],
  options?: NormalizeHomePageSettingsOptions,
) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const title = normalizeText(row.title);
      const description = normalizeText(row.description);
      const icon = normalizeText(row.icon) || "file-text";
      const link = normalizeText(row.link);

      if (!title) {
        if (!options?.preserveIncompleteHeroCards) {
          return null;
        }

        const draftIdSource = row.id ?? title ?? description ?? row.icon;

        return {
          id: buildId(draftIdSource, "hero-card", index),
          icon,
          title,
          description,
          link,
        } satisfies HomeHeroCard;
      }

      return {
        id: buildId(row.id ?? title, "hero-card", index),
        icon,
        title,
        description,
        link: link || "/services",
      } satisfies HomeHeroCard;
    })
    .filter(Boolean) as HomeHeroCard[];
  return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeHeroSoftwareItems = (value: unknown, fallback: HomeHeroSoftwareItem[]) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const imageUrl = normalizeText(row.image_url);
      if (!imageUrl) return null;
      const name = preferText(row.name, `Software ${index + 1}`);
      return {
        id: buildId(row.id ?? name, "hero-software", index),
        name,
        image_url: imageUrl,
      } satisfies HomeHeroSoftwareItem;
    })
    .filter(Boolean)
    .slice(0, MAX_HOME_HERO_SOFTWARE_LOGOS) as HomeHeroSoftwareItem[];

  return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeServiceCards = (value: unknown, fallback: HomeServiceCard[]) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const title = normalizeText(row.title);
      const description = normalizeText(row.description);
      if (!title || !description) return null;
      return {
        id: buildId(row.id ?? title, "service-card", index),
        icon: normalizeText(row.icon) || "globe",
        title,
        description,
        features: normalizeList(row.features, [], 10),
        link: normalizeText(row.link) || "/services",
      } satisfies HomeServiceCard;
    })
    .filter(Boolean) as HomeServiceCard[];
  return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeTrustedLogoItems = (value: unknown, fallback: HomeTrustedLogoItem[]) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const imageUrl = normalizeText(row.image_url);
      if (!imageUrl) return null;
      const name = preferText(row.name, `Client ${index + 1}`);
      return {
        id: buildId(row.id ?? name, "trusted-logo", index),
        name,
        image_url: imageUrl,
        link: normalizeText(row.link),
      } satisfies HomeTrustedLogoItem;
    })
    .filter(Boolean)
    .slice(0, MAX_HOME_TRUSTED_LOGOS) as HomeTrustedLogoItem[];

  return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeValueCards = (value: unknown, fallback: HomeValueCard[], prefix: string) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const title = normalizeText(row.title);
      const description = normalizeText(row.description);
      if (!title || !description) return null;
      return {
        id: buildId(row.id ?? title, prefix, index),
        icon: normalizeText(row.icon) || "target",
        title,
        description,
      } satisfies HomeValueCard;
    })
    .filter(Boolean) as HomeValueCard[];
  return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeReasonCards = (value: unknown, fallback: HomeReasonCard[]) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const title = normalizeText(row.title);
      const description = normalizeText(row.description);
      if (!title || !description) return null;
      return {
        id: buildId(row.id ?? title, "reason", index),
        icon: normalizeText(row.icon) || "zap",
        title,
        description,
      } satisfies HomeReasonCard;
    })
    .filter(Boolean) as HomeReasonCard[];
  return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeStatItems = (value: unknown, fallback: HomeStatItem[]) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const valueText = normalizeText(row.value);
      const label = normalizeText(row.label);
      if (!valueText || !label) return null;
      return {
        id: buildId(row.id ?? valueText, "stat", index),
        value: valueText,
        label,
      } satisfies HomeStatItem;
    })
    .filter(Boolean) as HomeStatItem[];
  return cleaned.length > 0 ? cleaned : fallback;
};

const DEFAULT_HOME_KEY_METRIC_ITEMS: HomeMetricItem[] = [
  {
    id: "orders",
    label: "Orders",
    value: "",
    label_font_size_px: 14,
    label_color: "#a1a1aa",
    value_font_size_px: 32,
    value_color: "#ef4444",
  },
  {
    id: "unique-clients",
    label: "Unique Clients",
    value: "",
    label_font_size_px: 14,
    label_color: "#a1a1aa",
    value_font_size_px: 32,
    value_color: "#ef4444",
  },
  {
    id: "countries",
    label: "Countries",
    value: "",
    label_font_size_px: 14,
    label_color: "#a1a1aa",
    value_font_size_px: 32,
    value_color: "#ef4444",
  },
  {
    id: "rating",
    label: "Rating",
    value: "",
    label_font_size_px: 14,
    label_color: "#a1a1aa",
    value_font_size_px: 32,
    value_color: "#ef4444",
  },
];

const normalizeMetricItems = (value: unknown, fallback: HomeMetricItem[]) => {
  const rows = Array.isArray(value) ? value : [];
  return fallback.map((metric, index) => {
    const directMatch = rows.find((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
      return row?.id === metric.id;
    });
    const source =
      (directMatch && typeof directMatch === "object"
        ? (directMatch as Record<string, unknown>)
        : rows[index] && typeof rows[index] === "object"
          ? (rows[index] as Record<string, unknown>)
          : {}) ?? {};

    return {
      id: metric.id,
      label: typeof source.label === "string" ? source.label.trim() : metric.label,
      value: normalizeText(source.value),
      label_font_size_px: normalizeNumber(source.label_font_size_px, metric.label_font_size_px, 10, 32),
      label_color: normalizeHexColor(source.label_color, metric.label_color),
      value_font_size_px: normalizeNumber(source.value_font_size_px, metric.value_font_size_px, 16, 72),
      value_color: normalizeHexColor(source.value_color, metric.value_color),
    } satisfies HomeMetricItem;
  });
};

export const DEFAULT_HOME_PAGE_SETTINGS: HomePageSettings = {
  section_order: HOME_SECTION_ORDER,
  updated_at: null,
  sections: {
    hero: {
      enabled: true,
      badge: "Engineering Excellence Redefined",
      title_line_1: "Drawn",
      title_line_2: "Dimension",
      description:
        "Where precision engineering meets digital innovation. We transform complex challenges into elegant solutions.",
      primary_label: "Start Your Project",
      primary_href: "/start-project",
      secondary_label: "View Our Work",
      secondary_href: "/portfolio",
      cards: [
        {
          id: "hero-pfd-pid",
          icon: "file-text",
          title: "PFD & P&ID Diagrams",
          description: "Process flow documentation",
          link: "/services/pfd-pid",
        },
        {
          id: "hero-solidworks",
          icon: "box",
          title: "3D SolidWorks Modeling",
          description: "Advanced 3D modeling solutions",
          link: "/services/solidworks",
        },
        {
          id: "hero-autocad",
          icon: "ruler",
          title: "AutoCAD Technical Drawings",
          description: "Precision engineering drawings",
          link: "/services/autocad",
        },
        {
          id: "hero-web-design",
          icon: "code",
          title: "Web Design & Development",
          description: "Modern, responsive websites",
          link: "/services/web-design",
        },

        {
          id: "process-flow-sim",
          title: "Process Flow Simulation",
          description: "Process & flow modeling.",
          icon: "workflow",
          link: "/services/process-flow-simulation"
        },
        {
          id: "cfd",
          title: "CFD Simulation",
          description: "Fluid & thermal simulation.",
          icon: "waves",
          link: "/services/computational-fluid-dynamics"
        }
      ],
      software_strip: {
  enabled: true,
  items: [
    {
      id: "hero-sw-cad",
      name: "CAD",
      image_url: "/images/software/cad logo.png",
    },
    {
      id: "hero-sw-freecad",
      name: "FreeCAD",
      image_url: "/images/software/FreeCAD.png",
    },
    {
      id: "hero-sw-ansys",
      name: "Ansys",
      image_url: "/images/software/Ansys.png",
    },
    {
      id: "hero-sw-aspen",
      name: "Aspen",
      image_url: "/images/software/Aspen.png",
    },
    {
      id: "hero-sw-solidworks",
      name: "SolidWorks",
      image_url: "/images/software/SolidWorks.png",
    },
  

        ],
      },
    },
    "key-metrics": {
      enabled: true,
      items: DEFAULT_HOME_KEY_METRIC_ITEMS,
    },
    "trusted-logos": {
      enabled: true,
      badge: "Trusted By",
      title: "Companies We Have Supported",
      description:
        "Showcase the brands, businesses, and organizations your team has worked with using an automatically moving logo slider.",
      logos: [],
    },
    services: {
      enabled: true,
      badge: "Our Services",
      title: "Comprehensive Solutions for",
      title_highlight: "Every Challenge",
      description:
        "From concept to completion, we provide end-to-end services that combine engineering precision with creative innovation.",
      items: [
        {
          id: "service-web",
          icon: "globe",
          title: "Web Design & Development",
          description:
            "Stunning, responsive websites built with modern technologies. From landing pages to complex web applications.",
          features: ["Custom Design", "React/Next.js", "E-commerce", "CMS Integration"],
          link: "/services/web-design",
        },
        {
          id: "service-autocad",
          icon: "pen-tool",
          title: "AutoCAD Technical Drawings",
          description:
            "Precise 2D technical drawings and documentation for engineering, architecture, and manufacturing projects.",
          features: ["2D Drafting", "As-Built Drawings", "Shop Drawings", "Detail Plans"],
          link: "/services/autocad",
        },
        {
          id: "service-solidworks",
          icon: "box",
          title: "3D SolidWorks Modeling",
          description:
            "Advanced 3D modeling and simulation for product design, prototyping, and mechanical engineering.",
          features: ["3D Modeling", "Assembly Design", "FEA Analysis", "Rendering"],
          link: "/services/solidworks",
        },
        {
          id: "service-pfd-pid",
          icon: "git-branch",
          title: "PFD & P&ID Diagrams",
          description:
            "Comprehensive process flow diagrams and piping & instrumentation diagrams for industrial applications.",
          features: ["Process Design", "P&ID Standards", "Equipment Specs", "Control Systems"],
          link: "/services/pfd-pid",
        },
        {
          id: "service-hazop",
          icon: "shield-check",
          title: "HAZOP Study & Risk Analysis",
          description:
            "Thorough hazard and operability studies to ensure safety and compliance in industrial processes.",
          features: ["Risk Assessment", "Safety Analysis", "Compliance", "Documentation"],
          link: "/services/hazop",
        },
        {
          id: "service-graphic",
          icon: "palette",
          title: "Graphic Design & Branding",
          description:
            "Creative visual solutions from marketing materials to complete brand identities that captivate audiences.",
          features: ["Brand Identity", "Marketing Materials", "Social Media", "Print Design"],
          link: "/services/graphic-design",
        },
      ],
      cta_title: "And Many More Engineering Services",
      cta_description:
        "We offer a wide range of additional engineering and digital services tailored to your specific needs.",
      primary_label: "View All Services",
      primary_href: "/services",
      secondary_label: "Message Us on WhatsApp",
      secondary_href: "https://wa.me/8801775119416",
    },
    portfolio: {
      enabled: true,
      badge: "Our Portfolio",
      title: "Projects That",
      title_highlight: "Speak Excellence",
      description:
        "Explore our diverse portfolio showcasing engineering precision, creative innovation, and technical expertise across multiple disciplines.",
      primary_label: "View More",
      primary_href: "/portfolio",
      secondary_label: "Message on WhatsApp",
      secondary_href: "https://wa.me/8801775119416",
    },
    "global-reach": {
      enabled: true,
      badge: "Global Footprint",
      title: "Countries Where We",
      title_highlight: "Delivered Projects",
      description:
        "A live map of regions where our engineering and digital teams have completed client work.",
      empty_title: "No countries marked yet",
      empty_description: "Add countries from CMS to highlight them here.",
    },
    testimonials: {
      enabled: true,
      badge: "Featured Reviews",
      title: "What Our Clients Say",
    },
    about: {
      enabled: true,
      badge: "About Us",
      title: "Building Tomorrow's",
      title_highlight: "Engineering Legacy",
      description:
        "At Drawn Dimension, we blend decades of technical expertise with cutting-edge digital innovation. Our multidisciplinary team transforms complex engineering challenges into streamlined, elegant solutions that drive your business forward.",
      description_secondary:
        "From intricate AutoCAD technical drawings to sophisticated 3D modeling, from comprehensive HAZOP studies to stunning web experiences - we deliver excellence across every discipline we touch.",
      primary_label: "Learn More About Us",
      primary_href: "/about",
      secondary_label: "Message Us on WhatsApp",
      secondary_href: "https://wa.me/8801775119416",
      values: [
        {
          id: "value-precision",
          icon: "target",
          title: "Precision",
          description: "Every detail matters. We deliver accuracy that exceeds industry standards.",
        },
        {
          id: "value-innovation",
          icon: "lightbulb",
          title: "Innovation",
          description: "Pioneering solutions that push boundaries and redefine possibilities.",
        },
        {
          id: "value-collaboration",
          icon: "users",
          title: "Collaboration",
          description: "Your vision, our expertise. Together we create extraordinary results.",
        },
        {
          id: "value-excellence",
          icon: "award",
          title: "Excellence",
          description: "Committed to delivering nothing less than exceptional quality.",
        },
      ],
    },
    "why-choose-us": {
      enabled: true,
      badge: "Why Choose Us",
      title: "Your Success Is",
      title_highlight: "Our Priority",
      description:
        "We do not just deliver projects - we build partnerships. Our commitment to excellence, combined with deep technical expertise and genuine care for your success, sets us apart in the industry.",
      primary_label: "Start Your Project Today",
      primary_href: "/start-project",
      secondary_label: "Message Us on WhatsApp",
      secondary_href: "https://wa.me/8801775119416",
      reasons: [
        {
          id: "reason-technology",
          icon: "zap",
          title: "Cutting-Edge Technology",
          description:
            "We leverage the latest tools and technologies to deliver innovative solutions that keep you ahead of the competition.",
        },
        {
          id: "reason-delivery",
          icon: "clock",
          title: "On-Time Delivery",
          description:
            "We respect your timelines. Our streamlined processes ensure projects are completed on schedule without compromising quality.",
        },
        {
          id: "reason-support",
          icon: "headphones",
          title: "Dedicated Support",
          description:
            "Our team provides ongoing support and consultation, ensuring your success long after project completion.",
        },
        {
          id: "reason-quality",
          icon: "shield",
          title: "Quality Assurance",
          description:
            "Rigorous quality checks at every stage guarantee deliverables that meet the highest industry standards.",
        },
        {
          id: "reason-scalable",
          icon: "trending-up",
          title: "Scalable Solutions",
          description:
            "Our solutions grow with your business, designed to adapt and scale as your needs evolve.",
        },
        {
          id: "reason-track-record",
          icon: "check",
          title: "Proven Track Record",
          description:
            "With 500+ successful projects and a 98% client satisfaction rate, our results speak for themselves.",
        },
      ],
      stats: [
        { id: "stat-iso", value: "ISO", label: "Certified" },
        { id: "stat-support", value: "24/7", label: "Support" },
        { id: "stat-security", value: "100%", label: "Secure" },
      ],
    },
    cta: {
      enabled: true,
      compact: false,
      title_prefix: "Ready to Transform Your",
      title_highlight: "Vision Into Reality?",
      description:
        "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.",
      primary_label: "Get Free Consultation",
      primary_href: "/start-project",
      secondary_label: "View Our Portfolio",
      secondary_href: "/portfolio",
    },
  },
};

export const normalizeHomePageSettings = (
  value: unknown,
  options?: NormalizeHomePageSettingsOptions,
): HomePageSettings => {
  const ensureKeyMetricsAfterHero = (items: HomeSectionId[]) => {
    if (items.includes("key-metrics")) {
      return [...items];
    }

    const next = [...items];
    const heroIndex = next.indexOf("hero");
    if (heroIndex === -1) {
      return ["hero", "key-metrics", ...next];
    }

    next.splice(heroIndex + 1, 0, "key-metrics");
    return next;
  };

  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sectionsSource =
    source.sections && typeof source.sections === "object"
      ? (source.sections as Record<string, unknown>)
      : {};

  const rawOrder = Array.isArray(source.section_order)
    ? source.section_order.map((item) => String(item))
    : [];
  const normalizedOrder: HomeSectionId[] = [];
  const allowed = new Set(HOME_SECTION_ORDER);
  rawOrder.forEach((item) => {
    const id = item as HomeSectionId;
    if (allowed.has(id) && !normalizedOrder.includes(id)) {
      normalizedOrder.push(id);
    }
  });
  const matchesLegacyOrder =
    normalizedOrder.length === LEGACY_HOME_SECTION_ORDER.length &&
    normalizedOrder.every((id, index) => id === LEGACY_HOME_SECTION_ORDER[index]);
  const matchesPreTrustedLogosOrder =
    normalizedOrder.length === PRE_TRUSTED_LOGOS_SECTION_ORDER.length &&
    normalizedOrder.every((id, index) => id === PRE_TRUSTED_LOGOS_SECTION_ORDER[index]);
  const sectionOrder = ensureKeyMetricsAfterHero(
    matchesLegacyOrder || matchesPreTrustedLogosOrder ? [...HOME_SECTION_ORDER] : normalizedOrder
  );
  HOME_SECTION_ORDER.forEach((id) => {
    if (!sectionOrder.includes(id)) {
      sectionOrder.push(id);
    }
  });

  const heroSource = sectionsSource.hero as Record<string, unknown> | undefined;
  const heroSoftwareStripSource =
    heroSource?.software_strip && typeof heroSource.software_strip === "object"
      ? (heroSource.software_strip as Record<string, unknown>)
      : undefined;
  const keyMetricsSource = sectionsSource["key-metrics"] as Record<string, unknown> | undefined;
  const trustedLogosSource = sectionsSource["trusted-logos"] as Record<string, unknown> | undefined;
  const servicesSource = sectionsSource.services as Record<string, unknown> | undefined;
  const portfolioSource = sectionsSource.portfolio as Record<string, unknown> | undefined;
  const globalReachSource = sectionsSource["global-reach"] as Record<string, unknown> | undefined;
  const testimonialsSource = sectionsSource.testimonials as Record<string, unknown> | undefined;
  const aboutSource = sectionsSource.about as Record<string, unknown> | undefined;
  const whyChooseSource = sectionsSource["why-choose-us"] as Record<string, unknown> | undefined;
  const ctaSource = sectionsSource.cta as Record<string, unknown> | undefined;

  const defaults = DEFAULT_HOME_PAGE_SETTINGS.sections;

  const normalized: HomePageSettings = {
    section_order: sectionOrder,
    updated_at: typeof source.updated_at === "string" ? source.updated_at : null,
    needs_migration: Boolean(source.needs_migration),
    sections: {
      hero: {
        ...defaults.hero,
        enabled: normalizeBool(heroSource?.enabled, defaults.hero.enabled),
        badge: preferText(heroSource?.badge, defaults.hero.badge),
        title_line_1: preferText(heroSource?.title_line_1, defaults.hero.title_line_1),
        title_line_2: preferText(heroSource?.title_line_2, defaults.hero.title_line_2),
        description: preferText(heroSource?.description, defaults.hero.description),
        primary_label: preferText(heroSource?.primary_label, defaults.hero.primary_label),
        primary_href: normalizeProjectCtaHref(
          preferText(heroSource?.primary_label, defaults.hero.primary_label),
          preferText(heroSource?.primary_href, defaults.hero.primary_href)
        ),
        secondary_label: preferText(heroSource?.secondary_label, defaults.hero.secondary_label),
        secondary_href: preferText(heroSource?.secondary_href, defaults.hero.secondary_href),
        cards: normalizeHeroCards(heroSource?.cards, defaults.hero.cards, options),
        software_strip: {
          ...defaults.hero.software_strip,
          enabled: normalizeBool(heroSoftwareStripSource?.enabled, defaults.hero.software_strip.enabled),
          items: normalizeHeroSoftwareItems(heroSoftwareStripSource?.items, defaults.hero.software_strip.items),
        },
      },
      "key-metrics": {
        ...defaults["key-metrics"],
        enabled: normalizeBool(keyMetricsSource?.enabled, defaults["key-metrics"].enabled),
        items: normalizeMetricItems(keyMetricsSource?.items, defaults["key-metrics"].items),
      },
      "trusted-logos": {
        ...defaults["trusted-logos"],
        enabled: normalizeBool(trustedLogosSource?.enabled, defaults["trusted-logos"].enabled),
        badge: preferText(trustedLogosSource?.badge, defaults["trusted-logos"].badge),
        title: preferText(trustedLogosSource?.title, defaults["trusted-logos"].title),
        description: preferText(trustedLogosSource?.description, defaults["trusted-logos"].description),
        logos: normalizeTrustedLogoItems(trustedLogosSource?.logos, defaults["trusted-logos"].logos),
      },
      services: {
        ...defaults.services,
        enabled: normalizeBool(servicesSource?.enabled, defaults.services.enabled),
        badge: preferText(servicesSource?.badge, defaults.services.badge),
        title: preferText(servicesSource?.title, defaults.services.title),
        title_highlight: preferText(servicesSource?.title_highlight, defaults.services.title_highlight),
        description: preferText(servicesSource?.description, defaults.services.description),
        items: normalizeServiceCards(servicesSource?.items, defaults.services.items),
        cta_title: preferText(servicesSource?.cta_title, defaults.services.cta_title),
        cta_description: preferText(servicesSource?.cta_description, defaults.services.cta_description),
        primary_label: preferText(servicesSource?.primary_label, defaults.services.primary_label),
        primary_href: normalizeProjectCtaHref(
          preferText(servicesSource?.primary_label, defaults.services.primary_label),
          preferText(servicesSource?.primary_href, defaults.services.primary_href)
        ),
        secondary_label: preferText(servicesSource?.secondary_label, defaults.services.secondary_label),
        secondary_href: preferText(servicesSource?.secondary_href, defaults.services.secondary_href),
      },
      portfolio: {
        ...defaults.portfolio,
        enabled: normalizeBool(portfolioSource?.enabled, defaults.portfolio.enabled),
        badge: preferText(portfolioSource?.badge, defaults.portfolio.badge),
        title: preferText(portfolioSource?.title, defaults.portfolio.title),
        title_highlight: preferText(portfolioSource?.title_highlight, defaults.portfolio.title_highlight),
        description: preferText(portfolioSource?.description, defaults.portfolio.description),
        primary_label: preferText(portfolioSource?.primary_label, defaults.portfolio.primary_label),
        primary_href: preferText(portfolioSource?.primary_href, defaults.portfolio.primary_href),
        secondary_label: preferText(portfolioSource?.secondary_label, defaults.portfolio.secondary_label),
        secondary_href: preferText(portfolioSource?.secondary_href, defaults.portfolio.secondary_href),
      },
      "global-reach": {
        ...defaults["global-reach"],
        enabled: normalizeBool(globalReachSource?.enabled, defaults["global-reach"].enabled),
        badge: preferText(globalReachSource?.badge, defaults["global-reach"].badge),
        title: preferText(globalReachSource?.title, defaults["global-reach"].title),
        title_highlight: preferText(globalReachSource?.title_highlight, defaults["global-reach"].title_highlight),
        description: preferText(globalReachSource?.description, defaults["global-reach"].description),
        empty_title: preferText(globalReachSource?.empty_title, defaults["global-reach"].empty_title),
        empty_description: preferText(
          globalReachSource?.empty_description,
          defaults["global-reach"].empty_description
        ),
      },
      testimonials: {
        ...defaults.testimonials,
        enabled: normalizeBool(testimonialsSource?.enabled, defaults.testimonials.enabled),
        badge: preferText(testimonialsSource?.badge, defaults.testimonials.badge),
        title: preferText(testimonialsSource?.title, defaults.testimonials.title),
      },
      about: {
        ...defaults.about,
        enabled: normalizeBool(aboutSource?.enabled, defaults.about.enabled),
        badge: preferText(aboutSource?.badge, defaults.about.badge),
        title: preferText(aboutSource?.title, defaults.about.title),
        title_highlight: preferText(aboutSource?.title_highlight, defaults.about.title_highlight),
        description: preferText(aboutSource?.description, defaults.about.description),
        description_secondary: preferText(aboutSource?.description_secondary, defaults.about.description_secondary),
        primary_label: preferText(aboutSource?.primary_label, defaults.about.primary_label),
        primary_href: normalizeProjectCtaHref(
          preferText(aboutSource?.primary_label, defaults.about.primary_label),
          preferText(aboutSource?.primary_href, defaults.about.primary_href)
        ),
        secondary_label: preferText(aboutSource?.secondary_label, defaults.about.secondary_label),
        secondary_href: preferText(aboutSource?.secondary_href, defaults.about.secondary_href),
        values: normalizeValueCards(aboutSource?.values, defaults.about.values, "value"),
      },
      "why-choose-us": {
        ...defaults["why-choose-us"],
        enabled: normalizeBool(whyChooseSource?.enabled, defaults["why-choose-us"].enabled),
        badge: preferText(whyChooseSource?.badge, defaults["why-choose-us"].badge),
        title: preferText(whyChooseSource?.title, defaults["why-choose-us"].title),
        title_highlight: preferText(
          whyChooseSource?.title_highlight,
          defaults["why-choose-us"].title_highlight
        ),
        description: preferText(whyChooseSource?.description, defaults["why-choose-us"].description),
        primary_label: preferText(whyChooseSource?.primary_label, defaults["why-choose-us"].primary_label),
        primary_href: normalizeProjectCtaHref(
          preferText(whyChooseSource?.primary_label, defaults["why-choose-us"].primary_label),
          preferText(whyChooseSource?.primary_href, defaults["why-choose-us"].primary_href)
        ),
        secondary_label: preferText(whyChooseSource?.secondary_label, defaults["why-choose-us"].secondary_label),
        secondary_href: preferText(whyChooseSource?.secondary_href, defaults["why-choose-us"].secondary_href),
        reasons: normalizeReasonCards(whyChooseSource?.reasons, defaults["why-choose-us"].reasons),
        stats: normalizeStatItems(whyChooseSource?.stats, defaults["why-choose-us"].stats),
      },
      cta: {
        ...defaults.cta,
        enabled: normalizeBool(ctaSource?.enabled, defaults.cta.enabled),
        compact: normalizeBool(ctaSource?.compact, defaults.cta.compact),
        title_prefix: preferText(ctaSource?.title_prefix, defaults.cta.title_prefix),
        title_highlight: preferText(ctaSource?.title_highlight, defaults.cta.title_highlight),
        description: preferText(ctaSource?.description, defaults.cta.description),
        primary_label: preferText(ctaSource?.primary_label, defaults.cta.primary_label),
        primary_href: normalizeProjectCtaHref(
          preferText(ctaSource?.primary_label, defaults.cta.primary_label),
          preferText(ctaSource?.primary_href, defaults.cta.primary_href)
        ),
        secondary_label: preferText(ctaSource?.secondary_label, defaults.cta.secondary_label),
        secondary_href: preferText(ctaSource?.secondary_href, defaults.cta.secondary_href),
      },
    },
  };

  return normalized;
};