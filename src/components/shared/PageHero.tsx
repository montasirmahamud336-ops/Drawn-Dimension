import { motion } from "framer-motion";

interface PageHeroProps {
  title: string;
  subtitle: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHero = ({ title, subtitle, description, actions }: PageHeroProps) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const hasAccentWord = words.length > 1;
  const leadTitle = hasAccentWord ? words.slice(0, -1).join(" ") : title;
  const accentWord = hasAccentWord ? words[words.length - 1] : "";
  const hasActions = Boolean(actions);

  return (
    <section
      className={`relative pt-32 md:pt-36 overflow-hidden ${
        hasActions ? "pb-10 md:pb-12" : "pb-20 md:pb-24"
      }`}
    >
      {/* Clean background – no dark fade, just a soft top glow */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft primary glow top-left */}
        <div className="absolute top-[-9rem] right-[-11rem] w-[34rem] h-[34rem] rounded-full bg-primary/12 blur-3xl" />
        {/* Subtle radial accent – no dark overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.10),transparent_36%)]" />
      </div>

      <div className="container-narrow relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_rgba(239,68,68,0.22)] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            {subtitle}
          </span>
          <h1 className="text-[clamp(2.35rem,7vw,5.65rem)] font-bold leading-[1.02] tracking-[-0.02em] mt-6 mb-6 text-foreground text-balance">
            {leadTitle}
            {hasAccentWord ? " " : ""}
            {hasAccentWord ? <span className="text-gradient-primary">{accentWord}</span> : null}
          </h1>
          {description && (
            <p className="text-muted-foreground/90 text-base md:text-[1.35rem] max-w-3xl mx-auto leading-relaxed md:leading-relaxed">
              {description}
            </p>
          )}
          {actions && (
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {actions}
            </div>
          )}
          <div
            className={`mx-auto h-px w-44 bg-gradient-to-r from-transparent via-primary/80 to-transparent ${
              hasActions ? "mt-6" : "mt-8"
            }`}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default PageHero;