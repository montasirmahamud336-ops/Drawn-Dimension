import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import ReviewCard from "@/components/shared/ReviewCard";
import AddReviewForm from "@/components/shared/AddReviewForm";
import { fetchPublishedReviews, subscribeToPublishedReviews } from "@/components/shared/reviews";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

const REVIEWS_QUERY_KEY = ["testimonials", "published"];

const AllReviews = () => {
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

  const groupedReviews = useMemo(() => {
    const map = new Map<string, typeof testimonials>();

    testimonials.forEach((review) => {
      const key = review.project || "General Service";
      const current = map.get(key) ?? [];
      current.push(review);
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([service, reviews]) => ({ service, reviews }));
  }, [testimonials]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main>
          <PageHero
            title="All Client Reviews"
            subtitle="Service-wise Results"
            description="Browse every review grouped by service so you can compare quality across each offering."
          />

          <section className="py-12 md:py-16">
            <div className="container-narrow">
              <div className="mb-8">
                <Link
                  to="/testimonials"
                  className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                >
                  Back to main reviews
                </Link>
              </div>

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

              {!isLoading && !isError && !groupedReviews.length ? (
                <div className="glass-card p-10 text-center text-muted-foreground">
                  No published reviews yet.
                </div>
              ) : null}

              {!isLoading && !isError && groupedReviews.length ? (
                <div className="space-y-10">
                  {groupedReviews.map((group, groupIndex) => (
                    <motion.section
                      key={group.service}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: groupIndex * 0.05 }}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-xl md:text-2xl font-semibold text-foreground">{group.service}</h2>
                        <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                          {group.reviews.length} review{group.reviews.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                        {group.reviews.map((review, reviewIndex) => (
                          <ReviewCard key={review.id} review={review} index={reviewIndex} />
                        ))}
                      </div>
                    </motion.section>
                  ))}
                </div>
              ) : null}

              <AddReviewForm
                onSubmitted={() => {
                  void queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
                }}
              />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default AllReviews;
