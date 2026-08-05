import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  ThumbsUp,
  Star,
  Briefcase,
  Sparkles,
  Search,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import ReviewCard from "@/components/shared/ReviewCard";
import AddReviewForm from "@/components/shared/AddReviewForm";
import CountUp from "@/components/shared/CountUp";
import { Input } from "@/components/ui/input";
import { fetchPublishedReviews, subscribeToPublishedReviews } from "@/components/shared/reviews";

const REVIEWS_QUERY_KEY = ["testimonials", "published"];

const CATEGORIES = [
  "All",
  "Web Development",
  "AutoCAD Technical Drawings",
  "3D SolidWorks Modeling",
  "P&ID Engineering",
  "HAZOP Study",
  "Graphic Design",
];

const Testimonials = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);

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
        value: <CountUp to={total} duration={2} />,
        label: "Client Reviews",
        subtitle: "Verified testimonials",
        icon: MessageSquare,
        color: "blue",
      },
      {
        value: <CountUp to={positive} suffix="%" duration={2} />,
        label: "Positive Ratings",
        subtitle: "4-star and above",
        icon: ThumbsUp,
        color: "emerald",
      },
      {
        value: <CountUp to={average} decimals={1} suffix="/5" duration={2} />,
        label: "Average Rating",
        subtitle: "Service quality score",
        icon: Star,
        color: "amber",
      },
      {
        value: <CountUp to={services} duration={2} />,
        label: "Services Reviewed",
        subtitle: "Cross-domain coverage",
        icon: Briefcase,
        color: "rose",
      },
    ];
  }, [testimonials]);

  // ── Filtered reviews list ──
  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((review) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        review.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (review.project || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        (review.project || "").toLowerCase() === selectedCategory.toLowerCase();

      const matchesRating = minRatingFilter === 0 || review.rating >= minRatingFilter;

      return matchesSearch && matchesCategory && matchesRating;
    });
  }, [testimonials, searchQuery, selectedCategory, minRatingFilter]);

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
                  <Sparkles className="w-7 h-7 text-primary" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                      Client Reviews
                    </span>
                    <span className="px-3 py-1 text-[11px] font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full">
                      Verified Feedback
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2 tracking-tight">
                    What Our Clients Say
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
                    Discover how Drawn Dimension helps companies execute engineering projects and digital designs with maximum precision.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to="/testimonials/all"
                  className="px-5 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-2xl hover:bg-primary/90 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] shadow-sm flex items-center gap-2"
                >
                  <span>Service Breakdown</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ─── KPI Grid (Matches Dashboard KPI Cards) ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {stats.map((kpi, idx) => {
              const Icon = kpi.icon;
              const colorMap: Record<string, { bg: string; icon: string }> = {
                blue: {
                  bg: "bg-blue-100/80 dark:bg-blue-950/30",
                  icon: "text-blue-700 dark:text-blue-400",
                },
                amber: {
                  bg: "bg-amber-100/80 dark:bg-amber-950/30",
                  icon: "text-amber-700 dark:text-amber-400",
                },
                emerald: {
                  bg: "bg-emerald-100/80 dark:bg-emerald-950/30",
                  icon: "text-emerald-700 dark:text-emerald-400",
                },
                rose: {
                  bg: "bg-rose-100/80 dark:bg-rose-950/30",
                  icon: "text-rose-700 dark:text-rose-400",
                },
              };
              const colors = colorMap[kpi.color];

              return (
                <div
                  key={idx}
                  className="group relative bg-card border-[2.5px] border-border/70 dark:border-border rounded-xl p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg cursor-pointer overflow-hidden shadow-md"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.06] dark:opacity-[0.10] group-hover:opacity-[0.16] transition-opacity pointer-events-none">
                    <Icon className="w-full h-full text-foreground" strokeWidth={1.5} />
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground mb-0.5 tracking-tight">
                        {kpi.value}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {kpi.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {kpi.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl" />
                </div>
              );
            })}
          </motion.div>

          {/* ─── Search & Category Filter Controls ──────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 p-4 rounded-2xl border-[2.5px] border-border/70 dark:border-border bg-card shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-border/70 bg-background/50 h-10"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">Stars:</span>
                {[
                  { label: "All", val: 0 },
                  { label: "5 ★", val: 5 },
                  { label: "4+ ★", val: 4 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setMinRatingFilter(opt.val)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      minRatingFilter === opt.val
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-background/80 border border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ─── Testimonials Grid ───────────────────────────────────────── */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border-[2.5px] border-border/70 bg-card p-10 text-center text-muted-foreground">
              Unable to load reviews right now. Please try again later.
            </div>
          )}

          {!isLoading && !isError && filteredTestimonials.length === 0 && (
            <div className="rounded-2xl border-[2.5px] border-border/70 bg-card p-10 text-center text-muted-foreground">
              No matching reviews found. Try adjusting your search filter or category.
            </div>
          )}

          {!isLoading && !isError && filteredTestimonials.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
            >
              {filteredTestimonials.map((review, i) => (
                <ReviewCard key={review.id} review={review} index={i} />
              ))}
            </motion.div>
          )}

          {/* ─── Add Review Form Section ─────────────────────────────────── */}
          <AddReviewForm
            onSubmitted={() =>
              queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY })
            }
          />
        </main>

        <CTASection compact />
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Testimonials;