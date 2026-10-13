import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";

import {
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  Quote,
  Compass,
  Box,
  Code2,
  ShieldCheck,
  Globe,
  PenTool,
  Boxes,
  Cpu,
  FileSearch,
  Workflow,
  Layers,
  CheckCircle2,
  Target,
  Sparkles,
  FileText,
  Sliders,
  Users,
} from "lucide-react";

import { Link } from "react-router-dom";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ============================================================
   CONFIGURATION
============================================================ */

const SITE_ORIGIN = "https://www.drawndimension.com";

const WHATSAPP_NUMBER = "8801775119416";

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

const PROJECT_URL = "/start-project";

const SERVICES_URL = "/services";

/* ============================================================
   SEO CONFIGURATION
============================================================ */

const SEO = {
  title:
    "About Drawn Dimension | Engineering & Digital Design Studio",

  description:
    "Drawn Dimension is a multidisciplinary engineering and digital design studio providing AutoCAD drafting, PFD and P&ID documentation, SolidWorks 3D modeling, web development, graphic design, and digital solutions.",

  keywords:
    "Drawn Dimension, engineering design, AutoCAD drafting, PFD, P&ID, SolidWorks, mechanical CAD, web development, graphic design, Bangladesh",

  canonical: `${SITE_ORIGIN}/about`,
};

/* ============================================================
   COMPANY INFORMATION
============================================================ */

const COMPANY = {
  name: "Drawn Dimension",

  founded: "2022",

  description:
    "A multidisciplinary engineering and digital design studio connecting technical accuracy with thoughtful design.",
};

/* ============================================================
   SERVICE DATA
============================================================ */

const SERVICES = [
  {
    number: "01",

    category: "PROCESS ENGINEERING",

    title: "PFD & P&ID Documentation",

    description:
      "Clear Process Flow Diagrams and Piping & Instrumentation Diagrams for industrial systems, process equipment, and technical documentation.",

    scope:
      "Process Flow Diagrams · P&ID · Instrument Tagging · DWG / PDF",

    href: "/services/pfd-pid",
  },

  {
    number: "02",

    category: "TECHNICAL DRAFTING",

    title: "AutoCAD Technical Drafting",

    description:
      "Organized 2D technical drawings for mechanical, industrial, architectural, and general engineering applications.",

    scope:
      "2D Drawings · Mechanical Layouts · Equipment Plans · DWG / DXF",

    href: "/services/pfd-pid",
  },

  {
    number: "03",

    category: "MECHANICAL DESIGN",

    title: "SolidWorks 3D Modeling",

    description:
      "Mechanical part models, parametric assemblies, and technical 3D visualization developed using SolidWorks.",

    scope:
      "Part Modeling · Assemblies · Parametric Design · STEP Files",

    href: "/services/solidworks",
  },

  {
    number: "04",

    category: "DIGITAL DEVELOPMENT",

    title: "Web Design & Development",

    description:
      "Responsive websites and web applications designed around usability, performance, and practical functionality.",

    scope:
      "Business Websites · Responsive Design · Web Applications",

    href: "/services/web-design",
  },

  {
    number: "05",

    category: "VISUAL COMMUNICATION",

    title: "Graphic Design & Branding",

    description:
      "Visual identities, marketing materials, and digital graphics that help businesses communicate clearly.",

    scope:
      "Brand Identity · Marketing Graphics · Digital Assets · Print",

    href: "/services/graphic-design",
  },

  {
    number: "06",

    category: "DIGITAL PRODUCTS",

    title: "Tools & Software Products",

    description:
      "Practical digital utilities and software tools developed to simplify workflows and everyday tasks.",

    scope:
      "Productivity Tools · Document Utilities · Web Software",

    href: "/products",
  },
];

/* ============================================================
   COMPANY TIMELINE
============================================================ */

