import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Globe, PenTool, Box, GitBranch, ShieldCheck, Palette,
  Wrench, ArrowRight, ArrowUpRight, MessageCircle, Sparkles, CheckCircle2
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
    <section id="services" className="relative overflow-hidden bg-secondary/20 py-16 md:py-20 lg:py-24">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-[-10%] w-[32rem] h-[32rem] rounded-full bg-primary/8 blur-3xl pointer-events-none" />

      <div className="container-narrow relative z-10" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-14 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{content.badge}</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5">
            {content.title}
            <span className="text-gradient-primary block mt-1">{content.title_highlight}</span>
          </h2>

          <p className="text-muted-foreground/95 text-lg leading-relaxed">
            {content.description}
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {content.items.map((service, index) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap] ?? Globe;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
                className="group relative h-full"
              >
                {/* Compact Glow Card Container */}
                <div className="relative h-full flex flex-col justify-between rounded-2xl border-[2.5px] border-border/70 dark:border-border bg-card p-5 md:p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/40 overflow-hidden shadow-md">

                  {/* Top Ambient Glow Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all pointer-events-none" />

                  <Link to={service.link || "/start-project"} className="block flex-1">
                    <div>
                      {/* Header Row: Icon + Arrow Link */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 shadow-sm transition-all duration-300">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="w-8 h-8 rounded-full border border-border/70 bg-background/60 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 group-hover:bg-primary/10 transition-all duration-300">
                          <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors tracking-tight">
                        {service.title}
                      </h3>

                      {/* Description (Uniform line-clamp) */}
                      <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-2 mb-4">
                        {service.description}
                      </p>
                    </div>
                  </Link>

                  <div>
                    {/* Feature Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4 pt-3 border-t border-border/60">
                      {service.features.slice(0, 3).map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary/80"
                        >
                          <span className="w-1 h-1 rounded-full bg-primary/70" />
                          <span>{feature}</span>
                        </span>
                      ))}
                    </div>

                    {/* Action Button Link */}
                    <Link
                      to={service.link || "/start-project"}
                      className="inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-muted/50 text-foreground hover:bg-primary hover:text-primary-foreground border border-border/70 hover:border-primary shadow-sm transition-all duration-300 group/btn"
                    >
                      <span>Explore Solution</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Callout Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 lg:mt-16 rounded-3xl border border-primary/25 bg-gradient-to-r from-card/90 via-card/70 to-card/90 backdrop-blur-xl p-8 md:p-10 text-center shadow-xl relative overflow-hidden"
        >
          {/* Subtle Banner Ambient Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_70%)] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Comprehensive Engineering Capabilities</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              {content.cta_title}
            </h3>

            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8">
              {content.cta_description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  to={content.primary_href}
                  className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow-[0_8px_25px_rgba(239,68,68,0.25)] transition-all duration-300 w-full sm:w-auto"
                >
                  <span>{content.primary_label}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <a
                  href={content.secondary_href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl text-sm font-semibold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 shadow-[0_8px_20px_rgba(16,185,129,0.16)] transition-all duration-300 w-full sm:w-auto"
                >
                  <span>{content.secondary_label}</span>
                  <MessageCircle className="w-4 h-4" />
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
