import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  FileText,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
  ChevronRight,
  Globe,
  FileEdit,
  Sparkles,
  Layers,
  HelpCircle,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import FaqManager from "@/components/cms/FaqManager";
import BlogManager from "@/components/cms/BlogManager";
import HomePageManager from "@/components/cms/HomePageManager";
import CMSErrorBoundary from "@/components/cms/CMSErrorBoundary";
import { scrollCmsMainToTop } from "@/components/cms/cmsScroll";
import {
  buildDefaultServiceMetaDescription,
  buildDefaultServiceMetaTitle,
  buildDefaultServicePanelItems,
  buildDefaultServicePricingTiers,
  buildDefaultServiceProcessSteps,
  buildDefaultServiceSectionLeftItems,
  buildServiceFeatureCardsFromApi,
  buildServiceMetaDescriptionFromApi,
  buildServiceMetaTitleFromApi,
  buildServicePricingTiersFromApi,
  buildServiceProcessStepsFromApi,
  buildServiceSectionLeftItemsFromApi,
  buildServiceSectionPanelItemsFromApi,
  normalizeServiceTextList,
  resolveServiceLink,
  slugifyServiceName,
  type ApiServiceRecord,
  type ServiceFeatureCard,
  type ServicePricingTier,
  type ServiceProcessStep,
} from "@/components/shared/serviceCatalog";

type ServiceStatus = "live" | "draft";
type PageSection = "home" | "services" | "faq" | "blog";
type EditorTab = "settings" | "hero" | "content" | "process" | "pricing" | "cta" | "seo";

type ServiceItem = ApiServiceRecord & {
  id: number;
  name: string;
  status: ServiceStatus;
  slug?: string | null;
};

type ServiceForm = {
  name: string;
  slug: string;
  status: ServiceStatus;
  shortDescription: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  featuresText: string;
  featureCards: ServiceFeatureCard[];
  sectionBadge: string;
  sectionTitle: string;
  sectionDescription: string;
  sectionLeftItemsText: string;
  sectionPanelTitle: string;
  sectionPanelSubtitle: string;
  sectionPanelItemsText: string;
  processBadge: string;
  processTitle: string;
  processSteps: ServiceProcessStep[];
  pricingBadge: string;
  pricingTitle: string;
  pricingDescription: string;
  pricingTiers: ServicePricingTier[];
  ctaTitlePrefix: string;
  ctaTitleHighlight: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
  ctaPrimaryLink: string;
  ctaSecondaryLabel: string;
  ctaSecondaryLink: string;
  relatedWorksBadge: string;
  relatedWorksTitle: string;
  relatedWorksDescription: string;
  relatedWorksButtonLabel: string;
  relatedWorksButtonLink: string;
  relatedWorksEmptyText: string;
  metaTitle: string;
  metaDescription: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ");
const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const parseFeaturesText = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);

const toListText = (items: string[]) => items.join("\n");

const cleanProcessSteps = (steps: ServiceProcessStep[]) =>
  steps
    .map((step, index) => ({
      step: String(step.step || String(index + 1).padStart(2, "0")).trim(),
      title: step.title.trim(),
      description: step.description.trim(),
    }))
    .filter((step) => step.title && step.description)
    .slice(0, 8);

const cleanPricingTiers = (tiers: ServicePricingTier[]) => {
  const cleaned = tiers
    .map((tier) => ({
      name: tier.name.trim(),
      price: tier.price.trim(),
      description: tier.description.trim(),
      features: normalizeServiceTextList(tier.features, 10),
      popular: Boolean(tier.popular),
    }))
    .filter(
      (tier) =>
        tier.name && tier.price && tier.description && tier.features.length > 0
    )
    .slice(0, 6);

  let popularAssigned = false;
  return cleaned.map((tier) => {
    if (tier.popular && !popularAssigned) {
      popularAssigned = true;
      return tier;
    }
    return { ...tier, popular: false };
  });
};

const cleanFeatureCards = (cards: ServiceFeatureCard[]) =>
  cards
    .map((card) => ({
      title: card.title.trim(),
      description: card.description.trim(),
      icon: String(card.icon ?? "").trim() || null,
    }))
    .filter((card) => card.title && card.description)
    .slice(0, 8);

const fallbackCards = (name: string) => [
  {
    title: "Requirement Analysis",
    description: `Detailed review of your ${name.toLowerCase() || "service"} scope before execution.`,
    icon: "code",
  },
  {
    title: "Technical Execution",
    description: "Structured workflow with accurate technical output and quality checks.",
    icon: "shield",
  },
  {
    title: "Client-Ready Delivery",
    description: "Clean final submission with organized files and practical usability.",
    icon: "monitor",
  },
  {
    title: "Quality Assurance",
    description: "Detailed review checkpoints to ensure every output is accurate and dependable.",
    icon: "zap",
  },
  {
    title: "Client Communication",
    description: "Regular updates and feedback alignment throughout every phase of execution.",
    icon: "smartphone",
  },
  {
    title: "Presentation Quality",
    description: "Professional formatting and polished documentation for confident client submission.",
    icon: "palette",
  },
];

