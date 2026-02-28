import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Code, MessageCircle, Monitor, Palette, Shield, Smartphone, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import HowWeWork from "@/components/shared/HowWeWork";
import PricingCards from "@/components/shared/PricingCards";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import {
  type ApiServiceRecord,
  buildServiceCardFromApi,
  buildServiceFeatureCardsFromApi,
  buildServiceMetaDescriptionFromApi,
  buildServiceMetaTitleFromApi,
  buildServicePricingTiersFromApi,
  buildServiceProcessStepsFromApi,
  buildServiceSectionLeftItemsFromApi,
  buildServiceSectionPanelItemsFromApi,
  findServiceBySlug,
  slugifyServiceName,
} from "@/components/shared/serviceCatalog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ServiceFaqRecord } from "@/components/shared/serviceContent";

const featureIcons = [Code, Smartphone, Zap, Shield, Palette, Monitor];
const whatsappUrl = "https://wa.me/8801775119416";
const featureIconByKey = {
  code: Code,
  smartphone: Smartphone,
  zap: Zap,
  shield: Shield,
  palette: Palette,
  monitor: Monitor,
};

const toAbsoluteUrl = (path: string) => {
  if (typeof window === "undefined") return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
};

const DynamicServicePage = () => {
  const { slug = "" } = useParams();
  const [services, setServices] = useState<ApiServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [serviceFaqs, setServiceFaqs] = useState<ServiceFaqRecord[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqLoadFailed, setFaqLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const apiBase = getApiBaseUrl();

    const loadServices = async () => {
      try {
        const res = await fetch(`${apiBase}/services?status=live`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error("Failed to fetch services");
        }

        const data = await res.json();
        if (!mounted) return;

        setServices(Array.isArray(data) ? data : []);
        setLoadFailed(false);
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to fetch service page data", error);
        setLoadFailed(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const service = useMemo(() => findServiceBySlug(services, slug), [services, slug]);
  const card = useMemo(() => (service ? buildServiceCardFromApi(service) : null), [service]);
  const featureCards = useMemo(() => (service ? buildServiceFeatureCardsFromApi(service) : []), [service]);

  const heroTitle = service?.hero_title?.trim() || service?.name || "Service";
  const heroBadge = service?.hero_badge?.trim() || "Digital Solutions";
  const heroDescription = service?.hero_description?.trim() || card?.description || "";
  const sectionBadge = service?.section_badge?.trim() || "What You Get";
  const sectionTitle = service?.section_title?.trim() || `Complete ${service?.name || "Service"} Solutions`;
  const sectionDescription =
    service?.section_description?.trim() ||
    `We deliver structured and professional ${(service?.name || "service").toLowerCase()} support from planning to final handover.`;
  const panelTitle = service?.section_panel_title?.trim() || "Professional Delivery Stack";
  const panelSubtitle = service?.section_panel_subtitle?.trim() || "Built for clarity and dependable output";
  const processBadge = service?.process_badge?.trim() || "Our Process";
  const processTitle = service?.process_title?.trim() || "How We Work";
  const pricingBadge = service?.pricing_badge?.trim() || "Pricing Plans";
  const pricingTitle = service?.pricing_title?.trim() || "Choose Your Plan";
  const pricingDescription =
    service?.pricing_description?.trim() ||
    "All plans require payment before service delivery begins. Custom quotes available for complex projects.";
  const ctaTitlePrefix = service?.cta_title_prefix?.trim() || "Ready to Transform Your";
  const ctaTitleHighlight = service?.cta_title_highlight?.trim() || "Vision Into Reality?";
  const ctaDescription =
    service?.cta_description?.trim() ||
    "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.";
  const ctaPrimaryLabel = service?.cta_primary_label?.trim() || "Get Free Consultation";
  const ctaPrimaryHref = service?.cta_primary_link?.trim() || "/contact";
  const ctaSecondaryLabel = service?.cta_secondary_label?.trim() || "View Our Portfolio";
  const ctaSecondaryHref = service?.cta_secondary_link?.trim() || "/portfolio";

  const deliverables = useMemo(() => (service ? buildServiceSectionLeftItemsFromApi(service) : []), [service]);
  const sideItems = useMemo(
    () => (service ? buildServiceSectionPanelItemsFromApi(service, deliverables) : []),
    [deliverables, service]
  );
  const steps = useMemo(() => (service ? buildServiceProcessStepsFromApi(service) : []), [service]);
  const pricing = useMemo(() => (service ? buildServicePricingTiersFromApi(service) : []), [service]);
  const serviceFilterSlug = useMemo(
    () => (service ? slugifyServiceName((service.slug || service.name || "").trim()) : ""),
    [service]
  );

  const metaDescription = service
    ? buildServiceMetaDescriptionFromApi(service)
    : card?.description ||
      "Premium engineering and creative services with clean workflow, accurate technical output, and client-ready delivery.";
  const pageTitle = service ? buildServiceMetaTitleFromApi(service) : `${heroTitle} Services | Drawn Dimension`;
  const canonicalPath = card?.link || `/services/${slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const ogImageUrl = toAbsoluteUrl("/images/logo.png");
  const pageKeywords = useMemo(() => {
    if (!service) return "";

    const baseKeywords = [
      `${service.name} services`,
      `${service.name} company`,
      `${service.name} solutions`,
      "engineering services",
      "technical design services",
      "global service provider",
    ];
    const featureKeywords = featureCards.flatMap((feature) => [
      feature.title,
      `${feature.title} service`,
    ]);

    return [...new Set([...baseKeywords, ...featureKeywords])]
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .join(", ");
  }, [featureCards, service]);

  const structuredData = useMemo(() => {
    if (!service) return null;

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Drawn Dimension",
          url: toAbsoluteUrl("/"),
          logo: ogImageUrl,
        },
        {
          "@type": "WebPage",
          name: pageTitle,
          url: canonicalUrl,
          description: metaDescription,
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
              item: toAbsoluteUrl("/services"),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: service.name,
              item: canonicalUrl,
            },
          ],
        },
        {
          "@type": "Service",
          name: service.name,
          serviceType: service.name,
          description: metaDescription,
          url: canonicalUrl,
          areaServed: "Worldwide",
          provider: {
            "@type": "Organization",
            name: "Drawn Dimension",
            url: toAbsoluteUrl("/"),
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${service.name} Scope`,
            itemListElement: featureCards.map((feature) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: feature.title,
                description: feature.description,
              },
            })),
          },
        },
      ],
    };
  }, [canonicalUrl, featureCards, metaDescription, ogImageUrl, pageTitle, service]);

  useEffect(() => {
    if (!service) return;

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

    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content") ?? "";

    let activeTag = descriptionTag;
    let createdTag = false;
    if (!activeTag) {
      activeTag = document.createElement("meta");
      activeTag.setAttribute("name", "description");
      document.head.appendChild(activeTag);
      createdTag = true;
    }
    activeTag.setAttribute("content", metaDescription);

    const resetKeywords = upsertMeta("name", "keywords", pageKeywords);
    const resetRobots = upsertMeta("name", "robots", "index, follow, max-image-preview:large");
    const resetOgTitle = upsertMeta("property", "og:title", pageTitle);
    const resetOgDescription = upsertMeta("property", "og:description", metaDescription);
    const resetOgType = upsertMeta("property", "og:type", "website");
    const resetOgUrl = upsertMeta("property", "og:url", canonicalUrl);
    const resetOgImage = upsertMeta("property", "og:image", ogImageUrl);
    const resetOgSiteName = upsertMeta("property", "og:site_name", "Drawn Dimension");
    const resetTwitterCard = upsertMeta("name", "twitter:card", "summary_large_image");
    const resetTwitterTitle = upsertMeta("name", "twitter:title", pageTitle);
    const resetTwitterDescription = upsertMeta("name", "twitter:description", metaDescription);
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
      if (createdTag) {
        activeTag?.remove();
      } else {
        activeTag?.setAttribute("content", previousDescription);
      }
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
  }, [canonicalUrl, metaDescription, ogImageUrl, pageKeywords, pageTitle, service]);

  useEffect(() => {
    if (loading || service) return;

    const previousTitle = document.title;
    document.title = "Service Not Found | Drawn Dimension";

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

    const resetDescription = upsertMeta(
      "name",
      "description",
      "This service page is not available right now. Explore all live services by Drawn Dimension."
    );
    const resetRobots = upsertMeta("name", "robots", "noindex, follow");
    const resetOgTitle = upsertMeta("property", "og:title", "Service Not Found | Drawn Dimension");
    const resetOgDescription = upsertMeta(
      "property",
      "og:description",
      "This service page is currently unavailable. Visit the full services page for live offerings."
    );
    const resetCanonicalUrl = upsertMeta("property", "og:url", toAbsoluteUrl("/services"));

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const previousCanonicalHref = canonical.getAttribute("href") ?? "";
    canonical.setAttribute("href", toAbsoluteUrl("/services"));

    return () => {
      document.title = previousTitle;
      resetDescription();
      resetRobots();
      resetOgTitle();
      resetOgDescription();
      resetCanonicalUrl();
      if (createdCanonical) {
        canonical?.remove();
      } else {
        canonical?.setAttribute("href", previousCanonicalHref);
      }
    };
  }, [loading, service]);

  useEffect(() => {
    if (!service?.id) {
      setServiceFaqs([]);
      setFaqLoadFailed(false);
      setFaqLoading(false);
      return;
    }

    let mounted = true;
    const controller = new AbortController();
    const apiBase = getApiBaseUrl();

    const loadServiceFaqs = async () => {
      setFaqLoading(true);
      try {
        const res = await fetch(
          `${apiBase}/service-faqs?status=live&serviceId=${encodeURIComponent(String(service.id))}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error("Failed to fetch service FAQs");
        }
        const data = await res.json();
        if (!mounted) return;
        setServiceFaqs(Array.isArray(data) ? (data as ServiceFaqRecord[]) : []);
        setFaqLoadFailed(false);
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to fetch service FAQs", error);
        setServiceFaqs([]);
        setFaqLoadFailed(true);
      } finally {
        if (mounted) setFaqLoading(false);
      }
    };

    loadServiceFaqs();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [service?.id]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          {structuredData ? (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
          ) : null}
          {loading ? (
            <section className="section-padding pt-36">
              <div className="container-narrow">
                <div className="glass-card p-10 text-center text-muted-foreground">Loading service page...</div>
              </div>
            </section>
          ) : !service ? (
            <section className="section-padding pt-36">
              <div className="container-narrow">
                <div className="glass-card p-10 text-center space-y-5">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">Service Page Not Found</h1>
                  <p className="text-muted-foreground">This service is not live right now. Publish it from CMS Pages to make it publicly available.</p>
                  <div className="flex justify-center gap-3">
                    <Link to="/services" className="btn-outline h-11 px-6">
                      Back To All Services
                    </Link>
                    <Link to="/contact" className="btn-primary h-11 px-6">
                      Contact Us
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              <PageHero
                title={heroTitle}
                subtitle={heroBadge}
                description={heroDescription}
                actions={
                  <>
                    <Link to="/contact" className="btn-primary h-12 px-8 inline-flex items-center gap-2 min-w-[200px] justify-center shadow-[0_16px_34px_-18px_rgba(239,68,68,0.75)]">
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline h-12 px-8 inline-flex items-center gap-2 min-w-[240px] justify-center border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 backdrop-blur-sm"
                    >
                      Message Us on WhatsApp
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </>
                }
              />

              <section className="section-padding relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_16%_18%,rgba(239,68,68,0.1),transparent_34%)]" />
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_86%_8%,rgba(14,165,233,0.06),transparent_32%)]" />
                <div className="container-narrow">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featureCards.map((feature, index) => {
                      const key = String(feature.icon ?? "").trim().toLowerCase();
                      const Icon =
                        featureIconByKey[key as keyof typeof featureIconByKey] ??
                        featureIcons[index % featureIcons.length];
                      return (
                        <motion.div
                          key={`${feature.title}-${index}`}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: index * 0.08 }}
                          className="glass-card p-6 group relative overflow-hidden border-border/60 hover:border-primary/45 transition-all duration-500 hover:-translate-y-1"
                        >
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(239,68,68,0.16),transparent_44%)] opacity-85" />
                          <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                          <div className="relative w-12 h-12 bg-primary/12 border border-primary/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:border-primary/55 transition-colors">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="relative font-semibold text-foreground mb-2 text-balance">{feature.title}</h3>
                          <p className="relative text-sm text-muted-foreground/90 leading-relaxed">{feature.description}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="section-padding relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_30%,rgba(239,68,68,0.1),transparent_42%)]" />
                <div className="container-narrow">
                  <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                    >
                      <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-primary font-semibold text-xs uppercase tracking-[0.16em]">
                        {sectionBadge}
                      </span>
                      <h2 className="text-[clamp(1.95rem,4vw,2.95rem)] font-bold mt-5 mb-5 text-foreground text-balance leading-tight">{sectionTitle}</h2>
                      <p className="text-muted-foreground/90 mb-7 leading-relaxed">{sectionDescription}</p>
                      <ul className="space-y-3.5">
                        {deliverables.map((item) => (
                          <li key={item} className="flex items-start gap-3 rounded-xl border border-border/55 bg-background/55 px-3.5 py-3">
                            <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground/90">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="glass-card relative overflow-hidden p-8 border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.09)_100%)]"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(239,68,68,0.12),transparent_48%)]" />
                      <div className="pointer-events-none absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                      <div className="relative flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-primary/12 border border-primary/35 rounded-2xl flex items-center justify-center shadow-[0_12px_26px_-16px_rgba(239,68,68,0.45)]">
                          <Monitor className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{panelTitle}</h3>
                          <p className="text-muted-foreground/90 text-sm">{panelSubtitle}</p>
                        </div>
                      </div>
                      <div className="relative grid grid-cols-2 gap-3">
                        {sideItems.slice(0, 6).map((item) => (
                          <div key={item} className="bg-secondary/80 border border-border/55 rounded-lg px-3 py-3 text-center">
                            <span className="text-sm text-foreground/95">{item}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </section>

              <HowWeWork steps={steps} badge={processBadge} title={processTitle} />
              <PricingCards
                tiers={pricing}
                badge={pricingBadge}
                title={pricingTitle}
                description={pricingDescription}
              />

              <section className="section-padding pt-0 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(239,68,68,0.08),transparent_38%)]" />
                <div className="container-narrow">
                  <div className="glass-card p-4 md:p-6 border-border/60">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div>
                        <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-primary font-semibold text-xs uppercase tracking-[0.16em]">
                          FAQ
                        </span>
                        <h2 className="text-2xl md:text-3xl font-bold mt-4 text-foreground">Frequently Asked Questions</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                          Answers about process, revisions, and delivery for {service.name}.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={serviceFilterSlug ? `/faq?service=${encodeURIComponent(serviceFilterSlug)}` : "/faq"}
                          className="btn-outline h-10 px-4 text-sm"
                        >
                          View All FAQs
                        </Link>
                        <Link
                          to={serviceFilterSlug ? `/blog?service=${encodeURIComponent(serviceFilterSlug)}` : "/blog"}
                          className="btn-outline h-10 px-4 text-sm"
                        >
                          Read Service Blog
                        </Link>
                      </div>
                    </div>

                    <div className="mt-5">
                      {faqLoading ? (
                        <div className="rounded-xl border border-border/60 bg-background/55 p-5 text-sm text-muted-foreground">
                          Loading FAQs...
                        </div>
                      ) : serviceFaqs.length === 0 ? (
                        <div className="rounded-xl border border-border/60 bg-background/55 p-5 text-sm text-muted-foreground">
                          No live FAQs yet for this service.
                        </div>
                      ) : (
                        <Accordion type="single" collapsible className="w-full">
                          {serviceFaqs.map((faq) => (
                            <AccordionItem key={faq.id} value={`service-faq-${faq.id}`} className="border-border/60">
                              <AccordionTrigger className="text-left hover:no-underline">{faq.question}</AccordionTrigger>
                              <AccordionContent className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                      {faqLoadFailed ? (
                        <p className="mt-2 text-xs text-muted-foreground/80">
                          FAQ data may be temporarily unavailable due to a network issue.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              {loadFailed && (
                <div className="container-narrow pb-8 text-center text-xs text-muted-foreground/80">
                  Live service details may be temporarily stale due to a network issue.
                </div>
              )}

              <CTASection
                titlePrefix={ctaTitlePrefix}
                titleHighlight={ctaTitleHighlight}
                description={ctaDescription}
                primaryLabel={ctaPrimaryLabel}
                primaryHref={ctaPrimaryHref}
                secondaryLabel={ctaSecondaryLabel}
                secondaryHref={ctaSecondaryHref}
              />
            </>
          )}
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default DynamicServicePage;
