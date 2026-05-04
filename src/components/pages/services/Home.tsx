import PageTransition from "@/components/shared/PageTransition";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import HomeMetricsSection from "@/components/HomeMetricsSection";
import Footer from "@/components/Footer";
import DeferredSection from "@/components/shared/DeferredSection";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { fetchPublishedReviews, subscribeToPublishedReviews } from "@/components/shared/reviews";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import {
  DEFAULT_HOME_PAGE_SETTINGS,
  normalizeHomePageSettings,
  type HomeSectionId,
} from "@/components/shared/homePageSettings";
import { warmLiveData } from "@/hooks/useLiveData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

const ServicesSection = lazy(() => import("@/components/ServicesSection"));
const TrustedLogosSection = lazy(() => import("@/components/TrustedLogosSection"));
const PortfolioSection = lazy(() => import("@/components/PortfolioSection"));
const GlobalReachSection = lazy(() => import("@/components/GlobalReachSection"));
const TestimonialSlider = lazy(() => import("@/components/shared/TestimonialSlider"));
const AboutSection = lazy(() => import("@/components/AboutSection"));
const WhyChooseUsSection = lazy(() => import("@/components/WhyChooseUsSection"));
const CTASection = lazy(() => import("@/components/CTASection"));

const HOME_REVIEWS_QUERY_KEY = ["home", "testimonials", "published"];

const Home = () => {
  const queryClient = useQueryClient();
  const [shouldLoadTestimonials, setShouldLoadTestimonials] = useState(false);
  const [homeSettings, setHomeSettings] = useState(DEFAULT_HOME_PAGE_SETTINGS);

  /* ── prefetch (unchanged) ── */
  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!isDesktop || connection?.saveData) return;

    const prefetchHomeSections = () => {
      void import("@/components/TrustedLogosSection");
      void import("@/components/ServicesSection");
      void import("@/components/PortfolioSection");
      void import("@/components/GlobalReachSection");
      void import("@/components/shared/TestimonialSlider");
      void import("@/components/AboutSection");
      void import("@/components/WhyChooseUsSection");
      void import("@/components/CTASection");
      void warmLiveData("projects", { cacheTimeMs: 120_000, revalidate: false });
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const timerId = window.setTimeout(prefetchHomeSections, 4000);
    const idleId = idleWindow.requestIdleCallback?.(prefetchHomeSections, { timeout: 6000 });

    return () => {
      window.clearTimeout(timerId);
      if (typeof idleId === "number") idleWindow.cancelIdleCallback?.(idleId);
    };
  }, []);

  /* ── settings fetch (unchanged) ── */
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const loadSettings = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/home-page-settings`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load");
        const payload = await res.json();
        if (!mounted) return;
        setHomeSettings(normalizeHomePageSettings(payload));
      } catch {
        if (!mounted || controller.signal.aborted) return;
        setHomeSettings(DEFAULT_HOME_PAGE_SETTINGS);
      }
    };

    void loadSettings();
    return () => { mounted = false; controller.abort(); };
  }, []);

  /* ── testimonials (unchanged) ── */
  const { data: testimonials = [] } = useQuery({
    queryKey: HOME_REVIEWS_QUERY_KEY,
    queryFn: fetchPublishedReviews,
    enabled: shouldLoadTestimonials,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!shouldLoadTestimonials) return;
    const unsubscribe = subscribeToPublishedReviews(() => {
      void queryClient.invalidateQueries({ queryKey: HOME_REVIEWS_QUERY_KEY });
    });
    return unsubscribe;
  }, [queryClient, shouldLoadTestimonials]);

  /* ── section order (unchanged) ── */
  const orderedSections = homeSettings.section_order.filter(
    (id) => homeSettings.sections[id].enabled,
  );
  const visibleSections = orderedSections.filter((id) => id !== "key-metrics");

  /* ── section nodes (unchanged) ── */
  const sectionNodes: Record<HomeSectionId, ReactNode> = {
    hero: (
      <HeroSection
        data={homeSettings.sections.hero}
        metricsData={homeSettings.sections["key-metrics"]}
      />
    ),
    "key-metrics": (
      <HomeMetricsSection data={homeSettings.sections["key-metrics"]} />
    ),
    "trusted-logos": (
      <DeferredSection minHeight={220}>
        <Suspense fallback={<div className="min-h-[220px]" />}>
          <TrustedLogosSection data={homeSettings.sections["trusted-logos"]} />
        </Suspense>
      </DeferredSection>
    ),
    services: (
      <DeferredSection minHeight={860}>
        <Suspense fallback={<div className="min-h-[860px]" />}>
          <ServicesSection data={homeSettings.sections.services} />
        </Suspense>
      </DeferredSection>
    ),
    portfolio: (
      <DeferredSection minHeight={760}>
        <Suspense fallback={<div className="min-h-[760px]" />}>
          <PortfolioSection data={homeSettings.sections.portfolio} />
        </Suspense>
      </DeferredSection>
    ),
    "global-reach": (
      <DeferredSection minHeight={620}>
        <Suspense fallback={<div className="min-h-[620px]" />}>
          <GlobalReachSection data={homeSettings.sections["global-reach"]} />
        </Suspense>
      </DeferredSection>
    ),
    testimonials: (
      <DeferredSection minHeight={420} onVisible={() => setShouldLoadTestimonials(true)}>
        <Suspense fallback={<div className="min-h-[420px]" />}>
          <TestimonialSlider
            testimonials={testimonials}
            sectionClassName="py-14 md:py-16 lg:py-20"
            sectionBadge={homeSettings.sections.testimonials.badge}
            sectionTitle={homeSettings.sections.testimonials.title}
          />
        </Suspense>
      </DeferredSection>
    ),
    about: (
      <DeferredSection minHeight={720}>
        <Suspense fallback={<div className="min-h-[720px]" />}>
          <AboutSection data={homeSettings.sections.about} />
        </Suspense>
      </DeferredSection>
    ),
    "why-choose-us": (
      <DeferredSection minHeight={760}>
        <Suspense fallback={<div className="min-h-[760px]" />}>
          <WhyChooseUsSection data={homeSettings.sections["why-choose-us"]} />
        </Suspense>
      </DeferredSection>
    ),
    cta: (
      <DeferredSection minHeight={420}>
        <Suspense fallback={<div className="min-h-[420px]" />}>
          <CTASection
            compact={homeSettings.sections.cta.compact}
            titlePrefix={homeSettings.sections.cta.title_prefix}
            titleHighlight={homeSettings.sections.cta.title_highlight}
            description={homeSettings.sections.cta.description}
            primaryLabel={homeSettings.sections.cta.primary_label}
            primaryHref={homeSettings.sections.cta.primary_href}
            secondaryLabel={homeSettings.sections.cta.secondary_label}
            secondaryHref={homeSettings.sections.cta.secondary_href}
          />
        </Suspense>
      </DeferredSection>
    ),
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER — hero immediate, rest scroll-triggered
     ═══════════════════════════════════════════════════════════ */

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="relative z-10">
          {visibleSections.map((sectionId) =>
            sectionId === "hero" ? (
              /* ── HERO: immediate animation, zero delay ── */
              <motion.div
                key={sectionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Fragment>{sectionNodes[sectionId]}</Fragment>
              </motion.div>
            ) : (
              /* ── OTHER SECTIONS: animate only when scrolled into view ── */
              <motion.div
                key={sectionId}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Fragment>{sectionNodes[sectionId]}</Fragment>
              </motion.div>
            ),
          )}
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Home;