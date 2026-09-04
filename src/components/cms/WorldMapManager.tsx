import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import WorldMap, { type ISOCode } from "react-svg-worldmap";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { COUNTRY_OPTIONS, getCountryName } from "@/data/countryOptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe2,
  Loader2,
  Save,
  Search,
  X,
  RotateCcw,
  Sparkles,
  Check,
  CheckCheck,
  CheckCircle2,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Clock,
  Layers,
} from "lucide-react";

interface WorldMapSettingsResponse {
  country_codes?: string[];
  updated_at?: string | null;
}

const sanitizeCountryCodes = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(normalized)) {
      unique.add(normalized);
    }
  }

  return Array.from(unique).sort((a, b) => {
    const nameA = getCountryName(a);
    const nameB = getCountryName(b);
    return nameA.localeCompare(nameB);
  });
};

/** Converts 2-letter ISO country code to Flag Emoji (e.g. US -> 🇺🇸, BD -> 🇧🇩) */
const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const hasSameSelection = (a: string[], b: string[]) =>
  a.length === b.length && a.every((code, index) => code === b[index]);

// Quick Regional Presets
const POPULAR_HUBS = ["US", "GB", "DE", "CA", "AU", "JP", "SG", "AE", "SA", "BD", "IN", "FR", "NL", "CH", "SE"];
const REGIONS: Record<string, { label: string; codes: string[] }> = {
  popular: {
    label: "Global Hubs",
    codes: POPULAR_HUBS,
  },
  asia: {
    label: "Asia Pacific",
    codes: ["BD", "IN", "PK", "LK", "NP", "CN", "JP", "KR", "SG", "MY", "TH", "VN", "ID", "PH", "AU", "NZ", "HK", "TW"],
  },
  europe: {
    label: "Europe",
    codes: ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PL", "PT", "GR", "CZ", "RO", "HU"],
  },
  americas: {
    label: "Americas",
    codes: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "PA", "CR", "UY"],
  },
  mena: {
    label: "Middle East & Africa",
    codes: ["AE", "SA", "QA", "KW", "OM", "BH", "EG", "ZA", "NG", "KE", "MA", "TR", "IL"],
  },
};

