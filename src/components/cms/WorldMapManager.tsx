import { useEffect, useMemo, useState } from "react";
import WorldMap, { type ISOCode } from "react-svg-worldmap";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { COUNTRY_OPTIONS, getCountryName } from "@/data/countryOptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe2, Loader2, Save, Search, X } from "lucide-react";

interface WorldMapSettingsResponse {
  country_codes?: string[];
  updated_at?: string | null;
}

const sanitizeCountryCodes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) {
      continue;
    }

    unique.add(normalized);
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

const hasSameSelection = (a: string[], b: string[]) =>
  a.length === b.length && a.every((code, index) => code === b[index]);

const WorldMapManager = () => {
  const apiBase = getApiBaseUrl();
  const token = getAdminToken();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [initialCodes, setInitialCodes] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadSettings = async () => {
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
    } catch (error) {
      toast.error("Could not load world map settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const filteredCountries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return COUNTRY_OPTIONS;
    }

    return COUNTRY_OPTIONS.filter(
      (option) => option.name.toLowerCase().includes(term) || option.code.toLowerCase().includes(term)
    );
  }, [search]);

  const mapData = useMemo(
    () =>
      selectedCodes.map((code) => ({
        country: code.toLowerCase() as ISOCode,
        value: 1
      })),
    [selectedCodes]
  );

  const isDirty = useMemo(() => !hasSameSelection(initialCodes, selectedCodes), [initialCodes, selectedCodes]);

  const toggleCountry = (code: string) => {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((item) => item !== code);
      }
      return [...prev, code].sort((a, b) => a.localeCompare(b));
    });
  };

  const handleReset = () => {
    setSelectedCodes(initialCodes);
  };

  const handleSave = async () => {
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          country_codes: selectedCodes
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save world map settings");
      }

      const payload = (await response.json()) as WorldMapSettingsResponse;
      const normalizedCodes = sanitizeCountryCodes(payload.country_codes ?? []);
      setSelectedCodes(normalizedCodes);
      setInitialCodes(normalizedCodes);
      setUpdatedAt(payload.updated_at ?? null);
      toast.success("World map countries updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save world map settings");
    } finally {
      setSaving(false);
    }
  };

  const lastUpdatedLabel = updatedAt ? new Date(updatedAt).toLocaleString() : "Not updated yet";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">World Map Highlights</h2>
          <p className="text-muted-foreground">
            Select countries where projects were completed. Selected countries will be highlighted on home page map.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!isDirty || saving || loading}>
            Reset
          </Button>
          <Button className="gap-2" onClick={handleSave} disabled={!isDirty || saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Countries
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,1fr]">
        <Card className="border-border/50 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-primary" />
              Live Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{selectedCodes.length}</span> countries
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : selectedCodes.length === 0 ? (
              <div className="h-[300px] rounded-2xl border border-dashed border-border/70 flex items-center justify-center text-muted-foreground">
                No country selected.
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3 overflow-x-auto">
                <div className="min-w-[700px] flex justify-center">
                  <WorldMap
                    data={mapData}
                    color="hsl(var(--primary))"
                    size={720}
                    frame={false}
                    borderColor="hsl(var(--border))"
                    backgroundColor="transparent"
                    valueSuffix=" completed projects"
                    richInteraction
                    strokeOpacity={0.8}
                    styleFunction={({ countryValue }) => ({
                      fill: countryValue ? "hsl(var(--primary))" : "hsl(var(--muted))",
                      fillOpacity: countryValue ? 0.98 : 0.46,
                      stroke: "hsl(var(--border))",
                      strokeWidth: 0.9,
                      strokeOpacity: countryValue ? 0.9 : 0.75,
                      cursor: "pointer",
                      transition: "fill-opacity 0.2s ease"
                    })}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {selectedCodes.map((code) => (
                <Badge
                  key={code}
                  variant="secondary"
                  className="gap-1 border border-primary/30 bg-primary/10 text-primary cursor-pointer hover:bg-primary/15"
                  onClick={() => toggleCountry(code)}
                >
                  {getCountryName(code)}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
              {selectedCodes.length === 0 && <span className="text-sm text-muted-foreground">No selected country chips.</span>}
            </div>

            <p className="text-xs text-muted-foreground">Last update: {lastUpdatedLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle>Select Countries</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search country name or code..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[540px] pr-3" data-lenis-prevent>
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredCountries.map((country) => {
                  const isSelected = selectedSet.has(country.code);
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => toggleCountry(country.code)}
                      className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                        isSelected
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/70 bg-background/50 text-foreground hover:border-primary/35"
                      }`}
                    >
                      <div className="text-sm font-medium leading-tight">{country.name}</div>
                      <div className="text-[11px] uppercase tracking-wider mt-1 opacity-80">{country.code}</div>
                    </button>
                  );
                })}
              </div>
              {filteredCountries.length === 0 && (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No country found for this search.
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorldMapManager;