const TIMELINE = [
  {
    year: "2022",

    label: "THE BEGINNING",

    title: "Starting with Digital Design",

    description:
      "Drawn Dimension began as a web design and development studio, focusing on responsive websites, thoughtful interfaces, and practical digital experiences.",

    areas: [
      "Web Design",
      "Frontend Development",
      "Responsive Interfaces",
    ],

    icon: Globe,
  },

  {
    year: "2024",

    label: "ENGINEERING EXPANSION",

    title: "Expanding into Technical Drafting",

    description:
      "We expanded into engineering documentation, introducing AutoCAD technical drawings, Process Flow Diagrams, and Piping & Instrumentation Diagrams.",

    areas: [
      "AutoCAD",
      "PFD",
      "P&ID",
    ],

    icon: PenTool,
  },

  {
    year: "2025",

    label: "MECHANICAL DESIGN",

    title: "Introducing SolidWorks 3D",

    description:
      "Our capabilities expanded into mechanical 3D modeling, including individual components, parametric models, and assembly development.",

    areas: [
      "SolidWorks",
      "3D Modeling",
      "Mechanical Assemblies",
    ],

    icon: Boxes,
  },

  {
    year: "2025 — PRESENT",

    label: "CONTINUED DEVELOPMENT",

    title: "Building Tools & Digital Products",

    description:
      "Alongside client services, we began developing digital productivity tools while continuing to refine our engineering and digital capabilities.",

    areas: [
      "Digital Products",
      "Productivity Tools",
      "Software Development",
    ],

    icon: Cpu,
  },
];

/* ============================================================
   PROJECT PROCESS
============================================================ */

const PROCESS = [
  {
    number: "01",

    label: "PROJECT DISCOVERY",

    title: "Understand",

    description:
      "We review your requirements, reference materials, technical specifications, and expected outcomes before beginning work.",

    icon: FileSearch,
  },

  {
    number: "02",

    label: "SCOPE & DIRECTION",

    title: "Plan",

    description:
      "We establish the project scope, expected deliverables, workflow, and any details that need clarification.",

    icon: Workflow,
  },

  {
    number: "03",

    label: "DESIGN & EXECUTION",

    title: "Develop",

    description:
      "We prepare drawings, models, designs, or software while reviewing the work against the agreed requirements.",

    icon: Layers,
  },

  {
    number: "04",

    label: "REVIEW & HANDOVER",

    title: "Deliver",

    description:
      "We organize the completed work, address agreed revisions, and provide the final project files.",

    icon: CheckCircle2,
  },
];

/* ============================================================
   WORKING PRINCIPLES
============================================================ */

const PRINCIPLES = [
  {
    number: "01",

    title: "Clarity",

    description:
      "Technical information should be organized, readable, and easy to understand.",

    icon: FileText,
  },

  {
    number: "02",

    title: "Precision",

    description:
      "Dimensions, specifications, visual details, and project requirements deserve careful attention.",

    icon: Compass,
  },

  {
    number: "03",

    title: "Consistency",

    description:
      "A consistent approach helps maintain quality throughout development, review, and delivery.",

    icon: Sliders,
  },

  {
    number: "04",

    title: "Collaboration",

    description:
      "Clear communication and an understanding of client needs guide our working process.",

    icon: Users,
  },
];

/* ============================================================
   FREQUENTLY ASKED QUESTIONS
============================================================ */

const FAQ_ITEMS = [
  {
    question: "What services does Drawn Dimension provide?",

    answer:
      "We provide engineering drafting, PFD and P&ID documentation, AutoCAD technical drawings, SolidWorks 3D modeling, web design and development, graphic design, and digital software solutions.",
  },

  {
    question: "When was Drawn Dimension established?",

    answer:
      "Drawn Dimension started in 2022 with web design and development. We expanded into engineering drafting in 2024 and SolidWorks 3D modeling in 2025.",
  },

  {
    question: "Do you work with international clients?",

    answer:
      "Yes. Drawn Dimension is based in Bangladesh and works remotely with clients from different locations.",
  },

  {
    question: "What file formats can you deliver?",

    answer:
      "Depending on the project, deliverables may include DWG, DXF, PDF, STEP, IGES, SolidWorks native files, graphic assets, or website source code. Available formats are discussed before the project begins.",
  },

  {
    question: "Can I discuss a project before placing an order?",

    answer:
      "Yes. You can share your requirements, sketches, reference files, or project brief through our project form or WhatsApp. We can then discuss the project scope and next steps.",
  },

  {
    question: "How does the revision process work?",

    answer:
      "Revision requirements depend on the agreed project scope. We review feedback, clarify requested changes, and complete revisions according to the project agreement.",
  },

  {
    question: "Can you handle both engineering and digital projects?",

    answer:
      "Yes. Our studio works across engineering documentation, mechanical modeling, website development, graphic design, and digital tools.",
  },
];

