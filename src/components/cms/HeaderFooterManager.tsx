import { useEffect, useMemo, useState } from "react";
import { GripVertical, PencilLine, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { moveItemById } from "./reorderUtils";
import {
  DEFAULT_FOOTER_LINKS,
  DEFAULT_FOOTER_SERVICE_LINKS,
  DEFAULT_HEADER_LINKS,
  normalizeHeaderFooterSettings,
  type HeaderFooterLink,
  type HeaderFooterSettings,
} from "@/components/shared/headerFooterSettings";
import { resolveServiceLink, type ApiServiceRecord } from "@/components/shared/serviceCatalog";

type MenuSection = "header" | "footer";

type FooterServiceItem = HeaderFooterLink & {
  serviceId: number;
  fallbackIndex?: number;
};

const normalizeFormHref = (value: string) => {
  const href = value.trim();
  if (!href) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href) || href.startsWith("/") || href.startsWith("#")) {
    return href;
  }
  return `/${href.replace(/^\/+/, "")}`;
};

const createItemId = (label: string, section: MenuSection, existingItems: HeaderFooterLink[]) => {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `${section}-link`;

  let nextId = `${section}-${base}`;
  let suffix = 1;
  const existingIds = new Set(existingItems.map((item) => item.id));
  while (existingIds.has(nextId)) {
    suffix += 1;
    nextId = `${section}-${base}-${suffix}`;
  }
  return nextId;
};

const sortFooterServiceItems = (items: FooterServiceItem[], orderIds: number[]): FooterServiceItem[] => {
  const rank = new Map<number, number>();
  orderIds.forEach((id, index) => rank.set(id, index));

  const sorted = [...items].sort((a, b) => {
    const aRank = rank.get(a.serviceId);
    const bRank = rank.get(b.serviceId);
    if (typeof aRank === "number" && typeof bRank === "number") return aRank - bRank;
    if (typeof aRank === "number") return -1;
    if (typeof bRank === "number") return 1;
    return (a.fallbackIndex ?? 0) - (b.fallbackIndex ?? 0);
  });

  return sorted;
};

