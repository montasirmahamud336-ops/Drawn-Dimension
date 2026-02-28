import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { slugifyServiceName } from "@/components/shared/serviceCatalog";
import type { ServiceBasic, ServiceFaqRecord } from "@/components/shared/serviceContent";

const toAbsoluteUrl = (path: string) => {
  if (typeof window === "undefined") return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
};

const FAQ = () => {
  const apiBase = getApiBaseUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceBasic[]>([]);
  const [faqs, setFaqs] = useState<ServiceFaqRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const [servicesRes, faqRes] = await Promise.all([
          fetch(`${apiBase}/services?status=live`, { signal: controller.signal }),
          fetch(`${apiBase}/service-faqs?status=live`, { signal: controller.signal }),
        ]);

        if (!servicesRes.ok) throw new Error("Failed to fetch services");
        if (!faqRes.ok) throw new Error("Failed to fetch FAQs");

        const servicesData = await servicesRes.json();
        const faqData = await faqRes.json();
        if (!mounted) return;

        setServices(Array.isArray(servicesData) ? (servicesData as ServiceBasic[]) : []);
        setFaqs(Array.isArray(faqData) ? (faqData as ServiceFaqRecord[]) : []);
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to load FAQ data", error);
        setServices([]);
        setFaqs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [apiBase]);

  const selectedSlug = searchParams.get("service")?.trim().toLowerCase() || "";
  const serviceMap = useMemo(() => {
    const map = new Map<number, ServiceBasic>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const selectedService = useMemo(
    () =>
      selectedSlug
        ? services.find((service) => slugifyServiceName((service.slug || service.name || "").trim()) === selectedSlug) ||
          null
        : null,
    [selectedSlug, services]
  );

  const visibleFaqs = useMemo(() => {
    if (!selectedService) return faqs;
    return faqs.filter((faq) => faq.service_id === selectedService.id);
  }, [faqs, selectedService]);

  const pageTitle = selectedService
    ? `${selectedService.name} FAQ | Drawn Dimension`
    : "FAQ | Drawn Dimension Services";
  const pageDescription = selectedService
    ? `Frequently asked questions about ${selectedService.name} services, workflow, and delivery support at Drawn Dimension.`
    : "Frequently asked questions about Drawn Dimension services, process, delivery format, and project support.";
  const canonicalUrl = selectedService
    ? toAbsoluteUrl(`/faq?service=${encodeURIComponent(slugifyServiceName(selectedService.slug || selectedService.name || ""))}`)
    : toAbsoluteUrl("/faq");

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: pageTitle,
          url: canonicalUrl,
          description: pageDescription,
          inLanguage: "en",
        },
        {
          "@type": "FAQPage",
          mainEntity: visibleFaqs.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        },
      ],
    }),
    [canonicalUrl, pageDescription, pageTitle, visibleFaqs]
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
        if (created) tag?.remove();
        else tag?.setAttribute("content", previousContent);
      };
    };

    const resetDescription = upsertMeta("name", "description", pageDescription);
    const resetOgTitle = upsertMeta("property", "og:title", pageTitle);
    const resetOgDescription = upsertMeta("property", "og:description", pageDescription);
    const resetOgType = upsertMeta("property", "og:type", "website");
    const resetOgUrl = upsertMeta("property", "og:url", canonicalUrl);
    const resetRobots = upsertMeta("name", "robots", "index, follow, max-image-preview:large");
    const resetTwitterCard = upsertMeta("name", "twitter:card", "summary_large_image");
    const resetTwitterTitle = upsertMeta("name", "twitter:title", pageTitle);
    const resetTwitterDescription = upsertMeta("name", "twitter:description", pageDescription);

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
      resetOgTitle();
      resetOgDescription();
      resetOgType();
      resetOgUrl();
      resetRobots();
      resetTwitterCard();
      resetTwitterTitle();
      resetTwitterDescription();
      if (createdCanonical) canonical?.remove();
      else canonical?.setAttribute("href", previousCanonicalHref);
    };
  }, [canonicalUrl, pageDescription, pageTitle]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
          <PageHero
            title={selectedService ? `${selectedService.name} FAQ` : "Frequently Asked Questions"}
            subtitle="Support Center"
            description="Get quick answers about process, delivery, pricing, and service workflow."
          />

          <section className="section-padding pt-0">
            <div className="container-narrow">
              <div className="glass-card p-4 border-border/60 mb-6">
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className={`px-4 py-2 rounded-full border text-sm transition-all ${
                      !selectedService ? "border-primary/45 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/35"
                    }`}
                  >
                    All Services
                  </button>
                  {services.map((service) => {
                    const slug = slugifyServiceName((service.slug || service.name || "").trim());
                    const active = selectedService?.id === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSearchParams({ service: slug })}
                        className={`px-4 py-2 rounded-full border text-sm transition-all ${
                          active ? "border-primary/45 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/35"
                        }`}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <div className="glass-card p-10 text-center text-muted-foreground">Loading FAQs...</div>
              ) : visibleFaqs.length === 0 ? (
                <div className="glass-card p-10 text-center text-muted-foreground">
                  No live FAQs found for this service yet.
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="glass-card p-3 md:p-4 border-border/60"
                >
                  <Accordion type="single" collapsible className="w-full">
                    {visibleFaqs.map((faq) => {
                      const service = serviceMap.get(faq.service_id);
                      return (
                        <AccordionItem key={faq.id} value={`faq-${faq.id}`} className="border-border/60">
                          <AccordionTrigger className="text-left hover:no-underline px-2">
                            <div>
                              <p className="font-semibold text-primary/95">{faq.question}</p>
                              {service ? <p className="text-xs text-muted-foreground mt-1">{service.name}</p> : null}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-2 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </motion.div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default FAQ;
