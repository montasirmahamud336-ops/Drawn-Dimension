import { Box, GitBranch, Globe, Palette, PenTool, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";

export type ServiceFeatureCard = {
  title: string;
  description: string;
  icon?: string | null;
};

export type ServiceProcessStep = {
  step: string;
  title: string;
  description: string;
};

export type ServicePricingTier = {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
};

export type ApiServiceRecord = {
  id: number;
  name: string;
  slug?: string | null;
  hero_badge?: string | null;
  hero_title?: string | null;
  hero_description?: string | null;
  short_description?: string | null;
  features?: string[] | string | null;
  feature_cards?: ServiceFeatureCard[] | string | null;
  section_badge?: string | null;
  section_title?: string | null;
  section_description?: string | null;
  section_left_items?: string[] | string | null;
  section_panel_title?: string | null;
  section_panel_subtitle?: string | null;
  section_panel_items?: string[] | string | null;
  process_badge?: string | null;
  process_title?: string | null;
  process_steps?: ServiceProcessStep[] | string | null;
  pricing_badge?: string | null;
  pricing_title?: string | null;
  pricing_description?: string | null;
  pricing_tiers?: ServicePricingTier[] | string | null;
  cta_title_prefix?: string | null;
  cta_title_highlight?: string | null;
  cta_description?: string | null;
  cta_primary_label?: string | null;
  cta_primary_link?: string | null;
  cta_secondary_label?: string | null;
  cta_secondary_link?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

type ServicePreset = {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  features: string[];
  metaTitle: string;
  metaDescription: string;
  aliases: string[];
};

const DEFAULT_FEATURES = ["Requirement Analysis", "Technical Guidance", "Clean Delivery", "Reliable Support"];
const MIN_FEATURE_CARD_COUNT = 6;
const FEATURE_ICON_KEYS = ["code", "smartphone", "zap", "shield", "palette", "monitor"] as const;

export const normalizeServiceKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const slugifyServiceName = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const normalizeServiceTextList = (value: unknown, limit = 12) => {
  const sanitize = (items: unknown[]) =>
    items
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, limit);

  if (Array.isArray(value)) {
    return sanitize(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return sanitize(parsed);
      }
    } catch {
      return trimmed
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit);
    }

    return [];
  }

  return [];
};

const servicePresets: ServicePreset[] = [
  {
    icon: Globe,
    title: "Web Design & Development",
    description:
      "Stunning, responsive websites built with modern technologies. From landing pages to complex web applications.",
    link: "/services/web-design",
    features: ["Custom Design", "React/Next.js", "E-commerce", "CMS Integration"],
    metaTitle: "Web Design & Development Services | Global Delivery | Drawn Dimension",
    metaDescription:
      "Professional web design and development services including responsive websites, React/Next.js builds, CMS integration, and SEO-ready performance for global businesses.",
    aliases: ["web design", "web development", "web design and development"],
  },
  {
    icon: PenTool,
    title: "AutoCAD Technical Drawings",
    description:
      "Precise 2D technical drawings and documentation for engineering, architecture, and manufacturing projects.",
    link: "/services/autocad",
    features: ["2D Drafting", "As-Built Drawings", "Shop Drawings", "Detail Plans"],
    metaTitle: "AutoCAD Technical Drawing Services | 2D Drafting Experts | Drawn Dimension",
    metaDescription:
      "AutoCAD technical drawing services for engineering and industrial projects, including 2D drafting, as-built drawings, shop drawings, and submission-ready documentation.",
    aliases: ["autocad", "autocad technical drawings", "technical drawings"],
  },
  {
    icon: Box,
    title: "3D SolidWorks Modeling",
    description:
      "Advanced 3D modeling and simulation for product design, prototyping, and mechanical engineering.",
    link: "/services/solidworks",
    features: ["3D Modeling", "Assembly Design", "FEA Analysis", "Rendering"],
    metaTitle: "3D SolidWorks Modeling Services | Product & Mechanical Design | Drawn Dimension",
    metaDescription:
      "SolidWorks 3D modeling services for product development, assembly design, simulation support, and technical visualization with clean, accurate engineering output.",
    aliases: ["solidworks", "3d solidworks", "solidworks modeling"],
  },
  {
    icon: GitBranch,
    title: "PFD & P&ID Diagrams",
    description:
      "Comprehensive process flow diagrams and piping & instrumentation diagrams for industrial applications.",
    link: "/services/pfd-pid",
    features: ["Process Design", "P&ID Standards", "Equipment Specs", "Control Systems"],
    metaTitle: "PFD & P&ID Diagram Services | Process Engineering Documentation | Drawn Dimension",
    metaDescription:
      "PFD and P&ID diagram services for industrial process systems, covering flow design, instrumentation mapping, control systems, and compliance-focused documentation.",
    aliases: ["pfd", "pid", "p and id", "pfd and pid", "pfd pid"],
  },
  {
    icon: ShieldCheck,
    title: "HAZOP Study & Risk Analysis",
    description:
      "Thorough hazard and operability studies to ensure safety and compliance in industrial processes.",
    link: "/services/hazop",
    features: ["Risk Assessment", "Safety Analysis", "Compliance", "Documentation"],
    metaTitle: "HAZOP Study & Risk Analysis Services | Process Safety | Drawn Dimension",
    metaDescription:
      "HAZOP study and industrial risk analysis services with structured hazard identification, operability review, safety recommendations, and compliance reporting.",
    aliases: ["hazop", "hazop study", "risk analysis"],
  },
  {
    icon: Palette,
    title: "Graphic Design & Branding",
    description:
      "Creative visual solutions from marketing materials to complete brand identities that captivate audiences.",
    link: "/services/graphic-design",
    features: ["Brand Identity", "Marketing Materials", "Social Media", "Print Design"],
    metaTitle: "Graphic Design & Branding Services | Creative Studio | Drawn Dimension",
    metaDescription:
      "Graphic design and branding services including brand identity, marketing collateral, social media creatives, and print-ready visual communication assets.",
    aliases: ["graphic design", "branding", "graphic design and branding"],
  },
];

const findPreset = (serviceName: string) => {
  const key = normalizeServiceKey(serviceName);
  return servicePresets.find((preset) =>
    preset.aliases.some((alias) => {
      const aliasKey = normalizeServiceKey(alias);
      return key === aliasKey || key.includes(aliasKey) || aliasKey.includes(key);
    })
  );
};

const normalizeFeatures = (value: ApiServiceRecord["features"]) => {
  return normalizeServiceTextList(value, 10);
};

const normalizeFeatureCards = (value: ApiServiceRecord["feature_cards"]) => {
  const fromArray = (items: unknown[]) =>
    items
      .map((item) => {
        const card = (item ?? {}) as { title?: unknown; description?: unknown };
        return {
          title: String(card.title ?? "").trim(),
          description: String(card.description ?? "").trim(),
          icon: String((item as { icon?: unknown }).icon ?? "").trim() || null,
        };
      })
      .filter((item) => item.title && item.description)
      .slice(0, 8);

  if (Array.isArray(value)) {
    return fromArray(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return fromArray(parsed);
      }
    } catch {
      return [];
    }
  }

  return [];
};

const fallbackDescription = (name: string) =>
  `Professional ${name.toLowerCase()} services delivered with clear workflow, technical accuracy, and dependable final output.`;

const fallbackMetaTitle = (name: string) => `${name} Services | Drawn Dimension`;

const fallbackMetaDescription = (name: string, shortDescription?: string | null) =>
  shortDescription?.trim() ||
  `Professional ${name.toLowerCase()} services with clean workflow, accurate technical output, and client-ready global delivery support.`;

export const buildDefaultServiceMetaTitle = (serviceName: string) => {
  const name = String(serviceName ?? "").trim();
  if (!name) return fallbackMetaTitle("Service");
  const preset = findPreset(name);
  return preset?.metaTitle || fallbackMetaTitle(name);
};

export const buildDefaultServiceMetaDescription = (serviceName: string, shortDescription?: string | null) => {
  const name = String(serviceName ?? "").trim();
  if (!name) return fallbackMetaDescription("service", shortDescription);
  const preset = findPreset(name);
  return preset?.metaDescription || fallbackMetaDescription(name, shortDescription);
};

export const buildServiceMetaTitleFromApi = (service: ApiServiceRecord) =>
  service.meta_title?.trim() || buildDefaultServiceMetaTitle(service.name);

export const buildServiceMetaDescriptionFromApi = (service: ApiServiceRecord) =>
  service.meta_description?.trim() ||
  buildDefaultServiceMetaDescription(service.name, service.short_description?.trim() || null);

export const buildDefaultServiceSectionLeftItems = (serviceName: string, features: string[] = []) => {
  const fromFeatures = features.filter(Boolean).slice(0, 8);
  if (fromFeatures.length > 0) return fromFeatures;

  return [
    `${serviceName} planning and consultation`,
    "Structured execution workflow",
    "Technical quality review",
    "Client-ready file organization",
    "Reliable delivery timeline",
    "Practical final output",
  ];
};

export const buildDefaultServicePanelItems = (leftItems: string[]) => {
  const base = leftItems.filter(Boolean).slice(0, 6);
  if (base.length > 0) return base;
  return ["Clean Workflow", "Technical Accuracy", "Quality Review", "Client-Ready Delivery"];
};

