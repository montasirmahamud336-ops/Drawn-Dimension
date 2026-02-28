import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, FileText, PencilLine, Plus, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import FaqManager from "@/components/cms/FaqManager";
import BlogManager from "@/components/cms/BlogManager";
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
type PageSection = "services" | "faq" | "blog";

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
  metaTitle: string;
  metaDescription: string;
};

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
    .filter((tier) => tier.name && tier.price && tier.description && tier.features.length > 0)
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
    sectionPanelItemsText: toListText(buildDefaultServicePanelItems(sectionLeft)),
    processBadge: "Our Process",
    processTitle: "How We Work",
    processSteps: buildDefaultServiceProcessSteps(baseName),
    pricingBadge: "Pricing Plans",
    pricingTitle: "Choose Your Plan",
    pricingDescription: "All plans require payment before service delivery begins. Custom quotes available for complex projects.",
    pricingTiers: buildDefaultServicePricingTiers(baseName),
    ctaTitlePrefix: "Ready to Transform Your",
    ctaTitleHighlight: "Vision Into Reality?",
    ctaDescription:
      "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.",
    ctaPrimaryLabel: "Get Free Consultation",
    ctaPrimaryLink: "/contact",
    ctaSecondaryLabel: "View Our Portfolio",
    ctaSecondaryLink: "/portfolio",
    metaTitle: buildDefaultServiceMetaTitle(baseName),
    metaDescription: buildDefaultServiceMetaDescription(baseName),
  };
};

const formFromService = (service: ServiceItem): ServiceForm => {
  const features = Array.isArray(service.features) ? service.features : [];
  const sectionLeftItems = buildServiceSectionLeftItemsFromApi(service);
  const sectionPanelItems = buildServiceSectionPanelItemsFromApi(service, sectionLeftItems);
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
    sectionTitle: service.section_title?.trim() || `Complete ${service.name} Solutions`,
    sectionDescription:
      service.section_description?.trim() ||
      `We deliver structured and professional ${service.name.toLowerCase()} support from planning to final handover.`,
    sectionLeftItemsText: toListText(sectionLeftItems),
    sectionPanelTitle: service.section_panel_title?.trim() || "Professional Delivery Stack",
    sectionPanelSubtitle: service.section_panel_subtitle?.trim() || "Built for clarity and dependable output",
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
    ctaTitlePrefix: service.cta_title_prefix?.trim() || "Ready to Transform Your",
    ctaTitleHighlight: service.cta_title_highlight?.trim() || "Vision Into Reality?",
    ctaDescription:
      service.cta_description?.trim() ||
      "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.",
    ctaPrimaryLabel: service.cta_primary_label?.trim() || "Get Free Consultation",
    ctaPrimaryLink: service.cta_primary_link?.trim() || "/contact",
    ctaSecondaryLabel: service.cta_secondary_label?.trim() || "View Our Portfolio",
    ctaSecondaryLink: service.cta_secondary_link?.trim() || "/portfolio",
    metaTitle: buildServiceMetaTitleFromApi(service),
    metaDescription: buildServiceMetaDescriptionFromApi(service),
  };
};

