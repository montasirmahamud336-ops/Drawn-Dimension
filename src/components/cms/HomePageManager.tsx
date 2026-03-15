import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { moveItemById } from "./reorderUtils";
import {
  DEFAULT_HOME_PAGE_SETTINGS,
  HOME_SECTION_LABELS,
  HOME_SECTION_ORDER,
  normalizeHomePageSettings,
  type HomeHeroCard,
  type HomePageSettings,
  type HomeReasonCard,
  type HomeSectionId,
  type HomeServiceCard,
  type HomeStatItem,
  type HomeValueCard,
} from "@/components/shared/homePageSettings";

const listToText = (items: string[]) => items.join("\n");
const textToList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const HomePageManager = () => {
  const apiBase = getApiBaseUrl();
  const [settings, setSettings] = useState<HomePageSettings>(DEFAULT_HOME_PAGE_SETTINGS);
  const [activeTab, setActiveTab] = useState<HomeSectionId>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draggingId, setDraggingId] = useState<HomeSectionId | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/home-page-settings`);
      if (!res.ok) {
        throw new Error("Failed to load home page settings");
      }
      const payload = await res.json();
      const normalized = normalizeHomePageSettings(payload);
      setSettings(normalized);
      setDirty(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load home page settings");
      setSettings(DEFAULT_HOME_PAGE_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const requireToken = () => {
    const token = getAdminToken();
    if (token) return token;
    toast.error("Session expired. Please login again.");
    return null;
  };

  const updateSettings = (updater: (prev: HomePageSettings) => HomePageSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      return next;
    });
    setDirty(true);
  };

  const toggleSection = (id: HomeSectionId) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [id]: {
          ...prev.sections[id],
          enabled: !prev.sections[id].enabled,
        },
      },
    }));
  };

  const handleDragStart = (id: HomeSectionId) => {
    setDraggingId(id);
  };

  const handleDragEnter = (targetId: HomeSectionId) => {
    if (!draggingId || draggingId === targetId) return;
    updateSettings((prev) => {
      const items = prev.section_order.map((id) => ({ id }));
      const nextItems = moveItemById(items, draggingId, targetId);
      return {
        ...prev,
        section_order: nextItems.map((item) => item.id as HomeSectionId),
      };
    });
    setDraggingId(targetId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const saveSettings = async () => {
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload = normalizeHomePageSettings(settings);
      const res = await fetch(`${apiBase}/home-page-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save home page settings");
      }
      const data = await res.json();
      const normalized = normalizeHomePageSettings(data);
      setSettings(normalized);
      setDirty(false);
      toast.success("Home page updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save home page settings");
    } finally {
      setSaving(false);
    }
  };

  const updateHeroField = (key: keyof HomePageSettings["sections"]["hero"], value: string | boolean) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        hero: {
          ...prev.sections.hero,
          [key]: value,
        },
      },
    }));
  };

  const updateHeroCard = (index: number, patch: Partial<HomeHeroCard>) => {
    updateSettings((prev) => {
      const cards = [...prev.sections.hero.cards];
      cards[index] = { ...cards[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          hero: { ...prev.sections.hero, cards },
        },
      };
    });
  };

  const addHeroCard = () =>
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        hero: {
          ...prev.sections.hero,
          cards: [
            ...prev.sections.hero.cards,
            { id: createId("hero-card"), icon: "file-text", title: "", description: "", link: "" },
          ],
        },
      },
    }));

  const removeHeroCard = (index: number) =>
    updateSettings((prev) => {
      const cards = prev.sections.hero.cards.filter((_, i) => i !== index);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          hero: { ...prev.sections.hero, cards: cards.length ? cards : prev.sections.hero.cards },
        },
      };
    });

  const updateServicesField = (key: keyof HomePageSettings["sections"]["services"], value: string | boolean) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        services: {
          ...prev.sections.services,
          [key]: value,
        },
      },
    }));
  };

  const updateServiceItem = (index: number, patch: Partial<HomeServiceCard>) => {
    updateSettings((prev) => {
      const items = [...prev.sections.services.items];
      items[index] = { ...items[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          services: { ...prev.sections.services, items },
        },
      };
    });
  };

  const addServiceItem = () =>
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        services: {
          ...prev.sections.services,
          items: [
            ...prev.sections.services.items,
            {
              id: createId("service-card"),
              icon: "globe",
              title: "",
              description: "",
              features: [],
              link: "",
            },
          ],
        },
      },
    }));

  const removeServiceItem = (index: number) =>
    updateSettings((prev) => {
      const items = prev.sections.services.items.filter((_, i) => i !== index);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          services: { ...prev.sections.services, items: items.length ? items : prev.sections.services.items },
        },
      };
    });

  const updatePortfolioField = (key: keyof HomePageSettings["sections"]["portfolio"], value: string | boolean) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        portfolio: {
          ...prev.sections.portfolio,
          [key]: value,
        },
      },
    }));
  };

  const updateGlobalReachField = (
    key: keyof HomePageSettings["sections"]["global-reach"],
    value: string | boolean
  ) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        "global-reach": {
          ...prev.sections["global-reach"],
          [key]: value,
        },
      },
    }));
  };

  const updateTestimonialsField = (
    key: keyof HomePageSettings["sections"]["testimonials"],
    value: string | boolean
  ) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        testimonials: {
          ...prev.sections.testimonials,
          [key]: value,
        },
      },
    }));
  };

  const updateAboutField = (key: keyof HomePageSettings["sections"]["about"], value: string | boolean) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        about: {
          ...prev.sections.about,
          [key]: value,
        },
      },
    }));
  };

  const updateAboutValue = (index: number, patch: Partial<HomeValueCard>) => {
    updateSettings((prev) => {
      const values = [...prev.sections.about.values];
      values[index] = { ...values[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          about: { ...prev.sections.about, values },
        },
      };
    });
  };

  const addAboutValue = () =>
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        about: {
          ...prev.sections.about,
          values: [
            ...prev.sections.about.values,
            { id: createId("value"), icon: "target", title: "", description: "" },
          ],
        },
      },
    }));

  const removeAboutValue = (index: number) =>
    updateSettings((prev) => {
      const values = prev.sections.about.values.filter((_, i) => i !== index);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          about: { ...prev.sections.about, values: values.length ? values : prev.sections.about.values },
        },
      };
    });

  const updateWhyChooseField = (
    key: keyof HomePageSettings["sections"]["why-choose-us"],
    value: string | boolean
  ) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        "why-choose-us": {
          ...prev.sections["why-choose-us"],
          [key]: value,
        },
      },
    }));
  };

  const updateReason = (index: number, patch: Partial<HomeReasonCard>) => {
    updateSettings((prev) => {
      const reasons = [...prev.sections["why-choose-us"].reasons];
      reasons[index] = { ...reasons[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          "why-choose-us": { ...prev.sections["why-choose-us"], reasons },
        },
      };
    });
  };

  const addReason = () =>
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        "why-choose-us": {
          ...prev.sections["why-choose-us"],
          reasons: [
            ...prev.sections["why-choose-us"].reasons,
            { id: createId("reason"), icon: "zap", title: "", description: "" },
          ],
        },
      },
    }));

  const removeReason = (index: number) =>
    updateSettings((prev) => {
      const reasons = prev.sections["why-choose-us"].reasons.filter((_, i) => i !== index);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          "why-choose-us": {
            ...prev.sections["why-choose-us"],
            reasons: reasons.length ? reasons : prev.sections["why-choose-us"].reasons,
          },
        },
      };
    });

  const updateStat = (index: number, patch: Partial<HomeStatItem>) => {
    updateSettings((prev) => {
      const stats = [...prev.sections["why-choose-us"].stats];
      stats[index] = { ...stats[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          "why-choose-us": { ...prev.sections["why-choose-us"], stats },
        },
      };
    });
  };

  const addStat = () =>
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        "why-choose-us": {
          ...prev.sections["why-choose-us"],
          stats: [
            ...prev.sections["why-choose-us"].stats,
            { id: createId("stat"), value: "", label: "" },
          ],
        },
      },
    }));

  const removeStat = (index: number) =>
    updateSettings((prev) => {
      const stats = prev.sections["why-choose-us"].stats.filter((_, i) => i !== index);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          "why-choose-us": {
            ...prev.sections["why-choose-us"],
            stats: stats.length ? stats : prev.sections["why-choose-us"].stats,
          },
        },
      };
    });

  const updateCtaField = (key: keyof HomePageSettings["sections"]["cta"], value: string | boolean) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        cta: {
          ...prev.sections.cta,
          [key]: value,
        },
      },
    }));
  };

  const updatedAtLabel = useMemo(() => {
    if (!settings.updated_at) return "Never";
    return new Date(settings.updated_at).toLocaleString();
  }, [settings.updated_at]);

  const resetToDefaults = () => {
    setSettings(DEFAULT_HOME_PAGE_SETTINGS);
    setDirty(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Home Page</h2>
          <p className="text-muted-foreground">
            Edit hero content, reorder sections, and update homepage messaging.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={loading || saving} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reload
          </Button>
          <Button variant="outline" onClick={resetToDefaults} disabled={loading || saving}>
            Reset Defaults
          </Button>
          <Button onClick={saveSettings} disabled={loading || saving || !dirty} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {settings.needs_migration && (
        <div className="glass-card border-border/60 p-4 text-sm text-amber-600">
          Home page settings table is missing. Changes are saved locally until migration runs.
        </div>
      )}

      <div className="glass-card border-border/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Section Order</h3>
          <span className="text-xs text-muted-foreground">Last saved: {updatedAtLabel}</span>
        </div>
        <div className="space-y-2">
          {settings.section_order.map((sectionId) => {
            const isDragging = draggingId === sectionId;
            return (
              <div
                key={sectionId}
                className={`flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-3 transition-colors ${
                  isDragging ? "bg-primary/10 border-primary/35" : "bg-card/40"
                }`}
                draggable
                onDragStart={() => handleDragStart(sectionId)}
                onDragEnter={() => handleDragEnter(sectionId)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{HOME_SECTION_LABELS[sectionId]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show</span>
                  <Switch
                    checked={settings.sections[sectionId].enabled}
                    onCheckedChange={() => toggleSection(sectionId)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card border-border/60 p-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as HomeSectionId)}>
          <TabsList className="flex flex-wrap">
            {HOME_SECTION_ORDER.map((sectionId) => (
              <TabsTrigger key={sectionId} value={sectionId}>
                {HOME_SECTION_LABELS[sectionId]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {activeTab === "hero" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.hero.badge}
                onChange={(event) => updateHeroField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections.hero.title_line_1}
                onChange={(event) => updateHeroField("title_line_1", event.target.value)}
                placeholder="Title line 1"
              />
              <Input
                value={settings.sections.hero.title_line_2}
                onChange={(event) => updateHeroField("title_line_2", event.target.value)}
                placeholder="Title line 2"
              />
              <Input
                value={settings.sections.hero.primary_label}
                onChange={(event) => updateHeroField("primary_label", event.target.value)}
                placeholder="Primary button label"
              />
              <Input
                value={settings.sections.hero.primary_href}
                onChange={(event) => updateHeroField("primary_href", event.target.value)}
                placeholder="Primary button link"
              />
              <Input
                value={settings.sections.hero.secondary_label}
                onChange={(event) => updateHeroField("secondary_label", event.target.value)}
                placeholder="Secondary button label"
              />
              <Input
                value={settings.sections.hero.secondary_href}
                onChange={(event) => updateHeroField("secondary_href", event.target.value)}
                placeholder="Secondary button link"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections.hero.description}
              onChange={(event) => updateHeroField("description", event.target.value)}
              placeholder="Hero description"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Hero Cards</h4>
                <Button size="sm" variant="outline" onClick={addHeroCard} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Card
                </Button>
              </div>
              {settings.sections.hero.cards.map((card, index) => (
                <div key={card.id} className="grid md:grid-cols-[1fr_auto] gap-2 rounded-xl border border-border/60 p-3">
                  <div className="space-y-2">
                    <Input
                      value={card.icon}
                      onChange={(event) => updateHeroCard(index, { icon: event.target.value })}
                      placeholder="Icon key (file-text, box, ruler, code)"
                    />
                    <Input
                      value={card.title}
                      onChange={(event) => updateHeroCard(index, { title: event.target.value })}
                      placeholder="Card title"
                    />
                    <Textarea
                      rows={2}
                      value={card.description}
                      onChange={(event) => updateHeroCard(index, { description: event.target.value })}
                      placeholder="Card description"
                    />
                    <Input
                      value={card.link}
                      onChange={(event) => updateHeroCard(index, { link: event.target.value })}
                      placeholder="Card link"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removeHeroCard(index)}
                    disabled={settings.sections.hero.cards.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.services.badge}
                onChange={(event) => updateServicesField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections.services.title}
                onChange={(event) => updateServicesField("title", event.target.value)}
                placeholder="Title"
              />
              <Input
                value={settings.sections.services.title_highlight}
                onChange={(event) => updateServicesField("title_highlight", event.target.value)}
                placeholder="Title highlight"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections.services.description}
              onChange={(event) => updateServicesField("description", event.target.value)}
              placeholder="Section description"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Service Cards</h4>
                <Button size="sm" variant="outline" onClick={addServiceItem} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Service
                </Button>
              </div>
              {settings.sections.services.items.map((card, index) => (
                <div key={card.id} className="grid md:grid-cols-[1fr_auto] gap-2 rounded-xl border border-border/60 p-3">
                  <div className="space-y-2">
                    <Input
                      value={card.icon}
                      onChange={(event) => updateServiceItem(index, { icon: event.target.value })}
                      placeholder="Icon key (globe, pen-tool, box, git-branch, shield-check, palette)"
                    />
                    <Input
                      value={card.title}
                      onChange={(event) => updateServiceItem(index, { title: event.target.value })}
                      placeholder="Service title"
                    />
                    <Textarea
                      rows={2}
                      value={card.description}
                      onChange={(event) => updateServiceItem(index, { description: event.target.value })}
                      placeholder="Service description"
                    />
                    <Textarea
                      rows={3}
                      value={listToText(card.features)}
                      onChange={(event) => updateServiceItem(index, { features: textToList(event.target.value) })}
                      placeholder="Features (one per line)"
                    />
                    <Input
                      value={card.link}
                      onChange={(event) => updateServiceItem(index, { link: event.target.value })}
                      placeholder="Service link"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removeServiceItem(index)}
                    disabled={settings.sections.services.items.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <p className="text-sm font-medium">Section CTA</p>
              <Input
                value={settings.sections.services.cta_title}
                onChange={(event) => updateServicesField("cta_title", event.target.value)}
                placeholder="CTA title"
              />
              <Textarea
                rows={2}
                value={settings.sections.services.cta_description}
                onChange={(event) => updateServicesField("cta_description", event.target.value)}
                placeholder="CTA description"
              />
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  value={settings.sections.services.primary_label}
                  onChange={(event) => updateServicesField("primary_label", event.target.value)}
                  placeholder="Primary button label"
                />
                <Input
                  value={settings.sections.services.primary_href}
                  onChange={(event) => updateServicesField("primary_href", event.target.value)}
                  placeholder="Primary button link"
                />
                <Input
                  value={settings.sections.services.secondary_label}
                  onChange={(event) => updateServicesField("secondary_label", event.target.value)}
                  placeholder="Secondary button label"
                />
                <Input
                  value={settings.sections.services.secondary_href}
                  onChange={(event) => updateServicesField("secondary_href", event.target.value)}
                  placeholder="Secondary button link"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.portfolio.badge}
                onChange={(event) => updatePortfolioField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections.portfolio.title}
                onChange={(event) => updatePortfolioField("title", event.target.value)}
                placeholder="Title"
              />
              <Input
                value={settings.sections.portfolio.title_highlight}
                onChange={(event) => updatePortfolioField("title_highlight", event.target.value)}
                placeholder="Title highlight"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections.portfolio.description}
              onChange={(event) => updatePortfolioField("description", event.target.value)}
              placeholder="Section description"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.portfolio.primary_label}
                onChange={(event) => updatePortfolioField("primary_label", event.target.value)}
                placeholder="Primary button label"
              />
              <Input
                value={settings.sections.portfolio.primary_href}
                onChange={(event) => updatePortfolioField("primary_href", event.target.value)}
                placeholder="Primary button link"
              />
              <Input
                value={settings.sections.portfolio.secondary_label}
                onChange={(event) => updatePortfolioField("secondary_label", event.target.value)}
                placeholder="Secondary button label"
              />
              <Input
                value={settings.sections.portfolio.secondary_href}
                onChange={(event) => updatePortfolioField("secondary_href", event.target.value)}
                placeholder="Secondary button link"
              />
            </div>
          </div>
        )}

        {activeTab === "global-reach" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections["global-reach"].badge}
                onChange={(event) => updateGlobalReachField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections["global-reach"].title}
                onChange={(event) => updateGlobalReachField("title", event.target.value)}
                placeholder="Title"
              />
              <Input
                value={settings.sections["global-reach"].title_highlight}
                onChange={(event) => updateGlobalReachField("title_highlight", event.target.value)}
                placeholder="Title highlight"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections["global-reach"].description}
              onChange={(event) => updateGlobalReachField("description", event.target.value)}
              placeholder="Section description"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections["global-reach"].empty_title}
                onChange={(event) => updateGlobalReachField("empty_title", event.target.value)}
                placeholder="Empty state title"
              />
              <Input
                value={settings.sections["global-reach"].empty_description}
                onChange={(event) => updateGlobalReachField("empty_description", event.target.value)}
                placeholder="Empty state description"
              />
            </div>
          </div>
        )}

        {activeTab === "testimonials" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.testimonials.badge}
                onChange={(event) => updateTestimonialsField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections.testimonials.title}
                onChange={(event) => updateTestimonialsField("title", event.target.value)}
                placeholder="Title"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Testimonials content is managed from Reviews. This section only controls heading text.
            </p>
          </div>
        )}

        {activeTab === "about" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.about.badge}
                onChange={(event) => updateAboutField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections.about.title}
                onChange={(event) => updateAboutField("title", event.target.value)}
                placeholder="Title"
              />
              <Input
                value={settings.sections.about.title_highlight}
                onChange={(event) => updateAboutField("title_highlight", event.target.value)}
                placeholder="Title highlight"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections.about.description}
              onChange={(event) => updateAboutField("description", event.target.value)}
              placeholder="Primary description"
            />
            <Textarea
              rows={3}
              value={settings.sections.about.description_secondary}
              onChange={(event) => updateAboutField("description_secondary", event.target.value)}
              placeholder="Secondary description"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.about.primary_label}
                onChange={(event) => updateAboutField("primary_label", event.target.value)}
                placeholder="Primary button label"
              />
              <Input
                value={settings.sections.about.primary_href}
                onChange={(event) => updateAboutField("primary_href", event.target.value)}
                placeholder="Primary button link"
              />
              <Input
                value={settings.sections.about.secondary_label}
                onChange={(event) => updateAboutField("secondary_label", event.target.value)}
                placeholder="Secondary button label"
              />
              <Input
                value={settings.sections.about.secondary_href}
                onChange={(event) => updateAboutField("secondary_href", event.target.value)}
                placeholder="Secondary button link"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Value Cards</h4>
                <Button size="sm" variant="outline" onClick={addAboutValue} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Value
                </Button>
              </div>
              {settings.sections.about.values.map((value, index) => (
                <div key={value.id} className="grid md:grid-cols-[1fr_auto] gap-2 rounded-xl border border-border/60 p-3">
                  <div className="space-y-2">
                    <Input
                      value={value.icon}
                      onChange={(event) => updateAboutValue(index, { icon: event.target.value })}
                      placeholder="Icon key (target, lightbulb, users, award)"
                    />
                    <Input
                      value={value.title}
                      onChange={(event) => updateAboutValue(index, { title: event.target.value })}
                      placeholder="Value title"
                    />
                    <Textarea
                      rows={2}
                      value={value.description}
                      onChange={(event) => updateAboutValue(index, { description: event.target.value })}
                      placeholder="Value description"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removeAboutValue(index)}
                    disabled={settings.sections.about.values.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "why-choose-us" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections["why-choose-us"].badge}
                onChange={(event) => updateWhyChooseField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections["why-choose-us"].title}
                onChange={(event) => updateWhyChooseField("title", event.target.value)}
                placeholder="Title"
              />
              <Input
                value={settings.sections["why-choose-us"].title_highlight}
                onChange={(event) => updateWhyChooseField("title_highlight", event.target.value)}
                placeholder="Title highlight"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections["why-choose-us"].description}
              onChange={(event) => updateWhyChooseField("description", event.target.value)}
              placeholder="Section description"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections["why-choose-us"].primary_label}
                onChange={(event) => updateWhyChooseField("primary_label", event.target.value)}
                placeholder="Primary button label"
              />
              <Input
                value={settings.sections["why-choose-us"].primary_href}
                onChange={(event) => updateWhyChooseField("primary_href", event.target.value)}
                placeholder="Primary button link"
              />
              <Input
                value={settings.sections["why-choose-us"].secondary_label}
                onChange={(event) => updateWhyChooseField("secondary_label", event.target.value)}
                placeholder="Secondary button label"
              />
              <Input
                value={settings.sections["why-choose-us"].secondary_href}
                onChange={(event) => updateWhyChooseField("secondary_href", event.target.value)}
                placeholder="Secondary button link"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Reason Cards</h4>
                <Button size="sm" variant="outline" onClick={addReason} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Reason
                </Button>
              </div>
              {settings.sections["why-choose-us"].reasons.map((reason, index) => (
                <div key={reason.id} className="grid md:grid-cols-[1fr_auto] gap-2 rounded-xl border border-border/60 p-3">
                  <div className="space-y-2">
                    <Input
                      value={reason.icon}
                      onChange={(event) => updateReason(index, { icon: event.target.value })}
                      placeholder="Icon key (zap, clock, headphones, shield, trending-up, check)"
                    />
                    <Input
                      value={reason.title}
                      onChange={(event) => updateReason(index, { title: event.target.value })}
                      placeholder="Reason title"
                    />
                    <Textarea
                      rows={2}
                      value={reason.description}
                      onChange={(event) => updateReason(index, { description: event.target.value })}
                      placeholder="Reason description"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removeReason(index)}
                    disabled={settings.sections["why-choose-us"].reasons.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Stats</h4>
                <Button size="sm" variant="outline" onClick={addStat} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Stat
                </Button>
              </div>
              {settings.sections["why-choose-us"].stats.map((stat, index) => (
                <div key={stat.id} className="grid md:grid-cols-[1fr_auto] gap-2 rounded-xl border border-border/60 p-3">
                  <div className="grid md:grid-cols-2 gap-2">
                    <Input
                      value={stat.value}
                      onChange={(event) => updateStat(index, { value: event.target.value })}
                      placeholder="Value"
                    />
                    <Input
                      value={stat.label}
                      onChange={(event) => updateStat(index, { label: event.target.value })}
                      placeholder="Label"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removeStat(index)}
                    disabled={settings.sections["why-choose-us"].stats.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "cta" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.sections.cta.compact}
                onCheckedChange={(checked) => updateCtaField("compact", checked)}
              />
              <span className="text-sm text-muted-foreground">Use compact layout</span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.cta.title_prefix}
                onChange={(event) => updateCtaField("title_prefix", event.target.value)}
                placeholder="Title prefix"
              />
              <Input
                value={settings.sections.cta.title_highlight}
                onChange={(event) => updateCtaField("title_highlight", event.target.value)}
                placeholder="Title highlight"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections.cta.description}
              onChange={(event) => updateCtaField("description", event.target.value)}
              placeholder="CTA description"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections.cta.primary_label}
                onChange={(event) => updateCtaField("primary_label", event.target.value)}
                placeholder="Primary button label"
              />
              <Input
                value={settings.sections.cta.primary_href}
                onChange={(event) => updateCtaField("primary_href", event.target.value)}
                placeholder="Primary button link"
              />
              <Input
                value={settings.sections.cta.secondary_label}
                onChange={(event) => updateCtaField("secondary_label", event.target.value)}
                placeholder="Secondary button label"
              />
              <Input
                value={settings.sections.cta.secondary_href}
                onChange={(event) => updateCtaField("secondary_href", event.target.value)}
                placeholder="Secondary button link"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePageManager;