export default function WorldMapManager() {
  const apiBase = getApiBaseUrl();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "selected" | "popular" | "asia" | "europe" | "americas" | "mena">("all");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [initialCodes, setInitialCodes] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const leftCardRef = useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = leftCardRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (window.innerWidth >= 1280) {
        setPanelHeight(el.offsetHeight);
      } else {
        setPanelHeight(undefined);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(el);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [loading]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/world-map-settings`);
      if (!response.ok) {
        throw new Error("Failed to fetch world map settings");
      }

      const payload = (await response.json()) as WorldMapSettingsResponse;
      const normalizedCodes = sanitizeCountryCodes(payload.country_codes ?? []);
      setSelectedCodes(normalizedCodes);
      setInitialCodes(normalizedCodes);
      setUpdatedAt(payload.updated_at ?? null);
    } catch {
      toast.error("Could not load world map settings");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const isDirty = useMemo(() => !hasSameSelection(initialCodes, selectedCodes), [initialCodes, selectedCodes]);

  const mapData = useMemo(
    () =>
      selectedCodes.map((code) => ({
        country: code.toLowerCase() as ISOCode,
        value: 1,
      })),
    [selectedCodes]
  );

  const filteredCountries = useMemo(() => {
    let list = COUNTRY_OPTIONS;

    if (activeCategory === "selected") {
      list = list.filter((option) => selectedSet.has(option.code));
    } else if (activeCategory in REGIONS) {
      const targetCodes = new Set(REGIONS[activeCategory].codes);
      list = list.filter((option) => targetCodes.has(option.code));
    }

    const term = search.trim().toLowerCase();
    if (!term) return list;

    return list.filter(
      (option) => option.name.toLowerCase().includes(term) || option.code.toLowerCase().includes(term)
    );
  }, [search, activeCategory, selectedSet]);

  const toggleCountry = (code: string) => {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((item) => item !== code);
      }
      return [...prev, code].sort((a, b) => {
        const nameA = getCountryName(a);
        const nameB = getCountryName(b);
        return nameA.localeCompare(nameB);
      });
    });
  };

  const handleSelectAllInView = () => {
    const inViewCodes = filteredCountries.map((c) => c.code);
    setSelectedCodes((prev) => {
      const merged = new Set([...prev, ...inViewCodes]);
      return Array.from(merged).sort((a, b) => {
        const nameA = getCountryName(a);
        const nameB = getCountryName(b);
        return nameA.localeCompare(nameB);
      });
    });
    toast.success(`Added ${inViewCodes.length} countries to selection`);
  };

  const handleDeselectAllInView = () => {
    const inViewCodes = new Set(filteredCountries.map((c) => c.code));
    setSelectedCodes((prev) => prev.filter((code) => !inViewCodes.has(code)));
    toast.success("Removed countries from selection");
  };

  const handleClearAll = () => {
    if (selectedCodes.length === 0) return;
    if (!confirm("Clear all selected countries?")) return;
    setSelectedCodes([]);
    toast.success("Cleared all selected countries");
  };

  const handleApplyPreset = (presetKey: string) => {
    if (!(presetKey in REGIONS)) return;
    const presetCodes = REGIONS[presetKey].codes;
    setSelectedCodes((prev) => {
      const merged = new Set([...prev, ...presetCodes]);
      return Array.from(merged).sort((a, b) => {
        const nameA = getCountryName(a);
        const nameB = getCountryName(b);
        return nameA.localeCompare(nameB);
      });
    });
    toast.success(`Applied ${REGIONS[presetKey].label} preset`);
  };

  const handleReset = () => {
    setSelectedCodes(initialCodes);
    toast.info("Changes reverted to saved state");
  };

  const handleSave = async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Admin session expired. Please log in again.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/world-map-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          country_codes: selectedCodes,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save world map settings");
      }

      const payload = (await response.json()) as WorldMapSettingsResponse;
      const normalizedCodes = sanitizeCountryCodes(payload.country_codes ?? []);
      setSelectedCodes(normalizedCodes);
      setInitialCodes(normalizedCodes);
      setUpdatedAt(payload.updated_at ?? new Date().toISOString());
      toast.success("World map countries updated and synced with Public Site!");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save world map settings");
    } finally {
      setSaving(false);
    }
  };

  const coveragePercent = Math.round((selectedCodes.length / COUNTRY_OPTIONS.length) * 100);
  const lastUpdatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not synced yet";

  return (
    <div className="space-y-4 pb-8">
      {/* ================= COMPACT EXECUTIVE ACTION & KPI BAR ================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">Global Reach & Coverage</h2>
              {isDirty ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Unsaved Changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Synced with Site
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>
                <strong className="text-foreground font-semibold">{selectedCodes.length}</strong> of {COUNTRY_OPTIONS.length} countries ({coveragePercent}% of globe)
              </span>
              <span className="hidden sm:inline text-border">•</span>
              <span className="hidden sm:inline">
                Last synced: <span className="text-foreground/80">{lastUpdatedLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty || saving || loading}
            className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-muted cursor-pointer"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Revert
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving || loading}
            className={`h-9 rounded-xl px-4 text-xs font-bold text-primary-foreground shadow-sm transition-all cursor-pointer ${
              isDirty ? "bg-primary hover:opacity-95 ring-2 ring-primary/25 shadow-primary/25 shadow-md" : "bg-primary/80"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Changes {isDirty && `(${selectedCodes.length})`}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ================= STUDIO 2-PANE WORKSPACE ================= */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_460px] items-start">
        {/* Left Studio: Interactive Map */}
        <div
          ref={leftCardRef}
          className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe2 className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Interactive Global Projection</h3>
            </div>
            <Badge variant="outline" className="rounded-lg text-[10px] font-bold bg-background/80">
              {selectedCodes.length} Active Highlights
            </Badge>
          </div>

          {/* Map Canvas */}
          <div className="relative flex items-center justify-center rounded-xl border border-border/50 bg-background/60 p-2 overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-xs text-muted-foreground">
                <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />
                Loading world map projection...
              </div>
            ) : selectedCodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-muted-foreground">
                <Globe2 className="mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="font-bold text-foreground">No countries highlighted yet</p>
                <p className="text-[11px] text-muted-foreground">Select countries from the right panel to illuminate them on the map.</p>
              </div>
            ) : (
              <div className="w-full max-w-[620px] flex justify-center py-1">
                <WorldMap
                  data={mapData}
                  color="hsl(var(--primary))"
                  size={580}
                  frame={false}
                  containerClassName="worldmap__wrapper worldmap-centered w-full"
                  borderColor="hsl(var(--border))"
                  backgroundColor="transparent"
                  valueSuffix=" highlighted reach"
                  richInteraction
                  strokeOpacity={0.8}
                  styleFunction={({ countryValue }) => ({
                    fill: countryValue ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    fillOpacity: countryValue ? 0.95 : 0.4,
                    stroke: "hsl(var(--border))",
                    strokeWidth: 0.8,
                    strokeOpacity: countryValue ? 0.95 : 0.6,
                    cursor: "pointer",
                    transition: "fill-opacity 0.2s ease, fill 0.2s ease",
                  })}
                />
              </div>
            )}
          </div>

          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Presets:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApplyPreset("popular")}
                className="h-6.5 rounded-lg px-2 text-[11px] font-semibold hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                Global Hubs ({POPULAR_HUBS.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApplyPreset("asia")}
                className="h-6.5 rounded-lg px-2 text-[11px] font-semibold hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                Asia Pac ({REGIONS.asia.codes.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApplyPreset("europe")}
                className="h-6.5 rounded-lg px-2 text-[11px] font-semibold hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                Europe ({REGIONS.europe.codes.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApplyPreset("americas")}
                className="h-6.5 rounded-lg px-2 text-[11px] font-semibold hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                Americas ({REGIONS.americas.codes.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApplyPreset("mena")}
                className="h-6.5 rounded-lg px-2 text-[11px] font-semibold hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                MENA ({REGIONS.mena.codes.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedCodes.length === 0}
                className="h-6.5 rounded-lg px-2 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Right Studio: Country Directory & Selection Catalog */}
        <div
          style={panelHeight ? { height: `${panelHeight}px` } : undefined}
          className="flex flex-col rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm overflow-hidden"
        >
          {/* Sticky / Pinned Card Header */}
          <div className="p-3.5 border-b border-border/50 bg-card/90 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Country Catalog</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                  {COUNTRY_OPTIONS.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllInView}
                  className="h-6.5 rounded-lg px-2 text-[10px] font-bold text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <CheckCheck className="mr-1 h-3 w-3" /> Select View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAllInView}
                  className="h-6.5 rounded-lg px-2 text-[10px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Deselect View
                </Button>
              </div>
            </div>

            {/* Search Box with Clear Button */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 rounded-xl border-border/70 bg-background/80 pl-8 pr-8 text-xs focus:border-primary"
                placeholder="Search country by name or ISO code..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Regional Filter Tabs with Count Badges */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                All ({COUNTRY_OPTIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("selected")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === "selected"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Selected ({selectedCodes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("popular")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === "popular"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Hubs ({POPULAR_HUBS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("asia")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === "asia"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Asia ({REGIONS.asia.codes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("europe")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === "europe"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Europe ({REGIONS.europe.codes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("americas")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === "americas"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Americas ({REGIONS.americas.codes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("mena")}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === "mena"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                MENA ({REGIONS.mena.codes.length})
              </button>
            </div>
          </div>

          {/* Scrollable Country Grid List */}
          <div className="flex-1 overflow-y-auto p-3" data-lenis-prevent>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {filteredCountries.map((country) => {
                const isSelected = selectedSet.has(country.code);
                const flag = getFlagEmoji(country.code);

                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => toggleCountry(country.code)}
                    className={`flex items-center justify-between rounded-xl border p-2 text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/25 text-foreground"
                        : "border-border/60 bg-background/50 text-foreground hover:border-primary/40 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-base shrink-0 leading-none">{flag}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">
                          {country.name}
                        </p>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {country.code}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border/80 bg-background"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredCountries.length === 0 && (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <Globe2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="font-semibold text-foreground">No countries found</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Try a different search term or category.</p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 px-3.5 border-t border-border/50 bg-card/90 text-xs text-muted-foreground flex items-center justify-between shrink-0">
            <span>Showing <strong className="text-foreground">{filteredCountries.length}</strong> countries</span>
            <span><strong className="text-foreground">{selectedCodes.length}</strong> total active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