const PagesManager = () => {
  const apiBase = getApiBaseUrl();
  const [activeSection, setActiveSection] = useState<PageSection>("services");
  const [statusTab, setStatusTab] = useState<ServiceStatus>("live");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(createForm("live"));

  const requireToken = () => {
    const token = getAdminToken();
    if (token) return token;
    toast.error("Session expired. Please login again.");
    return null;
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/services?status=${statusTab}`);
      if (!res.ok) throw new Error("Failed to fetch services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load services"));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, statusTab]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return services;
    return services.filter((service) =>
      [service.name, service.slug ?? "", service.short_description ?? ""].join(" ").toLowerCase().includes(key)
    );
  }, [search, services]);

  const openNewEditor = () => {
    setEditingId(null);
    setForm(createForm(statusTab, newName));
    setEditorOpen(true);
  };

  const openEditEditor = (service: ServiceItem) => {
    setEditingId(service.id);
    setForm(formFromService(service));
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
      section_panel_items: normalizeServiceTextList(form.sectionPanelItemsText, 8),
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
      meta_title: form.metaTitle.trim() || null,
      meta_description: form.metaDescription.trim() || null,
    };

    if (!payload.name) {
      toast.error("Service name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(editingId ? `${apiBase}/services/${editingId}` : `${apiBase}/services`, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save service");
      }

      const saved = (await res.json()) as ServiceItem;
      setEditingId(saved.id);
      setForm(formFromService(saved));
      setNewName("");
      if (saved.status !== statusTab) setStatusTab(saved.status);
      else await loadServices();
      toast.success(saved.status === "live" ? "Service page saved and live" : "Service page saved to draft");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save service"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (service: ServiceItem, nextStatus: ServiceStatus) => {
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
      toast.success(nextStatus === "live" ? "Service restored to live" : "Service moved to draft");
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

  const setField = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setFeature = (index: number, key: keyof ServiceFeatureCard, value: string) => {
    setForm((prev) => {
      const next = [...prev.featureCards];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, featureCards: next };
    });
  };

  const setProcessStep = (index: number, key: keyof ServiceProcessStep, value: string) => {
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
        processSteps: [...prev.processSteps, { step: nextStep, title: "", description: "" }],
      };
    });

  const removeProcessStep = (index: number) =>
    setForm((prev) => {
      const next = prev.processSteps.filter((_, i) => i !== index);
      return {
        ...prev,
        processSteps: next.length > 0 ? next : [{ step: "01", title: "", description: "" }],
      };
    });

  const setPricingTier = (index: number, key: keyof ServicePricingTier, value: string | boolean) => {
    setForm((prev) => {
      const next = [...prev.pricingTiers];
      if (key === "popular") {
        next.forEach((tier, tierIndex) => {
          next[tierIndex] = { ...tier, popular: tierIndex === index ? Boolean(value) : false };
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
      next[index] = { ...next[index], features: normalizeServiceTextList(value, 10) };
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
              { name: "", price: "", description: "", features: [], popular: false },
            ],
          }
    );

  const removePricingTier = (index: number) =>
    setForm((prev) => {
      const next = prev.pricingTiers.filter((_, i) => i !== index);
      return {
        ...prev,
        pricingTiers:
          next.length > 0 ? next : [{ name: "", price: "", description: "", features: [], popular: false }],
      };
    });

  const addFeatureCard = () =>
    setForm((prev) =>
      prev.featureCards.length >= 8
        ? prev
        : { ...prev, featureCards: [...prev.featureCards, { title: "", description: "", icon: "" }] }
    );

  const removeFeatureCard = (index: number) =>
    setForm((prev) => {
      const next = prev.featureCards.filter((_, i) => i !== index);
      return { ...prev, featureCards: next.length > 0 ? next : [{ title: "", description: "", icon: "" }] };
    });

  const previewUrl = resolveServiceLink(form.name || "service", form.slug || null);
  const pageSections: Array<{ id: PageSection; label: string }> = [
    { id: "services", label: "Our Services" },
    { id: "faq", label: "FAQ" },
    { id: "blog", label: "Blog" },
  ];
  const sectionDescriptions: Record<PageSection, string> = {
    services: "Create, edit, and publish service pages from CMS.",
    faq: "Manage page-wise FAQs for each live service with draft workflow.",
    blog: "Create and publish service-wise blog posts with draft workflow.",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pages</h2>
        <p className="text-muted-foreground">{sectionDescriptions[activeSection]}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6">
        <aside className="glass-card border-border/60 p-3 h-fit">
          <p className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Page Sections</p>
          <div className="space-y-2">
            {pageSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                  activeSection === section.id
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border/60 hover:border-primary/35"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {section.label}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          {activeSection === "services" ? (
            <>
          <div className="glass-card p-4 border-border/60">
            <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
              <div className="flex gap-2">
                <Button variant={statusTab === "live" ? "default" : "outline"} onClick={() => setStatusTab("live")}>
                  Live
                </Button>
                <Button variant={statusTab === "draft" ? "default" : "outline"} onClick={() => setStatusTab("draft")}>
                  Draft
                </Button>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${statusTab} services...`}
                  className="pl-9"
                />
              </div>
              <div className="flex w-full xl:w-auto gap-2">
                <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New service name" />
                <Button onClick={openNewEditor} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Service
                </Button>
              </div>
            </div>
          </div>

          {editorOpen && (
            <div className="glass-card p-4 md:p-5 border-border/60 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{editingId ? "Edit Service Page" : "Create Service Page"}</h3>
                <Button variant="outline" size="sm" onClick={closeEditor} className="gap-1">
                  <X className="w-4 h-4" />
                  Close
                </Button>
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium">Page Settings</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Service name" />
                  <Input
                    value={form.slug}
                    onChange={(e) => setField("slug", slugifyServiceName(e.target.value))}
                    placeholder="page slug"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={form.status === "live" ? "default" : "outline"} onClick={() => setField("status", "live")}>
                    Live
                  </Button>
                  <Button size="sm" variant={form.status === "draft" ? "default" : "outline"} onClick={() => setField("status", "draft")}>
                    Draft
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium">Hero Section</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input value={form.heroBadge} onChange={(e) => setField("heroBadge", e.target.value)} placeholder="Hero badge" />
                  <Input value={form.heroTitle} onChange={(e) => setField("heroTitle", e.target.value)} placeholder="Hero title" />
                </div>
                <Textarea
                  rows={3}
                  value={form.heroDescription}
                  onChange={(e) => setField("heroDescription", e.target.value)}
                  placeholder="Hero description"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium">All Services Card Section</p>
                <Textarea
                  rows={3}
                  value={form.shortDescription}
                  onChange={(e) => setField("shortDescription", e.target.value)}
                  placeholder="Card description for All Services page"
                />
                <Textarea
                  rows={3}
                  value={form.featuresText}
                  onChange={(e) => setField("featuresText", e.target.value)}
                  placeholder="Card tag list (one per line or comma separated)"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Feature Cards Section</p>
                  <Button size="sm" variant="outline" onClick={addFeatureCard} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Add Card
                  </Button>
                </div>
                {form.featureCards.map((card, index) => (
                  <div key={`card-${index}`} className="grid md:grid-cols-[1fr_auto] gap-2 rounded-xl border border-border/60 p-3">
                    <div className="space-y-2">
                      <Input value={String(card.icon ?? "")} onChange={(e) => setFeature(index, "icon", e.target.value)} placeholder="Icon key (code, smartphone, zap, shield, palette, monitor)" />
                      <Input value={card.title} onChange={(e) => setFeature(index, "title", e.target.value)} placeholder={`Feature ${index + 1} title`} />
                      <Textarea
                        rows={2}
                        value={card.description}
                        onChange={(e) => setFeature(index, "description", e.target.value)}
                        placeholder="Feature description"
                      />
                    </div>
                    <Button size="icon" variant="outline" onClick={() => removeFeatureCard(index)} disabled={form.featureCards.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium">Delivery Highlights Section</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input value={form.sectionBadge} onChange={(e) => setField("sectionBadge", e.target.value)} placeholder="Section badge" />
                  <Input value={form.sectionTitle} onChange={(e) => setField("sectionTitle", e.target.value)} placeholder="Section heading" />
                </div>
                <Textarea
                  rows={3}
                  value={form.sectionDescription}
                  onChange={(e) => setField("sectionDescription", e.target.value)}
                  placeholder="Section description"
                />
                <div className="grid md:grid-cols-2 gap-3">
                  <Textarea
                    rows={6}
                    value={form.sectionLeftItemsText}
                    onChange={(e) => setField("sectionLeftItemsText", e.target.value)}
                    placeholder="Left column items (one per line)"
                  />
                  <div className="space-y-3">
                    <Input value={form.sectionPanelTitle} onChange={(e) => setField("sectionPanelTitle", e.target.value)} placeholder="Right panel title" />
                    <Input
                      value={form.sectionPanelSubtitle}
                      onChange={(e) => setField("sectionPanelSubtitle", e.target.value)}
                      placeholder="Right panel subtitle"
                    />
                    <Textarea
                      rows={4}
                      value={form.sectionPanelItemsText}
                      onChange={(e) => setField("sectionPanelItemsText", e.target.value)}
                      placeholder="Right panel items (one per line)"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">How We Work Section</p>
                  <Button size="sm" variant="outline" onClick={addProcessStep} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Add Step
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input value={form.processBadge} onChange={(e) => setField("processBadge", e.target.value)} placeholder="Process section badge" />
                  <Input value={form.processTitle} onChange={(e) => setField("processTitle", e.target.value)} placeholder="Process section title" />
                </div>
                {form.processSteps.map((step, index) => (
                  <div key={`process-step-${index}`} className="rounded-xl border border-border/60 p-3 space-y-2">
                    <div className="grid md:grid-cols-[120px_1fr_auto] gap-2">
                      <Input value={step.step} onChange={(e) => setProcessStep(index, "step", e.target.value)} placeholder="Step no" />
                      <Input value={step.title} onChange={(e) => setProcessStep(index, "title", e.target.value)} placeholder="Step title" />
                      <Button size="icon" variant="outline" onClick={() => removeProcessStep(index)} disabled={form.processSteps.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={step.description}
                      onChange={(e) => setProcessStep(index, "description", e.target.value)}
                      placeholder="Step description"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Pricing Section</p>
                  <Button size="sm" variant="outline" onClick={addPricingTier} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Add Tier
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input value={form.pricingBadge} onChange={(e) => setField("pricingBadge", e.target.value)} placeholder="Pricing section badge" />
                  <Input value={form.pricingTitle} onChange={(e) => setField("pricingTitle", e.target.value)} placeholder="Pricing section title" />
                </div>
                <Textarea
                  rows={2}
                  value={form.pricingDescription}
                  onChange={(e) => setField("pricingDescription", e.target.value)}
                  placeholder="Pricing section description"
                />
                {form.pricingTiers.map((tier, index) => (
                  <div key={`pricing-tier-${index}`} className="rounded-xl border border-border/60 p-3 space-y-2">
                    <div className="grid md:grid-cols-[1fr_180px_auto_auto] gap-2 items-center">
                      <Input value={tier.name} onChange={(e) => setPricingTier(index, "name", e.target.value)} placeholder="Tier name" />
                      <Input value={tier.price} onChange={(e) => setPricingTier(index, "price", e.target.value)} placeholder="Price" />
                      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={Boolean(tier.popular)}
                          onChange={(e) => setPricingTier(index, "popular", e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                        Popular
                      </label>
                      <Button size="icon" variant="outline" onClick={() => removePricingTier(index)} disabled={form.pricingTiers.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={tier.description}
                      onChange={(e) => setPricingTier(index, "description", e.target.value)}
                      placeholder="Tier description"
                    />
                    <Textarea
                      rows={3}
                      value={tier.features.join("\n")}
                      onChange={(e) => setPricingTierFeatures(index, e.target.value)}
                      placeholder="Tier features (one per line)"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium">CTA Section</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input value={form.ctaTitlePrefix} onChange={(e) => setField("ctaTitlePrefix", e.target.value)} placeholder="CTA title (first line)" />
                  <Input value={form.ctaTitleHighlight} onChange={(e) => setField("ctaTitleHighlight", e.target.value)} placeholder="CTA highlighted line" />
                </div>
                <Textarea
                  rows={3}
                  value={form.ctaDescription}
                  onChange={(e) => setField("ctaDescription", e.target.value)}
                  placeholder="CTA description"
                />
                <div className="grid md:grid-cols-2 gap-3">
                  <Input value={form.ctaPrimaryLabel} onChange={(e) => setField("ctaPrimaryLabel", e.target.value)} placeholder="Primary button text" />
                  <Input value={form.ctaPrimaryLink} onChange={(e) => setField("ctaPrimaryLink", e.target.value)} placeholder="Primary button link" />
                  <Input value={form.ctaSecondaryLabel} onChange={(e) => setField("ctaSecondaryLabel", e.target.value)} placeholder="Secondary button text" />
                  <Input value={form.ctaSecondaryLink} onChange={(e) => setField("ctaSecondaryLink", e.target.value)} placeholder="Secondary button link" />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <p className="text-sm font-medium">SEO Section</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input value={form.metaTitle} onChange={(e) => setField("metaTitle", e.target.value)} placeholder="SEO meta title" />
                  <Input
                    value={form.metaDescription}
                    onChange={(e) => setField("metaDescription", e.target.value)}
                    placeholder="SEO meta description"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveService} disabled={submitting} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Service Page
                </Button>
                {form.status === "live" && (
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="gap-2" type="button">
                      <ExternalLink className="w-4 h-4" />
                      Open Live Page
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((service) => {
                const link = resolveServiceLink(service.name, service.slug);
                return (
                  <div key={service.id} className="glass-card p-4 border-border/60">
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">/{service.slug || slugifyServiceName(service.name)}</p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {service.short_description || "No service description yet."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditEditor(service)} className="gap-1">
                        <PencilLine className="w-4 h-4" />
                        Edit Page
                      </Button>
                      {statusTab === "live" && (
                        <>
                          <a href={link} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="gap-1">
                              <ExternalLink className="w-4 h-4" />
                              View
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(service, "draft")}
                            className="gap-1 text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                            Draft
                          </Button>
                        </>
                      )}
                      {statusTab === "draft" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(service, "live")}
                            className="gap-1 text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restore
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteService(service)} className="gap-1">
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {!loading && filtered.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-12 glass-card border-border/60">
                  No {statusTab} services found.
                </div>
              )}
            </div>
          )}
            </>
          ) : activeSection === "faq" ? (
            <FaqManager />
          ) : (
            <BlogManager />
          )}
        </section>
      </div>
    </div>
  );
};

export default PagesManager;
