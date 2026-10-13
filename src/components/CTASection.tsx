import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { normalizeProjectCtaHref } from "@/components/shared/homePageSettings";

interface CTASectionProps {
  compact?: boolean;
  titlePrefix?: string;
  titleHighlight?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

const CTASection = ({
  compact = false,
  titlePrefix = "Ready to Transform Your",
  titleHighlight = "Vision Into Reality?",
  description = "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.",
  primaryLabel = "Get Free Consultation",
  primaryHref = "/start-project",
  secondaryLabel = "View Our Portfolio",
  secondaryHref = "/portfolio",
}: CTASectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const normalizedPrimaryHref = normalizeProjectCtaHref(primaryLabel, primaryHref);

  return (
    <section className={`${compact ? "py-12 md:py-14" : "py-20 md:py-28"} relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[22rem] rounded-full bg-primary/[0.12] blur-3xl pointer-events-none" />

      <div className="container-narrow relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center flex flex-col items-center"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className={`${compact ? "text-3xl md:text-4xl mb-4" : "text-3xl md:text-5xl lg:text-6xl mb-6"} font-bold text-foreground leading-[1.1] tracking-tight`}
          >
            {titlePrefix}
            <span className="text-gradient-primary block">{titleHighlight}</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`${compact ? "text-base md:text-lg mb-8" : "text-base md:text-lg lg:text-xl mb-10"} text-muted-foreground/95 max-w-3xl mx-auto leading-relaxed`}
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={normalizedPrimaryHref}
                className="btn-primary inline-flex items-center justify-center gap-2 group min-w-[220px] shadow-[0_10px_30px_rgba(239,68,68,0.35)]"
              >
                <span>{primaryLabel}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={secondaryHref}
                className="btn-outline inline-flex items-center justify-center min-w-[220px] border-primary/25 bg-background/40 hover:bg-background/70 backdrop-blur-sm"
              >
                {secondaryLabel}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
