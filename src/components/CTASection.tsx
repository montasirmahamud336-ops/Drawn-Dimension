import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

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
  primaryHref = "/contact",
  secondaryLabel = "View Our Portfolio",
  secondaryHref = "/portfolio",
}: CTASectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className={`${compact ? "py-14 md:py-16" : "py-24"} relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-primary/4 to-primary/8" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-primary/20 blur-3xl opacity-45 pointer-events-none" />
      <div className="absolute -bottom-32 right-[-5%] w-[22rem] h-[22rem] rounded-full bg-primary/15 blur-3xl opacity-40 pointer-events-none" />

      <div className="container-narrow relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`glass-card relative overflow-hidden border border-primary/20 shadow-[0_20px_80px_rgba(239,68,68,0.18)] ${compact ? "p-8 md:p-10 rounded-3xl" : "p-12 md:p-16 rounded-[2rem]"} text-center bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012)_35%,rgba(239,68,68,0.07)_100%)]`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(239,68,68,0.2),transparent_35%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_36%)]" />
          <div className="pointer-events-none absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`${compact ? "w-16 h-16 mb-6" : "w-20 h-20 mb-8"} relative bg-primary/12 border border-primary/35 rounded-2xl flex items-center justify-center mx-auto`}
          >
            <span className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-70" />
            <Rocket className={`${compact ? "w-8 h-8" : "w-10 h-10"} text-primary`} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`${compact ? "text-3xl md:text-4xl mb-4" : "text-3xl md:text-5xl mb-6"} font-bold text-foreground leading-tight tracking-tight`}
          >
            {titlePrefix}
            <span className="text-gradient-primary block">{titleHighlight}</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`${compact ? "text-base md:text-lg mb-8" : "text-lg mb-10"} text-muted-foreground/95 max-w-3xl mx-auto leading-relaxed`}
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={primaryHref}
                className="btn-primary inline-flex items-center justify-center gap-2 group min-w-[220px] shadow-[0_10px_30px_rgba(239,68,68,0.35)]"
              >
                {primaryLabel}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={secondaryHref}
                className="btn-outline inline-flex items-center justify-center min-w-[220px] border-primary/25 bg-background/35 backdrop-blur-sm"
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
