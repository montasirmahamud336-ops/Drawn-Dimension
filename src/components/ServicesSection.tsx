import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  Globe, PenTool, Box, GitBranch, ShieldCheck, Palette,
  Wrench, ArrowRight, ArrowUpRight, MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeServicesSection } from "@/components/shared/homePageSettings";

const iconMap = {
  globe: Globe,
  "pen-tool": PenTool,
  box: Box,
  "git-branch": GitBranch,
  "shield-check": ShieldCheck,
  palette: Palette,
} as const;

interface ServicesSectionProps {
  data?: HomeServicesSection;
}

const ServicesSection = ({ data }: ServicesSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const content = data ?? DEFAULT_HOME_PAGE_SETTINGS.sections.services;

  return (
    <section id="services" className="relative overflow-hidden bg-secondary/30 py-14 md:py-16 lg:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(239,68,68,0.14),transparent_36%)] pointer-events-none" />
      <div className="container-narrow relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{content.badge}</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
            {content.title}
            <span className="text-gradient-primary block">{content.title_highlight}</span>
          </h2>
          <p className="text-muted-foreground/95 text-lg leading-relaxed">
            {content.description}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.items.map((service, index) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap] ?? Globe;
            return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group"
            >
              <div className="service-card h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/[0.05] border-border/60 relative overflow-hidden">
                <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-primary/12 border border-primary/25 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-all duration-500 ease-out">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300 tracking-tight">
                  {service.title}
                </h3>
                <p className="text-muted-foreground/95 text-sm mb-6 flex-grow leading-relaxed">
                  {service.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-border/50">
                  {service.features.map((feature) => (
                    <span key={feature} className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.12] text-primary font-medium">
                      {feature}
                    </span>
                  ))}
                </div>

                <Link
                  to="/start-project"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-secondary/85 text-secondary-foreground hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary transition-all duration-300"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )})}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 glass-panel p-8 text-center border-primary/20 bg-gradient-to-br from-background/90 to-primary/[0.05]"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wrench className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">{content.cta_title}</h3>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            {content.cta_description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to={content.primary_href} className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto sm:min-w-[280px]">
                {content.primary_label}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href={content.secondary_href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-[48px] w-full sm:w-auto sm:min-w-[280px] whitespace-nowrap px-8 rounded-xl border border-emerald-600/50 dark:border-emerald-500/35 bg-emerald-500/16 dark:bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/24 dark:hover:bg-emerald-500/20 hover:border-emerald-700/70 dark:hover:border-emerald-400/55 shadow-[0_8px_20px_rgba(16,185,129,0.16)] transition-all duration-300"
              >
                {content.secondary_label}
                <MessageCircle className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
