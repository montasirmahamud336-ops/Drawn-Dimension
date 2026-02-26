import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Globe2, Loader2, MapPin } from "lucide-react";
import WorldMap from "react-svg-worldmap";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { getCountryName } from "@/data/countryOptions";

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

const GlobalReachSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadSettings = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/world-map-settings`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to fetch world map settings");
        }

        const payload = (await response.json()) as WorldMapSettingsResponse;
        if (!isMounted) return;
        setCountryCodes(sanitizeCountryCodes(payload.country_codes ?? []));
      } catch (error) {
        if (controller.signal.aborted || !isMounted) {
          return;
        }
        setCountryCodes([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const mapData = useMemo(
    () => countryCodes.map((code) => ({ country: code.toLowerCase(), value: 1 })),
    [countryCodes]
  );

  return (
    <section id="global-reach" className="relative overflow-hidden bg-secondary/20 py-14 md:py-16 lg:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_25%,rgba(239,68,68,0.14),transparent_34%)] pointer-events-none" />
      <div className="absolute -top-32 right-[-10%] w-[26rem] h-[26rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="container-narrow relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Global Footprint</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
            Countries Where We
            <span className="text-gradient-primary block">Delivered Projects</span>
          </h2>
          <p className="text-muted-foreground/95 text-lg leading-relaxed">
            A live map of regions where our engineering and digital teams have completed client work.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card p-6 md:p-8 bg-gradient-to-br from-background via-background to-primary/[0.04] border-border/60"
        >
          {loading ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading world map...
            </div>
          ) : countryCodes.length === 0 ? (
            <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground text-center">
              <Globe2 className="w-10 h-10 mb-3 text-primary/65" />
              <p className="text-base font-medium text-foreground">No countries marked yet</p>
              <p className="text-sm">Add countries from CMS to highlight them here.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-3 md:p-5 overflow-x-auto">
                <div className="min-w-[760px] flex justify-center">
                  <WorldMap
                    data={mapData}
                    color="hsl(var(--primary))"
                    size={780}
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

              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {countryCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/12 px-3 py-1.5 text-xs font-medium text-primary"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {getCountryName(code)}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default GlobalReachSection;
