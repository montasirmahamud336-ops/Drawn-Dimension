import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { deleteRow, insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

const router = Router();
type ServiceStatus = "live" | "draft";

type FeatureCard = {
  title: string;
  description: string;
  icon?: string | null;
};

type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

type PricingTier = {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
};
const MIN_FEATURE_CARD_COUNT = 6;
const FEATURE_ICON_KEYS = ["code", "smartphone", "zap", "shield", "palette", "monitor"] as const;

const normalizeStatus = (value: unknown, allowAll = false): ServiceStatus | "all" => {
  const status = String(value ?? "").toLowerCase();
  if (allowAll && status === "all") return "all";
  return status === "draft" ? "draft" : "live";
};

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeOptionalText = (value: unknown) => {
  const text = normalizeText(value);
  return text || null;
};

const normalizeServiceName = (value: unknown) => normalizeText(value).replace(/\s+/g, " ");

const slugifyServiceName = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const normalizeSlug = (slugValue: unknown, fallbackName: string) => {
  const rawSlug = normalizeText(slugValue);
  const source = rawSlug || fallbackName;
  const normalized = slugifyServiceName(source);
  return normalized || slugifyServiceName(fallbackName);
};

const getDefaultMetaTitle = (name: string, slug: string) => {
  switch (slug) {
    case "web-design":
      return "Web Design & Development Services | Global Delivery | Drawn Dimension";
    case "autocad":
      return "AutoCAD Technical Drawing Services | 2D Drafting Experts | Drawn Dimension";
    case "solidworks":
      return "3D SolidWorks Modeling Services | Product & Mechanical Design | Drawn Dimension";
    case "pfd-pid":
      return "PFD & P&ID Diagram Services | Process Engineering Documentation | Drawn Dimension";
    case "hazop":
      return "HAZOP Study & Risk Analysis Services | Process Safety | Drawn Dimension";
    case "graphic-design":
      return "Graphic Design & Branding Services | Creative Studio | Drawn Dimension";
    default:
      return `${name} Services | Drawn Dimension`;
  }
};

const getDefaultMetaDescription = (name: string, slug: string, shortDescription: string | null) => {
  if (shortDescription) return shortDescription;

  switch (slug) {
    case "web-design":
      return "Professional web design and development services including responsive websites, CMS integration, and SEO-ready performance for global businesses.";
    case "autocad":
      return "AutoCAD technical drawing services for engineering projects, including 2D drafting, as-built drawings, shop drawings, and submission-ready files.";
    case "solidworks":
      return "SolidWorks 3D modeling services for product development, assembly design, simulation support, and technical visualization with accurate delivery.";
    case "pfd-pid":
      return "PFD and P&ID diagram services for industrial process systems, instrumentation mapping, control logic, and compliance-focused technical documentation.";
    case "hazop":
      return "HAZOP study and industrial risk analysis services with structured hazard identification, operability review, and compliance reporting.";
    case "graphic-design":
      return "Graphic design and branding services including brand identity, marketing assets, social media creatives, and print-ready visual materials.";
    default:
      return `Professional ${name.toLowerCase()} services with clean workflow, accurate technical output, and client-ready global delivery support.`;
  }
};

const normalizeTextList = (value: unknown, limit = 12) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, limit);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [] as string[];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeText(item))
          .filter(Boolean)
          .slice(0, limit);
      }
    } catch {
      return trimmed
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit);
    }
  }

  return [] as string[];
};

const normalizeFeatures = (value: unknown) => {
  return normalizeTextList(value, 10);
};

const normalizeFeatureCards = (value: unknown) => {
  if (!Array.isArray(value)) return [] as FeatureCard[];

  return value
    .map((item) => {
      const card = (item ?? {}) as { title?: unknown; description?: unknown; icon?: unknown };
      return {
        title: normalizeText(card.title),
        description: normalizeText(card.description),
        icon: normalizeOptionalText(card.icon),
      };
    })
    .filter((item) => item.title && item.description)
    .slice(0, 8);
};

const normalizeProcessSteps = (value: unknown) => {
  let source: unknown = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return [] as ProcessStep[];
    }
  }
  if (!Array.isArray(source)) return [] as ProcessStep[];

  return source
    .map((item, index) => {
      const row = (item ?? {}) as { step?: unknown; title?: unknown; description?: unknown };
      const title = normalizeText(row.title);
      const description = normalizeText(row.description);
      const step = normalizeText(row.step) || String(index + 1).padStart(2, "0");
      return { step, title, description };
    })
    .filter((item) => item.title && item.description)
    .slice(0, 8);
};

