import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PricingCards from "@/components/shared/PricingCards";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { useLiveData } from "@/hooks/useLiveData";
import {
  type ApiServiceRecord,
  buildServiceCardFromApi,
  buildServiceFeatureCardsFromApi,
  buildServiceMetaDescriptionFromApi,
  buildServiceMetaTitleFromApi,
  buildServicePricingTiersFromApi,
  buildServiceProcessStepsFromApi,
  buildServiceSectionLeftItemsFromApi,
  buildServiceSectionPanelItemsFromApi,
  findServiceBySlug,
  normalizeServiceKey,
  slugifyServiceName,
} from "@/components/shared/serviceCatalog";
import { buildCardImageSources } from "@/components/shared/mediaUrl";
import { getProjectPrimaryCardMedia } from "@/components/shared/projectMedia";
import {
  getProjectCategoryLabel,
  projectMatchesService,
} from "@/components/shared/projectAssociations";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import PdfPreview from "@/components/shared/PdfPreview";
import type { ServiceFaqRecord } from "@/components/shared/serviceContent";
import DashedCircleSpinner from "@/components/shared/DashedCircleSpinner";

/* ─────────── Design tokens ─────────── */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const EASE = [0.16, 1, 0.3, 1] as const;

const SHELL =
  "mx-auto w-full max-w-[1600px] px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20";

const whatsappUrl = "https://wa.me/8801775119416";
const siteOrigin = "https://www.drawndimension.com";

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-6">
    <span className="h-px w-8 bg-primary" />
    <span className="text-[11px] uppercase tracking-[0.24em] text-primary font-semibold">
      {children}
    </span>
  </div>
);


/* ─────────── Types ─────────── */

type ServiceSeoOverride = {
  slugs: string[];
  canonicalPath: string;
  pageTitle: string;
  metaDescription: string;
  keywords: string[];
  heroTitle: string;
  sectionTitle: string;
  panelTitle: string;
  processTitle: string;
  pricingTitle: string;
  faqTitle: string;
  featureCardTitles?: string[];
  quoteLinkLabel: string;
  portfolioLinkLabel: string;
  faqLinkLabel: string;
  blogLinkLabel: string;
  whatsappLabel: string;
  schemaName: string;
  serviceType: string;
};

type RelatedProjectRecord = {
  id: string | number;
  title: string;
  description?: string | null;
  category?: string | null;
  client?: string | null;
  image_url?: string | null;
  media?: Array<{ url?: string; type?: string; name?: string | null }> | null;
  linked_service_ids?: unknown;
  service_id?: unknown;
};

type ProcessStep = {
  title?: string;
  name?: string;
  description?: string;
  desc?: string;
};

const RELATED_WORK_DESCRIPTION_LIMIT = 135;

const getRelatedWorkDescriptionPreview = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { text: "No description available.", truncated: false };
  if (text.length <= RELATED_WORK_DESCRIPTION_LIMIT)
    return { text, truncated: false };
  const shortened = text
    .slice(0, RELATED_WORK_DESCRIPTION_LIMIT)
    .trimEnd()
    .replace(/[.,;:!?-]+$/, "");
  return { text: shortened, truncated: true };
};

/* ─────────── Related work media (logic unchanged) ─────────── */

