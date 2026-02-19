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

  const { data: testimonials = [], isLoading, isError } = useQuery({
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

  const stats = useMemo(() => {
    const totalReviews = testimonials.length;
    const totalRating = testimonials.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalReviews ? totalRating / totalReviews : 0;
    const positiveRate = totalReviews
      ? Math.round((testimonials.filter((review) => review.rating >= 4).length / totalReviews) * 100)
      : 0;
    const serviceCount = new Set(testimonials.map((review) => review.project)).size;

    return [
      {
        value: <CountUp to={totalReviews} duration={2.5} />,
        label: "Client Reviews",
        hint: "Verified testimonials",
        icon: MessageSquare
      },
      {
        value: <CountUp to={positiveRate} suffix="%" duration={2.5} />,
        label: "Positive Ratings",
        hint: "4-star and above",
        icon: ThumbsUp
      },
      {
        value: <CountUp to={averageRating} decimals={1} suffix="/5" duration={2.5} />,
        label: "Average Rating",
        hint: "Service quality score",
        icon: Star
      },
      {
        value: <CountUp to={serviceCount} duration={2.5} />,
        label: "Services Reviewed",
        hint: "Cross-domain coverage",
        icon: Briefcase
      },
    ];
  }, [testimonials]);

  const featuredTestimonials = useMemo(() => testimonials.slice(0, 6), [testimonials]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero title="Client Testimonials" subtitle="What They Say" description="Hear from our satisfied clients about their experience working with Drawn Dimension." />

          {/* Stats */}
          <section className="py-12 md:py-14 bg-secondary/30 relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <div className="glass-panel p-4 sm:p-6 border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <motion.article
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: index * 0.08 }}
                      className="h-full rounded-2xl border border-border/50 bg-background/55 backdrop-blur-md p-5 sm:p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_14px_34px_rgba(239,68,68,0.14)]"
                    >
                      <div className="mx-auto mb-4 w-10 h-10 rounded-xl border border-primary/30 bg-primary/10 text-primary flex items-center justify-center">
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mb-2">{stat.value}</div>
                      <div className="text-foreground/90 font-medium">{stat.label}</div>
                      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{stat.hint}</div>
                    </motion.article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials Grid */}
          <section className="py-12 md:py-16">
            <div className="container-narrow">
              {isLoading ? (
                <div className="glass-card p-10 text-center text-muted-foreground flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Loading reviews...
                </div>
              ) : null}

              {isError ? (
                <div className="glass-card p-10 text-center text-muted-foreground">
                  Reviews are temporarily unavailable. Please try again shortly.
                </div>
              ) : null}

              {!isLoading && !isError && !testimonials.length ? (
                <div className="glass-card p-10 text-center text-muted-foreground">
                  No published reviews yet.
                </div>
              ) : null}

              {!isLoading && !isError && featuredTestimonials.length ? (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    {featuredTestimonials.map((testimonial, index) => (
                      <ReviewCard key={testimonial.id} review={testimonial} index={index} />
                    ))}
                  </div>
                  <div className="mt-8 text-center">
                    <Link
                      to="/testimonials/all"
                      className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                    >
                      See more results
                    </Link>
                  </div>
                  <AddReviewForm
                    onSubmitted={() => {
                      void queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
                    }}
                  />
                </>
              ) : null}

              {!isLoading && !isError && !testimonials.length ? (
                <>
                  <div className="mt-8 text-center">
                    <Link
                      to="/testimonials/all"
                      className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                    >
                      See more results
                    </Link>
                  </div>
                  <AddReviewForm
                    onSubmitted={() => {
                      void queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
                    }}
                  />
                </>
              ) : null}
            </div>
          </section>

          {/* Testimonial Slider */}
          <TestimonialSlider testimonials={testimonials} />

          {/* Trust Banner */}
          <section className="py-12 md:py-16 bg-secondary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.04] to-transparent pointer-events-none" />
            <div className="container-narrow">
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card p-8 md:p-10 text-center border border-border/60 bg-gradient-to-br from-background to-primary/[0.03] relative z-10">
                <Quote className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Trusted by Industry Leaders</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
                  Our commitment to excellence has earned us the trust of companies across industries.
                  From startups to Fortune 500 corporations, our clients choose Drawn Dimension for quality that speaks for itself.
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