const normalizePricingTiers = (value: unknown) => {
  let source: unknown = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return [] as PricingTier[];
    }
  }
  if (!Array.isArray(source)) return [] as PricingTier[];

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
        name: normalizeText(tier.name),
        price: normalizeText(tier.price),
        description: normalizeText(tier.description),
        features: normalizeTextList(tier.features, 10),
        popular: Boolean(tier.popular),
      };
    })
    .filter((item) => item.name && item.price && item.description && item.features.length > 0)
    .slice(0, 6);
};

const getBaseFeatureCardTemplates = (serviceName: string): FeatureCard[] => [
  {
    title: "Requirement Analysis",
    description: `Detailed review of your ${serviceName.toLowerCase()} project scope before production.`,
    icon: "code",
  },
  {
    title: "Execution Quality",
    description: "Structured workflow and review checkpoints for dependable output.",
    icon: "shield",
  },
  {
    title: "Quality Assurance",
    description: "Accuracy and consistency checks are completed before final handover.",
    icon: "zap",
  },
  {
    title: "Client Communication",
    description: "Regular progress updates and revision alignment throughout delivery.",
    icon: "smartphone",
  },
  {
    title: "Client-Ready Delivery",
    description: "Organized final handover with practical, usable deliverables.",
    icon: "monitor",
  },
  {
    title: "Presentation Quality",
    description: "Final outputs are polished for clear review, submission, and implementation.",
    icon: "palette",
  },
];

const getFeatureCardsFromHighlights = (serviceName: string, features: string[]): FeatureCard[] =>
  features
    .filter(Boolean)
    .slice(0, 6)
    .map((feature, index) => ({
      title: feature,
      description: `${feature} delivered with clean structure and technical accuracy.`,
      icon: FEATURE_ICON_KEYS[index % FEATURE_ICON_KEYS.length],
    }));

const ensureMinimumFeatureCards = (cards: FeatureCard[], serviceName: string, features: string[]) => {
  const merged: FeatureCard[] = [];
  const seen = new Set<string>();

  const pushUnique = (card: FeatureCard) => {
    const title = normalizeText(card.title);
    const description = normalizeText(card.description);
    if (!title || !description) return;
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ title, description, icon: normalizeOptionalText(card.icon) });
  };

  cards.forEach(pushUnique);
  if (merged.length >= MIN_FEATURE_CARD_COUNT) return merged.slice(0, 8);

  getFeatureCardsFromHighlights(serviceName, features).forEach(pushUnique);
  if (merged.length >= MIN_FEATURE_CARD_COUNT) return merged.slice(0, 8);

  getBaseFeatureCardTemplates(serviceName).forEach(pushUnique);
  return merged.slice(0, 8);
};

const getFallbackSectionLeftItems = (serviceName: string, features: string[]) => {
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

const getFallbackSectionPanelItems = (leftItems: string[]) => {
  const fromLeft = leftItems.filter(Boolean).slice(0, 6);
  if (fromLeft.length > 0) return fromLeft;
  return ["Clean Workflow", "Technical Accuracy", "Quality Review", "Client-Ready Delivery"];
};

const getFallbackProcessSteps = (serviceName: string): ProcessStep[] => [
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

const getFallbackPricingTiers = (serviceName: string): PricingTier[] => [
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

const isDuplicateNameError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("23505") || message.includes("duplicate key");
};

const isSchemaOutdatedError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("does not exist") &&
    (message.includes("slug") ||
      message.includes("short_description") ||
      message.includes("hero_") ||
      message.includes("feature_cards") ||
      message.includes("section_") ||
      message.includes("process_badge") ||
      message.includes("pricing_badge") ||
      message.includes("cta_") ||
      message.includes("process_steps") ||
      message.includes("pricing_tiers") ||
      message.includes("meta_") ||
      message.includes("updated_at"))
  );
};

const getSchemaOutdatedMessage = () =>
  "Services table schema is outdated. Run the latest Supabase migration for service page fields.";

