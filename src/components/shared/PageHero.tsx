import { motion } from "framer-motion";

interface PageHeroProps {
  title: string;
  subtitle: string;
  description?: string;
}

const PageHero = ({ title, subtitle, description }: PageHeroProps) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const hasAccentWord = words.length > 1;
  const leadTitle = hasAccentWord ? words.slice(0, -1).join(" ") : title;
  const accentWord = hasAccentWord ? words[words.length - 1] : "";

  return (
    <section className="relative pt-32 md:pt-36 pb-20 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="hero-glow top-16 -left-28 opacity-55" />
        <div className="absolute top-[-9rem] right-[-11rem] w-[34rem] h-[34rem] rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.12),transparent_36%)]" />
        {/* <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_38%,rgba(0,0,0,0.22)_100%)]" /> */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:58px_58px] opacity-35" />
      </div>

      <div className="container-narrow relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-[0_0_22px_rgba(239,68,68,0.2)]">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            {subtitle}
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight mt-6 mb-6 text-foreground">
            {leadTitle}
            {hasAccentWord ? " " : ""}
            {hasAccentWord ? <span className="text-gradient-primary">{accentWord}</span> : null}
          </h1>
          {description && (
            <p className="text-muted-foreground/95 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
          <div className="mx-auto mt-8 h-px w-40 bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};

export default PageHero;