export const buildDefaultServiceProcessSteps = (serviceName: string): ServiceProcessStep[] => [
  {
    step: "01",
    title: "Discovery",
    description: `We review your ${serviceName.toLowerCase()} requirements, scope, and priorities in detail.`,
  },
  {
    step: "02",
    title: "Planning",
    description: "We define the technical workflow, milestones, and quality checkpoints before execution.",
  },
  {
    step: "03",
    title: "Execution",
    description: "We deliver with clear structure, accurate output, and continuous internal quality review.",
  },
  {
    step: "04",
    title: "Final Delivery",
    description: "We submit organized, client-ready files in practical formats for immediate use.",
  },
];

export const buildDefaultServicePricingTiers = (serviceName: string): ServicePricingTier[] => [
  {
    name: "Starter",
    price: "$499",
    description: `Basic ${serviceName} scope for small requirements`,
    features: ["Initial consultation", "Core deliverables", "1 revision", "Standard turnaround", "Final files"],
  },
  {
    name: "Professional",
    price: "$1,499",
    description: "Recommended for business-grade project execution",
    features: [
      "Detailed planning",
      "Advanced deliverables",
      "3 revisions",
      "Priority support",
      "Structured documentation",
      "Handover support",
    ],
    popular: true,
  },
  {
    name: "Premium",
    price: "$3,499",
    description: "Comprehensive delivery for complex project requirements",
    features: [
      "Full project scope",
      "High-detail output",
      "5 revisions",
      "Faster delivery window",
      "Technical review package",
      "Extended support",
    ],
  },
  {
    name: "Custom",
    price: "Contact",
    description: "Tailored enterprise scope and ongoing partnership",
    features: [
      "Custom scope planning",
      "Dedicated specialist support",
      "Flexible milestones",
      "Priority queue",
      "Long-term collaboration",
    ],
  },
];

const buildBaseFeatureCardTemplates = (serviceName: string): ServiceFeatureCard[] => [
  {
    title: "Requirement Analysis",
    description: `We review your ${serviceName.toLowerCase()} requirements in detail before execution starts.`,
    icon: "code",
  },
  {
    title: "Technical Execution",
    description: `Structured process and quality control ensure reliable ${serviceName.toLowerCase()} delivery.`,
    icon: "shield",
  },
  {
    title: "Quality Assurance",
    description: "Internal checks and validation keep every output accurate and dependable.",
    icon: "zap",
  },
  {
    title: "Client Communication",
    description: "Clear updates and checkpoints keep your project aligned from start to finish.",
    icon: "smartphone",
  },
  {
    title: "Structured Delivery",
    description: "Final files are organized, clean, and ready for immediate practical use.",
    icon: "monitor",
  },
  {
    title: "Presentation Quality",
    description: "Outputs are polished for professional review, submission, and implementation.",
    icon: "palette",
  },
];

const buildFeatureCardsFromHighlights = (serviceName: string, highlights: string[]): ServiceFeatureCard[] =>
  highlights
    .filter(Boolean)
    .slice(0, 6)
    .map((feature, index) => ({
      title: feature,
      description: `${feature} delivered with clean workflow, technical precision, and practical output for ${serviceName}.`,
      icon: FEATURE_ICON_KEYS[index % FEATURE_ICON_KEYS.length],
    }));

const ensureMinimumFeatureCards = (
  initialCards: ServiceFeatureCard[],
  serviceName: string,
  highlights: string[]
) => {
  const merged: ServiceFeatureCard[] = [];
  const seen = new Set<string>();

  const pushUnique = (card: ServiceFeatureCard) => {
    const title = String(card.title ?? "").trim();
    const description = String(card.description ?? "").trim();
    if (!title || !description) return;
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({
      title,
      description,
      icon: String(card.icon ?? "").trim() || null,
    });
  };

  initialCards.forEach(pushUnique);
  if (merged.length >= MIN_FEATURE_CARD_COUNT) return merged.slice(0, 8);

  buildFeatureCardsFromHighlights(serviceName, highlights).forEach(pushUnique);
  if (merged.length >= MIN_FEATURE_CARD_COUNT) return merged.slice(0, 8);

  buildBaseFeatureCardTemplates(serviceName).forEach(pushUnique);
  return merged.slice(0, 8);
};

export const resolveServiceLink = (name: string, slug?: string | null) => {
  const preset = findPreset(name);
  if (preset) return preset.link;

  const normalizedSlug = slugifyServiceName((slug ?? "").trim());
  if (normalizedSlug) return `/services/${normalizedSlug}`;

  return `/services/${slugifyServiceName(name) || "service"}`;
};

