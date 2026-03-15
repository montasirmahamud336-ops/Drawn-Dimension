import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Lightbulb, Users, Award, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeAboutSection } from "@/components/shared/homePageSettings";

const iconMap = {
  target: Target,
  lightbulb: Lightbulb,
  users: Users,
  award: Award,
} as const;

interface AboutSectionProps {
  data?: HomeAboutSection;
}

const AboutSection = ({ data }: AboutSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const content = data ?? DEFAULT_HOME_PAGE_SETTINGS.sections.about;

  return (
    <section id="about" className="section-no-blend relative py-14 md:py-16 lg:py-20">
      {/* <div className="pointer-events-none absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-background to-transparent" /> */}
      {/* <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/8 to-transparent" /> */}
      <div className="absolute -left-20 top-1/3 w-72 h-72 rounded-full bg-primary/5 blur-3xl opacity-40" />

      <div className="container-narrow relative z-10" ref={ref}>
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              {content.badge}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.12] mt-4 mb-6 pb-1 text-foreground">
              {content.title}
              <span className="text-gradient-primary block leading-[1.12] pb-1">{content.title_highlight}</span>
            </h2>
            <p className="text-muted-foreground/95 text-lg leading-relaxed mb-8">
              {content.description}
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {content.description_secondary}
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-3 w-full">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to={content.primary_href} className="btn-primary inline-flex items-center gap-2 whitespace-nowrap w-full sm:w-auto sm:min-w-[280px]">
                  {content.primary_label}
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

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 gap-4"
          >
            {content.values.map((value, index) => {
              const Icon = iconMap[value.icon as keyof typeof iconMap] ?? Target;
              return (
              <motion.div
                key={value.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card p-6 group hover:border-primary/50 transition-all duration-500 bg-gradient-to-br from-background via-background to-primary/[0.04] border-border/60"
              >
                <div className="w-12 h-12 bg-primary/10 border border-primary/25 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 tracking-tight">{value.title}</h3>
                <p className="text-sm text-muted-foreground/95 leading-relaxed">{value.description}</p>
              </motion.div>
            )})}
          </motion.div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent via-background/65 to-background" />
    </section>
  );
};

export default AboutSection;