/* ============================================================
   ANIMATION SETTINGS
============================================================ */

const EASE = [0.22, 1, 0.36, 1] as const;

const MOTION_DURATION = 0.72;

const REVEAL_DISTANCE = 18;

/* ============================================================
   TYPES
============================================================ */

type ChildrenProps = {
  children: ReactNode;
  className?: string;
};

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

type ButtonProps = {
  to: string;
  children: ReactNode;
  className?: string;
};

/* ============================================================
   FULL WIDTH CONTAINER
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
        max-w-none
        px-5
        sm:px-8
        md:px-10
        lg:px-14
        xl:px-20
        2xl:px-24
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/* ============================================================
   SUBTLE REVEAL ANIMATION
============================================================ */

const Reveal = ({
  children,
  className = "",
  delay = 0,
}: RevealProps) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: REVEAL_DISTANCE,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.12,
        margin: "0px 0px -32px 0px",
      }}
      transition={{
        duration: MOTION_DURATION,
        delay,
        ease: EASE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ============================================================
   SECTION LABEL
============================================================ */

const SectionLabel = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary backdrop-blur-sm dark:bg-primary/15">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
};

/* ============================================================
   PRIMARY BUTTON
============================================================ */

const PrimaryButton = ({
  to,
  children,
  className = "",
}: ButtonProps) => {
  return (
    <Link
      to={to}
      className={`group btn-primary gap-2.5 ${className}`}
    >
      <span>{children}</span>

      <ArrowUpRight
        className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
};

/* ============================================================
   SECONDARY BUTTON
============================================================ */

const SecondaryButton = ({
  to,
  children,
  className = "",
}: ButtonProps) => {
  return (
    <Link
      to={to}
      className={`group btn-outline gap-2.5 ${className}`}
    >
      <span>{children}</span>

      <ArrowRight
        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
};

/* ============================================================
   SCROLL PROGRESS
============================================================ */

const ScrollProgress = () => {
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  if (reduceMotion) {
    return null;
  }

  return (
    <motion.div
      style={{
        scaleX,
        transformOrigin: "0% 50%",
      }}
      className="
        pointer-events-none
        fixed
        inset-x-0
        top-0
        z-[100]
        h-[2px]
        bg-primary
      "
      aria-hidden="true"
    />
  );
};

/* ============================================================
   HERO SECTION
============================================================ */

const HeroSection = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="
        relative
        overflow-hidden
        pb-14
        pt-32
        sm:pb-16
        sm:pt-36
        lg:pb-20
        lg:pt-40
      "
      aria-labelledby="about-hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[-10rem] top-20 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden="true" />

      <Container>
        <div className="w-full">
          <motion.div
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 12,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              ease: EASE,
            }}
          >
            <SectionLabel>
              ABOUT DRAWN DIMENSION
            </SectionLabel>
          </motion.div>

          <motion.h1
            id="about-hero-heading"
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 22,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.82,
              delay: 0.08,
              ease: EASE,
            }}
            className="
              max-w-[1450px]
              text-[clamp(3rem,7vw,6.25rem)]
              font-semibold
              leading-[1.04]
              tracking-[-0.06em]
              text-foreground
            "
          >
            Engineering Precision.

            <span className="block text-primary">
              Digital Creativity.
            </span>
          </motion.h1>

          <motion.p
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 18,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.75,
              delay: 0.18,
              ease: EASE,
            }}
            className="
              mt-7
              max-w-[760px]
              text-base
              leading-8
              text-muted-foreground
              sm:mt-8
              sm:text-lg
              sm:leading-9
            "
          >
            We connect engineering drafting,
            mechanical design, and digital development
            to create practical solutions for businesses
            and project teams.
          </motion.p>

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
              duration: 0.75,
              delay: 0.28,
              ease: EASE,
            }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <PrimaryButton to={PROJECT_URL}>
              Start a Project
            </PrimaryButton>

            <SecondaryButton to={SERVICES_URL}>
              Explore Services
            </SecondaryButton>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   INTRODUCTION SECTION
