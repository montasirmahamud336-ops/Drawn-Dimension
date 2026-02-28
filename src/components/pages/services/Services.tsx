import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
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

const toAbsoluteUrl = (path: string) => {
  if (typeof window === "undefined") return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
};

const Services = () => {
  const [apiServices, setApiServices] = useState<ApiServiceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

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

  const services = useMemo(() => {
    if (apiServices.length > 0) {
      return apiServices.map(buildServiceCardFromApi);
    }

    if (loadFailed) {
      return getFallbackServiceCards();
    }

    return [];
  }, [apiServices, loadFailed]);

  const seoServices = useMemo(
    () => (services.length > 0 ? services : getFallbackServiceCards()),
    [services]
  );
  const pageTitle =
    "Engineering & Design Services | Web, AutoCAD, P&ID, SolidWorks | Drawn Dimension";
  const pageDescription =
    "Explore Drawn Dimension's global engineering and digital services: web design, AutoCAD technical drawing, PFD/P&ID diagrams, SolidWorks 3D modeling, HAZOP studies, and graphic design.";
  const canonicalUrl = toAbsoluteUrl("/services");
  const ogImageUrl = toAbsoluteUrl("/images/logo.png");
  const pageKeywords = useMemo(() => {
    const baseKeywords = [
      "engineering services",
      "digital services",
      "web design services",
      "AutoCAD technical drawing",
      "PFD and P&ID services",
      "SolidWorks 3D modeling",
      "HAZOP risk analysis",
      "graphic design services",
      "global engineering solutions",
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
      "@graph": [
        {
          "@type": "Organization",
          name: "Drawn Dimension",
          url: toAbsoluteUrl("/"),
          logo: ogImageUrl,
          description: pageDescription,
        },
        {
          "@type": "WebPage",
          name: "Services | Drawn Dimension",
          url: canonicalUrl,
          description: pageDescription,
          inLanguage: "en",
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: toAbsoluteUrl("/"),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Services",
              item: canonicalUrl,
            },
          ],
        },
        {
          "@type": "Service",
          serviceType: "Engineering and Digital Services",
          areaServed: "Worldwide",
          provider: {
            "@type": "Organization",
            name: "Drawn Dimension",
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "All Services",
            itemListElement: seoServices.map((service) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: service.title,
                description: service.description,
                url: toAbsoluteUrl(service.link),
              },
            })),
          },
        },
        {
          "@type": "ItemList",
          name: "Drawn Dimension Services",
          itemListElement: seoServices.map((service, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: service.title,
            url: toAbsoluteUrl(service.link),
          })),
        },
      ],
    }),
    [canonicalUrl, ogImageUrl, pageDescription, seoServices]
  );

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
    const resetOgSiteName = upsertMeta("property", "og:site_name", "Drawn Dimension");
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
        <main>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <PageHero
            title="Our Services"
            subtitle="What We Offer"
            description="Comprehensive engineering and digital solutions tailored to transform your vision into reality."
          />

          <section className="section-padding relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(239,68,68,0.12),transparent_34%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(14,165,233,0.08),transparent_34%)] pointer-events-none" />
            <div className="absolute -bottom-24 right-[-8%] w-[24rem] h-[24rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
                className="glass-panel p-4 sm:p-5 md:p-6 border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_40%,rgba(239,68,68,0.08))] shadow-[0_22px_50px_-30px_rgba(15,23,42,0.55)] mb-10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { value: "ISO", label: "Certified process quality" },
                    { value: "24/7", label: "Dedicated project support" },
                    { value: "500+", label: "Successful project delivery" },
                  ].map((item) => (
                    <div
                      key={item.value}
                      className="rounded-2xl border border-border/65 bg-background/75 backdrop-blur-sm px-5 py-4 text-center shadow-[0_10px_28px_-20px_rgba(239,68,68,0.45)]"
                    >
                      <div className="text-2xl md:text-3xl font-bold text-primary tracking-tight">{item.value}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {isLoaded && services.length === 0 ? (
                <div className="glass-panel p-8 border-border/60 text-center text-muted-foreground bg-background/75 backdrop-blur-sm">
                  No live services found. Add a new service from CMS Pages to publish cards here.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service, index) => (
                    <ServiceCard key={`${service.link}-${service.title}`} {...service} index={index} />
                  ))}
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
