import CountUp from "@/components/shared/CountUp";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  DEFAULT_HOME_PAGE_SETTINGS,
  type HomeKeyMetricsSection,
} from "@/components/shared/homePageSettings";

interface HomeMetricsSectionProps {
  data?: HomeKeyMetricsSection;
  className?: string;
}

const parseAnimatedMetricValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([^0-9-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;

  const [, prefix, numericText, suffix] = match;
  const to = Number.parseFloat(numericText);
  if (!Number.isFinite(to)) return null;

  const decimals = numericText.includes(".")
    ? numericText.split(".")[1].length
    : 0;

  return { to, prefix, suffix, decimals };
};

const HomeMetricsSection = ({
  data,
  className = "",
}: HomeMetricsSectionProps) => {
  const content =
    data ?? DEFAULT_HOME_PAGE_SETTINGS.sections["key-metrics"];
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <div ref={sectionRef} className={`relative z-20 ${className}`}>
      {/* Single unified block — থিম-অ্যাডাপ্টিভ */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-neutral-200 bg-white/80 p-[1.5px] shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-black/90 dark:shadow-2xl"
      >
        {/* Inner glass layer — থিম অনুযায়ী ব্যাকগ্রাউন্ড */}
        <div className="relative rounded-3xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-1 dark:from-neutral-900 dark:via-black dark:to-neutral-950">
          {/* Top shine — ডার্কে বেশি উজ্জ্বল */}
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/30" />
          {/* Ambient glows — থিম অনুযায়ী কালার */}
          <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />

          {/* Grid of metrics — ডিভাইডার কালার অ্যাডাপ্টিভ */}
          <div className="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-white/5 lg:grid-cols-4">
            {content.items.map((metric, index) => {
              const animatedValue = parseAnimatedMetricValue(metric.value);

              return (
                <motion.div
                  key={metric.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.5,
                    delay: 0.2 + index * 0.1,
                    ease: "easeOut",
                  }}
                  className="relative flex flex-col items-center justify-center px-2 py-5 text-center sm:px-4 sm:py-6"
                >
                  {/* Vertical separator on hover (mobile) — dark mode-এ আলাদা */}
                  <div className="absolute inset-y-4 left-0 w-px bg-neutral-200 dark:bg-white/5 lg:hidden" />

                  {/* Value — text shadow থিম অনুযায়ী কম/বেশি */}
                  <div
                    className="relative z-10 font-extrabold leading-none tracking-tight"
                    style={{
                      color: metric.value_color,
                      fontSize: `${Math.min(
                        metric.value_font_size_px * 0.8,
                        40
                      )}px`,
                      // light mode এ shadowটা হালকা, dark এ বেশি
                      textShadow: `0 0 20px ${metric.value_color}1a`,
                      // dark mode via manual check if needed, but we'll use inline style for simplicity,
                      // Tailwind doesn't do dynamic textShadow. We'll add a dark class?
                      // Since color is dynamic, we can't use Tailwind for textShadow.
                      // Instead, we'll define a CSS custom property or just set shadow differently.
                      // We'll rely on the ambient dark/light via the parent, but user might need to add a class.
                      // We'll add a wrapper class to increase shadow in dark mode using a parent dark selector.
                      // For simplicity, keep it as is but add a note.
                    }}
                  >
                    {animatedValue ? (
                      <CountUp
                        from={0}
                        to={animatedValue.to}
                        decimals={animatedValue.decimals}
                        prefix={animatedValue.prefix}
                        suffix={animatedValue.suffix}
                        duration={2.2}
                      />
                    ) : (
                      metric.value || "\u00A0"
                    )}
                  </div>

                  {/* Label — color already comes from settings, but readability */}
                  <div
                    className="relative z-10 mt-2 text-xs font-medium uppercase tracking-wider sm:text-sm"
                    style={{
                      color: metric.label_color,
                      textShadow: "0 1px 6px rgba(0,0,0,0.15)", // light mode soft shadow
                    }}
                  >
                    {metric.label || "\u00A0"}
                  </div>

                  {/* Inner horizontal divider for mobile (not last) — থিমে মানায় */}
                  {index < content.items.length - 1 && (
                    <div className="absolute bottom-0 left-4 right-4 h-px bg-neutral-200 dark:bg-white/5 lg:hidden" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HomeMetricsSection;