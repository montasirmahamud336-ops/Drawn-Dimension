import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index >= current ? 1 : -1);
      setCurrent(index);
      setExpanded(false);
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
  const isLong = t.content.length > 180;

  return (
    <section className={`${sectionClassName ?? "py-16 md:py-24"} relative`}>
      {/* decorative */}
      <div
        className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-[14rem] md:text-[20rem] font-serif text-slate-200 dark:text-foreground/[0.018] select-none leading-none"
        aria-hidden="true"
      >
        &ldquo;
      </div>

      <div className="container-narrow relative z-10">
        {/* ── header ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/60">
            {sectionBadge ?? "Client Reviews"}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-[-0.025em] mt-3 text-foreground">
            {sectionTitle ?? "What Our Clients Say"}
          </h2>
        </motion.div>

        {/* ── slider card ── */}
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.015] shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <AnimatePresence mode="wait" onExitComplete={() => setExpanded(false)}>
              <motion.div
                key={current}
                initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* top — stars + tag */}
                <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-2">
                  <div className="flex gap-[3px]">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-4 h-4 transition-colors duration-300 ${
                          n <= t.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-200 text-slate-200 dark:fill-white/[0.08] dark:text-white/[0.08]"
                        }`}
                      />
                    ))}
                  </div>
                  {t.project && t.project !== "General Service" && (
                    <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-muted-foreground/30 border border-slate-200 dark:border-white/[0.04] px-2.5 py-[3px] rounded bg-slate-50 dark:bg-transparent">
                      {t.project}
                    </span>
                  )}
                </div>

                {/* content — fixed height */}
                <div className="px-6 md:px-8 h-[120px] md:h-[112px] flex items-start">
                  <p
                    className={`text-[15.5px] md:text-[17px] leading-[1.75] text-slate-700 dark:text-foreground/65 ${
                      expanded ? "" : "line-clamp-3"
                    }`}
                  >
                    &ldquo;{t.content}&rdquo;
                  </p>
                </div>

                {/* read more — links to testimonials page */}
                {isLong && (
                  <div className="px-6 md:px-8 -mt-1">
                    <Link
                      to="/testimonials"
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-primary/70 hover:text-primary transition-colors"
                    >
                      Read more
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* author */}
                <div className="px-6 md:px-8 pt-5 pb-6 md:pb-8 border-t border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-4">
                    {t.image ? (
                      <img
                        src={t.image}
                        alt={t.name}
                        loading="lazy"
                        className="w-11 h-11 shrink-0 rounded-full object-cover border-2 border-white dark:border-white/[0.08] shadow-sm"
                      />
                    ) : (
                      <div className="w-11 h-11 shrink-0 rounded-full border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center text-[11px] font-semibold text-slate-500 dark:text-foreground/30 tracking-wide">
                        {initials(t.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-slate-900 dark:text-foreground/90 truncate">
                        {t.name}
                      </p>
                      <p className="text-[12px] text-slate-500 dark:text-muted-foreground/40 truncate">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </div>

                {/* controls */}
                {testimonials.length > 1 && (
                  <div className="flex items-center justify-between px-6 md:px-8 py-3.5 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
                    <button
                      onClick={prev}
                      className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-slate-500 dark:text-muted-foreground/40 hover:text-slate-700 dark:hover:text-foreground/70 hover:border-slate-300 dark:hover:border-white/[0.12] transition-all duration-200"
                      aria-label="Previous review"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex gap-1.5">
                      {testimonials.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goTo(i)}
                          className={`rounded-full transition-all duration-300 ${
                            i === current
                              ? "w-6 h-1.5 bg-primary"
                              : "w-1.5 h-1.5 bg-slate-300 dark:bg-white/[0.08] hover:bg-slate-400 dark:hover:bg-white/[0.16]"
                          }`}
                          aria-label={`Go to review ${i + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={next}
                      className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-slate-500 dark:text-muted-foreground/40 hover:text-slate-700 dark:hover:text-foreground/70 hover:border-slate-300 dark:hover:border-white/[0.12] transition-all duration-200"
                      aria-label="Next review"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSlider;