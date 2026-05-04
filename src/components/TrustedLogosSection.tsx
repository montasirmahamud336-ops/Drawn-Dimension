import { DEFAULT_HOME_PAGE_SETTINGS, type HomeTrustedLogosSection } from "@/components/shared/homePageSettings";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

interface TrustedLogosSectionProps {
  data?: HomeTrustedLogosSection;
}

const TrustedLogosSection = ({ data }: TrustedLogosSectionProps) => {
  const content = data ?? DEFAULT_HOME_PAGE_SETTINGS.sections["trusted-logos"];
  const logos = content.logos.filter((item) => item.image_url);

  if (logos.length === 0) return null;

  const speedPerSet = 7; // আগে 10 ছিল, এখন একটু দ্রুত

  return (
    <section id="trusted-logos" className="relative overflow-hidden py-12 md:py-16">
      {/* ── Header ── */}
      <div className="container-narrow relative z-10">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {content.badge}
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {content.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            {content.description}
          </p>
        </div>
      </div>

      {/* ── Marquee – স্বচ্ছ, বড় লোগো ── */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />

        <div className="overflow-hidden marquee-container group">
          <div
            className="marquee-track inline-flex items-center"
            style={{
              animationDuration: `${logos.length * speedPerSet}s`,
            }}
          >
            {[...logos, ...logos].map((logo, index) => {
              const imageUrl = resolveCmsMediaUrl(logo.image_url);
              const imageElement = (
                <img
                  src={imageUrl}
                  alt={logo.name}
                  loading={index < logos.length ? "eager" : "lazy"}
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  className="h-20 w-auto object-contain opacity-80 transition-opacity duration-300 hover:opacity-100 md:h-28"
                />
              );

              return logo.link ? (
                <a
                  key={`${logo.id}-${index}`}
                  href={logo.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-6 md:px-8 shrink-0"
                  aria-label={logo.name}
                >
                  {imageElement}
                </a>
              ) : (
                <span
                  key={`${logo.id}-${index}`}
                  className="inline-block px-6 md:px-8 shrink-0"
                >
                  {imageElement}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .marquee-track {
          animation: marqueeScroll linear infinite;
        }
        .marquee-container:hover .marquee-track {
          animation-play-state: paused;
        }
        @keyframes marqueeScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
};

export default TrustedLogosSection;
