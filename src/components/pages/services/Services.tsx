import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import ServiceCard from "@/components/shared/ServiceCard";
import { motion } from "framer-motion";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import {
  type ApiServiceRecord,
  buildServiceCardFromApi,
  getFallbackServiceCards,
} from "@/components/shared/serviceCatalog";
import { 
  Sparkles, 
  Search, 
  LayoutGrid, 
  List, 
  X, 
  ArrowRight, 
  Layers 
} from "lucide-react";
import { Link } from "react-router-dom";

const siteOrigin = "https://www.drawndimension.com";

const toAbsoluteUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin}${path.startsWith("/") ? path : `/${path}`}`;
};

const ServicesSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="rounded-3xl border border-border/50 bg-card/60 overflow-hidden shadow-lg animate-pulse p-7 flex flex-col justify-between"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 rounded-2xl bg-muted/60" />
            <div className="w-6 h-4 bg-muted/40 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-muted/80 rounded-xl" />
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-muted/50 rounded-lg" />
            <div className="h-3.5 w-5/6 bg-muted/50 rounded-lg" />
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-border/40">
          <div className="h-10 w-full bg-primary/20 rounded-2xl" />
        </div>
      </div>
    ))}
  </div>
);

const Services = () => {
  const [apiServices, setApiServices] = useState<ApiServiceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  useEffect(() => {
    let mounted = true;
    const apiBase = getApiBaseUrl();
    const controller = new AbortController();

    const fetchServices = async () => {
      try {
        const res = await fetch(`${apiBase}/services?status=live`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error("Failed to fetch services");
        }

        const data = await res.json();
        if (!mounted) return;
        setApiServices(Array.isArray(data) ? data : []);
        setLoadFailed(false);
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to fetch services", error);
        setLoadFailed(true);
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    };

    fetchServices();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const rawServices = useMemo(() => {
    if (apiServices.length > 0) {
      return apiServices.map(buildServiceCardFromApi);
    }

    if (loadFailed) {
      return getFallbackServiceCards();
    }

    return [];
  }, [apiServices, loadFailed]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rawServices;

    return rawServices.filter(
      (s) =>
        s.title?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.features?.some((f) => f.toLowerCase().includes(query))
    );
  }, [rawServices, searchQuery]);

  const seoServices = useMemo(
    () => (rawServices.length > 0 ? rawServices : getFallbackServiceCards()),
    [rawServices]
  );
  const pageTitle = "Engineering & Digital Service Solutions | DrawnDimension";
  const pageDescription =
    "Explore DrawnDimension's engineering & digital service solutions, including CRO, P&ID, PFD, architectural drafting, HAZOP, web development, graphic design, and SolidWorks 3D modeling.";
  const canonicalUrl = toAbsoluteUrl("/services");
  const ogImageUrl = toAbsoluteUrl("/images/logo.png");
  const pageKeywords = useMemo(() => {
    const baseKeywords = [
      "engineering services",
      "technical service solutions",
      "industrial engineering services",
      "B2B engineering outsourcing",
      "web development services for engineering firms",
      "architectural drafting services",
      "P&ID drawing services",
      "process flow diagram services",
      "SolidWorks modeling services",
      "HAZOP study services",
      "conversion rate optimization services",
      "technical graphics design services",
    ];

    const serviceKeywords = seoServices.flatMap((service) => [
      service.title,
      `${service.title} services`,
      ...service.features.map((feature) => `${feature} service`),
    ]);

    return [...new Set([...baseKeywords, ...serviceKeywords])]
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .join(", ");
  }, [seoServices]);

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "DrawnDimension Services",
      description: pageDescription,
      itemListElement: seoServices.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: service.title,
        url: toAbsoluteUrl(service.link),
      })),
    }),
    [pageDescription, seoServices]
  );

  useEffect(() => {
    let schemaScript = document.head.querySelector('script[data-dd-services-schema="true"]') as HTMLScriptElement | null;
    const createdScript = !schemaScript;
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.type = "application/ld+json";
      schemaScript.setAttribute("data-dd-services-schema", "true");
      document.head.appendChild(schemaScript);
    }

    const previousContent = schemaScript.textContent ?? "";
    schemaScript.textContent = JSON.stringify(structuredData);

    return () => {
      if (createdScript) {
        schemaScript?.remove();
      } else if (schemaScript) {
        schemaScript.textContent = previousContent;
      }
    };
  }, [structuredData]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle;

    const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      const created = !tag;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      const previousContent = tag.getAttribute("content") ?? "";
      tag.setAttribute("content", content);
      return () => {
        if (created) {
          tag?.remove();
        } else {
          tag?.setAttribute("content", previousContent);
        }
      };
    };

    const resetDescription = upsertMeta("name", "description", pageDescription);
    const resetKeywords = upsertMeta("name", "keywords", pageKeywords);
    const resetRobots = upsertMeta("name", "robots", "index, follow, max-image-preview:large");
    const resetOgTitle = upsertMeta("property", "og:title", pageTitle);
    const resetOgDescription = upsertMeta("property", "og:description", pageDescription);
    const resetOgType = upsertMeta("property", "og:type", "website");
    const resetOgUrl = upsertMeta("property", "og:url", canonicalUrl);
    const resetOgImage = upsertMeta("property", "og:image", ogImageUrl);
    const resetOgSiteName = upsertMeta("property", "og:site_name", "DrawnDimension");
    const resetTwitterCard = upsertMeta("name", "twitter:card", "summary_large_image");
    const resetTwitterTitle = upsertMeta("name", "twitter:title", pageTitle);
    const resetTwitterDescription = upsertMeta("name", "twitter:description", pageDescription);
    const resetTwitterImage = upsertMeta("name", "twitter:image", ogImageUrl);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const previousCanonicalHref = canonical.getAttribute("href") ?? "";
    canonical.setAttribute("href", canonicalUrl);

    return () => {
      document.title = previousTitle;
      resetDescription();
      resetKeywords();
      resetRobots();
      resetOgTitle();
      resetOgDescription();
      resetOgType();
      resetOgUrl();
      resetOgImage();
      resetOgSiteName();
      resetTwitterCard();
      resetTwitterTitle();
      resetTwitterDescription();
      resetTwitterImage();
      if (createdCanonical) {
        canonical?.remove();
      } else {
        canonical?.setAttribute("href", previousCanonicalHref);
      }
    };
  }, [canonicalUrl, ogImageUrl, pageDescription, pageKeywords, pageTitle]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="min-h-screen">
          
          <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-20 right-[-10rem] w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="max-w-3xl"
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary dark:bg-primary/20 mb-5 border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Engineering & Creative Services
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-balance">
                  Engineering & Digital <span className="text-gradient-primary">Service Solutions</span>.
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  Professional B2B services covering CRO, P&ID, PFD, architectural drafting, HAZOP, web development, technical graphic design, and 3D SolidWorks modeling.
                </p>

                <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/50">
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-foreground">100%</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">ISO Process Quality</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-primary">500+</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Delivered Projects</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-foreground">99.5%</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Satisfaction Rating</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-primary">24/7</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Technical Support</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <section className="pb-12">
            <div className="container-narrow">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xl">
                
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services by title, discipline, or feature..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/60 focus:bg-background text-sm placeholder:text-muted-foreground/70 transition-all outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                    Showing <span className="text-foreground font-bold">{filteredServices.length}</span> services
                  </span>
                  <div className="flex items-center p-1 rounded-2xl bg-muted/40 border border-border/50">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === "grid"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("compact")}
                      title="Compact View"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === "compact"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Compact</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </section>

          <section className="pb-24">
            <div className="container-narrow">
              
              {!isLoaded ? (
                <ServicesSkeleton />
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-20 rounded-3xl border border-border/50 bg-card/40 p-8">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-xl font-bold">No services matched your search</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try searching another keyword or clear the search query.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-6 px-6 py-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-full text-xs font-bold transition-all"
                  >
                    Clear Search
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredServices.map((service, index) => (
                    <ServiceCard key={`${service.link}-${service.title}`} {...service} index={index} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredServices.map((service, index) => {
                    const Icon = service.icon;
                    return (
                      <article
                        key={`${service.link}-${service.title}`}
                        className="group rounded-2xl border border-border/60 bg-card/90 hover:border-primary/50 hover:bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 shadow-md hover:shadow-xl"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                              {service.title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate max-w-2xl mt-0.5">
                              {service.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <Link
                            to={service.link}
                            className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary group-hover:bg-primary group-hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-300"
                          >
                            Explore Solution <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

            </div>
          </section>

          <CTASection />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Services;
