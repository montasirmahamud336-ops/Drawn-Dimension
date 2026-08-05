import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import ReviewCard from "@/components/shared/ReviewCard";
import AddReviewForm from "@/components/shared/AddReviewForm";
import { fetchPublishedReviews, subscribeToPublishedReviews } from "@/components/shared/reviews";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, Layers, Loader2, Sparkles } from "lucide-react";
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

        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
          {/* ─── Hero Banner Card (Matches Dashboard Banner) ───────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8 overflow-hidden rounded-3xl bg-card border-[2.5px] border-border/70 dark:border-border p-6 md:p-8 shadow-md"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-5">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center flex-shrink-0"
                >
                  <Layers className="w-7 h-7 text-primary" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                      Service Breakdown
                    </span>
                    <span className="px-3 py-1 text-[11px] font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full">
                      {groupedReviews.length} Service Categories
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2 tracking-tight">
                    All Client Reviews
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
                    Browse every review grouped by service so you can evaluate performance and satisfaction across each engineering discipline.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to="/testimonials"
                  className="px-5 py-3 bg-card border border-border/80 dark:border-border rounded-2xl text-foreground font-semibold text-sm hover:bg-muted/80 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] shadow-sm flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Main Reviews</span>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ─── Review Groups ───────────────────────────────────────────── */}
          {isLoading ? (
            <div className="rounded-2xl border-[2.5px] border-border/70 bg-card p-10 text-center text-muted-foreground flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Loading reviews...
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-2xl border-[2.5px] border-border/70 bg-card p-10 text-center text-muted-foreground">
              Reviews are temporarily unavailable. Please try again shortly.
            </div>
          ) : null}

          {!isLoading && !isError && !groupedReviews.length ? (
            <div className="rounded-2xl border-[2.5px] border-border/70 bg-card p-10 text-center text-muted-foreground">
              No published reviews yet.
            </div>
          ) : null}

          {!isLoading && !isError && groupedReviews.length ? (
            <div className="space-y-10 mb-12">
              {groupedReviews.map((group, groupIndex) => (
                <motion.section
                  key={group.service}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: groupIndex * 0.05 }}
                >
                  <div className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-2xl border-[2.5px] border-border/70 dark:border-border bg-card px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{group.service}</h2>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-bold tracking-wider uppercase">
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
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default AllReviews;