export const buildServiceCardFromApi = (service: ApiServiceRecord) => {
  const preset = findPreset(service.name);
  const normalizedFeatures = normalizeFeatures(service.features);

  return {
    icon: preset?.icon ?? Wrench,
    title: service.name,
    description: service.short_description?.trim() || preset?.description || fallbackDescription(service.name),
    link: resolveServiceLink(service.name, service.slug),
    features: normalizedFeatures.length > 0 ? normalizedFeatures : preset?.features ?? DEFAULT_FEATURES,
  };
};

export const buildServiceFeatureCardsFromApi = (service: ApiServiceRecord) => {
  const cards = normalizeFeatureCards(service.feature_cards);
  const cardData = buildServiceCardFromApi(service);
  return ensureMinimumFeatureCards(cards, service.name, cardData.features);
};

const normalizeServiceProcessSteps = (value: unknown) => {
  const source = Array.isArray(value) ? value : typeof value === "string" ? JSON.parse(value || "[]") : [];
  if (!Array.isArray(source)) return [] as ServiceProcessStep[];

  return source
    .map((item, index) => {
      const stepItem = (item ?? {}) as { step?: unknown; title?: unknown; description?: unknown };
      const title = String(stepItem.title ?? "").trim();
      const description = String(stepItem.description ?? "").trim();
      const fallbackStep = String(index + 1).padStart(2, "0");
      const step = String(stepItem.step ?? "").trim() || fallbackStep;
      return { step, title, description };
    })
    .filter((item) => item.title && item.description)
    .slice(0, 8);
};

const normalizeServicePricingTiers = (value: unknown) => {
  const source = Array.isArray(value) ? value : typeof value === "string" ? JSON.parse(value || "[]") : [];
  if (!Array.isArray(source)) return [] as ServicePricingTier[];

  return source
    .map((item) => {
      const tier = (item ?? {}) as {
        name?: unknown;
        price?: unknown;
        description?: unknown;
        features?: unknown;
        popular?: unknown;
      };
      return {
        name: String(tier.name ?? "").trim(),
        price: String(tier.price ?? "").trim(),
        description: String(tier.description ?? "").trim(),
        features: normalizeServiceTextList(tier.features, 10),
        popular: Boolean(tier.popular),
      };
    })
    .filter((item) => item.name && item.price && item.description && item.features.length > 0)
    .slice(0, 6);
};

export const buildServiceSectionLeftItemsFromApi = (service: ApiServiceRecord) => {
  const items = normalizeServiceTextList(service.section_left_items, 10);
  if (items.length > 0) return items;

  const card = buildServiceCardFromApi(service);
  return buildDefaultServiceSectionLeftItems(service.name, card.features);
};

export const buildServiceSectionPanelItemsFromApi = (service: ApiServiceRecord, leftItems: string[]) => {
  const items = normalizeServiceTextList(service.section_panel_items, 8);
  if (items.length > 0) return items;
  return buildDefaultServicePanelItems(leftItems);
};

export const buildServiceProcessStepsFromApi = (service: ApiServiceRecord) => {
  try {
    const steps = normalizeServiceProcessSteps(service.process_steps);
    if (steps.length > 0) return steps;
  } catch {
    // fall through to defaults
  }
  return buildDefaultServiceProcessSteps(service.name);
};

export const buildServicePricingTiersFromApi = (service: ApiServiceRecord) => {
  try {
    const tiers = normalizeServicePricingTiers(service.pricing_tiers);
    if (tiers.length > 0) return tiers;
  } catch {
    // fall through to defaults
  }
  return buildDefaultServicePricingTiers(service.name);
};

export const buildServiceNavItems = (services: ApiServiceRecord[]) => {
  const seen = new Set<string>();
  const items: Array<{ href: string; label: string }> = [];

  services.forEach((service) => {
    const label = String(service.name ?? "").trim();
    if (!label) return;

    const href = resolveServiceLink(label, service.slug);
    if (seen.has(href)) return;

    seen.add(href);
    items.push({ href, label });
  });

  return items;
};

export const getFallbackServiceCards = () =>
  servicePresets.map(({ aliases, metaTitle, metaDescription, ...preset }) => ({
    ...preset,
  }));

export const findServiceBySlug = (services: ApiServiceRecord[], slug: string) => {
  const target = slugifyServiceName(slug);
  if (!target) return null;

  const directMatch =
    services.find((service) => {
      const fromResponse = slugifyServiceName((service.slug ?? "").trim());
      if (fromResponse) return fromResponse === target;
      return slugifyServiceName(service.name) === target;
    }) ?? null;

  if (directMatch) return directMatch;

  const presetMatch = servicePresets.find((preset) => {
    const linkSlug = slugifyServiceName(preset.link.split("/").pop() ?? "");
    return linkSlug === target;
  });

  if (!presetMatch) return null;

  return (
    services.find((service) => {
      const servicePreset = findPreset(service.name);
      return servicePreset?.link === presetMatch.link;
    }) ?? null
  );
};
