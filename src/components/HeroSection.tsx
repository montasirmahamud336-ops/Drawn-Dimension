import { ArrowRight, Play, Code, Ruler, Box, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeHeroSection } from "@/components/shared/homePageSettings";

const iconMap = {
  "file-text": FileText,
  box: Box,
  ruler: Ruler,
  code: Code,
} as const;

interface HeroSectionProps {
  data?: HomeHeroSection;
}

const HeroSection = ({ data }: HeroSectionProps) => {
  const content = data ?? DEFAULT_HOME_PAGE_SETTINGS.sections.hero;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20 md:py-24">
      {/* Premium layered background */}
      <div className="absolute inset-0">
        <div className="hero-glow top-24 -left-32" />
        <div className="absolute top-20 right-[-10rem] w-[28rem] h-[28rem] rounded-full bg-primary/7 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.09),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),transparent_22%,rgba(0,0,0,0.25)_100%)]" />

      </div>

      {/* Floating accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
        <div className="absolute top-1/4 left-[8%] w-28 h-28 border border-primary/25 rounded-2xl bg-primary/10 backdrop-blur-sm motion-safe:animate-float" />
        <div className="absolute top-1/3 right-[12%] w-20 h-20 border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm motion-safe:animate-float-delayed" />
        <div
          className="absolute bottom-1/3 left-[18%] w-14 h-14 border border-primary/30 rounded-lg bg-primary/10 motion-safe:animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container-narrow relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT SIDE - Hero Content */}
          <div>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/12 border border-primary/35 backdrop-blur-sm mb-6 shadow-[0_0_24px_rgba(239,68,68,0.2)]">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">{content.badge}</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              <span className="text-foreground">{content.title_line_1}</span>
              <br />
              <span className="text-gradient-primary">{content.title_line_2}</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground/95 mb-8 leading-relaxed max-w-xl">
              {content.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <Link
                  to={content.primary_href}
                  className="btn-primary inline-flex items-center justify-center gap-2 group min-w-[210px] shadow-[0_12px_30px_rgba(239,68,68,0.35)]"
                >
                  {content.primary_label}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div>
                <Link
                  to={content.secondary_href}
                  className="btn-outline inline-flex items-center justify-center gap-2 min-w-[210px] border-primary/25 bg-background/40 backdrop-blur-sm"
                >
                  <Play className="w-5 h-5" />
                  {content.secondary_label}
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Service Cards Grid */}
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            {content.cards.map((service) => {
              const Icon = iconMap[service.icon as keyof typeof iconMap] ?? FileText;
              return (
                <div key={service.id}>
                  <Link to={service.link}>
                    <div className="group relative h-full min-h-[200px] overflow-hidden p-6 rounded-2xl border border-border/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(255,255,255,0.9)_46%,rgba(239,68,68,0.12)_100%)] ring-1 ring-primary/10 shadow-[0_14px_34px_rgba(15,23,42,0.14)] hover:-translate-y-1.5 hover:border-primary/45 hover:ring-primary/20 hover:shadow-[0_24px_50px_rgba(239,68,68,0.18)] transition-all duration-300 cursor-pointer dark:border-white/10 dark:bg-[linear-gradient(155deg,rgba(18,18,22,0.95),rgba(12,12,16,0.9)_44%,rgba(110,20,20,0.42)_100%)] dark:ring-white/5 dark:shadow-[0_14px_34px_rgba(0,0,0,0.5)] dark:hover:border-primary/55 dark:hover:ring-primary/25 dark:hover:shadow-[0_24px_50px_rgba(239,68,68,0.3)]">
                      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_82%_12%,rgba(239,68,68,0.18),transparent_46%)] opacity-90 dark:bg-[radial-gradient(circle_at_82%_12%,rgba(239,68,68,0.24),transparent_45%)] dark:opacity-80" />
                      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent dark:via-primary/75" />
                      <div className="pointer-events-none absolute -top-14 -right-8 h-32 w-32 rounded-full bg-primary/16 blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-300 dark:bg-primary/20 dark:opacity-55 dark:group-hover:opacity-90" />

                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-[linear-gradient(145deg,rgba(239,68,68,0.2),rgba(239,68,68,0.08))] border border-primary/35 flex items-center justify-center mb-4 shadow-[0_8px_18px_rgba(239,68,68,0.2)] group-hover:border-primary/55 group-hover:shadow-[0_12px_24px_rgba(239,68,68,0.3)] transition-all duration-300 dark:bg-[linear-gradient(145deg,rgba(239,68,68,0.26),rgba(239,68,68,0.1))] dark:border-primary/45 dark:shadow-[0_10px_24px_rgba(239,68,68,0.26)] dark:group-hover:border-primary/70 dark:group-hover:shadow-[0_14px_28px_rgba(239,68,68,0.34)]">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-foreground mb-2 leading-tight tracking-tight">
                          {service.title}
                        </h3>
                        <p className="text-sm text-muted-foreground/95 leading-snug">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smooth blend into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-background/65 to-background" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[70rem] h-40 rounded-full bg-background/60 blur-3xl opacity-70" />
    </section>
  );
};

export default HeroSection;