const createForm = (status: ServiceStatus, name = ""): ServiceForm => {
  const cleanName = normalizeName(name);
  const baseName = cleanName || "Service";
  const sectionLeft = buildDefaultServiceSectionLeftItems(baseName);
  return {
    name: cleanName,
    slug: cleanName ? slugifyServiceName(cleanName) : "",
    status,
    shortDescription: "",
    heroBadge: "Digital Solutions",
    heroTitle: cleanName,
    heroDescription: "",
    featuresText: "",
    featureCards: fallbackCards(cleanName || "service"),
    sectionBadge: "What You Get",
    sectionTitle: `Complete ${baseName} Solutions`,
    sectionDescription: `We deliver structured and professional ${baseName.toLowerCase()} support from planning to final handover.`,
    sectionLeftItemsText: toListText(sectionLeft),
    sectionPanelTitle: "Professional Delivery Stack",
    sectionPanelSubtitle: "Built for clarity and dependable output",
    sectionPanelItemsText: toListText(
      buildDefaultServicePanelItems(sectionLeft)
    ),
    processBadge: "Our Process",
    processTitle: "How We Work",
    processSteps: buildDefaultServiceProcessSteps(baseName),
    pricingBadge: "Pricing Plans",
    pricingTitle: "Choose Your Plan",
    pricingDescription:
      "All plans require payment before service delivery begins. Custom quotes available for complex projects.",
    pricingTiers: buildDefaultServicePricingTiers(baseName),
    ctaTitlePrefix: "Ready to Transform Your",
    ctaTitleHighlight: "Vision Into Reality?",
    ctaDescription:
      "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.",
    ctaPrimaryLabel: "Get Free Consultation",
    ctaPrimaryLink: "/start-project",
    ctaSecondaryLabel: "View Our Portfolio",
    ctaSecondaryLink: "/portfolio",
    relatedWorksBadge: "Our Work",
    relatedWorksTitle: "Related {{service}} Projects",
    relatedWorksDescription:
      "Live works linked from CMS for this service page appear here automatically.",
    relatedWorksButtonLabel: "View All Works",
    relatedWorksButtonLink: "/portfolio",
    relatedWorksEmptyText:
      "No live works are linked to this service yet. Select this service while posting from CMS Live Work to show it here.",
    metaTitle: buildDefaultServiceMetaTitle(baseName),
    metaDescription: buildDefaultServiceMetaDescription(baseName),
  };
};

const formFromService = (service: ServiceItem): ServiceForm => {
  const features = Array.isArray(service.features) ? service.features : [];
  const sectionLeftItems = buildServiceSectionLeftItemsFromApi(service);
  const sectionPanelItems = buildServiceSectionPanelItemsFromApi(
    service,
    sectionLeftItems
  );
  return {
    name: service.name,
    slug: (service.slug ?? "").trim(),
    status: service.status,
    shortDescription: service.short_description?.trim() || "",
    heroBadge: service.hero_badge?.trim() || "Digital Solutions",
    heroTitle: service.hero_title?.trim() || service.name,
    heroDescription: service.hero_description?.trim() || "",
    featuresText: features.join(", "),
    featureCards: buildServiceFeatureCardsFromApi(service),
    sectionBadge: service.section_badge?.trim() || "What You Get",
    sectionTitle:
      service.section_title?.trim() || `Complete ${service.name} Solutions`,
    sectionDescription:
      service.section_description?.trim() ||
      `We deliver structured and professional ${service.name.toLowerCase()} support from planning to final handover.`,
    sectionLeftItemsText: toListText(sectionLeftItems),
    sectionPanelTitle:
      service.section_panel_title?.trim() || "Professional Delivery Stack",
    sectionPanelSubtitle:
      service.section_panel_subtitle?.trim() ||
      "Built for clarity and dependable output",
    sectionPanelItemsText: toListText(sectionPanelItems),
    processBadge: service.process_badge?.trim() || "Our Process",
    processTitle: service.process_title?.trim() || "How We Work",
    processSteps: buildServiceProcessStepsFromApi(service),
    pricingBadge: service.pricing_badge?.trim() || "Pricing Plans",
    pricingTitle: service.pricing_title?.trim() || "Choose Your Plan",
    pricingDescription:
      service.pricing_description?.trim() ||
      "All plans require payment before service delivery begins. Custom quotes available for complex projects.",
    pricingTiers: buildServicePricingTiersFromApi(service),
    ctaTitlePrefix:
      service.cta_title_prefix?.trim() || "Ready to Transform Your",
    ctaTitleHighlight:
      service.cta_title_highlight?.trim() || "Vision Into Reality?",
    ctaDescription:
      service.cta_description?.trim() ||
      "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.",
    ctaPrimaryLabel:
      service.cta_primary_label?.trim() || "Get Free Consultation",
    ctaPrimaryLink: service.cta_primary_link?.trim() || "/start-project",
    ctaSecondaryLabel:
      service.cta_secondary_label?.trim() || "View Our Portfolio",
    ctaSecondaryLink: service.cta_secondary_link?.trim() || "/portfolio",
    relatedWorksBadge: service.related_works_badge?.trim() || "Our Work",
    relatedWorksTitle:
      service.related_works_title?.trim() ||
      "Related {{service}} Projects",
    relatedWorksDescription:
      service.related_works_description?.trim() ||
      "Live works linked from CMS for this service page appear here automatically.",
    relatedWorksButtonLabel:
      service.related_works_button_label?.trim() || "View All Works",
    relatedWorksButtonLink:
      service.related_works_button_link?.trim() || "/portfolio",
    relatedWorksEmptyText:
      service.related_works_empty_text?.trim() ||
      "No live works are linked to this service yet. Select this service while posting from CMS Live Work to show it here.",
    metaTitle: buildServiceMetaTitleFromApi(service),
    metaDescription: buildServiceMetaDescriptionFromApi(service),
  };
};

