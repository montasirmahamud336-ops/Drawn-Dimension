import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Globe2, Loader2, MapPin, Search, Sparkles, CheckCircle2, X } from "lucide-react";
import WorldMap from "react-svg-worldmap";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { getCountryName } from "@/data/countryOptions";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeGlobalReachSection } from "@/components/shared/homePageSettings";

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

interface GlobalReachSectionProps {
  data?: HomeGlobalReachSection;
}

const GlobalReachSection = ({ data }: GlobalReachSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const content = data ?? DEFAULT_HOME_PAGE_SETTINGS.sections["global-reach"];

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadSettings = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/world-map-settings`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch world map settings");

        const payload = (await response.json()) as WorldMapSettingsResponse;
        if (!isMounted) return;
        setCountryCodes(sanitizeCountryCodes(payload.country_codes ?? []));
      } catch {
        if (controller.signal.aborted || !isMounted) return;
        setCountryCodes([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const filteredCountryCodes = useMemo(() => {
    if (!searchQuery.trim()) return countryCodes;
    const query = searchQuery.toLowerCase().trim();
    return countryCodes.filter((code) => {
      const countryName = getCountryName(code).toLowerCase();
      return countryName.includes(query) || code.toLowerCase().includes(query);
    });
  }, [countryCodes, searchQuery]);

  const { track1, track2 } = useMemo(() => {
    const midPoint = Math.ceil(filteredCountryCodes.length / 2);
    return {
      track1: filteredCountryCodes.slice(0, midPoint),
      track2: filteredCountryCodes.slice(midPoint),
    };
  }, [filteredCountryCodes]);

  const mapData = useMemo(
    () => countryCodes.map((code) => ({ country: code.toLowerCase(), value: 1 })),
    [countryCodes]
  );

  return (
    <section id="global-reach" className="relative overflow-hidden bg-secondary/20 py-14 md:py-16 lg:py-24">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_25%,rgba(239,68,68,0.14),transparent_38%)] pointer-events-none" />
      <div className="absolute -top-32 right-[-10%] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="container-narrow relative z-10" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Globe2 className="w-3.5 h-3.5 animate-spin-slow" />
            <span>{content.badge}</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
            {content.title}
            <span className="text-gradient-primary block mt-1">{content.title_highlight}</span>
          </h2>

          <p className="text-muted-foreground/95 text-lg leading-relaxed max-w-2xl mx-auto">
            {content.description}
          </p>

          {/* Quick Metrics Bar */}
          {!loading && countryCodes.length > 0 && (
            <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-6 md:gap-10 p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-foreground leading-none">{countryCodes.length}+</div>
                  <div className="text-xs text-muted-foreground mt-1">Countries Active</div>
                </div>
              </div>

              <div className="h-8 w-px bg-border/60 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-foreground leading-none">100%</div>
                  <div className="text-xs text-muted-foreground mt-1">Verified Delivery</div>
                </div>
              </div>

              <div className="h-8 w-px bg-border/60 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-foreground leading-none">Global</div>
                  <div className="text-xs text-muted-foreground mt-1">Engineering Hubs</div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Main Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full space-y-6"
        >
          {loading ? (
            <div className="h-[360px] flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2.5 text-primary" />
              <span>Loading interactive world map...</span>
            </div>
          ) : countryCodes.length === 0 ? (
            <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground text-center">
              <Globe2 className="w-12 h-12 mb-3 text-primary/65" />
              <p className="text-base font-semibold text-foreground">{content.empty_title}</p>
              <p className="text-sm mt-1">{content.empty_description}</p>
            </div>
          ) : (
            <>
              {/* Interactive World Map Canvas */}
              <div className="relative rounded-2xl overflow-x-auto p-2 md:p-4">
                <div className="min-w-[760px] flex justify-center">
                  <WorldMap
                    data={mapData}
                    color="hsl(var(--primary))"
                    size={780}
                    frame={false}
                    containerClassName="worldmap__wrapper worldmap-centered"
                    borderColor="transparent"
                    backgroundColor="transparent"
                    valueSuffix=" completed projects"
                    richInteraction
                    strokeOpacity={0.8}
                    styleFunction={({ countryValue, countryCode }) => {
                      const isHovered = hoveredCountry === countryCode.toUpperCase();
                      return {
                        fill: isHovered
                          ? "#ffffff"
                          : countryValue
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted))",
                        fillOpacity: isHovered ? 1 : countryValue ? 0.88 : 0.40,
                        stroke: isHovered ? "#ffffff" : "hsl(var(--background))",
                        strokeWidth: isHovered ? 2.5 : 0.6,
                        strokeOpacity: isHovered ? 1 : countryValue ? 0.8 : 0.5,
                        cursor: countryValue ? "pointer" : "default",
                        transition: "all 0.2s ease",
                      };
                    }}
                  />
                </div>

                {/* Map Floating Legend Badge */}
                <div className="absolute bottom-2 left-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  <span className="font-medium text-foreground">Live Delivery Hubs</span>
                </div>
              </div>

              {/* Compact Marquee Ticker & Search Header */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Active Project Footprint ({filteredCountryCodes.length} Regions)
                    </h3>
                  </div>

                  {/* Compact Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Quick search country..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-border/60 bg-background/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Smooth Infinite Marquee Ticker Tapes (Saves ~300px Vertical Space!) */}
                {filteredCountryCodes.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No regions match &quot;{searchQuery}&quot;
                  </div>
                ) : searchQuery ? (
                  /* Static Filter View when user searches */
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1 cms-main-scroll">
                    {filteredCountryCodes.map((code) => {
                      const countryName = getCountryName(code);
                      const flag = getFlagEmoji(code);
                      const isHovered = hoveredCountry === code;

                      return (
                        <div
                          key={code}
                          onMouseEnter={() => setHoveredCountry(code)}
                          onMouseLeave={() => setHoveredCountry(null)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 cursor-pointer ${
                            isHovered
                              ? "border-primary/60 bg-primary/20 text-primary shadow-sm"
                              : "border-border/60 bg-background/60 text-foreground/90 hover:border-primary/40 hover:bg-primary/10"
                          }`}
                        >
                          <span className="text-sm select-none">{flag}</span>
                          <span>{countryName}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Live Double Marquee Ticker Tape */
                  <div className="space-y-2 pt-1">
                    {/* Marquee Row 1 */}
                    <div className="trusted-logos-marquee group relative overflow-hidden py-0.5">
                      <div
                        className="trusted-logos-track flex items-center gap-2.5 group-hover:[animation-play-state:paused]"
                        style={{ "--trusted-logos-duration": "40s" } as React.CSSProperties}
                      >
                        {[...track1, ...track1, ...track1].map((code, idx) => {
                          const countryName = getCountryName(code);
                          const flag = getFlagEmoji(code);
                          const isHovered = hoveredCountry === code;

                          return (
                            <div
                              key={`${code}-t1-${idx}`}
                              onMouseEnter={() => setHoveredCountry(code)}
                              onMouseLeave={() => setHoveredCountry(null)}
                              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer ${
                                isHovered
                                  ? "border-primary/60 bg-primary/20 text-primary shadow-sm scale-105"
                                  : "border-border/60 bg-background/60 text-foreground/90 hover:border-primary/40 hover:bg-primary/10"
                              }`}
                            >
                              <span className="text-sm select-none">{flag}</span>
                              <span className="whitespace-nowrap">{countryName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Marquee Row 2 */}
                    <div className="trusted-logos-marquee group relative overflow-hidden py-0.5">
                      <div
                        className="trusted-logos-track flex items-center gap-2.5 group-hover:[animation-play-state:paused]"
                        style={{ "--trusted-logos-duration": "48s" } as React.CSSProperties}
                      >
                        {[...track2, ...track2, ...track2].map((code, idx) => {
                          const countryName = getCountryName(code);
                          const flag = getFlagEmoji(code);
                          const isHovered = hoveredCountry === code;

                          return (
                            <div
                              key={`${code}-t2-${idx}`}
                              onMouseEnter={() => setHoveredCountry(code)}
                              onMouseLeave={() => setHoveredCountry(null)}
                              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer ${
                                isHovered
                                  ? "border-primary/60 bg-primary/20 text-primary shadow-sm scale-105"
                                  : "border-border/60 bg-background/60 text-foreground/90 hover:border-primary/40 hover:bg-primary/10"
                              }`}
                            >
                              <span className="text-sm select-none">{flag}</span>
                              <span className="whitespace-nowrap">{countryName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default GlobalReachSection;
