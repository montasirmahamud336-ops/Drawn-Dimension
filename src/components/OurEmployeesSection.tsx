import { motion } from "framer-motion";
import { Loader2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

type OurEmployeesSectionProps = {
  showAll?: boolean;
  compact?: boolean;
};

const PREVIEW_LIMIT = 12;

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getCountryLabel = (country: unknown) => {
  if (typeof country !== "string") return null;
  const normalized = country.trim();
  return normalized ? `From ${normalized}` : null;
};

const OurEmployeesSection = ({ showAll = false, compact = false }: OurEmployeesSectionProps) => {
  const { data: employees, loading } = useLiveData("team", {
    params: { memberType: "employee" },
  });
  const [sliderIndex, setSliderIndex] = useState(0);

  const visibleEmployees = showAll ? employees : employees.slice(0, PREVIEW_LIMIT);
  const hasMore = !showAll && employees.length > PREVIEW_LIMIT;

  const cardWidth = 220; // width of each card + gap
  const maxSlideIndex = Math.max(0, visibleEmployees.length - 1);

  const slidePrev = () => setSliderIndex((prev) => Math.max(0, prev - 1));
  const slideNext = () => setSliderIndex((prev) => Math.min(maxSlideIndex, prev + 1));

  return (
    <section
      id={compact ? "our-employees" : undefined}
      className={compact ? "py-12 md:py-14 lg:py-16" : "section-padding"}
      aria-labelledby="our-employees-heading"
    >
      <div className="container-narrow">
        {/* Centered Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
            <span>Global Workforce</span>
          </span>
          <h2 id="our-employees-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]">
            <span className="text-foreground block">Our World-Class</span>
            <span className="text-primary font-bold block mt-1">Engineers & Specialists</span>
          </h2>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : visibleEmployees.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No employees found.
          </div>
        ) : (
          <>
            {/* Interactive Carousel Wrapper with Side-Positioned Nav Arrows */}
            <div className="relative w-full px-2 sm:px-4">
              {/* Left Arrow Button */}
              {visibleEmployees.length > 1 && (
                <button
                  type="button"
                  onClick={slidePrev}
                  disabled={sliderIndex === 0}
                  aria-label="Previous slide"
                  className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border-[2.5px] border-border/80 text-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 shadow-xl active:scale-95"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Right Arrow Button */}
              {visibleEmployees.length > 1 && (
                <button
                  type="button"
                  onClick={slideNext}
                  disabled={sliderIndex >= maxSlideIndex}
                  aria-label="Next slide"
                  className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border-[2.5px] border-border/80 text-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 shadow-xl active:scale-95"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Carousel Track */}
              <div className="overflow-hidden w-full py-4 -my-4 px-1 -mx-1">
              <div
                className="flex gap-4 md:gap-5 transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${sliderIndex * cardWidth}px)` }}
              >
                {visibleEmployees.map((employee: any, index: number) => {
                  const countryLabel = getCountryLabel(employee?.country);
                  const imageUrl = resolveCmsMediaUrl(employee?.image_url);

                  return (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                      className="relative overflow-hidden rounded-2xl border-[2.5px] border-border/70 dark:border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/40 text-center flex flex-col items-center justify-between group shadow-md w-[200px] sm:w-[215px] shrink-0"
                    >
                      {/* Top Glow Line Accent */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Clean Circular Avatar - NO BORDER RINGS */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3.5 group-hover:scale-105 transition-transform duration-300 shadow-md bg-muted/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={employee.name}
                            className="w-full h-full object-cover"
                          />
                        ) : typeof employee.name === "string" && employee.name.trim() ? (
                          getInitials(employee.name)
                        ) : (
                          <Users className="w-6 h-6 opacity-70" />
                        )}
                      </div>

                      {/* Details - NO PILL BORDER BOX */}
                      <div className="w-full">
                        <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {employee.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                          {employee.role}
                        </p>
                        {countryLabel ? (
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/90 mt-1.5 truncate">
                            {countryLabel}
                          </p>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <Link
                  to="/team"
                  className="px-7 py-3 bg-card border-[2.5px] border-border/70 text-foreground font-bold text-sm rounded-2xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm inline-flex items-center gap-2"
                >
                  Meet All Team Members
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default OurEmployeesSection;
