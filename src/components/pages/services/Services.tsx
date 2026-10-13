import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";

import {
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  Search,
  X,
} from "lucide-react";

import { Link } from "react-router-dom";

import { getApiBaseUrl } from "@/components/admin/adminAuth";

import {
  type ApiServiceRecord,
  buildServiceCardFromApi,
  getFallbackServiceCards,
} from "@/components/shared/serviceCatalog";

/* ============================================================
   CONFIGURATION
============================================================ */

const SITE_ORIGIN = "https://www.drawndimension.com";

const SEO = {
  title:
    "Engineering & Digital Services | Drawn Dimension",

  description:
    "Explore Drawn Dimension's engineering and digital services, including PFD and P&ID documentation, AutoCAD drafting, SolidWorks 3D modeling, web development, graphic design, and digital solutions.",

  canonical: `${SITE_ORIGIN}/services`,

  image: `${SITE_ORIGIN}/images/logo.png`,
};

const EASE = [0.22, 1, 0.36, 1] as const;

/* ============================================================
   TYPES
============================================================ */

type ChildrenProps = {
  children: ReactNode;
  className?: string;
};

type ServiceCardData = ReturnType<
  typeof buildServiceCardFromApi
>;

/* ============================================================
   CONTAINER
============================================================ */

const Container = ({
  children,
  className = "",
}: ChildrenProps) => {
  return (
    <div
      className={`
        mx-auto
        w-full
        max-w-[1500px]
        px-5
        sm:px-8
        lg:px-12
        xl:px-16
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/* ============================================================
   HERO
============================================================ */

const ServicesHero = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="
        relative
        pb-10
        pt-32
        text-center
        sm:pb-12
        sm:pt-36
        lg:pt-40
      "
      aria-labelledby="services-heading"
    >
      <Container>
        <motion.div
          initial={
            reduceMotion
              ? false
              : {
                  opacity: 0,
                  y: 16,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.7,
            ease: EASE,
          }}
          className="mx-auto max-w-[1050px]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            OUR SERVICES
          </p>

          <h1
            id="services-heading"
            className="
              mt-5
              text-[clamp(2.8rem,5.8vw,5.3rem)]
              font-semibold
              leading-[1.08]
              tracking-[-0.05em]
              text-foreground
            "
          >
            Engineering & Digital
            <span className="block text-primary">
              Services.
            </span>
          </h1>

          <p
            className="
              mx-auto
              mt-6
              max-w-[720px]
              text-base
              leading-8
              text-muted-foreground
              sm:text-lg
            "
          >
            From engineering documentation and mechanical
            design to websites and digital solutions.
            Explore our services and find the right
            support for your project.
          </p>
        </motion.div>
      </Container>
    </section>
  );
};

/* ============================================================
   SEARCH
============================================================ */

const ServicesSearch = ({
  value,
  onChange,
  resultCount,
}: {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}) => {
  return (
    <section
      className="pb-10"
      aria-label="Search services"
    >
      <Container>
        <div className="mx-auto max-w-[650px]">
          <div className="relative">
            <Search
              className="
                pointer-events-none
                absolute
                left-4
                top-1/2
                h-4
                w-4
                -translate-y-1/2
                text-muted-foreground
              "
              aria-hidden="true"
            />

            <input
              type="search"
              value={value}
              onChange={(event) =>
                onChange(event.target.value)
              }
              placeholder="Search services..."
              aria-label="Search services"
              className="
                h-[52px]
                w-full
                rounded-xl
                border
                border-border
                bg-card
                pl-11
                pr-12
                text-sm
                text-foreground
                outline-none
                transition-[border-color,background-color]
                duration-200
                placeholder:text-muted-foreground
                focus:border-primary/40
                focus:bg-card
                dark:border-white/10
                dark:bg-white/[0.045]
                dark:focus:border-white/16
              "
            />

            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Clear search"
                className="
                  absolute
                  right-3
                  top-1/2
                  flex
                  h-8
                  w-8
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-lg
                  text-muted-foreground
                  hover:bg-muted
                  hover:text-foreground
                "
              >
                <X
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          <p
            className="mt-3 text-center text-xs text-muted-foreground"
            aria-live="polite"
          >
            {resultCount}{" "}
            {resultCount === 1 ? "service" : "services"} available
          </p>
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   COMPACT SERVICE CARD
============================================================ */

const CompactServiceCard = ({
  service,
  index,
}: {
  service: ServiceCardData;
  index: number;
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 16,
            }
      }
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.12,
      }}
      transition={{
        duration: 0.6,
        delay: Math.min(index * 0.04, 0.16),
        ease: EASE,
      }}
      className="
        group
        relative
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-xl
        border
        border-border/70
        bg-card
        p-6
        shadow-[0_8px_24px_-18px_rgba(15,23,42,0.18)]
        transition-[background-color,box-shadow,transform]
        duration-300
        ease-out
        hover:-translate-y-0.5
        hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]
        dark:border-white/[0.08]
        dark:bg-white/[0.045]
        dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_28px_-20px_rgba(0,0,0,0.7)]
        dark:hover:bg-white/[0.07]
        dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_-22px_rgba(0,0,0,0.85)]
        sm:p-7
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-black/10
          to-transparent
          dark:via-white/20
        "
        aria-hidden="true"
      />

      <div className="flex items-center justify-between gap-4">
        <span
          className="
            text-2xl
            font-semibold
            tracking-[-0.05em]
            text-primary
          "
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <span className="text-[11px] font-medium text-muted-foreground">
          Drawn Dimension
        </span>
      </div>

      <h2
        className="
          mt-6
          text-[21px]
          font-semibold
          leading-tight
          tracking-[-0.025em]
          text-foreground
        "
      >
        {service.title}
      </h2>

      <p
        className="
          mt-3
          line-clamp-3
          text-sm
          leading-7
          text-muted-foreground
        "
      >
        {service.description}
      </p>

      {service.features?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {service.features.slice(0, 3).map((feature) => (
            <span
              key={feature}
              className="
                rounded-md
                border
                border-border/70
                bg-muted/50
                px-2.5
                py-1
                text-[11px]
                text-muted-foreground
                dark:border-white/10
                dark:bg-white/[0.05]
              "
            >
              {feature}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-6">
        <Link
          to={service.link}
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-primary
            transition-all
            duration-300
            group-hover:gap-3
            hover:underline
          "
        >
          View Service

          <ArrowRight
            className="h-4 w-4"
            aria-hidden="true"
          />
        </Link>
      </div>
    </motion.article>
  );
};

/* ============================================================
   SKELETON
============================================================ */

const ServicesSkeleton = () => {
  return (
    <div
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Loading services"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="
            min-h-[260px]
            rounded-xl
            border
            border-border/70
            bg-card
            p-7
            dark:border-white/[0.08]
            dark:bg-white/[0.045]
          "
        >
          <div className="h-6 w-10 animate-pulse rounded bg-muted dark:bg-white/10" />

          <div className="mt-7 h-5 w-3/4 animate-pulse rounded bg-muted dark:bg-white/10" />

          <div className="mt-5 space-y-3">
            <div className="h-3 w-full animate-pulse rounded bg-muted dark:bg-white/10" />

            <div className="h-3 w-5/6 animate-pulse rounded bg-muted dark:bg-white/10" />

            <div className="h-3 w-2/3 animate-pulse rounded bg-muted dark:bg-white/10" />
          </div>

          <div className="mt-6 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded bg-muted dark:bg-white/10" />

            <div className="h-6 w-24 animate-pulse rounded bg-muted dark:bg-white/10" />
          </div>

          <div className="mt-7 h-4 w-24 animate-pulse rounded bg-muted dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
};

/* ============================================================
   EMPTY STATE
============================================================ */

const EmptyState = ({
  searchQuery,
  onClear,
}: {
  searchQuery: string;
  onClear: () => void;
}) => {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        No matching services found
      </h2>

      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        We couldn't find a service matching
        {searchQuery ? ` "${searchQuery}"` : " your search"}.
        Try another keyword.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="
          mt-6
          rounded-lg
          bg-primary
          px-5
          py-2.5
          text-sm
          font-semibold
          text-primary-foreground
          hover:bg-primary/90
        "
      >
        Clear Search
      </button>
    </div>
  );
};

/* ============================================================
   SEO HOOK
============================================================ */

const useServicesSEO = (
  keywords: string,
  structuredData: object,
) => {
  useEffect(() => {
    const previousTitle = document.title;

    document.title = SEO.title;

    const cleanupFunctions: Array<() => void> = [];

    const updateMeta = (
      attribute: "name" | "property",
      key: string,
      content: string,
    ) => {
      let element = document.head.querySelector(
        `meta[${attribute}="${key}"]`,
      ) as HTMLMetaElement | null;

      const created = !element;

      if (!element) {
        element = document.createElement("meta");

        element.setAttribute(attribute, key);

        document.head.appendChild(element);
      }

      const previousContent =
        element.getAttribute("content");

      element.setAttribute("content", content);

      cleanupFunctions.push(() => {
        if (created) {
          element?.remove();
        } else if (previousContent !== null) {
          element?.setAttribute(
            "content",
            previousContent,
          );
        } else {
          element?.removeAttribute("content");
        }
      });
    };

    updateMeta(
      "name",
      "description",
      SEO.description,
    );

    updateMeta(
      "name",
      "keywords",
      keywords,
    );

    updateMeta(
      "name",
      "robots",
      "index, follow, max-image-preview:large",
    );

    updateMeta(
      "property",
      "og:title",
      SEO.title,
    );

    updateMeta(
      "property",
      "og:description",
      SEO.description,
    );

    updateMeta(
      "property",
      "og:type",
      "website",
    );

    updateMeta(
      "property",
      "og:url",
      SEO.canonical,
    );

    updateMeta(
      "property",
      "og:image",
      SEO.image,
    );

    updateMeta(
      "name",
      "twitter:card",
      "summary_large_image",
    );

    updateMeta(
      "name",
      "twitter:title",
      SEO.title,
    );

    updateMeta(
      "name",
      "twitter:description",
      SEO.description,
    );

    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;

    const createdCanonical = !canonical;

    if (!canonical) {
      canonical = document.createElement("link");

      canonical.rel = "canonical";

      document.head.appendChild(canonical);
    }

    const previousCanonical =
      canonical.getAttribute("href");

    canonical.href = SEO.canonical;

    let schemaScript = document.head.querySelector(
      'script[data-dd-services-schema="true"]',
    ) as HTMLScriptElement | null;

    const createdSchema = !schemaScript;

    if (!schemaScript) {
      schemaScript = document.createElement("script");

      schemaScript.type = "application/ld+json";

      schemaScript.setAttribute(
        "data-dd-services-schema",
        "true",
      );

      document.head.appendChild(schemaScript);
    }

    const previousSchema =
      schemaScript.textContent;

    schemaScript.textContent = JSON.stringify(
      structuredData,
    ).replace(/</g, "\\u003c");

    return () => {
      document.title = previousTitle;

      cleanupFunctions.forEach((cleanup) => cleanup());

      if (createdCanonical) {
        canonical?.remove();
      } else if (previousCanonical !== null) {
        canonical?.setAttribute(
          "href",
          previousCanonical,
        );
      }

      if (createdSchema) {
        schemaScript?.remove();
      } else if (schemaScript) {
        schemaScript.textContent = previousSchema;
      }
    };
  }, [keywords, structuredData]);
};

/* ============================================================
   MAIN SERVICES PAGE
============================================================ */

const Services = () => {
  const [apiServices, setApiServices] = useState<
    ApiServiceRecord[]
  >([]);

  const [isLoaded, setIsLoaded] = useState(false);

  const [loadFailed, setLoadFailed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    const controller = new AbortController();

    const fetchServices = async () => {
      try {
        const apiBase = getApiBaseUrl();

        const response = await fetch(
          `${apiBase}/services?status=live`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch services: ${response.status}`,
          );
        }

        const data = await response.json();

        if (!mounted) return;

        setApiServices(
          Array.isArray(data) ? data : [],
        );

        setLoadFailed(false);
      } catch (error) {
        if (
          controller.signal.aborted ||
          !mounted
        ) {
          return;
        }

        console.error(
          "Failed to fetch services",
          error,
        );

        setLoadFailed(true);
      } finally {
        if (mounted && !controller.signal.aborted) {
          setIsLoaded(true);
        }
      }
    };

    fetchServices();

    return () => {
      mounted = false;

      controller.abort();
    };
  }, []);

  const rawServices = useMemo(() => {
    if (apiServices.length > 0) {
      return apiServices.map(
        buildServiceCardFromApi,
      );
    }

    return getFallbackServiceCards();
  }, [apiServices]);

  const filteredServices = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase();

    if (!query) {
      return rawServices;
    }

    return rawServices.filter((service) => {
      const titleMatch = service.title
        ?.toLowerCase()
        .includes(query);

      const descriptionMatch = service.description
        ?.toLowerCase()
        .includes(query);

      const featureMatch = service.features
        ?.some((feature) =>
          feature.toLowerCase().includes(query),
        );

      return (
        titleMatch ||
        descriptionMatch ||
        featureMatch
      );
    });
  }, [rawServices, searchQuery]);

  const seoServices = useMemo(() => {
    return rawServices.length > 0
      ? rawServices
      : getFallbackServiceCards();
  }, [rawServices]);

  const keywords = useMemo(() => {
    return [
      "engineering services",
      "AutoCAD drafting",
      "PFD P&ID drawings",
      "SolidWorks 3D modeling",
      "web development",
      "graphic design",
      "digital solutions",
      ...seoServices.map((service) => service.title),
    ].join(", ");
  }, [seoServices]);

  const structuredData = useMemo(() => {
    return {
      "@context": "https://schema.org",

      "@type": "ItemList",

      name: "Drawn Dimension Services",

      itemListElement: seoServices.map(
        (service, index) => ({
          "@type": "ListItem",

          position: index + 1,

          name: service.title,

          url: service.link.startsWith("http")
            ? service.link
            : `${SITE_ORIGIN}${service.link}`,
        }),
      ),
    };
  }, [seoServices]);

  useServicesSEO(
    keywords,
    structuredData,
  );

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />

        <main
          className="
            relative
            min-h-screen
            w-full
            overflow-x-clip
            text-foreground
          "
          aria-label="Drawn Dimension Services"
        >
          <ServicesHero />

          <ServicesSearch
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={filteredServices.length}
          />

          <section
            className="pb-16 sm:pb-20 lg:pb-24"
            aria-label="Available services"
          >
            <Container>
              {!isLoaded ? (
                <ServicesSkeleton />
              ) : filteredServices.length === 0 ? (
                <EmptyState
                  searchQuery={searchQuery}
                  onClear={() =>
                    setSearchQuery("")
                  }
                />
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredServices.map(
                    (service, index) => (
                      <CompactServiceCard
                        key={`${service.link}-${service.title}`}
                        service={service}
                        index={index}
                      />
                    ),
                  )}
                </div>
              )}
            </Container>
          </section>

          <CTASection />
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Services;