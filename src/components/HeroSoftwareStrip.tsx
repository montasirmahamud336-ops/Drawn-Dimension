"use client";

import {
  DEFAULT_HOME_PAGE_SETTINGS,
  type HomeHeroSoftwareStrip,
} from "@/components/shared/homePageSettings";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

interface HeroSoftwareStripProps {
  data?: HomeHeroSoftwareStrip;
}

const HeroSoftwareStrip = ({ data }: HeroSoftwareStripProps) => {
  const content =
    data ?? DEFAULT_HOME_PAGE_SETTINGS.sections.hero.software_strip;

  const items = content.items.filter((item) => item.image_url);

  if (!content.enabled || items.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 w-full overflow-hidden">
      <div className="relative flex w-max gap-3 hero-strip-scroll">
        {[...items, ...items].map((item, index) => {
          const imageUrl = resolveCmsMediaUrl(item.image_url);

          return (
            <div
              key={`${item.id}-${index}`}
              className="flex min-w-[120px] flex-col items-center justify-center py-4 px-2"
            >
              <div className="flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="max-h-9 w-auto object-contain transition-transform duration-300 hover:scale-110"
                />
              </div>

              <div className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {item.name}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes hero-strip-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .hero-strip-scroll {
          animation: hero-strip-scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default HeroSoftwareStrip;


/*OLD VS
import {
  DEFAULT_HOME_PAGE_SETTINGS,
  type HomeHeroSoftwareStrip,
} from "@/components/shared/homePageSettings";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

interface HeroSoftwareStripProps {
  data?: HomeHeroSoftwareStrip;
}

const HeroSoftwareStrip = ({ data }: HeroSoftwareStripProps) => {
  const content = data ?? DEFAULT_HOME_PAGE_SETTINGS.sections.hero.software_strip;
  const items = content.items.filter((item) => item.image_url);

  if (!content.enabled || items.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 w-full overflow-hidden">
      <div className="flex flex-row flex-nowrap justify-start gap-3 sm:gap-6">
        {items.map((item) => {
          const imageUrl = resolveCmsMediaUrl(item.image_url);

          return (
            <div
              key={item.id}
              tabIndex={0}
              className="group flex flex-col items-center justify-center shrink-0 py-4 px-1"
            >
              <div className="flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  className="max-h-8 sm:max-h-9 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </div>

              <div className="mt-2 text-center text-[9px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {item.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HeroSoftwareStrip;
*/