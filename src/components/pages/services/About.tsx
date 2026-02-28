import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import LeadershipTeam from "@/components/LeadershipTeam";
import OurEmployeesSection from "@/components/OurEmployeesSection";
import { motion, useInView } from "framer-motion";
import { MouseEvent, useEffect, useMemo, useRef } from "react";
import {
  Target,
  Lightbulb,
  Users,
  Award,
  Building2,
  Globe,
  Wrench,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  Workflow,
  Clock3,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import PremiumBackground from "@/components/shared/PremiumBackground";

const ABOUT_FAQ_ITEMS = [
  {
    question: "What services does Drawn Dimension provide?",
    answer:
      "We provide web design, graphic design, PFD/P&ID documentation, AutoCAD technical drawing, SolidWorks 3D modeling, and small tools development and sales.",
  },
  {
    question: "When did Drawn Dimension start?",
    answer:
      "Our team started in 2022 with web design and expanded into engineering and product-focused services from 2024 onward.",
  },
  {
    question: "Do you deliver client-ready files and project handover?",
    answer:
      "Yes. We focus on clean execution, accurate detail, and practical handover files that teams can use immediately.",
  },
  {
    question: "Can I request a project discussion before starting?",
    answer:
      "Yes. You can contact us through the contact page or WhatsApp to discuss requirements, scope, timeline, and delivery format.",
  },
];

const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const whatsappUrl = "https://wa.me/8801775119416";
  const pageTitle =
    "About Drawn Dimension | Web Design, AutoCAD, P&ID, SolidWorks Services";
  const pageDescription =
    "Drawn Dimension is a premium design and engineering services company offering web design, graphic design, PFD/P&ID, AutoCAD technical drawing, SolidWorks 3D modeling, and clean project delivery.";
  const pageKeywords =
    "web design company, graphic design services, PFD, P&ID, AutoCAD technical drawing, SolidWorks 3D modeling, engineering design services, Bangladesh design company";
  const canonicalUrl =
    typeof window !== "undefined" ? `${window.location.origin}/about` : "/about";

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();

    const sectionId = href.replace("#", "");
    const target = document.getElementById(sectionId);

    if (!target) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = target.getBoundingClientRect().top + window.scrollY - 96;
    const lenis = (window as Window & {
      __lenis?: {
        scrollTo: (
          targetTop: number,
          options?: { duration?: number; easing?: (value: number) => number; immediate?: boolean },
        ) => void;
      };
    }).__lenis;

    if (lenis && !prefersReducedMotion) {
      lenis.scrollTo(top, {
        duration: 1.05,
        easing: (value) => 1 - Math.pow(1 - value, 3),
      });
    } else {
      window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }

    window.history.replaceState(null, "", `#${sectionId}`);
  };

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Drawn Dimension",
          url: canonicalUrl,
          sameAs: [whatsappUrl],
          description: pageDescription,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: typeof window !== "undefined" ? `${window.location.origin}/` : "/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Services",
              item: typeof window !== "undefined" ? `${window.location.origin}/services` : "/services",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "About",
              item: canonicalUrl,
            },
          ],
        },
        {
          "@type": "Service",
          serviceType: "Design and Engineering Services",
          provider: {
            "@type": "Organization",
            name: "Drawn Dimension",
          },
          areaServed: "Global",
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Professional Services",
            itemListElement: [
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Web Design" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Graphic Design" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "PFD and P&ID Drawing" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "AutoCAD Technical Drawing" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "SolidWorks 3D Modeling" } },
            ],
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: ABOUT_FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        },
      ],
    }),
    [canonicalUrl, pageDescription, whatsappUrl],
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle;

    const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      const created = !tag;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      const previousContent = tag.getAttribute("content") ?? "";
      tag.setAttribute("content", content);
      return () => {
        if (created) {
          tag?.remove();
        } else {
          tag?.setAttribute("content", previousContent);
        }
      };
    };

    const resetDescription = upsertMeta("name", "description", pageDescription);
    const resetKeywords = upsertMeta("name", "keywords", pageKeywords);
    const resetOgTitle = upsertMeta("property", "og:title", pageTitle);
    const resetOgDescription = upsertMeta("property", "og:description", pageDescription);
    const resetOgType = upsertMeta("property", "og:type", "website");
    const resetOgUrl = upsertMeta("property", "og:url", canonicalUrl);
    const resetRobots = upsertMeta("name", "robots", "index, follow, max-image-preview:large");
    const resetTwitterCard = upsertMeta("name", "twitter:card", "summary_large_image");
    const resetTwitterTitle = upsertMeta("name", "twitter:title", pageTitle);
    const resetTwitterDescription = upsertMeta("name", "twitter:description", pageDescription);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const previousCanonicalHref = canonical.getAttribute("href") ?? "";
    canonical.setAttribute("href", canonicalUrl);

    return () => {
      document.title = previousTitle;
      resetDescription();
      resetKeywords();
      resetOgTitle();
      resetOgDescription();
      resetOgType();
      resetOgUrl();
      resetRobots();
      resetTwitterCard();
      resetTwitterTitle();
      resetTwitterDescription();
      if (createdCanonical) {
        canonical?.remove();
      } else {
        canonical?.setAttribute("href", previousCanonicalHref);
      }
    };
  }, [canonicalUrl, pageDescription, pageKeywords, pageTitle]);

  const values = [
    {
      icon: Target,
      title: "Precision",
      description: "Every detail matters. We deliver accuracy that meets technical and creative standards.",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We continuously improve workflows to provide practical and future-ready solutions.",
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Your goals shape every decision. We work closely with you from brief to final delivery.",
    },
    {
      icon: Award,
      title: "Excellence",
      description: "Quality is not optional. We review every output to keep delivery clean and dependable.",
    },
  ];

  const stats = [
    { value: "2022", label: "Web Design Started" },
    { value: "2024", label: "Engineering Services Added" },
    { value: "2025", label: "3D and Tools Expansion" },
    { value: "Today", label: "Clean, Accurate Delivery Focus" },
  ];

  const achievementStats = [
    {
      icon: Clock3,
      value: "2022-Present",
      label: "Continuous Professional Delivery",
      description: "Consistent project execution across design and engineering workflows.",
    },
    {
      icon: Workflow,
      value: "5 Integrated Tracks",
      label: "Web, Creative, and Technical Services",
      description: "One coordinated team for digital design and engineering output.",
    },
    {
      icon: ShieldCheck,
      value: "Quality-First",
      label: "Clean and Accurate Submissions",
      description: "Review-driven delivery standard to reduce revision and confusion.",
    },
    {
      icon: TrendingUp,
      value: "2025 Expansion",
      label: "3D and Product Capability",
      description: "SolidWorks and small tools development added for practical results.",
    },
  ];

  const milestones = [
    {
      year: "2022",
      title: "Started with Web Design",
      description: "We began by delivering modern, user-focused web design for growing businesses.",
    },
    {
      year: "2024",
      title: "Expanded Engineering and Design Services",
      description: "We added graphic design, PFD, P&ID, and AutoCAD technical drawing services.",
    },
    {
      year: "2025",
      title: "Launched 3D SolidWorks Workflows",
      description: "We introduced 3D SolidWorks capability for precise design visualization and development.",
    },
    {
      year: "2025",
      title: "Started Building and Selling Small Tools",
      description: "We expanded from design services into practical small-tool development and sales.",
    },
  ];

  const serviceTracks = [
    {
      icon: Globe,
      title: "Web Design",
      since: "Since 2022",
      description: "Clean, responsive websites built around clear communication and conversion goals.",
      href: "/services/web-design",
    },
    {
      icon: Lightbulb,
      title: "Graphic Design",
      since: "Since 2024",
      description: "Brand-focused visuals and design assets that keep your project presentation consistent.",
      href: "/services/graphic-design",
    },
    {
      icon: Wrench,
      title: "PFD, P&ID, AutoCAD Drawing",
      since: "Since 2024",
      description: "Accurate technical drawings and documentation prepared for practical project execution.",
      href: "/services/pfd-pid",
    },
    {
      icon: Building2,
      title: "3D SolidWorks",
      since: "Since 2025",
      description: "Detailed 3D models for design validation, technical clarity, and production planning.",
      href: "/services/solidworks",
    },
    {
      icon: Award,
      title: "Small Tools Development and Sales",
      since: "Since 2025",
      description: "Useful small tools designed, built, and supplied with a focus on reliability and value.",
      href: "/products",
    },
  ];

  const deliveryPillars = [
    {
      title: "Clean Execution",
      description: "Organized files, clear structure, and polished presentation in every project handover.",
    },
    {
      title: "Accurate Detail",
      description: "Technical precision and careful review so drawings, models, and designs are dependable.",
    },
    {
      title: "Client-Ready Delivery",
      description: "Outputs are submitted in a practical format that your team can use immediately.",
    },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="relative about-premium" aria-label="About Drawn Dimension - Premium Design and Engineering Services">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <PageHero
            title="About Drawn Dimension"
            subtitle="Our Story"
            description="Started in 2022 with web design, we now deliver premium engineering and creative services including graphic design, PFD/P&ID, AutoCAD technical drawing, SolidWorks 3D modeling, and clean project submission."
            actions={
              <>
                <Link
                  to="/contact"
                  className="btn-primary inline-flex items-center justify-center gap-2 min-w-[200px]"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-[48px] min-w-[200px] px-8 rounded-xl border border-emerald-600/55 dark:border-emerald-500/45 bg-emerald-500/12 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/20 dark:hover:bg-emerald-500/18 hover:border-emerald-700/70 dark:hover:border-emerald-400/60 transition-all duration-300"
                >
                  WhatsApp
                  <MessageCircle className="w-4 h-4" />
                </a>
              </>
            }
          />

          <section className="relative overflow-hidden pb-8 md:pb-9" aria-label="About page navigation">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_24%,rgba(239,68,68,0.12),transparent_38%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <nav className="glass-panel relative overflow-hidden border-primary/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01)_45%,rgba(239,68,68,0.09)_100%)] p-4 md:p-5 flex flex-wrap items-center justify-center gap-2 md:gap-3 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.65)]">
                <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
                {[
                  { label: "Who We Are", href: "#who-we-are" },
                  { label: "Milestones", href: "#milestones" },
                  { label: "Achievements", href: "#achievements" },
                  { label: "What We Do", href: "#what-we-do" },
                  { label: "Mission & Vision", href: "#mission-vision" },
                  { label: "Why Choose Us", href: "#why-choose-us" },
                  { label: "FAQ", href: "#about-faq" },
                  { label: "Contact", href: "#contact-cta" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(event) => scrollToSection(event, item.href)}
                    className="inline-flex items-center rounded-full border border-slate-300/85 dark:border-border/55 bg-background/45 px-4 py-1.5 text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/45 hover:bg-primary/12 hover:shadow-[0_8px_24px_-16px_rgba(239,68,68,0.55)] transition-all duration-300"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </section>

          {/* Journey Stats */}
          <section
            id="who-we-are"
            className="relative pt-8 pb-10 md:pt-10 md:pb-12 lg:pt-12 lg:pb-14 scroll-mt-24"
            aria-labelledby="who-we-are-heading"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_22%,rgba(239,68,68,0.11),transparent_36%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-center mb-9 md:mb-10"
              >
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary font-semibold text-xs uppercase tracking-[0.2em]">
                  Who We Are
                </span>
                <h2 id="who-we-are-heading" className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mt-3 text-foreground">
                  Professional Design and Engineering Team
                </h2>
                <p className="text-muted-foreground max-w-3xl mx-auto mt-4 leading-relaxed">
                  Drawn Dimension delivers modern web design and engineering solutions with a premium quality standard.
                  We focus on clean execution, accurate technical detail, and client-ready project handover.
                </p>
                <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="glass-card relative overflow-hidden border-slate-300/80 dark:border-border/55 p-6 text-center bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.1)_100%)] hover:border-primary/45 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.75)]"
                  >
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                    <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border/70 to-transparent" />
          </section>

          {/* Timeline */}
          <section
            id="milestones"
            className="relative py-12 md:py-14 lg:py-16 scroll-mt-24"
            aria-labelledby="company-milestones-heading"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(239,68,68,0.11),transparent_35%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-9 md:mb-10"
              >
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary font-semibold text-xs uppercase tracking-[0.2em]">
                  Our Journey
                </span>
                <h2 id="company-milestones-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.06] mt-3 text-foreground">
                  Company Milestones
                </h2>
                <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
              </motion.div>

              <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-gradient-to-b from-transparent via-primary/45 to-transparent hidden md:block" />

                {milestones.map((milestone, index) => (
                  <motion.div
                    key={`${milestone.year}-${milestone.title}`}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative flex items-center mb-6 md:mb-8 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  >
                    <div className={`w-full md:w-1/2 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                      <div className="glass-card relative overflow-hidden p-6 border-slate-300/80 dark:border-border/55 bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_46%,rgba(239,68,68,0.1)_100%)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_18px_42px_-28px_rgba(0,0,0,0.65)]">
                        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                        <span className="text-primary font-bold text-xl">{milestone.year}</span>
                        <h3 className="text-lg font-semibold text-foreground mt-2">{milestone.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{milestone.description}</p>
                      </div>
                    </div>
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full ring-4 ring-primary/20 shadow-[0_0_14px_rgba(239,68,68,0.65)] hidden md:block" />
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border/70 to-transparent" />
          </section>

          {/* Achievements */}
          <section
            id="achievements"
            className="relative py-12 md:py-14 lg:py-16 scroll-mt-24"
            aria-labelledby="achievements-heading"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(239,68,68,0.12),transparent_34%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_84%,rgba(239,68,68,0.08),transparent_34%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-center mb-9 md:mb-10"
              >
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary font-semibold text-xs uppercase tracking-[0.2em]">
                  Performance Snapshot
                </span>
                <h2 id="achievements-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.06] mt-3 text-foreground">
                  Trusted Growth, Premium Standards
                </h2>
                <p className="text-muted-foreground max-w-3xl mx-auto mt-4 leading-relaxed">
                  Our progress is built on consistent delivery quality, practical engineering execution, and strong design communication.
                </p>
                <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {achievementStats.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                    className="glass-card relative overflow-hidden p-5 md:p-6 border-slate-300/80 dark:border-border/55 bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_44%,rgba(239,68,68,0.1)_100%)] hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.7)]"
                  >
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-primary font-semibold text-sm uppercase tracking-wide">{item.value}</p>
                    <h3 className="text-base font-semibold text-foreground mt-2">{item.label}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border/70 to-transparent" />
          </section>

          {/* Service Tracks */}
          <section
            id="what-we-do"
            className="relative py-12 md:py-14 lg:py-16 section-no-blend overflow-hidden scroll-mt-24"
            aria-labelledby="what-we-do-heading"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(239,68,68,0.12),transparent_35%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_82%,rgba(239,68,68,0.09),transparent_35%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-9 md:mb-10"
              >
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary font-semibold text-xs uppercase tracking-[0.2em]">
                  What We Do
                </span>
                <h2 id="what-we-do-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.06] mt-3 text-foreground">
                  Web, Graphic, and Engineering Services
                </h2>
                <p className="text-muted-foreground max-w-3xl mx-auto mt-4 leading-relaxed">
                  We provide end-to-end professional support across web design, graphic design, PFD/P&ID, AutoCAD technical drawing,
                  SolidWorks 3D modeling, and practical product development.
                </p>
                <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {serviceTracks.map((service, index) => (
                  <motion.div
                    key={service.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="glass-card relative overflow-hidden border-slate-300/80 dark:border-border/55 p-6 group bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.11)_100%)] hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_46px_-28px_rgba(0,0,0,0.72)]"
                  >
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <service.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary/90">{service.since}</span>
                    <h3 className="font-semibold text-foreground mt-2 mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                    <Link
                      to={service.href}
                      className="inline-flex items-center gap-2 text-primary text-sm font-semibold mt-4 hover:text-primary/85 transition-colors"
                    >
                      Learn More
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border/70 to-transparent" />
          </section>

          {/* Mission & Vision */}
          <section
            id="mission-vision"
            className="relative py-12 md:py-14 lg:py-16 scroll-mt-24"
            ref={ref}
            aria-labelledby="mission-vision-heading"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(239,68,68,0.12),transparent_35%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <div className="grid lg:grid-cols-2 gap-10 xl:gap-12 items-start">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8 }}
                >
                  <h2 id="mission-vision-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08] mb-5 text-foreground">
                    Focused On
                    <span className="text-gradient-primary block leading-[1.12]">Clean, Accurate Delivery</span>
                  </h2>
                  <div className="mb-5 h-px w-24 bg-gradient-to-r from-primary/80 to-transparent" />
                  <p className="text-muted-foreground/95 text-base md:text-lg leading-relaxed mb-6 max-w-[60ch]">
                    We started with web design and expanded into technical and engineering services based on real client needs.
                    Each year, we added capabilities so clients can get complete project support from one team.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-8 max-w-[58ch]">
                    From concept design to final technical output, our goal stays simple: submit work that is clear,
                    accurate, and ready for practical use.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
                    {[
                      { icon: Building2, label: "Technical Clarity" },
                      { icon: Globe, label: "Digital Design Strength" },
                      { icon: Wrench, label: "Execution Discipline" },
                      { icon: Award, label: "Quality Assurance" },
                    ].map((item) => (
                      <div key={item.label} className="relative overflow-hidden flex items-center gap-3 rounded-xl border border-slate-300/80 dark:border-border/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_62%,rgba(239,68,68,0.08)_100%)] px-3 py-2 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.6)]">
                        <div className="w-9 h-9 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="glass-card relative overflow-hidden p-7 lg:p-8 border-slate-300/80 dark:border-border/55 bg-[linear-gradient(155deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.1)_100%)] shadow-[0_22px_50px_-26px_rgba(0,0,0,0.66)]"
                >
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                  <h3 className="text-2xl font-bold mb-4 text-foreground">Our Mission</h3>
                  <p className="text-muted-foreground/95 mb-7">
                    To submit every client project with clean execution, accurate technical detail, and dependable quality
                    from concept to final delivery.
                  </p>
                  <h3 className="text-2xl font-bold mb-4 text-foreground">Our Vision</h3>
                  <p className="text-muted-foreground/95 mb-8">
                    To be a trusted leader in integrated engineering and creative services, known for precision,
                    reliability, and long-term client success.
                  </p>

                  <div className="space-y-4 pt-2 border-t border-slate-300/80 dark:border-border/55">
                    {deliveryPillars.map((pillar) => (
                      <div key={pillar.title} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-semibold text-foreground">{pillar.title}</p>
                          <p className="text-sm text-muted-foreground/95 leading-relaxed">{pillar.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
            <div className="mx-auto mt-10 h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border/70 to-transparent" />
          </section>

          {/* Core Values */}
          <section
            id="why-choose-us"
            className="relative py-12 md:py-14 lg:py-16 scroll-mt-24"
            aria-labelledby="why-choose-us-heading"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(239,68,68,0.15),transparent_35%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_82%,rgba(239,68,68,0.10),transparent_35%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-9 md:mb-10"
              >
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary font-semibold text-xs uppercase tracking-[0.2em]">
                  What Drives Us
                </span>
                <h2 id="why-choose-us-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.06] mt-3 text-foreground">
                  Why Choose Drawn Dimension
                </h2>
                <p className="text-muted-foreground max-w-3xl mx-auto mt-4 leading-relaxed">
                  We combine technical precision, modern design, and reliable communication to deliver work that meets premium business expectations.
                </p>
                <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((value, index) => (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group relative overflow-hidden rounded-3xl border border-slate-300/80 dark:border-border/55 bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.12)_110%)] p-6 md:p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/55 hover:shadow-[0_24px_56px_-34px_rgba(0,0,0,0.75)]"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(239,68,68,0.16),transparent_48%)] opacity-85 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
                    <div className="relative z-10">
                      <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85 mb-4">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Core Value {index + 1}
                      </span>
                      <div className="w-12 h-12 rounded-xl border border-primary/35 bg-primary/10 flex items-center justify-center mb-4 shadow-[0_10px_22px_rgba(239,68,68,0.22)] transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/50 group-hover:shadow-[0_14px_30px_rgba(239,68,68,0.32)]">
                        <value.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 text-2xl tracking-tight">{value.title}</h3>
                      <p className="text-sm text-muted-foreground/95 leading-relaxed">{value.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border/70 to-transparent" />
          </section>

          {/* FAQ */}
          <section
            id="about-faq"
            className="relative py-12 md:py-14 lg:py-16 scroll-mt-24"
            aria-labelledby="about-faq-heading"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_22%,rgba(239,68,68,0.12),transparent_36%)] pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-center mb-9 md:mb-10"
              >
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary font-semibold text-xs uppercase tracking-[0.2em]">
                  FAQ
                </span>
                <h2 id="about-faq-heading" className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mt-3 text-foreground">
                  Frequently Asked Questions
                </h2>
                <p className="text-muted-foreground max-w-3xl mx-auto mt-4 leading-relaxed">
                  Common client questions about our web design, graphic design, and engineering project delivery process.
                </p>
                <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
              </motion.div>

              <div className="grid md:grid-cols-2 gap-5">
                {ABOUT_FAQ_ITEMS.map((item, index) => (
                  <motion.article
                    key={item.question}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.06 }}
                    className="glass-card relative overflow-hidden p-5 md:p-6 border-slate-300/80 dark:border-border/55 bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_48%,rgba(239,68,68,0.09)_100%)] hover:border-primary/45 transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.72)]"
                  >
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                    <h3 className="text-lg font-semibold text-foreground flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
                      <span>{item.question}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.answer}</p>
                  </motion.article>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 h-px w-full max-w-6xl bg-gradient-to-r from-transparent via-border/70 to-transparent" />
          </section>

          {/* Leadership Team */}
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(239,68,68,0.1),transparent_36%)] pointer-events-none" />
            <LeadershipTeam compact />
          </div>

          {/* Our Employees */}
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(239,68,68,0.1),transparent_36%)] pointer-events-none" />
            <OurEmployeesSection compact />
          </div>

          {/* Final CTA */}
          <section
            id="contact-cta"
            className="py-12 md:py-14 lg:py-16 scroll-mt-24"
            aria-labelledby="contact-cta-heading"
          >
            <div className="container-narrow">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="glass-card relative overflow-hidden p-8 md:p-10 border-primary/30 bg-[linear-gradient(155deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01)_44%,rgba(239,68,68,0.13)_100%)] shadow-[0_24px_60px_-26px_rgba(0,0,0,0.72)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(239,68,68,0.15),transparent_35%)] pointer-events-none" />
                <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                    Start Your Next Project
                  </span>
                  <h2 id="contact-cta-heading" className="text-3xl md:text-4xl font-bold mt-4 text-foreground max-w-3xl leading-tight">
                    Need a clean and accurate project submission?
                  </h2>
                  <p className="text-muted-foreground/95 mt-4 max-w-2xl text-base leading-relaxed">
                    Tell us your requirement. We will plan the workflow and deliver your project with clarity,
                    technical accuracy, and a professional final handover.
                  </p>

                  <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <Link to="/contact" className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[220px]">
                      Start Your Project
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-[48px] w-full sm:w-auto sm:min-w-[220px] px-8 rounded-xl border border-emerald-600/50 dark:border-emerald-500/40 bg-emerald-500/16 dark:bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/24 dark:hover:bg-emerald-500/20 hover:border-emerald-700/70 dark:hover:border-emerald-400/60 shadow-[0_8px_20px_rgba(16,185,129,0.14)] transition-all duration-300"
                    >
                      Message Us on WhatsApp
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default About;