============================================================ */

const IntroductionSection = () => {
  return (
    <section
      className="border-t border-border/60 py-16 sm:py-20 lg:py-24 dark:border-white/[0.06]"
      aria-labelledby="introduction-heading"
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <div>
              <SectionLabel>
                WHO WE ARE
              </SectionLabel>

              <h2
                id="introduction-heading"
                className="
                  max-w-[580px]
                  text-[32px]
                  font-semibold
                  leading-[1.14]
                  tracking-[-0.04em]
                  text-foreground
                  sm:text-[40px]
                  xl:text-[48px]
                "
              >
                A multidisciplinary studio
                built around practical solutions.
              </h2>

              <div className="mt-8 grid grid-cols-2 gap-3 max-w-[480px]">
                <div className="flex items-center gap-2.5 rounded-xl border-2 border-border/70 bg-card px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#111113]">
                  <Compass className="h-4 w-4 text-primary shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-foreground">CAD & Drafting</span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border-2 border-border/70 bg-card px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#111113]">
                  <Box className="h-4 w-4 text-primary shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-foreground">3D SolidWorks</span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border-2 border-border/70 bg-card px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#111113]">
                  <Code2 className="h-4 w-4 text-primary shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-foreground">Web Platforms</span>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border-2 border-border/70 bg-card px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#111113]">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-foreground">Exact Quality</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="max-w-[900px]">
              <p className="text-lg leading-8 text-foreground/90 sm:text-xl sm:leading-9">
                Drawn Dimension brings together engineering
                and digital design to support projects
                that require technical understanding,
                thoughtful planning, and careful execution.
              </p>

              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Founded in 2022, our studio began with
                web design and development. Over time,
                we expanded into AutoCAD drafting,
                PFD and P&ID documentation,
                SolidWorks 3D modeling,
                graphic design, and digital products.
              </p>

              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Although our work spans different
                disciplines, our approach remains
                consistent. We focus on understanding
                requirements, organizing information
                clearly, and creating work that serves
                its intended purpose.
              </p>

              <div className="mt-8 rounded-2xl border-2 border-border/70 bg-card p-6 shadow-sm dark:border-white/10 dark:bg-[#111113] sm:p-7">
                <div className="mb-3 inline-flex text-primary">
                  <Quote className="h-6 w-6 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" aria-hidden="true" />
                </div>

                <blockquote className="text-base font-medium leading-8 text-foreground sm:text-lg">
                  "Good design is not only about appearance.
                  It is about clarity, accuracy, and making
                  things work as intended."
                </blockquote>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   PREMIUM SERVICE CARD
============================================================ */

type ServiceItemProps = {
  service: (typeof SERVICES)[number];
  index: number;
};

const ServiceItem = ({
  service,
  index,
}: ServiceItemProps) => {
  return (
    <Reveal
      delay={Math.min(index * 0.04, 0.16)}
      className="h-full"
    >
      <article
        className="
          group
          relative
          flex
          h-full
          flex-col
          overflow-hidden
          rounded-2xl
          border-2
          border-border/70
          bg-card
          p-6
          shadow-sm
          transition-all
          duration-300
          ease-out
          hover:-translate-y-1
          hover:border-primary/50
          dark:border-white/10
          dark:bg-[#111113]
          dark:hover:border-primary/50
          sm:p-7
          lg:p-8
        "
      >
        <div className="flex items-start justify-between gap-4">
          <span
            className="
              font-sans
              text-[30px]
              font-semibold
              leading-none
              tracking-[-0.055em]
              text-primary
              sm:text-[34px]
            "
          >
            {service.number}
          </span>

          <span
            className="
              max-w-[70%]
              rounded-md
              border
              border-border/70
              bg-muted/50
              px-2.5
              py-1
              text-right
              text-[10px]
              font-semibold
              uppercase
              leading-4
              tracking-[0.1em]
              text-muted-foreground
              dark:border-white/10
              dark:bg-white/[0.05]
              sm:text-[11px]
            "
          >
            {service.category}
          </span>
        </div>

        <h3
          className="
            mt-6
            text-[21px]
            font-semibold
            leading-[1.3]
            tracking-[-0.025em]
            text-foreground
            transition-colors
            duration-200
            group-hover:text-primary
            sm:text-[23px]
          "
        >
          {service.title}
        </h3>

        <p
          className="
            mt-3
            text-sm
            leading-7
            text-muted-foreground
            sm:text-[15px]
          "
        >
          {service.description}
        </p>

        <div className="mt-6 border-t border-border/70 pt-5 dark:border-white/[0.08]">
          <p className="mb-2 text-xs font-semibold text-foreground">
            Typical deliverables
          </p>

          <p className="text-xs leading-6 text-muted-foreground sm:text-[13px]">
            {service.scope}
          </p>
        </div>

        <div className="mt-auto pt-7">
          <Link
            to={service.href}
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
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary
            "
          >
            Learn More

            <ArrowRight
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Link>
        </div>
      </article>
    </Reveal>
  );
};

/* ============================================================
   SERVICES SECTION
============================================================ */

const ServicesSection = () => {
  return (
    <section
      id="expertise"
      className="
        scroll-mt-24
        border-y
        border-border/60
        bg-muted/15
        py-16
        dark:border-white/[0.06]
        dark:bg-white/[0.015]
        sm:py-20
        lg:py-24
      "
      aria-labelledby="services-heading"
    >
      <Container>
        <Reveal>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <SectionLabel>
                OUR EXPERTISE
              </SectionLabel>

              <h2
                id="services-heading"
                className="
                  text-[34px]
                  font-semibold
                  leading-tight
                  tracking-[-0.04em]
                  text-foreground
                  sm:text-[42px]
                  xl:text-[50px]
                "
              >
                What we do.
              </h2>

              <p className="mt-4 max-w-[780px] text-base leading-8 text-muted-foreground sm:text-lg">
                From engineering drawings and mechanical
                modeling to websites and digital products,
                our services address practical project needs.
              </p>
            </div>

            <Link
              to={SERVICES_URL}
              className="
                group
                inline-flex
                shrink-0
                items-center
                gap-2
                text-sm
                font-semibold
                text-primary
                transition-all
                hover:gap-2.5
              "
            >
              Explore All Services

              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </Reveal>

        <div
          className="
            mt-10
            grid
            grid-cols-1
            gap-5
            md:grid-cols-2
            xl:grid-cols-3
            xl:gap-6
          "
        >
          {SERVICES.map((service, index) => (
            <ServiceItem
              key={service.number}
              service={service}
              index={index}
            />
          ))}
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   TIMELINE SECTION
============================================================ */

const TimelineSection = () => {
  return (
    <section
      id="journey"
      className="scroll-mt-24 py-16 sm:py-20 lg:py-24"
      aria-labelledby="timeline-heading"
    >
      <Container>
        <Reveal>
          <SectionLabel>
            OUR JOURNEY
          </SectionLabel>

          <h2
            id="timeline-heading"
            className="
              text-[34px]
              font-semibold
              tracking-[-0.04em]
              text-foreground
              sm:text-[42px]
              xl:text-[50px]
            "
          >
            How we have evolved.
          </h2>

          <p className="mt-4 max-w-[800px] text-base leading-8 text-muted-foreground sm:text-lg">
            What started as a digital design studio
            has gradually grown into a practice covering
            engineering, mechanical design, and software.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5">
          {TIMELINE.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.year} delay={index * 0.05}>
                <article
                  className="
                    group
                    relative
                    grid
                    gap-6
                    py-6
                    transition-all
                    duration-300
                    sm:grid-cols-[220px_1fr]
                    sm:gap-8
                    sm:py-8
                    lg:grid-cols-[260px_1fr]
                    lg:gap-10
                  "
                >
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="mb-4 inline-flex items-center text-primary">
                        {Icon && <Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />}
                      </div>

                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        {item.label}
                      </p>

                      <p className="mt-1 text-2xl font-bold leading-tight tracking-[-0.03em] text-foreground transition-colors group-hover:text-primary sm:text-3xl">
                        {item.year}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      {item.title}
                    </h3>

                    <p className="mt-3 max-w-[900px] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                      {item.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.areas.map((area) => (
                        <span
                          key={area}
                          className="
                            rounded-md
                            border
                            border-border/40
                            px-2.5
                            py-1
                            text-xs
                            font-medium
                            text-muted-foreground
                          "
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   WORK PROCESS SECTION
============================================================ */

const ProcessSection = () => {
  return (
    <section
      id="approach"
      className="
        scroll-mt-24
        py-16
        sm:py-20
        lg:py-24
      "
      aria-labelledby="process-heading"
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <div>
              <SectionLabel>
                HOW WE WORK
              </SectionLabel>

              <h2
                id="process-heading"
                className="
                  text-[34px]
                  font-semibold
                  leading-[1.12]
                  tracking-[-0.04em]
                  text-foreground
                  sm:text-[42px]
                  xl:text-[50px]
                "
              >
                A clear process.
                <br />
                Better execution.
              </h2>

              <p className="mt-5 max-w-[600px] text-base leading-8 text-muted-foreground sm:text-lg">
                Every project is different, but clear
                requirements and an organized workflow
                help us work more effectively.
              </p>

              <div className="mt-7">
                <PrimaryButton to={PROJECT_URL}>
                  Discuss Your Project
                </PrimaryButton>
              </div>
            </div>
          </Reveal>

          <div className="space-y-4">
            {PROCESS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal
                  key={step.number}
                  delay={index * 0.04}
                >
                  <article
                    className="
                      group
                      grid
                      gap-4
                      py-5
                      transition-all
                      duration-300
                      sm:grid-cols-[48px_1fr]
                      sm:gap-6
                      sm:py-6
                    "
                  >
                    <div className="flex shrink-0 items-center justify-center text-primary pt-1">
                      {Icon && <Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                          STEP {step.number}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {step.label}
                        </p>
                      </div>

                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
                        {step.title}
                      </h3>

                      <p className="mt-2 max-w-[800px] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                        {step.description}
                      </p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   MISSION & VISION SECTION
============================================================ */

const MissionVisionSection = () => {
  return (
    <section
      className="py-16 sm:py-20 lg:py-24"
      aria-labelledby="mission-vision-heading"
    >
      <Container>
        <Reveal>
          <SectionLabel>
            WHAT DRIVES US
          </SectionLabel>

          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <h2
              id="mission-vision-heading"
              className="
                text-[34px]
                font-semibold
                leading-tight
                tracking-[-0.04em]
                text-foreground
                sm:text-[42px]
                xl:text-[50px]
              "
            >
              Our mission & vision.
            </h2>

            <p className="max-w-[800px] text-base leading-8 text-muted-foreground sm:text-lg">
              Our direction is shaped by practical goals:
              clearer technical information, thoughtful
              project development, and dependable communication.
            </p>
          </div>
        </Reveal>

        <div className="mt-9 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal className="h-full">
            <article
              className="
                group
                relative
                flex
                h-full
                flex-col
                py-6
                transition-all
                duration-300
                sm:py-8
              "
            >
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" aria-hidden="true" />

                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                  OUR MISSION
                </p>
              </div>

              <h3 className="mt-7 max-w-[760px] text-[27px] font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-[34px] lg:text-[38px]">
                Making technical and digital work
                clearer and more practical.
              </h3>

              <p className="mt-6 max-w-[850px] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                Our mission is to help clients transform
                requirements into useful deliverables
                through careful planning, clear communication,
                and attention to detail.
              </p>

              <p className="mt-4 max-w-[850px] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                Whether preparing a technical drawing,
                building a 3D model, or developing a website,
                we focus on work that serves its intended purpose.
              </p>
            </article>
          </Reveal>

          <Reveal
            delay={0.08}
            className="h-full"
          >
            <article
              className="
                group
                relative
                flex
                h-full
                flex-col
                py-6
                transition-all
                duration-300
                sm:py-8
              "
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />

                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                  OUR VISION
                </p>
              </div>

              <h3 className="mt-7 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-[34px] lg:text-[36px]">
                Building a trusted studio
                across multiple disciplines.
              </h3>

              <p className="mt-6 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                We want Drawn Dimension to continue
                growing as a dependable partner for
                engineering documentation, mechanical
                design, and digital development.
              </p>

              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                Our focus is on developing our skills,
                refining our processes, and building
                lasting professional relationships.
              </p>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   PRINCIPLES SECTION
============================================================ */

const PrinciplesSection = () => {
  return (
    <section
      className="
        py-16
        sm:py-20
        lg:py-24
      "
      aria-labelledby="principles-heading"
    >
      <Container>
        <Reveal>
          <SectionLabel>
            OUR PRINCIPLES
          </SectionLabel>

          <h2
            id="principles-heading"
            className="
              text-[34px]
              font-semibold
              tracking-[-0.04em]
              text-foreground
              sm:text-[42px]
              xl:text-[50px]
            "
          >
            What guides our work.
          </h2>

          <p className="mt-4 max-w-[780px] text-base leading-8 text-muted-foreground sm:text-lg">
            These principles shape how we approach
            projects, communicate with clients,
            and prepare deliverables.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {PRINCIPLES.map((principle, index) => {
            const Icon = principle.icon;
            return (
              <Reveal
                key={principle.number}
                delay={index * 0.04}
                className="h-full"
              >
                <article className="group flex h-full flex-col py-4 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="text-primary">
                      {Icon && <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />}
                    </div>

                    <span className="text-xs font-semibold text-muted-foreground">
                      {principle.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {principle.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {principle.description}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
};


/* ============================================================
   FAQ SECTION
============================================================ */

const FAQSection = () => {
  return (
    <section
      id="faq"
      className="
        scroll-mt-24
        border-t
        border-border/60
        bg-muted/15
        pb-7
        pt-16
        dark:border-white/[0.06]
        dark:bg-white/[0.015]
        sm:pb-8
        sm:pt-20
        lg:pb-8
        lg:pt-24
      "
      aria-labelledby="faq-heading"
    >
      <Container>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <div>
              <SectionLabel>
                FREQUENTLY ASKED QUESTIONS
              </SectionLabel>

              <h2
                id="faq-heading"
                className="
                  text-[34px]
                  font-semibold
                  leading-tight
                  tracking-[-0.04em]
                  text-foreground
                  sm:text-[42px]
                  xl:text-[48px]
                "
              >
                Questions?
                <br />
                We have answers.
              </h2>

              <p className="mt-4 max-w-[540px] text-base leading-8 text-muted-foreground">
                Find information about our services,
                project workflow, and deliverables.
              </p>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group
                  mt-6
                  inline-flex
                  items-center
                  gap-2
                  text-sm
                  font-semibold
                  text-primary
                  transition-all
                  hover:gap-2.5
                "
              >
                <span>Ask Us on WhatsApp</span>

                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <Accordion
              type="single"
              collapsible
              className="divide-y divide-border/60 border-y border-border/60 dark:divide-white/[0.08] dark:border-white/[0.08]"
            >
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={`faq-${index}`}
                  className="border-0"
                >
                  <AccordionTrigger
                    className="
                      py-5
                      text-left
                      text-sm
                      font-semibold
                      leading-6
                      text-foreground
                      transition-colors
                      duration-200
                      hover:text-primary
                      hover:no-underline
                      sm:text-base
                    "
                  >
                    {item.question}
                  </AccordionTrigger>

                  <AccordionContent
                    className="
                      max-w-[900px]
                      pb-5
                      pr-6
                      text-sm
                      leading-7
                      text-muted-foreground
                    "
                  >
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </Container>
    </section>
  );
};

/* ============================================================
   CONTACT SECTION
============================================================ */

const ContactSection = () => {
  return (
    <section
      id="contact"
      className="
        scroll-mt-24
        py-16
        sm:py-20
        lg:py-24
      "
      aria-labelledby="contact-heading"
    >
      <Container>
        <Reveal>
          <div
            className="
              relative
              mx-auto
              overflow-hidden
              rounded-2xl
              border-2
              border-border/70
              bg-card
              p-8
              text-center
              shadow-sm
              dark:border-white/10
              dark:bg-[#111113]
              sm:p-12
              lg:p-16
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                inset-0
                bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.12),transparent_60%)]
              "
              aria-hidden="true"
            />

            <div className="relative z-10 mx-auto max-w-[800px]">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary backdrop-blur-sm dark:bg-primary/15">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                LET'S WORK TOGETHER
              </p>

              <h2
                id="contact-heading"
                className="
                  mt-5
                  text-[36px]
                  font-semibold
                  leading-[1.1]
                  tracking-[-0.045em]
                  text-foreground
                  sm:text-[48px]
                  lg:text-[56px]
                "
              >
                Have a project in mind?
              </h2>

              <p className="mx-auto mt-5 max-w-[620px] text-base leading-8 text-muted-foreground sm:text-lg">
                Share your requirements with us.
                We'll review your project and discuss
                the next steps.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <PrimaryButton
                  to={PROJECT_URL}
                  className="w-full sm:w-auto"
                >
                  Start a Project
                </PrimaryButton>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group btn-outline gap-2.5 w-full sm:w-auto"
                >
                  <MessageCircle
                    className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  />

                  <span>Contact on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
};

/* ============================================================
   SEO METADATA
============================================================ */

const useAboutSEO = () => {
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
      SEO.keywords,
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
      } else {
        canonical?.removeAttribute("href");
      }
    };
  }, []);
};

/* ============================================================
   STRUCTURED DATA
============================================================ */

const createStructuredData = () => {
  return {
    "@context": "https://schema.org",

    "@graph": [
      {
        "@type": "Organization",

        "@id": `${SITE_ORIGIN}/#organization`,

        name: COMPANY.name,

        url: SITE_ORIGIN,

        description: COMPANY.description,

        foundingDate: COMPANY.founded,

        areaServed: "Worldwide",

        contactPoint: {
          "@type": "ContactPoint",

          contactType: "customer service",

          telephone: `+${WHATSAPP_NUMBER}`,

          availableLanguage: [
            "English",
            "Bengali",
          ],
        },
      },

      {
        "@type": "WebPage",

        "@id": SEO.canonical,

        url: SEO.canonical,

        name: SEO.title,

        description: SEO.description,

        about: {
          "@id": `${SITE_ORIGIN}/#organization`,
        },
      },

      {
        "@type": "BreadcrumbList",

        itemListElement: [
          {
            "@type": "ListItem",

            position: 1,

            name: "Home",

            item: `${SITE_ORIGIN}/`,
          },

          {
            "@type": "ListItem",

            position: 2,

            name: "About Us",

            item: SEO.canonical,
          },
        ],
      },

      {
        "@type": "FAQPage",

        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",

          name: item.question,

          acceptedAnswer: {
            "@type": "Answer",

            text: item.answer,
          },
        })),
      },
    ],
  };
};

/* ============================================================
   ABOUT PAGE
============================================================ */

const About = () => {
  useAboutSEO();

  const structuredData = useMemo(
    () => createStructuredData(),
    [],
  );

  return (
    <PageTransition>
      <PremiumBackground>
        <ScrollProgress />

        <Navigation />

        <main
          className="
            relative
            min-h-screen
            w-full
            overflow-x-clip
            text-foreground
          "
          aria-label="About Drawn Dimension"
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                structuredData,
              ).replace(/</g, "\\u003c"),
            }}
          />

          <HeroSection />

          <IntroductionSection />

          <ServicesSection />

          <TimelineSection />

          <ProcessSection />

          <MissionVisionSection />

          <PrinciplesSection />

          <FAQSection />

          <ContactSection />
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default About;