const HeaderFooterManager = () => {
  const apiBase = getApiBaseUrl();
  const [headerLinks, setHeaderLinks] = useState<HeaderFooterLink[]>(DEFAULT_HEADER_LINKS);
  const [footerLinks, setFooterLinks] = useState<HeaderFooterLink[]>(DEFAULT_FOOTER_LINKS);
  const [footerServiceLinks, setFooterServiceLinks] = useState<FooterServiceItem[]>(
    DEFAULT_FOOTER_SERVICE_LINKS.map((item, index) => ({
      ...item,
      serviceId: index + 1,
      fallbackIndex: index,
    }))
  );
  const [footerServiceOrder, setFooterServiceOrder] = useState<number[]>([]);
  const [activeSection, setActiveSection] = useState<MenuSection>("header");
  const [formSection, setFormSection] = useState<MenuSection>("header");
  const [formLabel, setFormLabel] = useState("");
  const [formHref, setFormHref] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingSection, setDraggingSection] = useState<MenuSection | null>(null);
  const [draggingServiceId, setDraggingServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const visibleLinks = useMemo(
    () => (activeSection === "header" ? headerLinks : footerLinks),
    [activeSection, footerLinks, headerLinks]
  );

  const applySettings = (settings: HeaderFooterSettings) => {
    setHeaderLinks(settings.header_links);
    setFooterLinks(settings.footer_links);
    setFooterServiceOrder(settings.footer_service_order);
    setUpdatedAt(settings.updated_at);
    setDirty(false);
  };

  const loadSettings = async (): Promise<HeaderFooterSettings | null> => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/header-footer-settings`);
      if (!res.ok) {
        throw new Error("Failed to load header and footer settings");
      }
      const data = await res.json();
      const normalized = normalizeHeaderFooterSettings(data);
      applySettings(normalized);
      return normalized;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load header/footer settings");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadLiveFooterServices = async (orderIds: number[] = footerServiceOrder) => {
    try {
      const res = await fetch(`${apiBase}/services?status=live`);
      if (!res.ok) {
        throw new Error("Failed to load live services");
      }
      const data = (await res.json()) as ApiServiceRecord[];
      const liveServices = Array.isArray(data) ? data : [];

      const mapped = liveServices
        .filter(
          (service) =>
            Number.isInteger(Number(service.id)) && Number(service.id) > 0 && String(service.name ?? "").trim()
        )
        .map((service, index) => {
          const serviceId = Number(service.id);
          const label = String(service.name ?? "").trim();
          return {
            id: `service-${serviceId}`,
            serviceId,
            label,
            href: resolveServiceLink(label, service.slug),
            fallbackIndex: index,
          } satisfies FooterServiceItem;
        });

      const sorted = sortFooterServiceItems(mapped, orderIds);
      setFooterServiceLinks(sorted);
      setFooterServiceOrder(sorted.map((item) => item.serviceId));
    } catch {
      // keep previous list
    }
  };

  useEffect(() => {
    const init = async () => {
      const settings = await loadSettings();
      await loadLiveFooterServices(settings?.footer_service_order ?? []);
    };
    void init();
  }, []);

  const requireToken = () => {
    const token = getAdminToken();
    if (token) return token;
    toast.error("Session expired. Please login again.");
    return null;
  };

  const updateSectionLinks = (section: MenuSection, updater: (prev: HeaderFooterLink[]) => HeaderFooterLink[]) => {
    if (section === "header") {
      setHeaderLinks((prev) => {
        const next = updater(prev);
        if (next !== prev) setDirty(true);
        return next;
      });
      return;
    }

    setFooterLinks((prev) => {
      const next = updater(prev);
      if (next !== prev) setDirty(true);
      return next;
    });
  };

  const startEdit = (section: MenuSection, item: HeaderFooterLink) => {
    setFormSection(section);
    setFormLabel(item.label);
    setFormHref(item.href);
    setEditingId(item.id);
  };

  const resetForm = () => {
    setFormLabel("");
    setFormHref("");
    setEditingId(null);
  };

  const upsertItem = () => {
    const label = formLabel.trim();
    const href = normalizeFormHref(formHref);

    if (!label || !href) {
      toast.error("Label and URL are required");
      return;
    }

    if (editingId) {
      const updatedItem: HeaderFooterLink = { id: editingId, label, href };
      const existsInHeader = headerLinks.some((item) => item.id === editingId);
      const sourceSection: MenuSection = existsInHeader ? "header" : "footer";

      if (sourceSection === formSection) {
        updateSectionLinks(formSection, (prev) =>
          prev.map((item) => (item.id === editingId ? updatedItem : item))
        );
      } else {
        if (sourceSection === "header") {
          setHeaderLinks((prev) => prev.filter((item) => item.id !== editingId));
          setFooterLinks((prev) => [...prev, updatedItem]);
        } else {
          setFooterLinks((prev) => prev.filter((item) => item.id !== editingId));
          setHeaderLinks((prev) => [...prev, updatedItem]);
        }
        setDirty(true);
      }

      toast.success("Menu link updated");
      resetForm();
      return;
    }

    updateSectionLinks(formSection, (prev) => [
      ...prev,
      {
        id: createItemId(label, formSection, prev),
        label,
        href,
      },
    ]);
    toast.success("Menu link added");
    resetForm();
  };

  const removeItem = (section: MenuSection, id: string) => {
    updateSectionLinks(section, (prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const handleDragStart = (section: MenuSection, id: string) => {
    setDraggingSection(section);
    setDraggingId(id);
  };

  const handleDragEnter = (section: MenuSection, targetId: string) => {
    if (!draggingId || !draggingSection || draggingSection !== section || draggingId === targetId) return;
    updateSectionLinks(section, (prev) => moveItemById(prev, draggingId, targetId));
    setDraggingId(targetId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDraggingSection(null);
  };

  const handleFooterServiceDragStart = (id: string) => {
    setDraggingServiceId(id);
  };

  const handleFooterServiceDragEnter = (targetId: string) => {
    if (!draggingServiceId || draggingServiceId === targetId) return;
    setFooterServiceLinks((prev) => {
      const next = moveItemById(prev, draggingServiceId, targetId);
      if (next !== prev) {
        setFooterServiceOrder(next.map((item) => item.serviceId));
        setDirty(true);
      }
      return next;
    });
    setDraggingServiceId(targetId);
  };

  const handleFooterServiceDragEnd = () => {
    setDraggingServiceId(null);
  };

  const saveSettings = async () => {
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        header_links: headerLinks,
        footer_links: footerLinks,
        footer_service_order: footerServiceOrder,
      };
      const res = await fetch(`${apiBase}/header-footer-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save header/footer settings");
      }

      const data = await res.json();
      const normalized = normalizeHeaderFooterSettings(data);
      applySettings(normalized);
      await loadLiveFooterServices(normalized.footer_service_order);
      toast.success("Header and footer updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const updatedAtLabel = useMemo(() => {
    if (!updatedAt) return "Never";
    return new Date(updatedAt).toLocaleString();
  }, [updatedAt]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Header and Footer</h2>
          <p className="text-muted-foreground">
            Add menu links, drag to reorder, and control what appears in navbar and footer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void (async () => {
                const settings = await loadSettings();
                await loadLiveFooterServices(settings?.footer_service_order ?? footerServiceOrder);
              })();
            }}
            disabled={loading || saving}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reload
          </Button>
          <Button onClick={saveSettings} disabled={loading || saving || !dirty} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="glass-card border-border/60 p-4 space-y-4">
        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as MenuSection)}>
          <TabsList>
            <TabsTrigger value="header">Header Menu</TabsTrigger>
            <TabsTrigger value="footer">Footer Menu</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          Drag and drop items to set display order. Last saved: {updatedAtLabel}
        </p>

        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">Loading links...</div>
        ) : visibleLinks.length === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">No links found for this section.</div>
        ) : (
          <div className="space-y-2">
            {visibleLinks.map((item) => {
              const isDragging = draggingId === item.id && draggingSection === activeSection;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-3 transition-colors ${
                    isDragging ? "bg-primary/10 border-primary/35" : "bg-card/40"
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(activeSection, item.id)}
                  onDragEnter={() => handleDragEnter(activeSection, item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => event.preventDefault()}
                  onDragEnd={handleDragEnd}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.href}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => startEdit(activeSection, item)}
                      aria-label={`Edit ${item.label}`}
                    >
                      <PencilLine className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => removeItem(activeSection, item.id)}
                      aria-label={`Delete ${item.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-card border-border/60 p-4 space-y-4">
        <h3 className="text-lg font-semibold">{editingId ? "Edit Menu Link" : "Add New Menu Link"}</h3>

        <Tabs value={formSection} onValueChange={(value) => setFormSection(value as MenuSection)}>
          <TabsList>
            <TabsTrigger value="header">Header</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid md:grid-cols-2 gap-3">
          <Input
            value={formLabel}
            onChange={(event) => setFormLabel(event.target.value)}
            placeholder="Menu label"
          />
          <Input
            value={formHref}
            onChange={(event) => setFormHref(event.target.value)}
            placeholder="/contact or https://example.com"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Keep a <span className="font-medium">Services</span> link in header if you want the service dropdown to stay
          visible.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={upsertItem} className="gap-2">
            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? "Update Link" : "Add Link"}
          </Button>
          <Button variant="outline" onClick={resetForm}>
            Reset Form
          </Button>
        </div>
      </div>

      <div className="glass-card border-border/60 p-4 space-y-3">
        <h3 className="text-lg font-semibold">Footer Services (Auto)</h3>
        <p className="text-xs text-muted-foreground">
          Drag and drop to set order. New live services are auto-added and deleted services are auto-removed.
        </p>
        <div className="space-y-2">
          {footerServiceLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No live services found.</p>
          ) : (
            footerServiceLinks.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 transition-colors ${
                  draggingServiceId === item.id ? "bg-primary/10 border-primary/35" : "bg-card/40"
                }`}
                draggable
                onDragStart={() => handleFooterServiceDragStart(item.id)}
                onDragEnter={() => handleFooterServiceDragEnter(item.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={handleFooterServiceDragEnd}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm truncate">{item.label}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.href}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderFooterManager;