type RawServiceRow = {
  id: number;
  name?: unknown;
  slug?: unknown;
  status?: unknown;
  short_description?: unknown;
  hero_badge?: unknown;
  hero_title?: unknown;
  hero_description?: unknown;
  features?: unknown;
  feature_cards?: unknown;
  section_badge?: unknown;
  section_title?: unknown;
  section_description?: unknown;
  section_left_items?: unknown;
  section_panel_title?: unknown;
  section_panel_subtitle?: unknown;
  section_panel_items?: unknown;
  process_badge?: unknown;
  process_title?: unknown;
  process_steps?: unknown;
  pricing_badge?: unknown;
  pricing_title?: unknown;
  pricing_description?: unknown;
  pricing_tiers?: unknown;
  cta_title_prefix?: unknown;
  cta_title_highlight?: unknown;
  cta_description?: unknown;
  cta_primary_label?: unknown;
  cta_primary_link?: unknown;
  cta_secondary_label?: unknown;
  cta_secondary_link?: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const normalizeServiceRow = (row: RawServiceRow) => {
  const name = normalizeServiceName(row.name);
  const slug = normalizeSlug(row.slug, name);
  const features = normalizeFeatures(row.features);
  const featureCards = normalizeFeatureCards(row.feature_cards);
  const shortDescription = normalizeOptionalText(row.short_description);
  const heroTitle = normalizeOptionalText(row.hero_title) ?? name;
  const sectionLeftItemsRaw = normalizeTextList(row.section_left_items, 10);
  const sectionLeftItems =
    sectionLeftItemsRaw.length > 0
      ? sectionLeftItemsRaw
      : getFallbackSectionLeftItems(name, features);
  const sectionPanelItemsRaw = normalizeTextList(row.section_panel_items, 8);
  const sectionPanelItems =
    sectionPanelItemsRaw.length > 0
      ? sectionPanelItemsRaw
      : getFallbackSectionPanelItems(sectionLeftItems);
  const processSteps = normalizeProcessSteps(row.process_steps);
  const pricingTiers = normalizePricingTiers(row.pricing_tiers);
  const ensuredFeatureCards = ensureMinimumFeatureCards(featureCards, name, features);

  return {
    id: Number(row.id),
    name,
    slug,
    status: normalizeStatus(row.status) as ServiceStatus,
    short_description: shortDescription,
    hero_badge: normalizeOptionalText(row.hero_badge),
    hero_title: heroTitle,
    hero_description: normalizeOptionalText(row.hero_description) ?? shortDescription,
    features,
    feature_cards: ensuredFeatureCards,
    section_badge: normalizeOptionalText(row.section_badge) ?? "What You Get",
    section_title: normalizeOptionalText(row.section_title) ?? `Complete ${name} Solutions`,
    section_description:
      normalizeOptionalText(row.section_description) ??
      `We deliver structured and professional ${name.toLowerCase()} support from planning to final handover.`,
    section_left_items: sectionLeftItems,
    section_panel_title: normalizeOptionalText(row.section_panel_title) ?? "Professional Delivery Stack",
    section_panel_subtitle: normalizeOptionalText(row.section_panel_subtitle) ?? "Built for clarity and dependable output",
    section_panel_items: sectionPanelItems,
    process_badge: normalizeOptionalText(row.process_badge) ?? "Our Process",
    process_title: normalizeOptionalText(row.process_title) ?? "How We Work",
    process_steps: processSteps.length > 0 ? processSteps : getFallbackProcessSteps(name),
    pricing_badge: normalizeOptionalText(row.pricing_badge) ?? "Pricing Plans",
    pricing_title: normalizeOptionalText(row.pricing_title) ?? "Choose Your Plan",
    pricing_description:
      normalizeOptionalText(row.pricing_description) ??
      "All plans require payment before service delivery begins. Custom quotes available for complex projects.",
    pricing_tiers: pricingTiers.length > 0 ? pricingTiers : getFallbackPricingTiers(name),
    cta_title_prefix: normalizeOptionalText(row.cta_title_prefix) ?? "Ready to Transform Your",
    cta_title_highlight: normalizeOptionalText(row.cta_title_highlight) ?? "Vision Into Reality?",
    cta_description:
      normalizeOptionalText(row.cta_description) ??
      "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.",
    cta_primary_label: normalizeOptionalText(row.cta_primary_label) ?? "Get Free Consultation",
    cta_primary_link: normalizeOptionalText(row.cta_primary_link) ?? "/contact",
    cta_secondary_label: normalizeOptionalText(row.cta_secondary_label) ?? "View Our Portfolio",
    cta_secondary_link: normalizeOptionalText(row.cta_secondary_link) ?? "/portfolio",
    meta_title: normalizeOptionalText(row.meta_title) ?? getDefaultMetaTitle(name, slug),
    meta_description:
      normalizeOptionalText(row.meta_description) ??
      getDefaultMetaDescription(name, slug, shortDescription),
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
};

const buildServicePatch = (body: unknown, requireName = false) => {
  const source = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (requireName || "name" in source) {
    const name = normalizeServiceName(source.name);
    if (!name) {
      return { error: "Service name is required" as const };
    }
    patch.name = name;
  }

  if ("status" in source || requireName) {
    patch.status = normalizeStatus(source.status) as ServiceStatus;
  }

  if ("slug" in source) {
    const nameForSlug = (patch.name as string | undefined) ?? normalizeServiceName(source.name);
    patch.slug = normalizeSlug(source.slug, nameForSlug || "service");
  } else if ("name" in patch) {
    patch.slug = normalizeSlug("", String(patch.name));
  }

  if ("short_description" in source) {
    patch.short_description = normalizeOptionalText(source.short_description);
  }
  if ("hero_badge" in source) {
    patch.hero_badge = normalizeOptionalText(source.hero_badge);
  }
  if ("hero_title" in source) {
    patch.hero_title = normalizeOptionalText(source.hero_title);
  }
  if ("hero_description" in source) {
    patch.hero_description = normalizeOptionalText(source.hero_description);
  }
  if ("features" in source) {
    patch.features = normalizeFeatures(source.features);
  }
  if ("feature_cards" in source) {
    patch.feature_cards = normalizeFeatureCards(source.feature_cards);
  }
  if ("section_badge" in source) {
    patch.section_badge = normalizeOptionalText(source.section_badge);
  }
  if ("section_title" in source) {
    patch.section_title = normalizeOptionalText(source.section_title);
  }
  if ("section_description" in source) {
    patch.section_description = normalizeOptionalText(source.section_description);
  }
  if ("section_left_items" in source) {
    patch.section_left_items = normalizeTextList(source.section_left_items, 10);
  }
  if ("section_panel_title" in source) {
    patch.section_panel_title = normalizeOptionalText(source.section_panel_title);
  }
  if ("section_panel_subtitle" in source) {
    patch.section_panel_subtitle = normalizeOptionalText(source.section_panel_subtitle);
  }
  if ("section_panel_items" in source) {
    patch.section_panel_items = normalizeTextList(source.section_panel_items, 8);
  }
  if ("process_badge" in source) {
    patch.process_badge = normalizeOptionalText(source.process_badge);
  }
  if ("process_title" in source) {
    patch.process_title = normalizeOptionalText(source.process_title);
  }
  if ("process_steps" in source) {
    patch.process_steps = normalizeProcessSteps(source.process_steps);
  }
  if ("pricing_badge" in source) {
    patch.pricing_badge = normalizeOptionalText(source.pricing_badge);
  }
  if ("pricing_title" in source) {
    patch.pricing_title = normalizeOptionalText(source.pricing_title);
  }
  if ("pricing_description" in source) {
    patch.pricing_description = normalizeOptionalText(source.pricing_description);
  }
  if ("pricing_tiers" in source) {
    patch.pricing_tiers = normalizePricingTiers(source.pricing_tiers);
  }
  if ("cta_title_prefix" in source) {
    patch.cta_title_prefix = normalizeOptionalText(source.cta_title_prefix);
  }
  if ("cta_title_highlight" in source) {
    patch.cta_title_highlight = normalizeOptionalText(source.cta_title_highlight);
  }
  if ("cta_description" in source) {
    patch.cta_description = normalizeOptionalText(source.cta_description);
  }
  if ("cta_primary_label" in source) {
    patch.cta_primary_label = normalizeOptionalText(source.cta_primary_label);
  }
  if ("cta_primary_link" in source) {
    patch.cta_primary_link = normalizeOptionalText(source.cta_primary_link);
  }
  if ("cta_secondary_label" in source) {
    patch.cta_secondary_label = normalizeOptionalText(source.cta_secondary_label);
  }
  if ("cta_secondary_link" in source) {
    patch.cta_secondary_link = normalizeOptionalText(source.cta_secondary_link);
  }
  if ("meta_title" in source) {
    patch.meta_title = normalizeOptionalText(source.meta_title);
  }
  if ("meta_description" in source) {
    patch.meta_description = normalizeOptionalText(source.meta_description);
  }

  return { patch };
};

const selectServices = async (status: ServiceStatus | "all") => {
  const filters = [
    "select=id,name,slug,status,short_description,hero_badge,hero_title,hero_description,features,feature_cards,section_badge,section_title,section_description,section_left_items,section_panel_title,section_panel_subtitle,section_panel_items,process_badge,process_title,process_steps,pricing_badge,pricing_title,pricing_description,pricing_tiers,cta_title_prefix,cta_title_highlight,cta_description,cta_primary_label,cta_primary_link,cta_secondary_label,cta_secondary_link,meta_title,meta_description,created_at,updated_at",
    "order=created_at.desc",
  ];

  if (status !== "all") {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }

  return selectRows(`/services?${filters.join("&")}`);
};

const selectServicesLegacy = async (status: ServiceStatus | "all") => {
  const filters = ["select=id,name,status,created_at", "order=created_at.desc"];

  if (status !== "all") {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }

  return selectRows(`/services?${filters.join("&")}`);
};

router.get("/services", async (req, res) => {
  const status = normalizeStatus(req.query.status, true);

  try {
    const rows = await selectServices(status);
    const items = Array.isArray(rows) ? rows : [];
    return res.json(items.map((row) => normalizeServiceRow(row as RawServiceRow)));
  } catch (error: unknown) {
    if (isSchemaOutdatedError(error)) {
      try {
        const legacyRows = await selectServicesLegacy(status);
        const items = Array.isArray(legacyRows) ? legacyRows : [];
        return res.json(items.map((row) => normalizeServiceRow(row as RawServiceRow)));
      } catch (legacyError: unknown) {
        return res.status(500).json({
          message:
            legacyError instanceof Error ? legacyError.message : getSchemaOutdatedMessage(),
        });
      }
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch services",
    });
  }
});

router.post("/services", requireAuth, async (req, res) => {
  const { patch, error } = buildServicePatch(req.body, true);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const data = await insertRow("/services", patch);
    const created = Array.isArray(data) ? data[0] : null;
    if (!created) {
      return res.status(500).json({ message: "Failed to create service" });
    }
    return res.status(201).json(normalizeServiceRow(created as RawServiceRow));
  } catch (e: unknown) {
    if (isSchemaOutdatedError(e)) {
      try {
        const legacyPayload = {
          name: String(patch.name ?? ""),
          status: (patch.status as ServiceStatus | undefined) ?? "live",
        };
        const legacyData = await insertRow("/services", legacyPayload);
        const created = Array.isArray(legacyData) ? legacyData[0] : null;
        if (!created) {
          return res.status(500).json({ message: "Failed to create service" });
        }
        return res.status(201).json(normalizeServiceRow(created as RawServiceRow));
      } catch (legacyError: unknown) {
        if (isDuplicateNameError(legacyError)) {
          return res.status(409).json({ message: "Service name already exists" });
        }
        return res.status(500).json({
          message:
            legacyError instanceof Error ? legacyError.message : getSchemaOutdatedMessage(),
        });
      }
    }

    if (isDuplicateNameError(e)) {
      return res.status(409).json({ message: "Service name or slug already exists" });
    }
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to create service",
    });
  }
});

