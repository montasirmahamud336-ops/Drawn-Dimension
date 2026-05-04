import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { ensureCmsBucket, uploadCmsFile } from "@/integrations/supabase/storage";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";
import { moveItemById } from "./reorderUtils";
import { scrollCmsMainToTop } from "./cmsScroll";
import {
  DEFAULT_HOME_PAGE_SETTINGS,
  HOME_SECTION_LABELS,
  HOME_SECTION_ORDER,
  MAX_HOME_HERO_SOFTWARE_LOGOS,
  MAX_HOME_TRUSTED_LOGOS,
  normalizeHomePageSettings,
  type HomeHeroCard,
  type HomeHeroSoftwareItem,
  type HomeMetricItem,
  type HomePageSettings,
  type HomeReasonCard,
  type HomeSectionId,
  type HomeServiceCard,
  type HomeStatItem,
  type HomeTrustedLogoItem,
  type HomeValueCard,
} from "@/components/shared/homePageSettings";

const listToText = (items: string[]) => items.join("\n");
const textToList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const clampMetricFontSize = (value: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
};
const MAX_TRUSTED_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_HERO_SOFTWARE_LOGO_BYTES = 2 * 1024 * 1024;
const HERO_SOFTWARE_DRAFT_KEY = "cms-home-hero-software-draft";
const getHeroSoftwareStrip = (settings: HomePageSettings) =>
  settings.sections.hero.software_strip ?? DEFAULT_HOME_PAGE_SETTINGS.sections.hero.software_strip;
const getHeroSoftwareItems = (settings: HomePageSettings) => {
  const strip = getHeroSoftwareStrip(settings);
  return Array.isArray(strip.items) ? strip.items : [];
};
const buildSoftwareNameFromFile = (fileName: string) => {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base || "Software";
};
const scrollHeroSoftwareItemIntoView = (itemId: string) => {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    const row = window.document.querySelector<HTMLElement>(`[data-hero-software-item="${itemId}"]`);
    row?.scrollIntoView({ block: "center", behavior: "auto" });
  }, 60);
};
const scrollTrustedLogoIntoView = (itemId: string) => {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    const row = window.document.querySelector<HTMLElement>(`[data-trusted-logo-item="${itemId}"]`);
    row?.scrollIntoView({ block: "center", behavior: "auto" });
  }, 60);
};
const readHeroSoftwareDraft = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(HERO_SOFTWARE_DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return normalizeHomePageSettings({
      sections: {
        hero: {
          software_strip: parsed,
        },
      },
    }).sections.hero.software_strip;
  } catch {
    return null;
  }
};
const persistHeroSoftwareDraft = (settings: HomePageSettings) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      HERO_SOFTWARE_DRAFT_KEY,
      JSON.stringify(getHeroSoftwareStrip(settings))
    );
  } catch {
    // ignore session storage issues
  }
};
const clearHeroSoftwareDraft = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(HERO_SOFTWARE_DRAFT_KEY);
  } catch {
    // ignore session storage issues
  }
};
const mergeHeroSoftwareDraft = (settings: HomePageSettings) => {
  const draft = readHeroSoftwareDraft();
  if (!draft) {
    return { settings, restoredDraft: false };
  }

  const merged: HomePageSettings = {
    ...settings,
    sections: {
      ...settings.sections,
      hero: {
        ...settings.sections.hero,
        software_strip: draft,
      },
    },
  };

  const restoredDraft =
    JSON.stringify(draft) !== JSON.stringify(settings.sections.hero.software_strip);

  return { settings: merged, restoredDraft };
};

const normalizeCmsHomePageSettings = (value: unknown) =>
  normalizeHomePageSettings(value, { preserveIncompleteHeroCards: true });
const getIncompleteHeroCardIndexes = (settings: HomePageSettings) =>
  settings.sections.hero.cards.reduce<number[]>((indexes, card, index) => {
    if (!card.title.trim()) {
      indexes.push(index + 1);
    }
    return indexes;
  }, []);