const RelatedWorkMedia = ({
  project,
  eagerImage,
}: {
  project: RelatedProjectRecord;
  eagerImage: boolean;
}) => {
  const previewMedia = getProjectPrimaryCardMedia(project);
  const imageSrc = previewMedia?.type === "image" ? previewMedia.url : "";
  const imageSources = imageSrc ? buildCardImageSources(imageSrc) : null;
  const [variantFailed, setVariantFailed] = useState(false);
  const [isImageReady, setIsImageReady] = useState(
    previewMedia?.type !== "image",
  );

  useEffect(() => {
    setVariantFailed(false);
    setIsImageReady(previewMedia?.type !== "image");
  }, [previewMedia?.type, imageSrc]);

  return (
    <div className="relative overflow-hidden aspect-video bg-muted/15">
      {previewMedia?.type === "video" ? (
        <video
          src={previewMedia.url}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="none"
        />
      ) : previewMedia?.type === "pdf" ? (
        <PdfPreview
          url={previewMedia.url}
          title={project.title}
          loading={eagerImage ? "eager" : "lazy"}
        />
      ) : imageSrc ? (
        <>
          <div
            className={`absolute inset-0 bg-muted/35 transition-opacity duration-300 ${
              isImageReady ? "opacity-0" : "opacity-100"
            }`}
            aria-hidden="true"
          />
          <img
            src={
              variantFailed
                ? imageSources?.fallbackSrc ?? imageSrc
                : imageSources?.src ?? imageSrc
            }
            srcSet={variantFailed ? undefined : imageSources?.srcSet}
            alt={project.title}
            width={800}
            height={600}
            loading={eagerImage ? "eager" : "lazy"}
            fetchpriority={eagerImage ? "high" : "low"}
            decoding="async"
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 50vw, 33vw"
            onLoad={() => setIsImageReady(true)}
            onError={() => {
              if (!variantFailed && imageSources?.srcSet) {
                setVariantFailed(true);
              } else {
                setIsImageReady(true);
              }
            }}
            className={`h-full w-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.02] ${
              isImageReady ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
          No preview
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute top-4 left-4">
        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold px-2.5 py-1 rounded-full border border-primary/30 bg-background/85 backdrop-blur-sm text-primary">
          {getProjectCategoryLabel(project.category)}
        </span>
      </div>
    </div>
  );
};

/* ─────────── SEO overrides (verbatim) ─────────── */

const serviceSeoOverrides: ServiceSeoOverride[] = [
  {
    slugs: [
      "pfd-pid",
      "pfd",
      "pid",
      "p-and-id",
      "p-id",
      "process-flow-diagram",
      "piping-and-instrumentation-diagram",
      "process-flow-diagrams",
      "piping-instrumentation-diagrams",
    ],
    canonicalPath: "/services/pfd-pid",
    pageTitle:
      "P&ID & PFD Drawing Services | ISA 5.1 Piping & Instrumentation | Drawn Dimension",
    metaDescription:
      "Professional P&ID and PFD drafting services for chemical, oil & gas, and industrial process plants. ISA 5.1 & ISO 10628 compliant diagrams, as-built updates, instrument loops, and fast turnaround. Get a free quote today.",
    keywords: [
      "P&ID drawing services",
      "PFD drafting services",
      "piping and instrumentation diagram CAD",
      "ISA 5.1 instrumentation symbols",
      "ISO 10628 process flow diagrams",
      "as-built P&ID updates",
      "intelligent P&ID conversion",
      "process engineering drafting",
      "oil and gas piping diagrams",
      "chemical plant P&ID drafting",
      "P&ID drafting outsourcing",
      "process flow diagram CAD",
    ],
    heroTitle: "P&ID & PFD Drawing Services for Industrial Process Plants",
    sectionTitle:
      "ISA 5.1 & ISO 10628 Compliant Process Flow & Instrumentation Diagrams",
    panelTitle: "Industrial Process CAD & Documentation Stack",
    processTitle: "Engineering Drafting & P&ID Verification Workflow",
    pricingTitle: "P&ID & PFD Drafting Service Packages",
    faqTitle: "P&ID & PFD Engineering Drawing FAQs",
    featureCardTitles: [
      "ISA 5.1 Instrument Tagging & Symbology",
      "PFD Mass & Energy Stream Balances",
      "Piping Specifications & Valve Details",
      "As-Built Redline & CAD Conversions",
      "Control Interlocks & Safety Logic",
      "Multi-Format Handover (DWG, DXF, PDF)",
    ],
    quoteLinkLabel: "Request a P&ID / PFD Quote",
    portfolioLinkLabel: "View Process Drawing Samples",
    faqLinkLabel: "Browse P&ID FAQs",
    blogLinkLabel: "Read Process Engineering Insights",
    whatsappLabel: "Discuss P&ID Services on WhatsApp",
    schemaName: "P&ID and PFD Drawing Services",
    serviceType: "P&ID and PFD engineering drafting services",
  },
  {
    slugs: [
      "autocad",
      "autocad-technical-drawings",
      "technical-drawings",
      "2d-drafting",
      "cad-drafting",
      "autocad-drawings",
      "2d-cad",
    ],
    canonicalPath: "/services/autocad",
    pageTitle:
      "AutoCAD Technical Drawing Services | 2D CAD Drafting Experts | Drawn Dimension",
    metaDescription:
      "Precision AutoCAD technical drawing and 2D CAD drafting services for engineering, architectural, and manufacturing projects. ASME Y14.5 compliant shop drawings, as-builts, and fabrication details. Request a quote.",
    keywords: [
      "AutoCAD technical drawing services",
      "2D CAD drafting services",
      "AutoCAD drafting outsourcing",
      "ASME Y14.5 CAD drawings",
      "shop drawings AutoCAD",
      "as-built CAD drawings",
      "mechanical 2D drafting",
      "architectural CAD drafting",
      "DWG CAD drafting services",
      "paper to CAD conversion",
      "fabrication drawing services",
    ],
    heroTitle: "Precision AutoCAD Technical Drawing & 2D Drafting Services",
    sectionTitle:
      "ASME & ISO Compliant Technical Drawings for Engineering & Fabrication",
    panelTitle: "2D CAD Drafting & Documentation Stack",
    processTitle: "AutoCAD Drafting & Verification Workflow",
    pricingTitle: "AutoCAD Drafting Service Packages",
    faqTitle: "AutoCAD Technical Drawing FAQs",
    featureCardTitles: [
      "2D CAD Drafting & As-Built Plans",
      "Shop Drawings & Fabrication Details",
      "ASME Y14.5 Geometric Dimensioning (GD&T)",
      "Architectural & MEP Plan Drafting",
      "Paper-to-CAD Vector Conversions",
      "Production-Ready DWG & PDF Handover",
    ],
    quoteLinkLabel: "Request an AutoCAD Quote",
    portfolioLinkLabel: "View AutoCAD Drawing Portfolio",
    faqLinkLabel: "Browse AutoCAD FAQs",
    blogLinkLabel: "Read CAD Drafting Insights",
    whatsappLabel: "Discuss AutoCAD Drafting on WhatsApp",
    schemaName: "AutoCAD Technical Drawing Services",
    serviceType: "AutoCAD technical drafting services",
  },
  {
    slugs: [
      "solidworks",
      "3d-product-modeling",
      "3d-solidworks",
      "solidworks-modeling",
      "3d-modeling",
    ],
    canonicalPath: "/services/solidworks",
    pageTitle:
      "SolidWorks 3D Modeling Services | Mechanical CAD Design & Prototyping | Drawn Dimension",
    metaDescription:
      "Professional SolidWorks 3D modeling and mechanical CAD design services. From concept prototyping to production-ready assemblies, sheet metal design, and FEA simulation. Request a quote today.",
    keywords: [
      "SolidWorks modeling services",
      "3D CAD modeling outsourcing",
      "SolidWorks mechanical design services",
      "product design SolidWorks",
      "3D CAD assembly modeling",
      "sheet metal SolidWorks design",
      "FEA stress simulation",
      "manufacturing drawings CAD",
      "STEP IGES CAD modeling",
      "SolidWorks drafting services",
    ],
    heroTitle: "Professional 3D SolidWorks Modeling & Mechanical CAD Design",
    sectionTitle:
      "Production-Ready 3D CAD Models, Assemblies & Manufacturing Drawings",
    panelTitle: "3D Mechanical Modeling & Simulation Stack",
    processTitle: "SolidWorks Design & Verification Workflow",
    pricingTitle: "SolidWorks 3D Modeling Service Packages",
    faqTitle: "SolidWorks 3D Modeling FAQs",
    featureCardTitles: [
      "Parametric 3D Part & Surface Modeling",
      "Complex Assembly & Mechanism Design",
      "Sheet Metal & Weldment Drafting",
      "FEA Stress & Motion Simulation",
      "Manufacturing Drawings & BOM Creation",
      "Multi-Format Export (SLDPRT, STEP, IGES)",
    ],
    quoteLinkLabel: "Request a SolidWorks Quote",
    portfolioLinkLabel: "View SolidWorks Project Portfolio",
    faqLinkLabel: "Browse SolidWorks FAQs",
    blogLinkLabel: "Read SolidWorks Insights",
    whatsappLabel: "Discuss SolidWorks on WhatsApp",
    schemaName: "SolidWorks 3D Modeling Services",
    serviceType: "SolidWorks 3D modeling and mechanical design services",
  },
  {
    slugs: [
      "hazop",
      "hazop-study",
      "risk-analysis",
      "risk-assessment",
      "process-safety",
    ],
    canonicalPath: "/services/hazop",
    pageTitle:
      "HAZOP Study & Process Risk Analysis Services | IEC 61882 Process Safety | Drawn Dimension",
    metaDescription:
      "Certified HAZOP study and process hazard analysis (PHA) services compliant with IEC 61882 and OSHA PSM. Node identification, deviation analysis, safeguard review, and actionable safety reporting.",
    keywords: [
      "HAZOP study services",
      "hazard and operability study",
      "process safety risk assessment",
      "process hazard analysis",
      "HAZOP facilitation",
      "IEC 61882",
      "LOPA support",
      "OSHA PSM compliance",
      "plant safety audit",
    ],
    heroTitle: "HAZOP Study & Process Safety Risk Assessment Services",
    sectionTitle:
      "Hazard and Operability Study Support for Process Safety Risk Assessment",
    panelTitle: "Process Hazard Analysis & IEC 61882 Documentation",
    processTitle: "HAZOP Study Workflow & Action Tracking",
    pricingTitle: "HAZOP Study Service Packages",
    faqTitle: "HAZOP Study Service FAQs",
    featureCardTitles: [
      "HAZOP Facilitation Planning",
      "Process Hazard Analysis",
      "IEC 61882 Node Reviews",
      "Process Safety Risk Assessment",
      "Action Register Documentation",
      "LOPA Support Coordination",
    ],
    quoteLinkLabel: "Request a HAZOP Study Quote",
    portfolioLinkLabel: "View Process Safety Portfolio",
    faqLinkLabel: "Browse HAZOP FAQs",
    blogLinkLabel: "Read HAZOP Insights",
    whatsappLabel: "Discuss HAZOP Services on WhatsApp",
    schemaName: "HAZOP Study Services",
    serviceType: "HAZOP study services",
  },
  {
    slugs: [
      "architechtural-drawing",
      "architectural-drawing",
      "architectural-drafting",
      "cad-floor-plans",
    ],
    canonicalPath: "/services/architechtural-drawing",
    pageTitle:
      "Architectural Drafting Services | CAD Floor Plans, Elevations & Permitting | Drawn Dimension",
    metaDescription:
      "Professional architectural CAD drafting services for floor plans, elevations, cross-sections, and permit-ready construction documentation. Fast, accurate, and code-compliant global delivery.",
    keywords: [
      "architectural drafting services",
      "architectural CAD drafting",
      "architectural drawing services",
      "floor plans and elevations",
      "construction documentation",
      "permit drawing services",
      "as-built architectural drawings",
    ],
    heroTitle:
      "Architectural Drafting Services for Building Plans & Permitting",
    sectionTitle:
      "Architectural CAD Drafting for Plans, Elevations, and Sections",
    panelTitle: "Construction Documentation & Permit Drawing Support",
    processTitle: "Architectural Drafting Workflow",
    pricingTitle: "Architectural Drafting Service Packages",
    faqTitle: "Architectural Drafting Service FAQs",
    featureCardTitles: [
      "Architectural CAD Drafting",
      "Floor Plans and Elevations",
      "Section and Detail Drawings",
      "Permit Drawing Preparation",
      "As-Built Architectural Drawings",
      "Construction Documentation Review",
    ],
    quoteLinkLabel: "Request an Architectural Drafting Quote",
    portfolioLinkLabel: "View Architectural Drafting Portfolio",
    faqLinkLabel: "Browse Architectural Drafting FAQs",
    blogLinkLabel: "Read Architectural Drafting Insights",
    whatsappLabel: "Discuss Architectural Drafting on WhatsApp",
    schemaName: "Architectural Drafting Services",
    serviceType: "architectural drafting services",
  },
  {
    slugs: ["web-design", "web-development", "engineering-web-development"],
    canonicalPath: "/services/web-design",
    pageTitle:
      "Web Design & Development Services for Engineering & Tech Firms | Drawn Dimension",
    metaDescription:
      "High-performance web design and custom development for engineering, industrial, and technical B2B companies. SEO-optimized, responsive, ultrafast React & Next.js builds. Request a quote.",
    keywords: [
      "web development services for engineering firms",
      "engineering website design",
      "industrial website development",
      "B2B web design",
      "engineering company website design",
      "responsive web development",
      "SEO-ready website",
    ],
    heroTitle:
      "Web Development Services for Engineering & Industrial Businesses",
    sectionTitle:
      "Engineering Website Design & Industrial Web Application Development",
    panelTitle: "B2B Web Development Services for Technical Companies",
    processTitle: "Engineering Web Development Workflow",
    pricingTitle: "Web Development Packages for Engineering Firms",
    faqTitle: "Engineering Web Development FAQs",
    featureCardTitles: [
      "Engineering Company Website Design",
      "Responsive Industrial Web Development",
      "SEO-Ready Technical Content Setup",
      "Lead Generation Landing Pages",
      "B2B Conversion-Focused UX",
      "CMS and Performance Optimization",
    ],
    quoteLinkLabel: "Request a Website Development Quote",
    portfolioLinkLabel: "View Engineering Website Portfolio",
    faqLinkLabel: "Browse Web Development FAQs",
    blogLinkLabel: "Read Engineering Website Insights",
    whatsappLabel: "Discuss Web Development on WhatsApp",
    schemaName: "Web Development Services for Engineering Firms",
    serviceType: "web development services for engineering firms",
  },
  {
    slugs: [
      "graphic-design",
      "graphics-design",
      "branding",
      "technical-graphic-design",
    ],
    canonicalPath: "/services/graphic-design",
    pageTitle:
      "Technical Graphic Design & Industrial Branding Services | Drawn Dimension",
    metaDescription:
      "Technical graphic design services for engineering and industrial brands, from technical schematics and illustrations to complete branding systems. Request your design quote today.",
    keywords: [
      "technical graphic design services",
      "B2B graphic design services",
      "industrial branding design",
      "technical illustration services",
      "brand identity design",
      "marketing collateral design",
      "engineering brochure design",
    ],
    heroTitle: "Technical Graphic Design Services for Industrial Brands",
    sectionTitle:
      "Industrial Branding Design & Technical Illustration Services",
    panelTitle: "B2B Graphic Design Services for Engineering Marketing",
    processTitle: "Technical Graphic Design Workflow",
    pricingTitle: "Technical Graphic Design Packages",
    faqTitle: "Technical Graphic Design FAQs",
    featureCardTitles: [
      "Engineering Brand Identity Design",
      "Technical Illustration Services",
      "Industrial Marketing Collateral",
      "Presentation and Proposal Graphics",
      "Trade Show and Print Design",
      "B2B Campaign Visual Systems",
    ],
    quoteLinkLabel: "Request a Graphic Design Quote",
    portfolioLinkLabel: "View Industrial Branding Portfolio",
    faqLinkLabel: "Browse Graphic Design FAQs",
    blogLinkLabel: "Read Technical Design Insights",
    whatsappLabel: "Discuss Graphic Design on WhatsApp",
    schemaName: "Technical Graphic Design Services",
    serviceType: "technical graphic design services",
  },
  {
    slugs: [
      "conversion-rate-optimization",
      "cro",
      "conversion-optimization",
    ],
    canonicalPath: "/services/conversion-rate-optimization",
    pageTitle: "Conversion Rate Optimization Services | DrawnDimension",
    metaDescription:
      "Conversion rate optimization services for B2B websites with A/B testing, UX audits, and funnel fixes worldwide. Request your CRO quote today for growth.",
    keywords: [
      "conversion rate optimization services",
      "CRO agency",
      "website conversion optimization",
      "landing page optimization",
      "A/B testing services",
      "UX conversion audit",
      "B2B CRO",
    ],
    heroTitle: "Conversion Rate Optimization Services for B2B Websites",
    sectionTitle:
      "Landing Page Optimization and UX Conversion Audit Support",
    panelTitle: "A/B Testing Services for Website Conversion Optimization",
    processTitle: "B2B CRO Workflow and Experiment Roadmap",
    pricingTitle: "Conversion Rate Optimization Service Packages",
    faqTitle: "Conversion Rate Optimization Service FAQs",
    featureCardTitles: [
      "Conversion Research and Analytics",
      "A/B Testing Execution",
      "Landing Page Optimization",
      "UX Conversion Audit",
      "Funnel Optimization",
      "B2B CRO Reporting",
    ],
    quoteLinkLabel: "Request a CRO Quote",
    portfolioLinkLabel: "View CRO Case Studies",
    faqLinkLabel: "Browse CRO FAQs",
    blogLinkLabel: "Read CRO Insights",
    whatsappLabel: "Discuss CRO Services on WhatsApp",
    schemaName: "Conversion Rate Optimization Services",
    serviceType: "conversion rate optimization services",
  },
];

/* ─────────── Engineering spec map (verbatim) ─────────── */

type ServiceEngineeringSpec = {
  standards: string[];
  formats: string[];
  highlights: string[];
  protocolSteps: Array<{ title: string; desc: string }>;
};

const DEFAULT_ENGINEERING_SPEC: ServiceEngineeringSpec = {
  standards: [
    "ISO 9001 Certified Workflow",
    "Industry Best Practices",
    "Multi-Tier Peer Review",
    "Client-Specific Standards",
  ],
  formats: [
    "Native Source Files",
    "Vector Graphics",
    "High-Resolution PDF",
    "Complete Client Handover Package",
  ],
  highlights: [
    "100% Quality Assurance",
    "Dedicated Domain Specialist",
    "Structured Revision Cycles",
    "Global Delivery Track Record",
  ],
  protocolSteps: [
    {
      title: "Scope & Specifications Intake",
      desc: "Detailed review of technical requirements, applicable codes, and project milestones.",
    },
    {
      title: "Standardized Execution",
      desc: "Structured design execution following international and client-specific guidelines.",
    },
    {
      title: "Internal Quality Audit",
      desc: "Independent peer verification to ensure precision, tolerances, and design consistency.",
    },
    {
      title: "Client-Ready Handover",
      desc: "Organized delivery package with editable source files, universal exports, and change logs.",
    },
  ],
};

const SERVICE_STANDARDS_MAP: Record<string, ServiceEngineeringSpec> = {
  "pfd-pid": {
    standards: [
      "ANSI / ISA-5.1 Symbology",
      "ISO 10628 Process Diagrams",
      "ASME B31.3 Process Piping",
      "API 520 / 521 Guidelines",
      "OSHA 1910.119 PSM",
    ],
    formats: [
      "AutoCAD .DWG (Layered)",
      "Vector .DXF",
      "High-Res Vector .PDF",
      "Equipment & Line Schedules (.XLSX)",
      "Intelligent CAD Ready",
    ],
    highlights: [
      "100% ISA-5.1 Symbology Audit",
      "Mass & Energy Balance Consistency",
      "As-Built Redline CAD Updates",
      "Worldwide Delivery",
    ],
    protocolSteps: [
      {
        title: "Process Balance & Spec Review",
        desc: "Verification of PFD stream data, mass and energy balances, and equipment datasheets.",
      },
      {
        title: "ISA-5.1 Drafting & Tagging",
        desc: "Drafting standardized symbology for instrumentation loops, inline valves, and control interlocks.",
      },
      {
        title: "Multi-Tier Engineering Audit",
        desc: "Line-by-line cross-check of line numbers, pipe specs, valve schedules, and instrument indexes.",
      },
      {
        title: "As-Built Package Handover",
        desc: "Clean DWG, DXF, vector PDF, and automated equipment/instrument schedules with revision clouds.",
      },
    ],
  },
  autocad: {
    standards: [
      "ASME Y14.5 (GD&T)",
      "ASME Y14.100 Engineering",
      "ISO 128 Technical Drawings",
      "AIA CAD Layer Standards",
      "National CAD Standard (NCS)",
    ],
    formats: [
      "AutoCAD .DWG (All Versions)",
      "Vector .DXF",
      "Printable Vector .PDF",
      "Plot Style Tables (.CTB / .STB)",
    ],
    highlights: [
      "Shop & Fabrication Details",
      "As-Built Field Redlines",
      "Layer & Line Weight Control",
      "24-48h Rapid Turnaround",
    ],
    protocolSteps: [
      {
        title: "CAD Standards Alignment",
        desc: "Adopting client layer conventions, dimension styles, and title block templates.",
      },
      {
        title: "Precision Drafting & Detailing",
        desc: "Creating geometric layouts, section cuts, and fabrication callouts adhering to GD&T.",
      },
      {
        title: "Dimensional QA Check",
        desc: "Verification of all dimensions, scales, notes, and bill of materials (BOM).",
      },
      {
        title: "Production-Ready Release",
        desc: "Clean DWG, DXF, and layered PDF exports organized for immediate manufacturing or submittal.",
      },
    ],
  },
  solidworks: {
    standards: [
      "ISO 1101 Geometrical Tolerancing",
      "ASME Y14.41 (3D MBD)",
      "DFM / DFA Guidelines",
      "ASTM / DIN Material Specs",
    ],
    formats: [
      "SolidWorks Part (.SLDPRT)",
      "Assembly (.SLDASM)",
      "2D Drawing (.SLDDRW)",
      "STEP (.STP) / IGES (.IGS)",
      "Parasolid (.X_T) / STL",
    ],
    highlights: [
      "Parametric 3D Feature Trees",
      "Interference & Collision Checks",
      "FEA Stress Simulation",
      "Parametric BOM Cut Lists",
    ],
    protocolSteps: [
      {
        title: "Concept & Fitment Planning",
        desc: "Determining mechanical constraints, material selections, and manufacturing processes.",
      },
      {
        title: "Parametric 3D CAD Modeling",
        desc: "Building robust parts, assemblies, sheet metal flat patterns, and weldments.",
      },
      {
        title: "Motion & Stress Simulation",
        desc: "Executing clearance verification, kinematics motion checks, and FEA stress analysis.",
      },
      {
        title: "Manufacturing Drawing Package",
        desc: "Delivering native SolidWorks files, neutral STEP/DXF exports, and detailed 2D fabrication sheets.",
      },
    ],
  },
  hazop: {
    standards: [
      "IEC 61882 HAZOP Standard",
      "OSHA 29 CFR 1910.119 (PSM)",
      "CCPS Guidelines",
      "EPA Risk Management (RMP)",
      "LOPA / SIL Guidance",
    ],
    formats: [
      "Audit-Ready HAZOP Reports",
      "Node Worksheets (Excel / PDF)",
      "Risk Ranking Matrices",
      "Action Tracking Registers",
    ],
    highlights: [
      "Experienced Facilitation",
      "Systematic Guide Word Analysis",
      "Safeguard Adequacy Review",
      "Prioritized Mitigation Log",
    ],
    protocolSteps: [
      {
        title: "Charter & Node Definition",
        desc: "Scoping process boundaries, node subdivisions, design intentions, and P&ID baseline.",
      },
      {
        title: "Facilitated Node Review",
        desc: "Systematic application of guide words (Flow, Temp, Press) to uncover deviations and causes.",
      },
      {
        title: "Risk & Safeguard Assessment",
        desc: "Evaluating severity/likelihood, verifying existing safeguards, and identifying gaps.",
      },
      {
        title: "Action Tracking Register",
        desc: "Generating comprehensive audit-ready reports with assigned corrective recommendations.",
      },
    ],
  },
  "architechtural-drawing": {
    standards: [
      "International Building Code (IBC)",
      "International Residential Code (IRC)",
      "AIA CAD Layer Standards",
      "ADA Accessibility Guidelines",
    ],
    formats: [
      "AutoCAD .DWG",
      "High-Res Vector PDF (Arch D/E)",
      "Vector .DXF",
      "Printable Plot Sheets",
    ],
    highlights: [
      "Permit-Ready Drawing Sets",
      "Floor Plans, Elevations & Sections",
      "Door & Window Schedules",
      "Code-Compliant Detailing",
    ],
    protocolSteps: [
      {
        title: "Architectural Scope Intake",
        desc: "Reviewing sketch concepts, site boundary surveys, and local zoning requirements.",
      },
      {
        title: "Full Drawing Set Drafting",
        desc: "Drafting detailed floor plans, exterior elevations, building sections, and electrical/MEP layouts.",
      },
      {
        title: "Code & Dimension Verification",
        desc: "Checking egress paths, room dimensions, wall assemblies, and structural callouts.",
      },
      {
        title: "Permit Package Handover",
        desc: "Delivering organized DWG files and multi-sheet PDF packages ready for municipal submission.",
      },
    ],
  },
  "web-design": {
    standards: [
      "W3C Validated Standards",
      "Core Web Vitals 95+ Score",
      "WCAG 2.1 AA Accessibility",
      "Modern Responsive Architecture",
    ],
    formats: [
      "Clean React / Next.js Source",
      "TypeScript Codebase",
      "Tailwind CSS Design System",
      "Production Build Deployment",
    ],
    highlights: [
      "Sub-Second Page Load Times",
      "Full B2B SEO Pre-Configured",
      "Mobile-First Responsiveness",
      "Lead Generation Optimization",
    ],
    protocolSteps: [
      {
        title: "Information Architecture",
        desc: "Mapping user journeys, wireframes, and conversion funnels for technical buyers.",
      },
      {
        title: "Modern Component Engineering",
        desc: "Building responsive, accessible components with React, TypeScript, and modern styling.",
      },
      {
        title: "Performance & SEO Audit",
        desc: "Optimizing bundle size, Core Web Vitals, rich JSON-LD schemas, and meta tags.",
      },
      {
        title: "Deployment & Verification",
        desc: "Zero-downtime deployment, SSL configuration, and analytics tracking handover.",
      },
    ],
  },
  "graphic-design": {
    standards: [
      "300+ DPI Print Standards",
      "Vector SVG / EPS Geometry",
      "Pantone & CMYK Color Calibration",
      "Brand Identity Guidelines",
    ],
    formats: [
      "Adobe Illustrator (.AI)",
      "Vector .EPS / .SVG",
      "Print-Ready Vector .PDF",
      "Digital Web PNG / WebP",
    ],
    highlights: [
      "Technical & Industrial Visuals",
      "Engineering Diagrams & Schematics",
      "Marketing Collateral & Decks",
      "Consistent Brand Identity",
    ],
    protocolSteps: [
      {
        title: "Creative & Brand Brief",
        desc: "Defining aesthetic direction, technical messaging, and target audience personas.",
      },
      {
        title: "Vector Design & Illustration",
        desc: "Crafting pixel-perfect logos, technical schematics, whitepapers, and presentation decks.",
      },
      {
        title: "Cross-Medium QA",
        desc: "Verifying color profiles (CMYK vs RGB), typography legibility, and bleed margins.",
      },
      {
        title: "Asset Vault Handover",
        desc: "Delivering organized packages with vector source files, exports, and brand usage guides.",
      },
    ],
  },
};

const INDUSTRIES_SERVED = [
  {
    title: "Petrochemical & Refining",
    desc: "FCC units, distillation columns, high-pressure piping loops, and plant instrumentation documentation.",
  },
  {
    title: "Oil & Gas Systems",
    desc: "Upstream wellheads, midstream pipeline compressor stations, gas processing units, and offshore skids.",
  },
  {
    title: "Chemical Manufacturing",
    desc: "Batch chemical reactors, continuous processing, polymer synthesis, and hazardous chemical handling systems.",
  },
  {
    title: "Water & Wastewater Treatment",
    desc: "Reverse osmosis, desalination plants, membrane bioreactors, and municipal water distribution networks.",
  },
  {
    title: "Pharmaceutical & Biotech",
    desc: "Sanitary piping, CIP/SIP sterilization systems, bioreactors, and FDA 21 CFR compliant process documentation.",
  },
  {
    title: "Power & Renewable Energy",
    desc: "Steam turbines, combined-cycle generation, biomass plants, thermal circuits, and renewable energy piping.",
  },
];

const FALLBACK_SERVICE_FAQS: Record<
  string,
  Array<{ question: string; answer: string }>
> = {
  "pfd-pid": [
    {
      question:
        "What international standards do you follow for P&ID and PFD drawings?",
      answer:
        "Our piping and instrumentation diagrams comply with international engineering standards including ANSI/ISA-5.1 for instrumentation symbols and identification, ISO 10628 for process diagrams in chemical and petrochemical plants, and ASME/API standards for piping and equipment symbology.",
    },
    {
      question:
        "Can you convert legacy hand-drawn or paper P&IDs into intelligent CAD files?",
      answer:
        "Yes. We specialize in converting legacy paper drawings, scanned blueprints, raster images, and PDF markups into clean, layered, editable AutoCAD (.DWG/.DXF) drawings with standardized symbology, verified tagging, and customizable title blocks.",
    },
    {
      question:
        "What information do you need from us to start a P&ID or PFD project?",
      answer:
        "We typically require your Process Flow Diagram (PFD) or process balance, equipment specifications, piping specifications (piping class), instrument index, process control philosophy, and any existing redline markups or sketches.",
    },
    {
      question:
        "How do you ensure accuracy and quality control across complex drawings?",
      answer:
        "Every drawing undergoes a strict 4-stage internal review: line-by-line verification against process balances, ISA-5.1 tag consistency checks, piping class and valve schedule auditing, and an independent senior engineering sign-off before client delivery.",
    },
    {
      question: "What file formats will we receive upon project delivery?",
      answer:
        "Deliverables include native editable AutoCAD (.DWG), open CAD (.DXF), high-resolution vector PDF (.PDF), and comprehensive equipment, line, and instrument schedules in Excel or CSV upon request.",
    },
    {
      question: "How do you handle revisions and as-built modifications?",
      answer:
        "All our packages include revision cycles. We track revision history using standardized revision blocks, cloud revision markers, and delta tables so your team can easily verify and audit all modifications.",
    },
  ],
  autocad: [
    {
      question:
        "What types of 2D AutoCAD technical drawings do you produce?",
      answer:
        "We produce comprehensive 2D CAD drawings including mechanical fabrication and shop drawings, architectural floor plans and elevations, structural steel detailing, piping schematics, MEP layouts, and construction-ready documentation.",
    },
    {
      question:
        "Can you follow our company-specific CAD standards and layer conventions?",
      answer:
        "Yes. We can strictly adopt your company CAD manual, layer naming standards (such as AIA or ISO 13567), line weight scales, dimension styles, and title block templates. If you don't have existing standards, we apply proven ASME/ISO industry drafting conventions.",
    },
    {
      question:
        "Do you provide as-built drawing updates from contractor redline markups?",
      answer:
        "Yes. Updating redline markups into clean, production-ready as-built CAD files is one of our core specialties. We meticulously incorporate field modifications, cloud all revisions, and update sheet indexes and revision schedules.",
    },
    {
      question:
        "Which drafting codes and geometric standards do you comply with?",
      answer:
        "We adhere to ASME Y14.5 (Geometric Dimensioning and Tolerancing - GD&T), ASME Y14.100 (Engineering Drawing Practices), ISO 128 (Technical Drawings General Principles), and AIA CAD Standards.",
    },
    {
      question:
        "What is your typical turnaround time for AutoCAD drafting projects?",
      answer:
        "Small drawing packages and urgent redline updates are delivered within 24 to 48 hours. Larger multi-sheet engineering projects follow agreed milestone schedules with dedicated CAD specialists assigned to your project.",
    },
    {
      question: "What deliverable files do you provide upon completion?",
      answer:
        "You receive clean, purgable, layered AutoCAD (.DWG) source files in your required version, vector (.DXF) files, print-ready vector PDF packages with embedded plot style tables (.CTB), and zip archives.",
    },
  ],
  solidworks: [
    {
      question:
        "What 3D modeling and mechanical CAD capabilities do you offer in SolidWorks?",
      answer:
        "Our SolidWorks capabilities include parametric 3D part modeling, complex assembly design with motion validation, sheet metal fabrication design with bend tables, structural weldments with cut lists, surfacing, and production-ready 2D manufacturing drawings (.SLDDRW).",
    },
    {
      question:
        "Can you export universal CAD formats for CNC machining, sheet metal cutting, and 3D printing?",
      answer:
        "Yes. Along with native SolidWorks files (.SLDPRT, .SLDASM, .SLDDRW), we export STEP (.STP), IGES (.IGS), Parasolid (.X_T), DXF for CNC laser/plasma profiling, and high-resolution STL/3MF for rapid prototyping and 3D printing.",
    },
    {
      question:
        "Do you perform FEA (Finite Element Analysis) stress simulations on SolidWorks models?",
      answer:
        "Yes. We provide linear static stress analysis, displacement checks, factor of safety (FOS) assessments, and modal vibration analysis to optimize part geometry, reduce material costs, and verify structural integrity.",
    },
    {
      question:
        "Can you reverse engineer physical components from physical measurements or scan data?",
      answer:
        "Yes. We can reconstruct accurate, fully parametric 3D CAD models from physical parts, caliper and CMM measurements, 3D point cloud scans, or legacy 2D drawing archives.",
    },
    {
      question:
        "How do you ensure proper Bill of Materials (BOM) and assembly fitment?",
      answer:
        "We use top-down and bottom-up assembly modeling with strict interference and collision detection. We generate automated parametric BOMs with customized part numbering, material properties, and vendor component integration.",
    },
    {
      question: "What versions of SolidWorks do you support?",
      answer:
        "We work with multiple SolidWorks versions and can deliver models compatible with your internal engineering setup, along with universal neutral CAD files for cross-platform interoperability.",
    },
  ],
  hazop: [
    {
      question:
        "What is a HAZOP study and why is it essential for process safety compliance?",
      answer:
        "A Hazard and Operability (HAZOP) study is a structured, systematic examination of a planned or existing process to identify operational risks and safety hazards. It is required under OSHA 1910.119 Process Safety Management (PSM), EPA RMP, and international safety regulations to prevent catastrophic releases, equipment damage, and personnel injury.",
    },
    {
      question: "What international standards guide your HAZOP reviews?",
      answer:
        "Our process safety reviews strictly follow IEC 61882 (Hazard and Operability Studies - Application Guide), CCPS (Center for Chemical Process Safety) guidelines, and OSHA PSM regulations. We also support Layers of Protection Analysis (LOPA) to verify Safety Integrity Levels (SIL).",
    },
    {
      question:
        "What deliverables are provided at the conclusion of a HAZOP study?",
      answer:
        "You receive a comprehensive audit-ready HAZOP report including study charter, node definitions, completed HAZOP worksheets (listing guide words, parameters, causes, consequences, existing safeguards, and recommendations), risk ranking matrices, and an actionable recommendation tracking log.",
    },
    {
      question: "Can you facilitate remote or hybrid HAZOP workshops?",
      answer:
        "Yes. We conduct virtual, hybrid, or on-site HAZOP facilitation using dedicated software worksheets, interactive screen sharing, and structured node schedules that respect multidisciplinary team availability.",
    },
    {
      question: "How do you handle action items and follow-up tracking?",
      answer:
        "We structure recommendations in an actionable tracking matrix with prioritized risk scores, designated responsible engineering disciplines, and audit-ready resolution sign-off columns.",
    },
  ],
  "architechtural-drawing": [
    {
      question: "What architectural drafting deliverables do you provide?",
      answer:
        "We provide complete architectural drawing sets including 2D floor plans, exterior and interior elevations, building cross-sections, roof plans, reflected ceiling plans (RCP), door/window schedules, and permit-ready drawing packages.",
    },
    {
      question:
        "Can you convert hand sketches or PDFs into permit-ready CAD drawings?",
      answer:
        "Yes. We take architectural sketches, survey measurements, or conceptual layouts and convert them into dimensionally accurate, layered AutoCAD (.DWG) drawings adhering to local building codes and drafting standards.",
    },
    {
      question: "Do you follow specific building codes and drafting standards?",
      answer:
        "We draft in accordance with International Building Code (IBC), International Residential Code (IRC), AIA CAD layer standards, and ADA accessibility guidelines.",
    },
    {
      question:
        "What is the typical turnaround time for architectural drafting sets?",
      answer:
        "Single-sheet plans or redline updates are delivered within 24 to 48 hours. Full permit drawing packages for residential or commercial buildings are typically completed within 3 to 7 business days.",
    },
  ],
  "web-design": [
    {
      question:
        "Why do engineering and industrial companies need specialized web development?",
      answer:
        "Engineering and industrial firms need websites that communicate complex technical capabilities, showcase high-resolution CAD and portfolio deliverables, pass stringent enterprise security reviews, and rank for high-intent B2B search terms on Google. We build custom websites engineered for speed, technical clarity, and high-converting B2B inquiry generation.",
    },
    {
      question: "What technology stack do you use for website development?",
      answer:
        "We develop ultra-modern web applications using React, Next.js, TypeScript, Tailwind CSS, and headless CMS integrations. All sites feature sub-second load times, Core Web Vitals optimization, responsive mobile design, and bank-grade SSL/security.",
    },
    {
      question:
        "How do you ensure SEO optimization for global search ranking?",
      answer:
        "We implement exhaustive technical SEO on every page: semantic HTML5 architecture, JSON-LD Schema markup, optimized metadata and Open Graph tags, automated XML sitemaps, fast server response times, and mobile-first responsiveness.",
    },
    {
      question:
        "Do you provide ongoing maintenance and CMS content management?",
      answer:
        "Yes. All projects include an intuitive CMS interface where your team can effortlessly publish projects, blog articles, and update content without writing code, backed by our technical maintenance support.",
    },
  ],
  "graphic-design": [
    {
      question:
        "What makes your graphic design services suitable for technical and engineering brands?",
      answer:
        "Unlike generic consumer graphic agencies, we understand engineering terminology, blueprints, flow diagrams, and industrial aesthetics. We create technical marketing collateral, vector schematics, 3D rendering presentations, and brand identities that resonate with corporate decision-makers and technical buyers.",
    },
    {
      question:
        "What file formats do you deliver for digital and print media?",
      answer:
        "We deliver vector EPS, AI, SVG, high-resolution 300+ DPI print-ready CMYK PDFs, and optimized RGB assets for web and social channels.",
    },
    {
      question: "Can you create technical illustrations and product diagrams?",
      answer:
        "Yes. We specialize in isometric technical illustrations, exploded component views, process diagrams, and infographic schematics that turn complex technical concepts into clear visual collateral.",
    },
  ],
  "conversion-rate-optimization": [
    {
      question:
        "What is your B2B Conversion Rate Optimization (CRO) methodology?",
      answer:
        "Our methodology combines qualitative UX audits, heuristic evaluation, quantitative funnel analytics, heatmap analysis, and iterative A/B testing to eliminate friction and maximize qualified inquiry conversions.",
    },
    {
      question: "How quickly can we see improvements in conversion rates?",
      answer:
        "Initial high-impact quick wins (form optimization, copy clarity, CTA prominence) are implemented within 1 to 2 weeks, while structured statistical A/B test experiments run across 4 to 8 week validation cycles.",
    },
  ],
};

/* ─────────── Helpers (verbatim) ─────────── */

const toAbsoluteUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin}${path.startsWith("/") ? path : `/${path}`}`;
};

const renderServiceTemplate = (
  value: string | null | undefined,
  serviceName: string,
  fallback: string,
) => {
  const template = value?.trim() || fallback;
  return template.replace(/\{\{\s*service\s*\}\}/gi, serviceName);
};

const findServiceSeoOverride = (
  slug: string,
  service?: ApiServiceRecord | null,
) => {
  const slugCandidates = new Set(
    [slug, service?.slug ?? "", service?.name ?? ""]
      .map((value) => slugifyServiceName(value))
      .filter(Boolean),
  );

  return serviceSeoOverrides.find((override) =>
    override.slugs.some((candidate) =>
      slugCandidates.has(slugifyServiceName(candidate)),
    ),
  );
};

/* ════════════════════════════════════════════════════════ */

const DynamicServicePage = () => {
  const { slug = "" } = useParams();
  const [services, setServices] = useState<ApiServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [serviceFaqs, setServiceFaqs] = useState<ServiceFaqRecord[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqLoadFailed, setFaqLoadFailed] = useState(false);
  const { data: liveProjects, loading: relatedWorksLoading } = useLiveData(
    "projects",
    { cacheTimeMs: 120_000, revalidate: false },
  );

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const apiBase = getApiBaseUrl();

    const loadServices = async () => {
      try {
        const res = await fetch(`${apiBase}/services?status=live`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch services");
        const data = await res.json();
        if (!mounted) return;
        setServices(Array.isArray(data) ? data : []);
        setLoadFailed(false);
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to fetch service page data", error);
        setLoadFailed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadServices();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const service = useMemo(
    () => findServiceBySlug(services, slug),
    [services, slug],
  );
  const card = useMemo(
    () => (service ? buildServiceCardFromApi(service) : null),
    [service],
  );
  const featureCards = useMemo(
    () => (service ? buildServiceFeatureCardsFromApi(service) : []),
    [service],
  );
  const seoOverride = useMemo(
    () => findServiceSeoOverride(slug, service),
    [service, slug],
  );
  const relatedWorks = useMemo(() => {
    if (!service?.id) return [] as RelatedProjectRecord[];

    const normalizedServiceKeys = new Set(
      [service.name, service.slug ?? ""]
        .map((value) => normalizeServiceKey(String(value ?? "")))
        .filter(Boolean),
    );

    return (liveProjects as RelatedProjectRecord[]).filter((project) => {
      if (projectMatchesService(project, service.id)) return true;
      const normalizedCategory = normalizeServiceKey(
        String(project?.category ?? ""),
      );
      return (
        normalizedCategory.length > 0 &&
        normalizedServiceKeys.has(normalizedCategory)
      );
    });
  }, [liveProjects, service]);

  const heroTitle =
    seoOverride?.heroTitle ||
    service?.hero_title?.trim() ||
    service?.name ||
    "Service";
  const heroBadge = service?.hero_badge?.trim() || "Digital Solutions";
  const heroDescription =
    service?.hero_description?.trim() || card?.description || "";
  const sectionBadge = service?.section_badge?.trim() || "What You Get";
  const sectionTitle =
    seoOverride?.sectionTitle ||
    service?.section_title?.trim() ||
    `Complete ${service?.name || "Service"} Solutions`;
  const sectionDescription =
    service?.section_description?.trim() ||
    `We deliver structured and professional ${(
      service?.name || "service"
    ).toLowerCase()} support from planning to final handover.`;
  const panelTitle =
    seoOverride?.panelTitle ||
    service?.section_panel_title?.trim() ||
    "Professional Delivery Stack";
  const panelSubtitle =
    service?.section_panel_subtitle?.trim() ||
    "Built for clarity and dependable output";
  const processBadge = service?.process_badge?.trim() || "Our Process";
  const processTitle =
    seoOverride?.processTitle || service?.process_title?.trim() || "How We Work";
  const pricingBadge = service?.pricing_badge?.trim() || "Pricing Plans";
  const pricingTitle =
    seoOverride?.pricingTitle ||
    service?.pricing_title?.trim() ||
    "Choose Your Plan";
  const pricingDescription =
    service?.pricing_description?.trim() ||
    "All plans require payment before service delivery begins. Custom quotes available for complex projects.";
  const ctaTitlePrefix =
    service?.cta_title_prefix?.trim() || "Ready to Transform Your";
  const ctaTitleHighlight =
    service?.cta_title_highlight?.trim() || "Vision Into Reality?";
  const ctaDescription =
    service?.cta_description?.trim() ||
    "Let's discuss your project and discover how our engineering expertise and creative innovation can help you achieve extraordinary results.";
  const ctaPrimaryLabel =
    seoOverride?.quoteLinkLabel ||
    service?.cta_primary_label?.trim() ||
    "Get Free Consultation";
  const rawCtaPrimaryHref =
    service?.cta_primary_link?.trim() || "/start-project";
  const ctaPrimaryHref =
    rawCtaPrimaryHref === "/contact" ? "/start-project" : rawCtaPrimaryHref;
  const ctaSecondaryLabel =
    seoOverride?.portfolioLinkLabel ||
    service?.cta_secondary_label?.trim() ||
    "View Our Portfolio";
  const ctaSecondaryHref =
    service?.cta_secondary_link?.trim() || "/portfolio";
  const whatsappLabel =
    seoOverride?.whatsappLabel || "Message Us on WhatsApp";
  const faqTitle = seoOverride?.faqTitle || "Frequently Asked Questions";
  const faqLinkLabel = seoOverride?.faqLinkLabel || "View All FAQs";
  const blogLinkLabel = seoOverride?.blogLinkLabel || "Read Service Blog";
  const relatedWorksBadge = service?.related_works_badge?.trim() || "Our Work";
  const relatedWorksTitle = renderServiceTemplate(
    service?.related_works_title,
    service?.name || "Service",
    "Related {{service}} Projects",
  );
  const relatedWorksDescription =
    service?.related_works_description?.trim() ||
    "Live works linked from CMS for this service page appear here automatically.";
  const relatedWorksButtonLabel =
    service?.related_works_button_label?.trim() || "View All Works";
  const relatedWorksButtonLink =
    service?.related_works_button_link?.trim() || "/portfolio";
  const relatedWorksEmptyText =
    service?.related_works_empty_text?.trim() ||
    "No live works are linked to this service yet. Select this service while posting from CMS Live Work to show it here.";

  const deliverables = useMemo(
    () => (service ? buildServiceSectionLeftItemsFromApi(service) : []),
    [service],
  );
  const sideItems = useMemo(
    () =>
      service ? buildServiceSectionPanelItemsFromApi(service, deliverables) : [],
    [deliverables, service],
  );
  const rawSteps = useMemo(
    () => (service ? buildServiceProcessStepsFromApi(service) : []),
    [service],
  );
  const steps: ProcessStep[] = useMemo(
    () => (rawSteps as ProcessStep[]) || [],
    [rawSteps],
  );
  const pricing = useMemo(
    () => (service ? buildServicePricingTiersFromApi(service) : []),
    [service],
  );
  const serviceFilterSlug = useMemo(
    () =>
      service
        ? slugifyServiceName((service.slug || service.name || "").trim())
        : "",
    [service],
  );

  const metaDescription =
    seoOverride?.metaDescription ||
    (service
      ? buildServiceMetaDescriptionFromApi(service)
      : card?.description ||
        "Premium engineering and creative services with clean workflow, accurate technical output, and client-ready delivery.");
  const pageTitle =
    seoOverride?.pageTitle ||
    (service
      ? buildServiceMetaTitleFromApi(service)
      : `${heroTitle} Services | Drawn Dimension`);
  const canonicalPath =
    seoOverride?.canonicalPath || card?.link || `/services/${slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const ogImageUrl = toAbsoluteUrl("/images/logo.png");
  const pageKeywords = useMemo(() => {
    if (!service) return "";
    if (seoOverride) return seoOverride.keywords.join(", ");

    const baseKeywords = [
      `${service.name} services`,
      `${service.name} company`,
      `${service.name} solutions`,
      "engineering services",
      "technical design services",
      "global service provider",
    ];
    const featureKeywords = featureCards.flatMap((feature) => [
      feature.title,
      `${feature.title} service`,
    ]);

    return [...new Set([...baseKeywords, ...featureKeywords])]
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .join(", ");
  }, [featureCards, seoOverride, service]);

  const activeEngineeringSpec = useMemo(() => {
    const key = slugifyServiceName(slug || service?.slug || service?.name || "");
    for (const [k, spec] of Object.entries(SERVICE_STANDARDS_MAP)) {
      if (key === k || key.includes(k) || k.includes(key)) return spec;
    }
    return DEFAULT_ENGINEERING_SPEC;
  }, [service, slug]);

  const activeFaqs = useMemo(() => {
    if (serviceFaqs.length > 0) return serviceFaqs;
    const key = slugifyServiceName(slug || service?.slug || service?.name || "");
    for (const [k, faqs] of Object.entries(FALLBACK_SERVICE_FAQS)) {
      if (key === k || key.includes(k) || k.includes(key)) {
        return faqs.map((f, i) => ({
          id: i + 1,
          question: f.question,
          answer: f.answer,
        }));
      }
    }
    return (FALLBACK_SERVICE_FAQS["autocad"] || []).map((f, i) => ({
      id: i + 1,
      question: f.question,
      answer: f.answer,
    }));
  }, [service, serviceFaqs, slug]);

  const structuredData = useMemo(() => {
    if (!service) return null;

    const serviceUrl = toAbsoluteUrl(canonicalPath);
    const serviceNameText = seoOverride?.schemaName || heroTitle;

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Service",
          "@id": `${serviceUrl}#service`,
          name: serviceNameText,
          description: metaDescription,
          url: serviceUrl,
          provider: {
            "@type": "Organization",
            name: "DrawnDimension",
            url: siteOrigin,
            logo: toAbsoluteUrl("/images/logo.png"),
          },
          areaServed: { "@type": "Place", name: "Worldwide" },
          serviceType: seoOverride?.serviceType || service.name,
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: "499",
            offerCount: "3",
          },
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${serviceUrl}#breadcrumb`,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: siteOrigin,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Services",
              item: `${siteOrigin}/services`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: serviceNameText,
              item: serviceUrl,
            },
          ],
        },
        ...(activeFaqs.length > 0
          ? [
              {
                "@type": "FAQPage",
                "@id": `${serviceUrl}#faq`,
                mainEntity: activeFaqs.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: { "@type": "Answer", text: faq.answer },
                })),
              },
            ]
          : []),
      ],
    };
  }, [activeFaqs, canonicalPath, heroTitle, metaDescription, seoOverride, service]);

  useEffect(() => {
    if (!structuredData) return;

    let schemaScript = document.head.querySelector(
      'script[data-dd-service-schema="true"]',
    ) as HTMLScriptElement | null;
    const createdScript = !schemaScript;
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.type = "application/ld+json";
      schemaScript.setAttribute("data-dd-service-schema", "true");
      document.head.appendChild(schemaScript);
    }
    const previousContent = schemaScript.textContent ?? "";
    schemaScript.textContent = JSON.stringify(structuredData);

    return () => {
      if (createdScript) schemaScript?.remove();
      else if (schemaScript) schemaScript.textContent = previousContent;
    };
  }, [structuredData]);

  useEffect(() => {
    if (!service) return;

    const previousTitle = document.title;
    document.title = pageTitle;

    const upsertMeta = (
      attr: "name" | "property",
      key: string,
      content: string,
    ) => {
      let tag = document.head.querySelector(
        `meta[${attr}="${key}"]`,
      ) as HTMLMetaElement | null;
      const created = !tag;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      const previousContent = tag.getAttribute("content") ?? "";
      tag.setAttribute("content", content);
      return () => {
        if (created) tag?.remove();
        else tag?.setAttribute("content", previousContent);
      };
    };

    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content") ?? "";

    let activeTag = descriptionTag;
    let createdTag = false;
    if (!activeTag) {
      activeTag = document.createElement("meta");
      activeTag.setAttribute("name", "description");
      document.head.appendChild(activeTag);
      createdTag = true;
    }
    activeTag.setAttribute("content", metaDescription);

    const resetKeywords = upsertMeta("name", "keywords", pageKeywords);
    const resetRobots = upsertMeta(
      "name",
      "robots",
      "index, follow, max-image-preview:large",
    );
    const resetOgTitle = upsertMeta("property", "og:title", pageTitle);
    const resetOgDescription = upsertMeta(
      "property",
      "og:description",
      metaDescription,
    );
    const resetOgType = upsertMeta("property", "og:type", "website");
    const resetOgUrl = upsertMeta("property", "og:url", canonicalUrl);
    const resetOgImage = upsertMeta("property", "og:image", ogImageUrl);
    const resetOgSiteName = upsertMeta(
      "property",
      "og:site_name",
      "DrawnDimension",
    );
    const resetTwitterCard = upsertMeta(
      "name",
      "twitter:card",
      "summary_large_image",
    );
    const resetTwitterTitle = upsertMeta("name", "twitter:title", pageTitle);
    const resetTwitterDescription = upsertMeta(
      "name",
      "twitter:description",
      metaDescription,
    );
    const resetTwitterImage = upsertMeta("name", "twitter:image", ogImageUrl);

    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
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
      if (createdTag) activeTag?.remove();
      else activeTag?.setAttribute("content", previousDescription);
      resetKeywords();
      resetRobots();
      resetOgTitle();
      resetOgDescription();
      resetOgType();
      resetOgUrl();
      resetOgImage();
      resetOgSiteName();
      resetTwitterCard();
      resetTwitterTitle();
      resetTwitterDescription();
      resetTwitterImage();
      if (createdCanonical) canonical?.remove();
      else canonical?.setAttribute("href", previousCanonicalHref);
    };
  }, [canonicalUrl, metaDescription, ogImageUrl, pageKeywords, pageTitle, service]);

  useEffect(() => {
    if (loading || service) return;

    const previousTitle = document.title;
    document.title = "Service Not Found | Drawn Dimension";

    const upsertMeta = (
      attr: "name" | "property",
      key: string,
      content: string,
    ) => {
      let tag = document.head.querySelector(
        `meta[${attr}="${key}"]`,
      ) as HTMLMetaElement | null;
      const created = !tag;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      const previousContent = tag.getAttribute("content") ?? "";
      tag.setAttribute("content", content);
      return () => {
        if (created) tag?.remove();
        else tag?.setAttribute("content", previousContent);
      };
    };

    const resetDescription = upsertMeta(
      "name",
      "description",
      "This service page is not available right now. Explore all live services by Drawn Dimension.",
    );
    const resetRobots = upsertMeta("name", "robots", "noindex, follow");
    const resetOgTitle = upsertMeta(
      "property",
      "og:title",
      "Service Not Found | Drawn Dimension",
    );
    const resetOgDescription = upsertMeta(
      "property",
      "og:description",
      "This service page is currently unavailable. Visit the full services page for live offerings.",
    );
    const resetCanonicalUrl = upsertMeta(
      "property",
      "og:url",
      toAbsoluteUrl("/services"),
    );

    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const previousCanonicalHref = canonical.getAttribute("href") ?? "";
    canonical.setAttribute("href", toAbsoluteUrl("/services"));

    return () => {
      document.title = previousTitle;
      resetDescription();
      resetRobots();
      resetOgTitle();
      resetOgDescription();
      resetCanonicalUrl();
      if (createdCanonical) canonical?.remove();
      else canonical?.setAttribute("href", previousCanonicalHref);
    };
  }, [loading, service]);

  useEffect(() => {
    if (!service?.id) {
      setServiceFaqs([]);
      setFaqLoadFailed(false);
      setFaqLoading(false);
      return;
    }

    let mounted = true;
    const controller = new AbortController();
    const apiBase = getApiBaseUrl();

    const loadServiceFaqs = async () => {
      setFaqLoading(true);
      try {
        const res = await fetch(
          `${apiBase}/service-faqs?status=live&serviceId=${encodeURIComponent(
            String(service.id),
          )}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Failed to fetch service FAQs");
        const data = await res.json();
        if (!mounted) return;
        setServiceFaqs(Array.isArray(data) ? (data as ServiceFaqRecord[]) : []);
        setFaqLoadFailed(false);
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to fetch service FAQs", error);
        setServiceFaqs([]);
        setFaqLoadFailed(true);
      } finally {
        if (mounted) setFaqLoading(false);
      }
    };

    loadServiceFaqs();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [service?.id]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main aria-label={heroTitle} className="overflow-hidden">
          {loading ? (
            <section className="min-h-[70vh] flex items-center justify-center">
              <DashedCircleSpinner size={46} />
            </section>
          ) : !service ? (
            <section className="pt-40 pb-24">
              <div className={SHELL}>
                <div className="max-w-xl">
                  <Kicker>Service unavailable</Kicker>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-[-0.03em] text-foreground leading-[1.05]">
                    This service page is not live right now.
                  </h1>
                  <p className="mt-6 text-muted-foreground leading-relaxed">
                    Publish it from CMS Pages to make it publicly available, or
                    browse our full services list.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      to="/services"
                      className={`inline-flex items-center justify-between gap-6 h-[52px] pl-6 pr-5 rounded-full border border-border bg-card/60 backdrop-blur-sm hover:bg-card transition-colors font-medium ${FOCUS_RING}`}
                    >
                      <span>All services</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/start-project"
                      className={`inline-flex items-center justify-between gap-6 h-[52px] pl-6 pr-5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity ${FOCUS_RING}`}
                    >
                      <span>Contact us</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* ═══════════ HERO — split ═══════════ */}
              <section className="relative pt-32 md:pt-40 pb-20 md:pb-28">
                <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-primary/[0.06] blur-[140px] rounded-full -z-10" />

                <div className={SHELL}>
                  <div className="grid grid-cols-12 gap-10 lg:gap-16">
                    <div className="col-span-12 lg:col-span-7">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                      >
                        <Kicker>{heroBadge}</Kicker>
                      </motion.div>

                      <motion.h1
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
                        className="text-[2.25rem] sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4.25rem] font-bold tracking-[-0.035em] text-foreground leading-[1.03] text-balance"
                      >
                        {heroTitle}
                      </motion.h1>

                      {heroDescription ? (
                        <motion.p
                          initial={{ opacity: 0, y: 22 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.7,
                            delay: 0.15,
                            ease: EASE,
                          }}
                          className="mt-8 text-lg md:text-xl text-muted-foreground leading-[1.6] max-w-2xl"
                        >
                          {heroDescription}
                        </motion.p>
                      ) : null}

                      <motion.div
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.7,
                          delay: 0.25,
                          ease: EASE,
                        }}
                        className="mt-10 flex flex-col sm:flex-row gap-3"
                      >
                        <Link
                          to={ctaPrimaryHref}
                          aria-label={ctaPrimaryLabel}
                          className={`group inline-flex items-center justify-between gap-6 h-[54px] pl-7 pr-5 rounded-full bg-foreground text-background font-medium transition-all duration-300 ease-out hover:opacity-90 hover:shadow-[0_14px_44px_-14px_rgba(0,0,0,0.5)] shadow-[0_10px_40px_-14px_rgba(0,0,0,0.35)] ${FOCUS_RING}`}
                        >
                          <span>{ctaPrimaryLabel}</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Link>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={whatsappLabel}
                          className={`group inline-flex items-center justify-between gap-6 h-[54px] pl-7 pr-5 rounded-full border border-border bg-card/60 backdrop-blur-sm transition-colors duration-300 hover:bg-card hover:border-border/80 font-medium ${FOCUS_RING}`}
                        >
                          <span>{whatsappLabel}</span>
                          <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </a>
                      </motion.div>
                    </div>

                    <motion.aside
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                      className="col-span-12 lg:col-span-5 lg:pl-10 lg:border-l border-border"
                    >
                      <div className="space-y-8">
                        <SpecGroup
                          label="Standards & Codes"
                          items={activeEngineeringSpec.standards}
                        />
                        <SpecGroup
                          label="Deliverable Formats"
                          items={activeEngineeringSpec.formats}
                        />
                        <SpecGroup
                          label="Quality Assurance"
                          items={activeEngineeringSpec.highlights}
                        />
                      </div>
                    </motion.aside>
                  </div>
                </div>
              </section>

              {/* ═══════════ FEATURES — 3-col compact grid ═══════════ */}
              {featureCards.length > 0 ? (
                <section className="py-24 md:py-32 border-t border-border">
                  <div className={SHELL}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="max-w-3xl mb-16"
                    >
                      <Kicker>Capabilities</Kicker>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-foreground leading-[1.08]">
                        What this service covers.
                      </h2>
                      <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.75] max-w-xl">
                        Core capabilities delivered under this service — from
                        intake through signed handover.
                      </p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
                      {featureCards.map((feature, index) => {
                        const featureTitle =
                          seoOverride?.featureCardTitles?.[index] ||
                          feature.title;
                        return (
                          <motion.div
                            key={`${featureTitle}-${index}`}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{
                              duration: 0.5,
                              delay: index * 0.05,
                              ease: EASE,
                            }}
                            className="group border-t border-border pt-6 transition-colors hover:border-primary/40"
                          >
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="h-px w-8 bg-border transition-colors group-hover:bg-primary/50" />
                            </div>
                            <h3 className="mt-4 text-base md:text-lg font-semibold text-foreground tracking-[-0.01em] text-balance transition-colors group-hover:text-primary">
                              {featureTitle}
                            </h3>
                            <p className="mt-2.5 text-sm text-muted-foreground leading-[1.7]">
                              {feature.description}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              {/* ═══════════ DELIVERABLES + PANEL ═══════════ */}
              <section className="py-24 md:py-32 border-t border-border">
                <div className={SHELL}>
                  <div className="grid grid-cols-12 gap-10 lg:gap-16">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="col-span-12 lg:col-span-5"
                    >
                      <div className="lg:sticky lg:top-28">
                        <Kicker>{sectionBadge}</Kicker>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-foreground leading-[1.05] text-balance">
                          {sectionTitle}
                        </h2>
                        <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.75] max-w-xl">
                          {sectionDescription}
                        </p>
                      </div>
                    </motion.div>

                    <div className="col-span-12 lg:col-span-7 space-y-12">
                      {deliverables.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-80px" }}
                          transition={{
                            duration: 0.6,
                            delay: 0.05,
                            ease: EASE,
                          }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
                            Deliverables
                          </p>
                          <ul className="border-t border-border">
                            {deliverables.map((item, i) => (
                              <li
                                key={item}
                                className="flex items-start gap-4 py-4 border-b border-border"
                              >
                                <span className="text-xs tabular-nums text-muted-foreground mt-1 w-6 shrink-0">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="text-sm md:text-base text-foreground/90 leading-relaxed">
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      ) : null}

                      {sideItems.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-80px" }}
                          transition={{
                            duration: 0.6,
                            delay: 0.1,
                            ease: EASE,
                          }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
                            Included
                          </p>
                          <div className="rounded-2xl border border-border bg-card/40 p-7 md:p-8">
                            <h3 className="text-base md:text-lg font-semibold text-foreground tracking-[-0.01em]">
                              {panelTitle}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                              {panelSubtitle}
                            </p>
                            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                              {sideItems.slice(0, 6).map((item) => (
                                <div
                                  key={item}
                                  className="flex items-start gap-2"
                                >
                                  <Check
                                    className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0"
                                    strokeWidth={2.25}
                                  />
                                  <span className="text-sm text-foreground/90 leading-snug">
                                    {item}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              {/* ═══════════ INDUSTRIES ═══════════ */}
              <section className="py-24 md:py-32 border-t border-border">
                <div className={SHELL}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="max-w-2xl mb-16"
                  >
                    <Kicker>Industry verticals</Kicker>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-foreground leading-[1.08]">
                      Sectors we work with.
                    </h2>
                    <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.75] max-w-xl">
                      Our documentation and CAD work follow the operational
                      standards required by global industrial sectors.
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                    {INDUSTRIES_SERVED.map((ind, i) => (
                      <motion.div
                        key={ind.title}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{
                          duration: 0.5,
                          delay: i * 0.05,
                          ease: EASE,
                        }}
                        className="border-t border-border pt-6"
                      >
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-3 text-base md:text-lg font-semibold text-foreground tracking-[-0.01em]">
                          {ind.title}
                        </h3>
                        <p className="mt-2.5 text-sm text-muted-foreground leading-[1.7]">
                          {ind.desc}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ═══════════ VERIFICATION PROTOCOL ═══════════ */}
              <section className="py-24 md:py-32 border-t border-border">
                <div className={SHELL}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="max-w-2xl mb-16"
                  >
                    <Kicker>Quality assurance</Kicker>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-foreground leading-[1.08]">
                      Four-stage verification protocol.
                    </h2>
                    <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.75] max-w-xl">
                      Every drawing and model passes the same multi-tier review
                      before sign-off.
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
                    {activeEngineeringSpec.protocolSteps.map((step, idx) => (
                      <motion.div
                        key={step.title}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{
                          duration: 0.5,
                          delay: idx * 0.06,
                          ease: EASE,
                        }}
                        className="border-t border-border pt-6"
                      >
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {String(idx + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-3 text-base font-semibold text-foreground tracking-[-0.01em]">
                          {step.title}
                        </h3>
                        <p className="mt-2.5 text-sm text-muted-foreground leading-[1.7]">
                          {step.desc}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ═══════════ PROCESS — horizontal numbered stepper (NEW) ═══════════ */}
              {steps.length > 0 ? (
                <section className="py-24 md:py-32 border-t border-border">
                  <div className={SHELL}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="max-w-3xl mb-16"
                    >
                      <Kicker>{processBadge}</Kicker>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-foreground leading-[1.08] text-balance">
                        {processTitle}
                      </h2>
                      <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.75] max-w-xl">
                        Four phases, agreed upfront. Each one closes with a
                        reviewable output before the next begins.
                      </p>
                    </motion.div>

                    {/* Horizontal stepper with connector line */}
                    <div className="relative">
                      {/* Gradient connector line — desktop */}
                      <div className="hidden lg:block absolute top-[11px] left-[11px] right-[11px] h-px bg-gradient-to-r from-primary/40 via-primary/25 to-primary/10" />

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                        {steps.map((step, idx) => {
                          const stepTitle =
                            step.title || step.name || `Step ${idx + 1}`;
                          const stepDesc = step.description || step.desc || "";
                          return (
                            <motion.div
                              key={`${stepTitle}-${idx}`}
                              initial={{ opacity: 0, y: 14 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, margin: "-50px" }}
                              transition={{
                                duration: 0.5,
                                delay: idx * 0.08,
                                ease: EASE,
                              }}
                              className="relative"
                            >
                              {/* Node — desktop only */}
                              <div className="hidden lg:flex items-center mb-8 h-[22px]">
                                <span className="h-[22px] w-[22px] rounded-full border-2 border-primary bg-background flex items-center justify-center">
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                </span>
                              </div>

                              {/* Mobile-only rule */}
                              <div className="lg:hidden border-t border-border mb-5" />

                              <p className="text-xs tabular-nums text-muted-foreground">
                                Phase {String(idx + 1).padStart(2, "0")}
                              </p>
                              <h3 className="mt-3 text-base md:text-lg font-semibold text-foreground tracking-[-0.01em]">
                                {stepTitle}
                              </h3>
                              {stepDesc ? (
                                <p className="mt-2.5 text-sm text-muted-foreground leading-[1.7]">
                                  {stepDesc}
                                </p>
                              ) : null}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {/* ═══════════ PRICING (shared) ═══════════ */}
              <PricingCards
                tiers={pricing}
                badge={pricingBadge}
                title={pricingTitle}
                description={pricingDescription}
              />

              {/* ═══════════ RELATED WORKS ═══════════ */}
              <section className="py-24 md:py-32 border-t border-border">
                <div className={SHELL}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14"
                  >
                    <div className="max-w-3xl">
                      <Kicker>{relatedWorksBadge}</Kicker>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] text-foreground leading-[1.1]">
                        {relatedWorksTitle}
                      </h2>
                      <p className="mt-5 text-base text-muted-foreground leading-relaxed">
                        {relatedWorksDescription}
                      </p>
                    </div>

                    <div className="flex items-center gap-5 lg:self-end">
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80 font-medium tabular-nums whitespace-nowrap">
                        {relatedWorks.length}{" "}
                        {relatedWorks.length === 1 ? "work" : "works"}
                      </span>
                      <Link
                        to={relatedWorksButtonLink}
                        className={`inline-flex items-center gap-2 h-[48px] px-6 rounded-full border border-border bg-card/60 backdrop-blur-sm text-sm font-medium hover:bg-card transition-colors ${FOCUS_RING}`}
                      >
                        <span>{relatedWorksButtonLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>

                  {relatedWorksLoading ? (
                    <div className="py-16 flex items-center justify-center">
                      <DashedCircleSpinner size={34} />
                    </div>
                  ) : relatedWorks.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="max-w-2xl"
                    >
                      <div className="border-t border-border pt-8">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Samples available on request
                        </p>
                        <h3 className="mt-4 text-2xl md:text-3xl font-bold tracking-[-0.02em] text-foreground leading-[1.15]">
                          Confidential project samples & drawing packages.
                        </h3>
                        <p className="mt-4 text-sm md:text-base text-muted-foreground leading-[1.75]">
                          Due to industrial client NDAs, proprietary diagrams and
                          mechanical models are protected. We provide sanitized
                          sample packages, redline examples, and client
                          references upon inquiry.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                          <Link
                            to="/start-project"
                            className={`group inline-flex items-center justify-between gap-6 h-[48px] pl-6 pr-5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity ${FOCUS_RING}`}
                          >
                            <span>Request sample drawings</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                          <Link
                            to="/portfolio"
                            className={`inline-flex items-center justify-between gap-6 h-[48px] pl-6 pr-5 rounded-full border border-border bg-card/60 backdrop-blur-sm hover:bg-card transition-colors font-medium ${FOCUS_RING}`}
                          >
                            <span>Public portfolio</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                        <p className="mt-6 text-xs text-muted-foreground/80">
                          {relatedWorksEmptyText}
                        </p>
                      </div>
                    </motion.div>
                  ) : relatedWorks.length === 1 ? (
                    <div className="flex justify-center">
                      <div className="w-full max-w-[560px]">
                        {relatedWorks.map((project) => {
                          const description =
                            getRelatedWorkDescriptionPreview(project.description);

                          return (
                            <Link
                              key={project.id}
                              to={`/portfolio/${encodeURIComponent(
                                String(project.id),
                              )}`}
                              className={`group block h-full rounded-2xl ${FOCUS_RING}`}
                            >
                              <div className="h-full flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm transition-all duration-400 ease-out hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.28)]">
                                <RelatedWorkMedia
                                  project={project}
                                  eagerImage
                                />
                                <div className="p-7 flex flex-1 flex-col">
                                  <h3 className="text-xl font-semibold tracking-[-0.01em] text-foreground mb-3 group-hover:text-primary transition-colors">
                                    {project.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground leading-[1.7] mb-8">
                                    {description.text}
                                    {description.truncated ? (
                                      <span className="ml-1 font-medium text-foreground/90">
                                        Read more…
                                      </span>
                                    ) : null}
                                  </p>
                                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                                    <span className="text-xs text-muted-foreground">
                                      {project.client?.trim() || "Live project"}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                                      View work
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Carousel
                        opts={{
                          align: "start",
                          loop: relatedWorks.length > 3,
                        }}
                        className="w-full"
                      >
                        <CarouselContent className="-ml-4 md:-ml-5 items-stretch">
                          {relatedWorks.map((project, index) => {
                            const description =
                              getRelatedWorkDescriptionPreview(
                                project.description,
                              );

                            return (
                              <CarouselItem
                                key={project.id}
                                className="pl-4 md:pl-5 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                              >
                                <Link
                                  to={`/portfolio/${encodeURIComponent(
                                    String(project.id),
                                  )}`}
                                  className={`group block h-full rounded-2xl ${FOCUS_RING}`}
                                >
                                  <div className="h-full flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm transition-all duration-400 ease-out hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.28)]">
                                    <RelatedWorkMedia
                                      project={project}
                                      eagerImage={index < 3}
                                    />
                                    <div className="p-6 flex flex-1 flex-col">
                                      <h3
                                        className="text-lg font-semibold tracking-[-0.01em] text-foreground mb-2 min-h-14 overflow-hidden group-hover:text-primary transition-colors"
                                        style={{
                                          display: "-webkit-box",
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: "vertical",
                                        }}
                                      >
                                        {project.title}
                                      </h3>
                                      <p
                                        className="text-sm text-muted-foreground leading-[1.7] mb-6 min-h-[6.5rem] overflow-hidden"
                                        style={{
                                          display: "-webkit-box",
                                          WebkitLineClamp: 4,
                                          WebkitBoxOrient: "vertical",
                                        }}
                                      >
                                        {description.text}
                                        {description.truncated ? (
                                          <span className="ml-1 font-medium text-foreground/90">
                                            Read more…
                                          </span>
                                        ) : null}
                                      </p>
                                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                                        <span className="text-xs text-muted-foreground truncate">
                                          {project.client?.trim() ||
                                            "Live project"}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary shrink-0">
                                          View work
                                          <ArrowRight className="w-3.5 h-3.5" />
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              </CarouselItem>
                            );
                          })}
                        </CarouselContent>
                        {relatedWorks.length > 1 ? (
                          <>
                            <CarouselPrevious className="hidden md:inline-flex -left-3 border-border bg-background/90 hover:bg-foreground hover:text-background transition-colors" />
                            <CarouselNext className="hidden md:inline-flex -right-3 border-border bg-background/90 hover:bg-foreground hover:text-background transition-colors" />
                          </>
                        ) : null}
                      </Carousel>
                    </div>
                  )}
                </div>
              </section>

              {/* ═══════════ FAQ ═══════════ */}
              <section className="py-24 md:py-32 border-t border-border">
                <div className={SHELL}>
                  <div className="grid grid-cols-12 gap-10 lg:gap-16">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="col-span-12 lg:col-span-4"
                    >
                      <div className="lg:sticky lg:top-28">
                        <Kicker>FAQ</Kicker>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-foreground leading-[1.1]">
                          {faqTitle}
                        </h2>
                        <p className="mt-5 text-sm text-muted-foreground leading-[1.7] max-w-sm">
                          Answers about process, revisions, and delivery for{" "}
                          <span className="text-foreground/90 font-medium">
                            {service.name}
                          </span>
                          .
                        </p>

                        <div className="mt-8 flex flex-wrap gap-2">
                          <Link
                            to={
                              serviceFilterSlug
                                ? `/faq?service=${encodeURIComponent(
                                    serviceFilterSlug,
                                  )}`
                                : "/faq"
                            }
                            aria-label={faqLinkLabel}
                            className={`inline-flex items-center gap-2 h-[40px] px-4 rounded-full border border-border bg-card/60 backdrop-blur-sm text-xs font-medium hover:bg-card transition-colors ${FOCUS_RING}`}
                          >
                            <span>{faqLinkLabel}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          <Link
                            to={
                              serviceFilterSlug
                                ? `/blog?service=${encodeURIComponent(
                                    serviceFilterSlug,
                                  )}`
                                : "/blog"
                            }
                            aria-label={blogLinkLabel}
                            className={`inline-flex items-center gap-2 h-[40px] px-4 rounded-full border border-border bg-card/60 backdrop-blur-sm text-xs font-medium hover:bg-card transition-colors ${FOCUS_RING}`}
                          >
                            <span>{blogLinkLabel}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                      className="col-span-12 lg:col-span-8"
                    >
                      {faqLoading ? (
                        <div className="py-12 flex items-center justify-center">
                          <DashedCircleSpinner size={32} />
                        </div>
                      ) : (
                        <Accordion type="single" collapsible className="w-full">
                          {activeFaqs.map((faq) => (
                            <AccordionItem
                              key={faq.id}
                              value={`service-faq-${faq.id}`}
                              className="border-b border-border last:border-b-0"
                            >
                              <AccordionTrigger
                                className={`text-left font-medium text-foreground hover:no-underline py-6 text-base md:text-lg tracking-[-0.005em] rounded-sm ${FOCUS_RING}`}
                              >
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="text-muted-foreground text-sm md:text-base leading-[1.75] pb-6 max-w-3xl whitespace-pre-wrap">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}

                      {faqLoadFailed ? (
                        <p className="mt-3 text-xs text-muted-foreground/80">
                          FAQ data may be temporarily unavailable due to a
                          network issue.
                        </p>
                      ) : null}
                    </motion.div>
                  </div>
                </div>
              </section>

              {loadFailed ? (
                <div
                  className={`${SHELL} pb-8 text-center text-xs text-muted-foreground/80`}
                >
                  Live service details may be temporarily stale due to a
                  network issue.
                </div>
              ) : null}

              {/* ═══════════ CTA (shared) ═══════════ */}
              <CTASection
                titlePrefix={ctaTitlePrefix}
                titleHighlight={ctaTitleHighlight}
                description={ctaDescription}
                primaryLabel={ctaPrimaryLabel}
                primaryHref={ctaPrimaryHref}
                secondaryLabel={ctaSecondaryLabel}
                secondaryHref={ctaSecondaryHref}
              />
            </>
          )}
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

/* Hero spec panel helper */
const SpecGroup = ({
  label,
  items,
}: {
  label: string;
  items: string[];
}) => (
  <div>
    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
      {label}
    </p>
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="text-xs px-2.5 py-1 rounded-full border border-border bg-card/50 text-foreground/80"
        >
          {item}
        </span>
      ))}
    </div>
  </div>
);

export default DynamicServicePage;