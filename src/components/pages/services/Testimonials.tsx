import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import TestimonialSlider from "@/components/shared/TestimonialSlider";
import ReviewCard from "@/components/shared/ReviewCard";
import AddReviewForm from "@/components/shared/AddReviewForm";
import { fetchPublishedReviews, subscribeToPublishedReviews } from "@/components/shared/reviews";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Briefcase, Loader2, MessageSquare, Quote, Star, ThumbsUp } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import PremiumBackground from "@/components/shared/PremiumBackground";
import CountUp from "@/components/shared/CountUp";

const REVIEWS_QUERY_KEY = ["testimonials", "published"];

const Testimonials = () => {
  const queryClient = useQueryClient();

  const {
    data: testimonials = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: REVIEWS_QUERY_KEY,
    queryFn: fetchPublishedReviews,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const unsubscribe = subscribeToPublishedReviews(() => {
      void queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
    });
    return unsubscribe;
  }, [queryClient]);

  // ── Live statistics from reviews ──
  const stats = useMemo(() => {
    const total = testimonials.length;
    const totalRating = testimonials.reduce((s, r) => s + r.rating, 0);
    const average = total ? totalRating / total : 0;
    const positive = total
      ? Math.round((testimonials.filter((r) => r.rating >= 4).length / total) * 100)
      : 0;
    const services = new Set(testimonials.map((r) => r.project)).size;

    return [
      {
        value: <CountUp to={total} duration={2.5} />,
        label: "Client Reviews",
        hint: "Verified testimonials",
        icon: MessageSquare,
      },
      {
        value: <CountUp to={positive} suffix="%" duration={2.5} />,
        label: "Positive Ratings",
        hint: "4‑star and above",
        icon: ThumbsUp,
      },
      {
        value: <CountUp to={average} decimals={1} suffix="/5" duration={2.5} />,
        label: "Average Rating",
        hint: "Service quality score",
        icon: Star,
      },
      {
        value: <CountUp to={services} duration={2.5} />,
        label: "Services Reviewed",
        hint: "Cross‑domain coverage",
        icon: Briefcase,
      },
    ];
  }, [testimonials]);

  const featuredTestimonials = useMemo(() => testimonials.slice(0, 6), [testimonials]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          {/* ── Page Hero ── */}
          <PageHero
            title="Client Testimonials"
            subtitle="What They Say"
            description="Hear from our satisfied clients about their experience working with Drawn Dimension."
          />

          {/* ── Stats Section ── */}
          <section className="relative py-10 md:py-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {stats.map((stat) => (
                  <motion.div
                    key={stat.label}
                    variants={itemVariants}
                    className="group relative rounded-2xl border border-border/40 bg-card/60 dark:bg-white/[0.03] backdrop-blur-sm p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:ring-primary/40">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="text-3xl font-extrabold text-primary tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-sm font-semibold text-foreground mt-1">
                      {stat.label}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mt-1">
                      {stat.hint}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ── Featured Testimonials Grid ── */}
          <section className="py-10 md:py-16">
            <div className="container-narrow">
              {isLoading && (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {isError && (
                <div className="text-center py-20 text-muted-foreground">
                  Unable to load reviews right now. Please try again later.
                </div>
              )}

              {!isLoading && !isError && testimonials.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  No reviews yet. Be the first to share your experience!
                </div>
              )}

              {!isLoading && !isError && featuredTestimonials.length > 0 && (
                <>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {featuredTestimonials.map((review, i) => (
                      <motion.div key={review.id} variants={itemVariants}>
                        <ReviewCard review={review} index={i} />
                      </motion.div>
                    ))}
                  </motion.div>

                  <div className="mt-10 text-center">
                    <Link
                      to="/testimonials/all"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      View all reviews
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>

                  <AddReviewForm
                    onSubmitted={() =>
                      queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY })
                    }
                  />
                </>
              )}

              {!isLoading && !isError && testimonials.length === 0 && (
                <AddReviewForm
                  onSubmitted={() =>
                    queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY })
                  }
                />
              )}
            </div>
          </section>

          {/* ── Testimonial Carousel ── */}
          <TestimonialSlider testimonials={testimonials} />

          {/* ── Trust Banner ── */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
            <div className="container-narrow">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mx-auto max-w-3xl rounded-3xl border border-border/30 bg-card/70 dark:bg-white/[0.02] backdrop-blur-md p-8 md:p-12 text-center"
              >
                <Quote className="mx-auto h-10 w-10 text-primary/30 mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Trusted by Industry Leaders
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  Our commitment to excellence has earned us the trust of companies
                  worldwide. From startups to Fortune 500 corporations, our clients
                  choose Drawn Dimension for quality that speaks for itself.
                </p>
              </motion.div>
            </div>
          </section>

          <CTASection compact />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Testimonials;