const HomePageManager = () => {
  const apiBase = getApiBaseUrl();
  const [settings, setSettings] = useState<HomePageSettings>(DEFAULT_HOME_PAGE_SETTINGS);
  const [activeTab, setActiveTab] = useState<HomeSectionId>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draggingId, setDraggingId] = useState<HomeSectionId | null>(null);
  const [uploadingHeroSoftwareId, setUploadingHeroSoftwareId] = useState<string | null>(null);
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/home-page-settings`);
      if (!res.ok) {
        throw new Error("Failed to load home page settings");
      }
      const payload = await res.json();
      const normalized = normalizeCmsHomePageSettings(payload);
      const { settings: merged, restoredDraft } = mergeHeroSoftwareDraft(normalized);
      setSettings(merged);
      setDirty(restoredDraft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load home page settings");
      const { settings: merged, restoredDraft } = mergeHeroSoftwareDraft(DEFAULT_HOME_PAGE_SETTINGS);
      setSettings(merged);
      setDirty(restoredDraft);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    scrollCmsMainToTop();
  }, [activeTab]);

  const requireToken = () => {
    const token = getAdminToken();
    if (token) return token;
    toast.error("Session expired. Please login again.");
    return null;
  };

  const updateSettings = (updater: (prev: HomePageSettings) => HomePageSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      persistHeroSoftwareDraft(next);
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

    const incompleteHeroCardIndexes = getIncompleteHeroCardIndexes(settings);
    if (incompleteHeroCardIndexes.length > 0) {
      const cardLabel =
        incompleteHeroCardIndexes.length === 1
          ? `Hero card ${incompleteHeroCardIndexes[0]}`
          : `Hero cards ${incompleteHeroCardIndexes.join(", ")}`;
      toast.error(`${cardLabel} need a title before saving.`);
      return;
    }

    setSaving(true);
    try {
      const payload = normalizeCmsHomePageSettings(settings);
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
      const normalized = normalizeCmsHomePageSettings(data);
      setSettings(normalized);
      clearHeroSoftwareDraft();
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

  const updateHeroSoftwareStripEnabled = (enabled: boolean) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        hero: {
          ...prev.sections.hero,
          software_strip: {
            ...getHeroSoftwareStrip(prev),
            enabled,
          },
        },
      },
    }));
  };

  const updateHeroSoftwareItem = (index: number, patch: Partial<HomeHeroSoftwareItem>) => {
    updateSettings((prev) => {
      const items = [...getHeroSoftwareItems(prev)];
      if (!items[index]) {
        return prev;
      }

      items[index] = { ...items[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          hero: {
            ...prev.sections.hero,
            software_strip: {
              ...getHeroSoftwareStrip(prev),
              items,
            },
          },
        },
      };
    });
  };

  const updateKeyMetric = (index: number, patch: Partial<HomeMetricItem>) => {
    updateSettings((prev) => {
      const items = [...prev.sections["key-metrics"].items];
      if (!items[index]) {
        return prev;
      }

      items[index] = { ...items[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          "key-metrics": {
            ...prev.sections["key-metrics"],
            items,
          },
        },
      };
    });
  };

  const addHeroSoftwareItem = () => {
    if (getHeroSoftwareItems(settings).length >= MAX_HOME_HERO_SOFTWARE_LOGOS) {
      toast.error(`You can add up to ${MAX_HOME_HERO_SOFTWARE_LOGOS} hero software logos`);
      return;
    }

    const nextId = createId("hero-software");
    updateSettings((prev) => ({
      ...prev,
        sections: {
          ...prev.sections,
          hero: {
            ...prev.sections.hero,
            software_strip: {
              ...getHeroSoftwareStrip(prev),
              items: [
                ...getHeroSoftwareItems(prev),
                { id: nextId, name: "", image_url: "" },
              ],
            },
        },
      },
    }));

    scrollHeroSoftwareItemIntoView(nextId);
  };

  const removeHeroSoftwareItem = (index: number) =>
    updateSettings((prev) => ({
      ...prev,
        sections: {
          ...prev.sections,
          hero: {
            ...prev.sections.hero,
            software_strip: {
              ...getHeroSoftwareStrip(prev),
              items: getHeroSoftwareItems(prev).filter((_, currentIndex) => currentIndex !== index),
            },
          },
        },
    }));

  const moveHeroSoftwareItem = (index: number, direction: -1 | 1) =>
    updateSettings((prev) => {
      const items = [...getHeroSoftwareItems(prev)];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) {
        return prev;
      }

      const [moved] = items.splice(index, 1);
      items.splice(targetIndex, 0, moved);

      return {
        ...prev,
        sections: {
          ...prev.sections,
          hero: {
            ...prev.sections.hero,
            software_strip: {
              ...getHeroSoftwareStrip(prev),
              items,
            },
          },
        },
      };
    });

  const handleHeroSoftwareUpload = async (itemId: string, file: File | null | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > MAX_HERO_SOFTWARE_LOGO_BYTES) {
      toast.error("Image size must be 2MB or less");
      return;
    }

    const token = requireToken();
    if (!token) return;

    setUploadingHeroSoftwareId(itemId);
    try {
      await ensureCmsBucket();
      const extension = (file.name.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "") || "png";
      const uploadPath = `home/hero-software-strip/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const publicUrl = await uploadCmsFile(file, uploadPath);
      const fallbackName = buildSoftwareNameFromFile(file.name);

      updateSettings((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          hero: {
            ...prev.sections.hero,
            software_strip: {
              ...getHeroSoftwareStrip(prev),
              items: getHeroSoftwareItems(prev).map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      name: item.name.trim() || fallbackName,
                      image_url: String(publicUrl).trim(),
                    }
                  : item
              ),
            },
          },
        },
      }));

      scrollHeroSoftwareItemIntoView(itemId);
      toast.success("Hero software logo uploaded. Click Save Changes to keep it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload hero software logo");
    } finally {
      setUploadingHeroSoftwareId(null);
    }
  };

  const updateTrustedLogosField = (
    key: keyof HomePageSettings["sections"]["trusted-logos"],
    value: string | boolean
  ) => {
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        "trusted-logos": {
          ...prev.sections["trusted-logos"],
          [key]: value,
        },
      },
    }));
  };

  const updateTrustedLogo = (index: number, patch: Partial<HomeTrustedLogoItem>) => {
    updateSettings((prev) => {
      const logos = [...prev.sections["trusted-logos"].logos];
      if (!logos[index]) {
        return prev;
      }
      logos[index] = { ...logos[index], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          "trusted-logos": {
            ...prev.sections["trusted-logos"],
            logos,
          },
        },
      };
    });
  };

  const addTrustedLogo = () => {
    if (settings.sections["trusted-logos"].logos.length >= MAX_HOME_TRUSTED_LOGOS) {
      toast.error(`You can add up to ${MAX_HOME_TRUSTED_LOGOS} trusted logos`);
      return;
    }

    const nextId = createId("trusted-logo");
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        "trusted-logos": {
          ...prev.sections["trusted-logos"],
          logos: [
            ...prev.sections["trusted-logos"].logos,
            { id: nextId, name: "", image_url: "", link: "" },
          ],
        },
      },
    }));

    scrollTrustedLogoIntoView(nextId);
  };

  const removeTrustedLogo = (index: number) =>
    updateSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        "trusted-logos": {
          ...prev.sections["trusted-logos"],
          logos: prev.sections["trusted-logos"].logos.filter((_, currentIndex) => currentIndex !== index),
        },
      },
    }));

  const moveTrustedLogo = (index: number, direction: -1 | 1) =>
    updateSettings((prev) => {
      const logos = [...prev.sections["trusted-logos"].logos];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= logos.length) {
        return prev;
      }

      const [moved] = logos.splice(index, 1);
      logos.splice(targetIndex, 0, moved);

      return {
        ...prev,
        sections: {
          ...prev.sections,
          "trusted-logos": {
            ...prev.sections["trusted-logos"],
            logos,
          },
        },
      };
    });

  const handleTrustedLogoUpload = async (logoId: string, file: File | null | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > MAX_TRUSTED_LOGO_BYTES) {
      toast.error("Image size must be 2MB or less");
      return;
    }

    const token = requireToken();
    if (!token) return;

    setUploadingLogoId(logoId);
    try {
      await ensureCmsBucket();
      const extension = (file.name.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "") || "png";
      const uploadPath = `home/trusted-logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const publicUrl = await uploadCmsFile(file, uploadPath);

      updateSettings((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          "trusted-logos": {
            ...prev.sections["trusted-logos"],
            logos: prev.sections["trusted-logos"].logos.map((logo) =>
              logo.id === logoId ? { ...logo, image_url: publicUrl } : logo
            ),
          },
        },
      }));

      scrollTrustedLogoIntoView(logoId);
      toast.success("Trusted logo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload trusted logo");
    } finally {
      setUploadingLogoId(null);
    }
  };

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
    persistHeroSoftwareDraft(DEFAULT_HOME_PAGE_SETTINGS);
    setDirty(true);
  };

  const heroSoftwareStrip = getHeroSoftwareStrip(settings);
  const heroSoftwareItems = getHeroSoftwareItems(settings);

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

            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-medium">Hero Software Stripe</h4>
                  <p className="text-xs text-muted-foreground">
                    Add up to 5 software logos for the small hero stripe. This stays separate from Trusted Logos.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={heroSoftwareStrip.enabled}
                      onCheckedChange={updateHeroSoftwareStripEnabled}
                    />
                    <span className="text-sm text-muted-foreground">Show stripe</span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addHeroSoftwareItem}
                    className="gap-1"
                    disabled={heroSoftwareItems.length >= MAX_HOME_HERO_SOFTWARE_LOGOS}
                  >
                    <Plus className="w-4 h-4" />
                    Add Logo
                  </Button>
                </div>
              </div>

              {heroSoftwareItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                  No hero software logos added yet.
                </div>
              ) : (
                heroSoftwareItems.map((item, index) => {
                  const previewUrl = resolveCmsMediaUrl(item.image_url);

                  return (
                    <div
                      key={item.id}
                      data-hero-software-item={item.id}
                      className="rounded-xl border border-border/60 p-3 space-y-3"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                        <div className="w-full max-w-[220px] rounded-2xl border border-border/60 bg-card/50 px-4 py-4">
                          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/70">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={item.name || "Hero software logo"}
                                className="max-h-16 max-w-[160px] object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">No preview yet</span>
                            )}
                          </div>
                          <p className="mt-3 text-xs font-medium text-foreground">
                            {item.image_url ? "Logo uploaded" : "No logo uploaded"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground break-all">
                            {item.image_url || "Upload a logo image or paste a direct logo URL."}
                          </p>
                          {previewUrl ? (
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
                            >
                              Open uploaded logo
                            </a>
                          ) : null}
                        </div>

                        <div className="flex-1 space-y-2">
                          <Input
                            value={item.name}
                            onChange={(event) => updateHeroSoftwareItem(index, { name: event.target.value })}
                            placeholder="Software name"
                          />
                          <Input
                            value={item.image_url}
                            onChange={(event) => updateHeroSoftwareItem(index, { image_url: event.target.value })}
                            placeholder="Logo image URL"
                          />

                          <div className="flex flex-wrap gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50">
                              {uploadingHeroSoftwareId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {item.image_url ? "Replace Logo" : "Upload Logo"}
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={uploadingHeroSoftwareId === item.id}
                                onChange={(event) => {
                                  event.currentTarget.blur();
                                  void handleHeroSoftwareUpload(item.id, event.target.files?.[0]);
                                  event.currentTarget.value = "";
                                }}
                              />
                            </label>

                            {item.image_url ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => updateHeroSoftwareItem(index, { image_url: "" })}
                              >
                                Clear Logo
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex gap-2 xl:flex-col">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => moveHeroSoftwareItem(index, -1)}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => moveHeroSoftwareItem(index, 1)}
                            disabled={index === heroSoftwareItems.length - 1}
                            title="Move down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => removeHeroSoftwareItem(index)}
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "key-metrics" && (
          <div className="space-y-4">
            {settings.sections["key-metrics"].items.map((metric, index) => (
              <div key={metric.id} className="space-y-3 rounded-xl border border-border/60 p-4">
                <div className="text-sm font-medium">{metric.label || metric.id}</div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={metric.label}
                    onChange={(event) => updateKeyMetric(index, { label: event.target.value })}
                    placeholder="Label"
                  />
                  <Input
                    value={metric.value}
                    onChange={(event) => updateKeyMetric(index, { value: event.target.value })}
                    placeholder="Value"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Label font size (px)</p>
                    <Input
                      type="number"
                      min={10}
                      max={32}
                      value={metric.label_font_size_px}
                      onChange={(event) =>
                        updateKeyMetric(index, {
                          label_font_size_px: clampMetricFontSize(
                            event.target.value,
                            metric.label_font_size_px,
                            10,
                            32
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Label color</p>
                    <Input
                      type="color"
                      value={metric.label_color}
                      className="cursor-pointer p-1"
                      onChange={(event) => updateKeyMetric(index, { label_color: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Value font size (px)</p>
                    <Input
                      type="number"
                      min={16}
                      max={72}
                      value={metric.value_font_size_px}
                      onChange={(event) =>
                        updateKeyMetric(index, {
                          value_font_size_px: clampMetricFontSize(
                            event.target.value,
                            metric.value_font_size_px,
                            16,
                            72
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Value color</p>
                    <Input
                      type="color"
                      value={metric.value_color}
                      className="cursor-pointer p-1"
                      onChange={(event) => updateKeyMetric(index, { value_color: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
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

        {activeTab === "trusted-logos" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                value={settings.sections["trusted-logos"].badge}
                onChange={(event) => updateTrustedLogosField("badge", event.target.value)}
                placeholder="Badge"
              />
              <Input
                value={settings.sections["trusted-logos"].title}
                onChange={(event) => updateTrustedLogosField("title", event.target.value)}
                placeholder="Title"
              />
            </div>
            <Textarea
              rows={3}
              value={settings.sections["trusted-logos"].description}
              onChange={(event) => updateTrustedLogosField("description", event.target.value)}
              placeholder="Section description"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Trusted Logos</h4>
                  <p className="text-xs text-muted-foreground">
                    Add brand logos that should appear in the homepage logo slider.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addTrustedLogo}
                  className="gap-1"
                  disabled={settings.sections["trusted-logos"].logos.length >= MAX_HOME_TRUSTED_LOGOS}
                >
                  <Plus className="w-4 h-4" />
                  Add Logo
                </Button>
              </div>

              {settings.sections["trusted-logos"].logos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                  No trusted logos added yet.
                </div>
              ) : (
                settings.sections["trusted-logos"].logos.map((logo, index) => {
                  const previewUrl = resolveCmsMediaUrl(logo.image_url);

                  return (
                  <div
                    key={logo.id}
                    data-trusted-logo-item={logo.id}
                    className="rounded-xl border border-border/60 p-3 space-y-3"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                      <div className="flex h-24 w-full max-w-[220px] items-center justify-center rounded-2xl border border-border/60 bg-card/50 px-4">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={logo.name || `Trusted logo ${index + 1}`}
                            className="max-h-14 w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">No logo uploaded</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <Input
                          value={logo.name}
                          onChange={(event) => updateTrustedLogo(index, { name: event.target.value })}
                          placeholder="Company name"
                        />
                        <Input
                          value={logo.link}
                          onChange={(event) => updateTrustedLogo(index, { link: event.target.value })}
                          placeholder="Website link (optional)"
                        />
                        <Input
                          value={logo.image_url}
                          onChange={(event) => updateTrustedLogo(index, { image_url: event.target.value })}
                          placeholder="Logo image URL"
                        />

                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50">
                          {uploadingLogoId === logo.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {logo.image_url ? "Replace Logo" : "Upload Logo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadingLogoId === logo.id}
                            onChange={(event) => {
                              event.currentTarget.blur();
                              void handleTrustedLogoUpload(logo.id, event.target.files?.[0]);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex gap-2 xl:flex-col">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => moveTrustedLogo(index, -1)}
                          disabled={index === 0}
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => moveTrustedLogo(index, 1)}
                          disabled={index === settings.sections["trusted-logos"].logos.length - 1}
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => removeTrustedLogo(index)}
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
                })
              )}
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