// ─── Editor Tabs ─────────────────────────────────────────────────────────────

const EDITOR_TABS: Array<{ id: EditorTab; label: string }> = [
  { id: "settings", label: "Settings" },
  { id: "hero", label: "Hero" },
  { id: "content", label: "Content" },
  { id: "process", label: "Process" },
  { id: "pricing", label: "Pricing" },
  { id: "cta", label: "CTA" },
  { id: "seo", label: "SEO" },
];

// ─── Service Row (empty state list item) ─────────────────────────────────────

function ServiceRow({
  service,
  onEdit,
  onStatusChange,
  onDelete,
  submitting,
  isLive,
}: {
  service: ServiceItem;
  onEdit: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
  submitting: boolean;
  isLive: boolean;
}) {
  const link = resolveServiceLink(service.name, service.slug);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 p-3.5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-primary/40 hover:shadow-md group">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
            isLive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            {service.name}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/80 truncate">
            {service.slug || slugifyServiceName(service.name)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="h-8 rounded-xl px-3 text-xs font-bold gap-1 border-border/60 hover:border-primary/30"
        >
          <PencilLine className="w-3.5 h-3.5" />
          Edit
        </Button>
        {isLive ? (
          <>
            <a href={link} target="_blank" rel="noreferrer">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 rounded-xl border-border/60 hover:border-primary/30"
                title="View live page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={onStatusChange}
              disabled={submitting}
              className="h-8 px-2.5 rounded-xl text-xs font-bold text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
              title="Move to draft"
            >
              Draft
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onStatusChange}
              disabled={submitting}
              className="h-8 px-2.5 rounded-xl text-xs font-bold text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
              title="Restore to live"
            >
              Restore
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={submitting}
              className="h-8 w-8 p-0 rounded-xl"
              title="Delete service"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PagesManager = () => {
  const apiBase = getApiBaseUrl();
  const [activeSection, setActiveSection] = useState<PageSection | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("settings");
  const [form, setForm] = useState<ServiceForm>(createForm("live"));

  const liveServices = useMemo(
    () => services.filter((s) => s.status === "live"),
    [services]
  );
  const draftServices = useMemo(
    () => services.filter((s) => s.status === "draft"),
    [services]
  );

  const requireToken = () => {
    const token = getAdminToken();
    if (token) return token;
    toast.error("Session expired. Please login again.");
    return null;
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, dr] = await Promise.all([
        fetch(`${apiBase}/services?status=live`),
        fetch(`${apiBase}/services?status=draft`),
      ]);
      if (!lr.ok || !dr.ok) throw new Error("Failed to fetch services");
      const ld = await lr.json();
      const dd = await dr.json();
      setServices([
        ...(Array.isArray(ld) ? ld : []),
        ...(Array.isArray(dd) ? dd : []),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load services"));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (activeSection === "services") loadServices();
  }, [activeSection, loadServices]);

  useEffect(() => {
    if (activeSection) scrollCmsMainToTop();
  }, [activeSection]);

  const openNewEditor = () => {
    setEditingId(null);
    setForm(createForm("live"));
    setEditorTab("settings");
    setEditorOpen(true);
  };

  const openEditEditor = (service: ServiceItem) => {
    setEditingId(service.id);
    setForm(formFromService(service));
    setEditorTab("settings");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const saveService = async () => {
    const token = requireToken();
    if (!token) return;
    const payload = {
      name: normalizeName(form.name),
      slug: slugifyServiceName(form.slug || form.name),
      status: form.status,
      short_description: form.shortDescription.trim() || null,
      hero_badge: form.heroBadge.trim() || null,
      hero_title: form.heroTitle.trim() || null,
      hero_description: form.heroDescription.trim() || null,
      features: parseFeaturesText(form.featuresText),
      feature_cards: cleanFeatureCards(form.featureCards),
      section_badge: form.sectionBadge.trim() || null,
      section_title: form.sectionTitle.trim() || null,
      section_description: form.sectionDescription.trim() || null,
      section_left_items: normalizeServiceTextList(form.sectionLeftItemsText, 10),
      section_panel_title: form.sectionPanelTitle.trim() || null,
      section_panel_subtitle: form.sectionPanelSubtitle.trim() || null,
      section_panel_items: normalizeServiceTextList(
        form.sectionPanelItemsText,
        8
      ),
      process_badge: form.processBadge.trim() || null,
      process_title: form.processTitle.trim() || null,
      process_steps: cleanProcessSteps(form.processSteps),
      pricing_badge: form.pricingBadge.trim() || null,
      pricing_title: form.pricingTitle.trim() || null,
      pricing_description: form.pricingDescription.trim() || null,
      pricing_tiers: cleanPricingTiers(form.pricingTiers),
      cta_title_prefix: form.ctaTitlePrefix.trim() || null,
      cta_title_highlight: form.ctaTitleHighlight.trim() || null,
      cta_description: form.ctaDescription.trim() || null,
      cta_primary_label: form.ctaPrimaryLabel.trim() || null,
      cta_primary_link: form.ctaPrimaryLink.trim() || null,
      cta_secondary_label: form.ctaSecondaryLabel.trim() || null,
      cta_secondary_link: form.ctaSecondaryLink.trim() || null,
      related_works_badge: form.relatedWorksBadge.trim() || null,
      related_works_title: form.relatedWorksTitle.trim() || null,
      related_works_description: form.relatedWorksDescription.trim() || null,
      related_works_button_label: form.relatedWorksButtonLabel.trim() || null,
      related_works_button_link: form.relatedWorksButtonLink.trim() || null,
      related_works_empty_text: form.relatedWorksEmptyText.trim() || null,
      meta_title: form.metaTitle.trim() || null,
      meta_description: form.metaDescription.trim() || null,
    };
    if (!payload.name) {
      toast.error("Service name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        editingId
          ? `${apiBase}/services/${editingId}`
          : `${apiBase}/services`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save service");
      }
      const saved = (await res.json()) as ServiceItem;
      setEditingId(saved.id);
      setForm(formFromService(saved));
      await loadServices();
      toast.success(
        saved.status === "live"
          ? "Service page saved and live"
          : "Service page saved to draft"
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save service"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (
    service: ServiceItem,
    nextStatus: ServiceStatus
  ) => {
    const token = requireToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/services/${service.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update service status");
      await loadServices();
      toast.success(
        nextStatus === "live"
          ? "Service restored to live"
          : "Service moved to draft"
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update status"));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteService = async (service: ServiceItem) => {
    const token = requireToken();
    if (!token) return;
    if (!window.confirm(`Permanently delete "${service.name}"?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/services/${service.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete service");
      if (editingId === service.id) closeEditor();
      await loadServices();
      toast.success("Service deleted permanently");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete service"));
    } finally {
      setSubmitting(false);
    }
  };

  const setField = <K extends keyof ServiceForm>(
    key: K,
    value: ServiceForm[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const setFeature = (
    index: number,
    key: keyof ServiceFeatureCard,
    value: string
  ) => {
    setForm((prev) => {
      const next = [...prev.featureCards];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, featureCards: next };
    });
  };

  const setProcessStep = (
    index: number,
    key: keyof ServiceProcessStep,
    value: string
  ) => {
    setForm((prev) => {
      const next = [...prev.processSteps];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, processSteps: next };
    });
  };

  const addProcessStep = () =>
    setForm((prev) => {
      if (prev.processSteps.length >= 8) return prev;
      const nextStep = String(prev.processSteps.length + 1).padStart(2, "0");
      return {
        ...prev,
        processSteps: [
          ...prev.processSteps,
          { step: nextStep, title: "", description: "" },
        ],
      };
    });

  const removeProcessStep = (index: number) =>
    setForm((prev) => {
      const next = prev.processSteps.filter((_, i) => i !== index);
      return {
        ...prev,
        processSteps:
          next.length > 0
            ? next
            : [{ step: "01", title: "", description: "" }],
      };
    });

  const setPricingTier = (
    index: number,
    key: keyof ServicePricingTier,
    value: string | boolean
  ) => {
    setForm((prev) => {
      const next = [...prev.pricingTiers];
      if (key === "popular") {
        next.forEach((tier, tierIndex) => {
          next[tierIndex] = {
            ...tier,
            popular: tierIndex === index ? Boolean(value) : false,
          };
        });
      } else if (key === "name" || key === "price" || key === "description") {
        next[index] = { ...next[index], [key]: String(value) };
      }
      return { ...prev, pricingTiers: next };
    });
  };

  const setPricingTierFeatures = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.pricingTiers];
      next[index] = {
        ...next[index],
        features: normalizeServiceTextList(value, 10),
      };
      return { ...prev, pricingTiers: next };
    });
  };

  const addPricingTier = () =>
    setForm((prev) =>
      prev.pricingTiers.length >= 6
        ? prev
        : {
            ...prev,
            pricingTiers: [
              ...prev.pricingTiers,
              {
                name: "",
                price: "",
                description: "",
                features: [],
                popular: false,
              },
            ],
          }
    );

  const removePricingTier = (index: number) =>
    setForm((prev) => {
      const next = prev.pricingTiers.filter((_, i) => i !== index);
      return {
        ...prev,
        pricingTiers:
          next.length > 0
            ? next
            : [
                {
                  name: "",
                  price: "",
                  description: "",
                  features: [],
                  popular: false,
                },
              ],
      };
    });

  const addFeatureCard = () =>
    setForm((prev) =>
      prev.featureCards.length >= 8
        ? prev
        : {
            ...prev,
            featureCards: [
              ...prev.featureCards,
              { title: "", description: "", icon: "" },
            ],
          }
    );

  const removeFeatureCard = (index: number) =>
    setForm((prev) => {
      const next = prev.featureCards.filter((_, i) => i !== index);
      return {
        ...prev,
        featureCards:
          next.length > 0
            ? next
            : [{ title: "", description: "", icon: "" }],
      };
    });

  const previewUrl = resolveServiceLink(
    form.name || "service",
    form.slug || null
  );

  const pageSections: Array<{
    id: PageSection;
    label: string;
    badge: string;
    icon: React.ReactNode;
    description: string;
    tags: string[];
    accentGradient: string;
    actionLabel: string;
  }> = [
    {
      id: "home",
      label: "Home Page Workspace",
      badge: "Core Layout",
      icon: <Globe className="w-6 h-6 text-white" />,
      description:
        "Customize the home page hero section, reorder site components, update software strips, and manage primary call-to-actions.",
      tags: ["Hero Section", "Global Strips", "CTA Cards", "Reorder"],
      accentGradient: "from-blue-500 to-cyan-500",
      actionLabel: "Configure Home Page",
    },
    {
      id: "services",
      label: "Our Services Catalog",
      badge: "Services & Pricing",
      icon: <Layers className="w-6 h-6 text-white" />,
      description:
        "Create, edit, and publish custom service offerings, pricing tiers, step-by-step process workflows, and feature cards.",
      tags: ["Service Pages", "Process Steps", "Pricing Tiers", "Features"],
      accentGradient: "from-purple-500 to-indigo-500",
      actionLabel: "Manage Catalog",
    },
    {
      id: "faq",
      label: "FAQ Management",
      badge: "Help & QA",
      icon: <HelpCircle className="w-6 h-6 text-white" />,
      description:
        "Manage page-specific FAQs for each live service with instant preview, draft workflow, and publish controls.",
      tags: ["Service FAQs", "Draft Mode", "Categorized QA"],
      accentGradient: "from-amber-500 to-orange-500",
      actionLabel: "Edit FAQs",
    },
    {
      id: "blog",
      label: "Blog Articles & News",
      badge: "Editorial Content",
      icon: <BookOpen className="w-6 h-6 text-white" />,
      description:
        "Publish technical articles, tutorial guides, news updates, and manage service-linked draft blog posts.",
      tags: ["Blog Posts", "Draft System", "Rich Content", "Author Meta"],
      accentGradient: "from-emerald-500 to-teal-500",
      actionLabel: "Manage Articles",
    },
  ];

  const goBack = () => {
    setActiveSection(null);
    setEditorOpen(false);
    setEditingId(null);
  };

  // ── Index: 4 page cards ──
  if (!activeSection) {
    return (
      <div className="space-y-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {pageSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 sm:p-6 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl text-left flex flex-col justify-between"
            >
              {/* Subtle ambient accent background glow */}
              <div className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br ${section.accentGradient} opacity-15 blur-2xl transition-opacity duration-300 group-hover:opacity-30`} />

              <div>
                <div className="flex items-center justify-between gap-3 mb-3.5">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${section.accentGradient} shadow-md transition-transform duration-300 group-hover:scale-105`}>
                    {section.icon}
                  </div>
                  <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-md">
                    {section.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {section.label}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {section.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {section.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3.5">
                <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline">
                  {section.actionLabel}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Inside a section ──
  return (
    <div className="space-y-4">
      {/* Top bar */}
      {activeSection !== "blog" && activeSection !== "faq" && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            className="gap-1.5 h-8"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Button>
          <span className="text-sm font-medium">
            {pageSections.find((s) => s.id === activeSection)?.label}
          </span>

          {/* Services toolbar */}
          {activeSection === "services" && (
            <div className="flex items-center gap-2.5 ml-auto flex-wrap">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest select-none">
                Live
              </span>
              <div className="relative">
                <select
                  className="h-8 rounded-lg border border-border/60 bg-background text-sm pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
                  value={editingId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (!id) {
                      closeEditor();
                      return;
                    }
                    const svc = services.find((s) => s.id === id);
                    if (svc) openEditEditor(svc);
                  }}
                >
                  <option value="">Select service</option>
                  {liveServices.length > 0 && (
                    <optgroup label={`Live (${liveServices.length})`}>
                      {liveServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {draftServices.length > 0 && (
                    <optgroup label={`Draft (${draftServices.length})`}>
                      {draftServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none rotate-90" />
              </div>
              <Button
                size="sm"
                onClick={openNewEditor}
                className="gap-1.5 h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Section content */}
      {activeSection === "home" ? (
        <CMSErrorBoundary>
          <HomePageManager />
        </CMSErrorBoundary>
      ) : activeSection === "services" ? (
        <CMSErrorBoundary>
          <ServicesSection
            loading={loading}
            liveServices={liveServices}
            draftServices={draftServices}
            openNewEditor={openNewEditor}
            openEditEditor={openEditEditor}
            updateStatus={updateStatus}
            deleteService={deleteService}
            submitting={submitting}
            editorOpen={editorOpen}
            closeEditor={closeEditor}
            editingId={editingId}
            editorTab={editorTab}
            setEditorTab={setEditorTab}
            form={form}
            setField={setField}
            setFeature={setFeature}
            addFeatureCard={addFeatureCard}
            removeFeatureCard={removeFeatureCard}
            setProcessStep={setProcessStep}
            addProcessStep={addProcessStep}
            removeProcessStep={removeProcessStep}
            setPricingTier={setPricingTier}
            setPricingTierFeatures={setPricingTierFeatures}
            addPricingTier={addPricingTier}
            removePricingTier={removePricingTier}
            saveService={saveService}
            previewUrl={previewUrl}
          />
        </CMSErrorBoundary>
      ) : activeSection === "faq" ? (
        <CMSErrorBoundary>
          <FaqManager onBack={goBack} />
        </CMSErrorBoundary>
      ) : (
        <CMSErrorBoundary>
          <BlogManager onBack={goBack} />
        </CMSErrorBoundary>
      )}
    </div>
  );
};

// ─── Services Section ────────────────────────────────────────────────────────

type ServicesSectionProps = {
  loading: boolean;
  liveServices: ServiceItem[];
  draftServices: ServiceItem[];
  openNewEditor: () => void;
  openEditEditor: (s: ServiceItem) => void;
  updateStatus: (s: ServiceItem, status: ServiceStatus) => void;
  deleteService: (s: ServiceItem) => void;
  submitting: boolean;
  editorOpen: boolean;
  closeEditor: () => void;
  editingId: number | null;
  editorTab: EditorTab;
  setEditorTab: (t: EditorTab) => void;
  form: ServiceForm;
  setField: <K extends keyof ServiceForm>(
    key: K,
    value: ServiceForm[K]
  ) => void;
  setFeature: (
    index: number,
    key: keyof ServiceFeatureCard,
    value: string
  ) => void;
  addFeatureCard: () => void;
  removeFeatureCard: (index: number) => void;
  setProcessStep: (
    index: number,
    key: keyof ServiceProcessStep,
    value: string
  ) => void;
  addProcessStep: () => void;
  removeProcessStep: (index: number) => void;
  setPricingTier: (
    index: number,
    key: keyof ServicePricingTier,
    value: string | boolean
  ) => void;
  setPricingTierFeatures: (index: number, value: string) => void;
  addPricingTier: () => void;
  removePricingTier: (index: number) => void;
  saveService: () => void;
  previewUrl: string;
};

const ServicesSection = ({
  loading,
  liveServices,
  draftServices,
  openNewEditor,
  openEditEditor,
  updateStatus,
  deleteService,
  submitting,
  editorOpen,
  closeEditor,
  editingId,
  editorTab,
  setEditorTab,
  form,
  setField,
  setFeature,
  addFeatureCard,
  removeFeatureCard,
  setProcessStep,
  addProcessStep,
  removeProcessStep,
  setPricingTier,
  setPricingTierFeatures,
  addPricingTier,
  removePricingTier,
  saveService,
  previewUrl,
}: ServicesSectionProps) => {
  const allServices = [...liveServices, ...draftServices];

  // ── Services Catalog Overview: when editor is closed ──
  if (!editorOpen) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-r from-card/90 via-card/75 to-purple-500/10 p-5 shadow-xl backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white shadow-md shadow-purple-500/30">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">Services Catalog Management</h3>
                <p className="text-xs text-muted-foreground">Manage active services, create custom offerings, and edit pricing & process steps.</p>
              </div>
            </div>
            <Button onClick={openNewEditor} className="rounded-xl font-bold bg-purple-500 text-white shadow-md shadow-purple-500/25 hover:bg-purple-600 gap-1.5 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              <span>Create New Service</span>
            </Button>
          </div>
        </div>

        {!loading && allServices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveServices.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Live Services ({liveServices.length})
                  </span>
                </div>
                <div className="space-y-2.5">
                  {liveServices.map((service) => (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      onEdit={() => openEditEditor(service)}
                      onStatusChange={() => updateStatus(service, "draft")}
                      onDelete={() => deleteService(service)}
                      submitting={submitting}
                      isLive
                    />
                  ))}
                </div>
              </div>
            )}

            {draftServices.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Draft Services ({draftServices.length})
                  </span>
                </div>
                <div className="space-y-2.5">
                  {draftServices.map((service) => (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      onEdit={() => openEditEditor(service)}
                      onStatusChange={() => updateStatus(service, "live")}
                      onDelete={() => deleteService(service)}
                      submitting={submitting}
                      isLive={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-card/40 animate-pulse border border-border/40" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Editor panel ──
  return (
    <div className="glass-card border-border/60">
      {/* Editor Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div className="min-w-0">
          <h3 className="text-base font-semibold truncate">
            {editingId ? form.name || "Edit Service" : "New Service"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {editingId ? "Editing service page" : "Creating new page"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {form.status === "live" && editingId && (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Preview
              </Button>
            </a>
          )}
          <Button
            onClick={saveService}
            disabled={submitting}
            size="sm"
            className="gap-1.5 h-8 text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeEditor}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <div className="flex gap-0 border-b border-border/60 overflow-x-auto">
        {EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setEditorTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium shrink-0 border-b-2 transition-colors ${
              editorTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5 space-y-4">
        {/* ── Settings Tab ── */}
        {editorTab === "settings" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Service Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Service name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Page Slug
                </label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setField("slug", slugifyServiceName(e.target.value))
                  }
                  placeholder="page-slug"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Status
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={form.status === "live" ? "default" : "outline"}
                  onClick={() => setField("status", "live")}
                >
                  Live
                </Button>
                <Button
                  size="sm"
                  variant={form.status === "draft" ? "default" : "outline"}
                  onClick={() => setField("status", "draft")}
                >
                  Draft
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Short Description (All Services card)
              </label>
              <Textarea
                rows={3}
                value={form.shortDescription}
                onChange={(e) =>
                  setField("shortDescription", e.target.value)
                }
                placeholder="Card description for All Services page"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Feature Tags (comma or line separated)
              </label>
              <Textarea
                rows={3}
                value={form.featuresText}
                onChange={(e) => setField("featuresText", e.target.value)}
                placeholder="Tag 1, Tag 2, Tag 3"
              />
            </div>
          </div>
        )}

        {/* ── Hero Tab ── */}
        {editorTab === "hero" && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Badge</label>
                <Input
                  value={form.heroBadge}
                  onChange={(e) => setField("heroBadge", e.target.value)}
                  placeholder="Hero badge"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={form.heroTitle}
                  onChange={(e) => setField("heroTitle", e.target.value)}
                  placeholder="Hero title"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Description
              </label>
              <Textarea
                rows={4}
                value={form.heroDescription}
                onChange={(e) => setField("heroDescription", e.target.value)}
                placeholder="Hero description"
              />
            </div>
            <div className="border-t border-border/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Feature Cards</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addFeatureCard}
                  className="gap-1 h-7 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              {form.featureCards.map((card, index) => (
                <div
                  key={`card-${index}`}
                  className="rounded-xl border border-border/60 p-3 space-y-2"
                >
                  <div className="flex gap-2">
                    <Input
                      value={String(card.icon ?? "")}
                      onChange={(e) =>
                        setFeature(index, "icon", e.target.value)
                      }
                      placeholder="Icon (code, shield, zap…)"
                      className="flex-1 text-sm h-8"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFeatureCard(index)}
                      disabled={form.featureCards.length === 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={card.title}
                    onChange={(e) =>
                      setFeature(index, "title", e.target.value)
                    }
                    placeholder={`Card ${index + 1} title`}
                    className="text-sm h-8"
                  />
                  <Textarea
                    rows={2}
                    value={card.description}
                    onChange={(e) =>
                      setFeature(index, "description", e.target.value)
                    }
                    placeholder="Card description"
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Content Tab ── */}
        {editorTab === "content" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Section Badge
                </label>
                <Input
                  value={form.sectionBadge}
                  onChange={(e) => setField("sectionBadge", e.target.value)}
                  placeholder="Badge text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Section Title
                </label>
                <Input
                  value={form.sectionTitle}
                  onChange={(e) => setField("sectionTitle", e.target.value)}
                  placeholder="Section heading"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Section Description
              </label>
              <Textarea
                rows={3}
                value={form.sectionDescription}
                onChange={(e) =>
                  setField("sectionDescription", e.target.value)
                }
                placeholder="Section description"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Left Column Items (one per line)
                </label>
                <Textarea
                  rows={6}
                  value={form.sectionLeftItemsText}
                  onChange={(e) =>
                    setField("sectionLeftItemsText", e.target.value)
                  }
                  placeholder={"Item 1\nItem 2\nItem 3"}
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Right Panel Title
                  </label>
                  <Input
                    value={form.sectionPanelTitle}
                    onChange={(e) =>
                      setField("sectionPanelTitle", e.target.value)
                    }
                    placeholder="Panel title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Right Panel Subtitle
                  </label>
                  <Input
                    value={form.sectionPanelSubtitle}
                    onChange={(e) =>
                      setField("sectionPanelSubtitle", e.target.value)
                    }
                    placeholder="Panel subtitle"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Panel Items (one per line)
                  </label>
                  <Textarea
                    rows={4}
                    value={form.sectionPanelItemsText}
                    onChange={(e) =>
                      setField("sectionPanelItemsText", e.target.value)
                    }
                    placeholder={"Item 1\nItem 2"}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4 space-y-3">
              <p className="text-sm font-medium">Related Works</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Badge</label>
                  <Input
                    value={form.relatedWorksBadge}
                    onChange={(e) =>
                      setField("relatedWorksBadge", e.target.value)
                    }
                    placeholder="Section badge"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Title (use {`{{service}}`})
                  </label>
                  <Input
                    value={form.relatedWorksTitle}
                    onChange={(e) =>
                      setField("relatedWorksTitle", e.target.value)
                    }
                    placeholder="Related {{service}} Projects"
                  />
                </div>
              </div>
              <Textarea
                rows={2}
                value={form.relatedWorksDescription}
                onChange={(e) =>
                  setField("relatedWorksDescription", e.target.value)
                }
                placeholder="Description"
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  value={form.relatedWorksButtonLabel}
                  onChange={(e) =>
                    setField("relatedWorksButtonLabel", e.target.value)
                  }
                  placeholder="Button text"
                />
                <Input
                  value={form.relatedWorksButtonLink}
                  onChange={(e) =>
                    setField("relatedWorksButtonLink", e.target.value)
                  }
                  placeholder="Button link"
                />
              </div>
              <Textarea
                rows={2}
                value={form.relatedWorksEmptyText}
                onChange={(e) =>
                  setField("relatedWorksEmptyText", e.target.value)
                }
                placeholder="Empty state text"
              />
            </div>
          </div>
        )}

        {/* ── Process Tab ── */}
        {editorTab === "process" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Badge</label>
                <Input
                  value={form.processBadge}
                  onChange={(e) => setField("processBadge", e.target.value)}
                  placeholder="Process badge"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={form.processTitle}
                  onChange={(e) => setField("processTitle", e.target.value)}
                  placeholder="Process title"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Steps</p>
              <Button
                size="sm"
                variant="outline"
                onClick={addProcessStep}
                className="gap-1 h-7 text-xs"
              >
                <Plus className="w-3 h-3" />
                Add Step
              </Button>
            </div>
            {form.processSteps.map((step, index) => (
              <div
                key={`step-${index}`}
                className="rounded-xl border border-border/60 p-3 space-y-2"
              >
                <div className="flex gap-2">
                  <Input
                    value={step.step}
                    onChange={(e) =>
                      setProcessStep(index, "step", e.target.value)
                    }
                    placeholder="01"
                    className="w-20 text-sm h-8 shrink-0"
                  />
                  <Input
                    value={step.title}
                    onChange={(e) =>
                      setProcessStep(index, "title", e.target.value)
                    }
                    placeholder="Step title"
                    className="flex-1 text-sm h-8"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeProcessStep(index)}
                    disabled={form.processSteps.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  value={step.description}
                  onChange={(e) =>
                    setProcessStep(index, "description", e.target.value)
                  }
                  placeholder="Step description"
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Pricing Tab ── */}
        {editorTab === "pricing" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Badge</label>
                <Input
                  value={form.pricingBadge}
                  onChange={(e) => setField("pricingBadge", e.target.value)}
                  placeholder="Pricing badge"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={form.pricingTitle}
                  onChange={(e) => setField("pricingTitle", e.target.value)}
                  placeholder="Pricing title"
                />
              </div>
            </div>
            <Textarea
              rows={2}
              value={form.pricingDescription}
              onChange={(e) =>
                setField("pricingDescription", e.target.value)
              }
              placeholder="Pricing description"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Tiers</p>
              <Button
                size="sm"
                variant="outline"
                onClick={addPricingTier}
                className="gap-1 h-7 text-xs"
              >
                <Plus className="w-3 h-3" />
                Add Tier
              </Button>
            </div>
            {form.pricingTiers.map((tier, index) => (
              <div
                key={`tier-${index}`}
                className="rounded-xl border border-border/60 p-3 space-y-2"
              >
                <div className="flex gap-2 items-center">
                  <Input
                    value={tier.name}
                    onChange={(e) =>
                      setPricingTier(index, "name", e.target.value)
                    }
                    placeholder="Tier name"
                    className="flex-1 text-sm h-8"
                  />
                  <Input
                    value={tier.price}
                    onChange={(e) =>
                      setPricingTier(index, "price", e.target.value)
                    }
                    placeholder="Price"
                    className="w-28 text-sm h-8 shrink-0"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(tier.popular)}
                      onChange={(e) =>
                        setPricingTier(index, "popular", e.target.checked)
                      }
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Popular
                  </label>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removePricingTier(index)}
                    disabled={form.pricingTiers.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  value={tier.description}
                  onChange={(e) =>
                    setPricingTier(index, "description", e.target.value)
                  }
                  placeholder="Tier description"
                  className="text-sm"
                />
                <Textarea
                  rows={3}
                  value={tier.features.join("\n")}
                  onChange={(e) =>
                    setPricingTierFeatures(index, e.target.value)
                  }
                  placeholder="Features (one per line)"
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── CTA Tab ── */}
        {editorTab === "cta" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Title First Line
                </label>
                <Input
                  value={form.ctaTitlePrefix}
                  onChange={(e) =>
                    setField("ctaTitlePrefix", e.target.value)
                  }
                  placeholder="Ready to Transform Your"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Title Highlighted Line
                </label>
                <Input
                  value={form.ctaTitleHighlight}
                  onChange={(e) =>
                    setField("ctaTitleHighlight", e.target.value)
                  }
                  placeholder="Vision Into Reality?"
                />
              </div>
            </div>
            <Textarea
              rows={3}
              value={form.ctaDescription}
              onChange={(e) => setField("ctaDescription", e.target.value)}
              placeholder="CTA description"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Primary Button Text
                </label>
                <Input
                  value={form.ctaPrimaryLabel}
                  onChange={(e) =>
                    setField("ctaPrimaryLabel", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Primary Button Link
                </label>
                <Input
                  value={form.ctaPrimaryLink}
                  onChange={(e) =>
                    setField("ctaPrimaryLink", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Secondary Button Text
                </label>
                <Input
                  value={form.ctaSecondaryLabel}
                  onChange={(e) =>
                    setField("ctaSecondaryLabel", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Secondary Button Link
                </label>
                <Input
                  value={form.ctaSecondaryLink}
                  onChange={(e) =>
                    setField("ctaSecondaryLink", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ── SEO Tab ── */}
        {editorTab === "seo" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Meta Title
              </label>
              <Input
                value={form.metaTitle}
                onChange={(e) => setField("metaTitle", e.target.value)}
                placeholder="SEO meta title"
              />
              <p className="text-xs text-muted-foreground">
                {form.metaTitle.length}/60 chars
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Meta Description
              </label>
              <Textarea
                rows={3}
                value={form.metaDescription}
                onChange={(e) => setField("metaDescription", e.target.value)}
                placeholder="SEO meta description"
              />
              <p className="text-xs text-muted-foreground">
                {form.metaDescription.length}/160 chars
              </p>
            </div>
          </div>
        )}

        {/* Bottom Save */}
        <div className="pt-2 border-t border-border/60 flex gap-2">
          <Button
            onClick={saveService}
            disabled={submitting}
            size="sm"
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
          {form.status === "live" && editingId && (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Open Live
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PagesManager;