router.patch("/services/:id", requireAuth, async (req, res) => {
  const serviceId = Number(req.params.id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return res.status(400).json({ message: "Invalid service id" });
  }

  const { patch, error } = buildServicePatch(req.body, false);
  if (error) {
    return res.status(400).json({ message: error });
  }

  if (!patch || Object.keys(patch).length === 0) {
    return res.status(400).json({ message: "No valid fields provided" });
  }

  try {
    const data = await updateRow(`/services?id=eq.${encodeURIComponent(String(serviceId))}`, patch);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json(normalizeServiceRow(data[0] as RawServiceRow));
  } catch (e: unknown) {
    if (isSchemaOutdatedError(e)) {
      const legacyPatch: Record<string, unknown> = {};
      if ("name" in patch) legacyPatch.name = patch.name;
      if ("status" in patch) legacyPatch.status = patch.status;

      if (Object.keys(legacyPatch).length === 0) {
        return res.status(400).json({ message: getSchemaOutdatedMessage() });
      }

      try {
        const legacyData = await updateRow(
          `/services?id=eq.${encodeURIComponent(String(serviceId))}`,
          legacyPatch
        );
        if (!Array.isArray(legacyData) || legacyData.length === 0) {
          return res.status(404).json({ message: "Service not found" });
        }
        return res.json(normalizeServiceRow(legacyData[0] as RawServiceRow));
      } catch (legacyError: unknown) {
        if (isDuplicateNameError(legacyError)) {
          return res.status(409).json({ message: "Service name already exists" });
        }
        return res.status(500).json({
          message:
            legacyError instanceof Error ? legacyError.message : getSchemaOutdatedMessage(),
        });
      }
    }

    if (isDuplicateNameError(e)) {
      return res.status(409).json({ message: "Service name or slug already exists" });
    }
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to update service",
    });
  }
});

router.delete("/services/:id", requireAuth, async (req, res) => {
  const serviceId = Number(req.params.id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return res.status(400).json({ message: "Invalid service id" });
  }

  try {
    const existing = await selectRows(
      `/services?id=eq.${encodeURIComponent(String(serviceId))}&select=id&limit=1`
    );
    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    await deleteRow(`/services?id=eq.${encodeURIComponent(String(serviceId))}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete service",
    });
  }
});

export default router;
