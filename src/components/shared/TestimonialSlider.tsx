import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Quote, Sparkles, Star, CheckCircle2 } from "lucide-react";
import type { Review } from "@/components/shared/reviews";

interface TestimonialSliderProps {
  testimonials: Review[];
  sectionClassName?: string;
  sectionBadge?: string;
  sectionTitle?: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "DD";

const TestimonialSlider = ({
  testimonials,
  sectionClassName,
  sectionBadge,
  sectionTitle,
}: TestimonialSliderProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index >= current ? 1 : -1);
      setCurrent(index);
    },
    [current],
  );

  const prev = useCallback(() => {
    if (testimonials.length <= 1) return;
    goTo((current - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length, current, goTo]);

  const next = useCallback(() => {
    if (testimonials.length <= 1) return;
    goTo((current + 1) % testimonials.length);
  }, [testimonials.length, current, goTo]);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [testimonials.length, next]);

  useEffect(() => {
    if (current >= testimonials.length) setCurrent(0);
  }, [current, testimonials.length]);

  if (!testimonials.length) return null;

  const t = testimonials[current];

  return (
    <section className={`${sectionClassName ?? "py-16 md:py-24"} relative overflow-hidden`}>
      <div className="container-narrow relative z-10">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-14 flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full mb-2">
            {sectionBadge ?? "Client Testimonials"}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {sectionTitle ?? "What Our Clients Say"}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-xl">
            Real feedback from engineering leaders and businesses who rely on Drawn Dimension.
          </p>
        </motion.div>

        {/* ── Slider Card Container ── */}
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 md:p-10 shadow-xl transition-all duration-300">
            {/* Glowing background radial */}
            <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <Quote className="absolute bottom-6 right-8 w-24 h-24 text-primary/[0.08] pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="relative z-10 flex flex-col justify-between min-h-[220px]"
              >
                {/* Header: Stars + Service Tag */}
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-4 h-4 ${
                            n <= t.rating
                              ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                              : "fill-transparent text-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-foreground">{t.rating}.0</span>
                  </div>

                  {t.project && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary border border-primary/20 bg-primary/10 px-3 py-1 rounded-full">
                      {t.project}
                    </span>
                  )}
                </div>

                {/* Quote Content */}
                <div className="mb-8 min-h-[90px] flex items-center">
                  <p className="text-lg md:text-xl font-medium leading-relaxed text-foreground tracking-tight italic">
                    &ldquo;{t.content}&rdquo;
                  </p>
                </div>

                {/* Author Info & Nav Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-border/60">
                  <div className="flex items-center gap-4">
                    {t.image ? (
                      <img
                        src={t.image}
                        alt={t.name}
                        loading="lazy"
                        className="w-12 h-12 shrink-0 rounded-full object-cover ring-2 ring-primary/30 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-primary/30">
                        {initials(t.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-base font-bold text-foreground truncate">{t.name}</h4>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground truncate">{t.role}</p>
                    </div>
                  </div>

                  {/* Navigation Controls with Counter */}
                  {testimonials.length > 1 && (
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <button
                        onClick={prev}
                        className="w-10 h-10 rounded-2xl border-[1.5px] border-border/70 bg-background/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm active:scale-95"
                        aria-label="Previous review"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      {/* Clean Counter Indicator */}
                      <span className="text-xs font-mono font-bold tracking-wider text-muted-foreground px-3 py-1.5 rounded-full border border-border/60 bg-background/50">
                        {String(current + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
                      </span>

                      <button
                        onClick={next}
                        className="w-10 h-10 rounded-2xl border-[1.5px] border-border/70 bg-background/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm active:scale-95"
                        aria-label="Next review"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* View All Reviews Button */}
          <div className="mt-8 text-center">
            <Link
              to="/testimonials"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border-[1.5px] border-border/70 bg-card hover:bg-muted/80 text-sm font-semibold text-foreground transition-all duration-200 hover:scale-[1.02] shadow-sm"
            >
              <span>Explore All Verified Reviews</span>
              <ChevronRight className="w-4 h-4 text-primary" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSlider;