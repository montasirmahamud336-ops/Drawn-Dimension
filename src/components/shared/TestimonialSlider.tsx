import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import type { Review } from "@/components/shared/reviews";

interface TestimonialSliderProps {
  testimonials: Review[];
  sectionClassName?: string;
}

const TestimonialSlider = ({ testimonials, sectionClassName }: TestimonialSliderProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (testimonials.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  useEffect(() => {
    if (current >= testimonials.length) {
      setCurrent(0);
    }
  }, [current, testimonials.length]);

  if (!testimonials.length) {
    return null;
  }

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  const t = testimonials[current];

  return (
    <section className={`${sectionClassName ?? "py-12 md:py-16 lg:py-20"} relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-10"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Featured Reviews
          </span>
          <h2 className="text-2xl md:text-4xl font-bold mt-3 text-foreground">
            What Our Clients Say
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-6 md:p-10 relative border border-border/60 bg-gradient-to-br from-background via-background to-primary/[0.03]">
            <Quote className="w-10 h-10 text-primary/20 absolute top-4 left-4" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-center relative z-10"
              >
                <div className="flex justify-center gap-1 mb-5">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 md:w-5 md:h-5 fill-primary text-primary" />
                  ))}
                </div>

                <div className="mb-6 max-h-44 overflow-y-auto pr-2">
                  <p className="text-foreground/90 text-base md:text-lg leading-7 md:leading-8 italic break-words">
                    "{t.content}"
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  {t.image ? (
                    <img
                      src={t.image}
                      alt={t.name}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-primary/30"
                    />
                  ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-primary/30 bg-primary/15 text-primary font-semibold flex items-center justify-center">
                      {t.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part.charAt(0).toUpperCase())
                        .join("") || "DD"}
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <h4 className="font-semibold text-foreground">{t.name}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground break-words">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            {testimonials.length > 1 ? (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button
                  onClick={prev}
                  className="w-9 h-9 rounded-full border border-border hover:border-primary/50 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="flex gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === current ? "bg-primary w-6" : "bg-border"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={next}
                  className="w-9 h-9 rounded-full border border-border hover:border-primary/50 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSlider;
