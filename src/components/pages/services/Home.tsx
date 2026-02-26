import PageTransition from "@/components/shared/PageTransition";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import DeferredSection from "@/components/shared/DeferredSection";
import { fetchPublishedReviews, subscribeToPublishedReviews } from "@/components/shared/reviews";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState } from "react";

const ServicesSection = lazy(() => import("@/components/ServicesSection"));
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

  const { data: testimonials = [] } = useQuery({
    queryKey: HOME_REVIEWS_QUERY_KEY,
    queryFn: fetchPublishedReviews,
    enabled: shouldLoadTestimonials,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!shouldLoadTestimonials) {
      return;
    }

    const unsubscribe = subscribeToPublishedReviews(() => {
      void queryClient.invalidateQueries({ queryKey: HOME_REVIEWS_QUERY_KEY });
    });

    return unsubscribe;
  }, [queryClient, shouldLoadTestimonials]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-x-hidden">
        <Navigation />
        <main className="relative z-10">
          <HeroSection />
          <DeferredSection minHeight={860}>
            <Suspense fallback={<div className="min-h-[860px]" />}>
              <ServicesSection />
            </Suspense>
          </DeferredSection>

          <DeferredSection minHeight={760}>
            <Suspense fallback={<div className="min-h-[760px]" />}>
              <PortfolioSection />
            </Suspense>
          </DeferredSection>

          <DeferredSection minHeight={620}>
            <Suspense fallback={<div className="min-h-[620px]" />}>
              <GlobalReachSection />
            </Suspense>
          </DeferredSection>

          <DeferredSection minHeight={420} onVisible={() => setShouldLoadTestimonials(true)}>
            <Suspense fallback={<div className="min-h-[420px]" />}>
              <TestimonialSlider
                testimonials={testimonials}
                sectionClassName="py-14 md:py-16 lg:py-20"
              />
            </Suspense>
          </DeferredSection>

          <DeferredSection minHeight={720}>
            <Suspense fallback={<div className="min-h-[720px]" />}>
              <AboutSection />
            </Suspense>
          </DeferredSection>

          <DeferredSection minHeight={760}>
            <Suspense fallback={<div className="min-h-[760px]" />}>
              <WhyChooseUsSection />
            </Suspense>
          </DeferredSection>

          <DeferredSection minHeight={420}>
            <Suspense fallback={<div className="min-h-[420px]" />}>
              <CTASection />
            </Suspense>
          </DeferredSection>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Home;
