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

  return {
    to,
    prefix,
    suffix,
    decimals: numericText.includes(".")
      ? numericText.split(".")[1].length
      : 0,
  };
};

const HomeMetricsSection = ({
  data,
  className = "",
}: HomeMetricsSectionProps) => {
  const content =
    data ?? DEFAULT_HOME_PAGE_SETTINGS.sections["key-metrics"];

  const ref = useRef<HTMLDivElement>(null);

  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  });

  return (
    <div
      ref={ref}
      className={`relative z-20 w-full ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="
          relative
          mx-auto
          max-w-4xl
          overflow-hidden
          rounded-2xl
          border-2
          border-white/15
          bg-white/75
          backdrop-blur-2xl
          shadow-[0_20px_70px_rgba(0,0,0,.08)]
          dark:bg-black/45
          dark:border-white/10
        "
      >
        {/* animated glow */}
        <div className="absolute inset-0">
          <div className="absolute -left-24 top-0 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        {/* top shine line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent dark:via-primary/50" />

        {/* grid */}
        <div className="relative grid grid-cols-2 divide-y divide-black/5 dark:divide-white/5 lg:grid-cols-4 lg:divide-y-0">
          {content.items.map((metric, index) => {
            const animatedValue = parseAnimatedMetricValue(metric.value);

            return (
              <motion.div
                key={metric.id}
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={
                  isInView
                    ? {
                      opacity: 1,
                      y: 0,
                    }
                    : {}
                }
                transition={{
                  delay: index * 0.08,
                  duration: 0.45,
                }}
                whileHover={{
                  y: -3,
                }}
                className="
                  group
                  relative
                  flex
                  flex-col
                  items-center
                  justify-center
                  px-4
                  py-6
                  text-center
                  sm:py-7
                "
              >
                {/* desktop divider */}
                {index !== content.items.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden h-10 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-black/10 to-transparent dark:via-white/10 lg:block" />
                )}

                {/* mobile vertical divider for odd items */}
                {index % 2 === 0 && index < content.items.length - 1 && (
                  <div className="absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-black/10 to-transparent dark:via-white/10 lg:hidden" />
                )}

                {/* hover glow box */}
                <div className="absolute inset-2 rounded-xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* value */}
                <div
                  className="
                    relative
                    z-10
                    font-black
                    tracking-tight
                    transition-transform
                    duration-300
                    group-hover:scale-105
                  "
                  style={{
                    color: metric.value_color,
                    fontSize: metric.value_font_size_px
                      ? `${Math.min(Math.max(metric.value_font_size_px * 0.85, 24), 38)}px`
                      : undefined,
                    textShadow: `0 0 24px ${metric.value_color}35, 0 2px 10px rgba(0,0,0,0.15)`,
                  }}
                >
                  {animatedValue ? (
                    <CountUp
                      from={0}
                      to={animatedValue.to}
                      decimals={animatedValue.decimals}
                      prefix={animatedValue.prefix}
                      suffix={animatedValue.suffix}
                      duration={2}
                    />
                  ) : (
                    metric.value || "\u00A0"
                  )}
                </div>

                {/* label */}
                <div
                  className="
                    relative
                    z-10
                    mt-2
                    text-[11px]
                    sm:text-xs
                    font-bold
                    uppercase
                    tracking-[0.22em]
                    opacity-90
                  "
                  style={{
                    color: metric.label_color,
                  }}
                >
                  {metric.label || "\u00A0"}
                </div>

                {/* underline hover indicator */}
                <div
                  className="mt-2.5 h-[2px] w-0 rounded-full transition-all duration-500 group-hover:w-10"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${metric.value_color || "var(--primary)"}, transparent)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default HomeMetricsSection;