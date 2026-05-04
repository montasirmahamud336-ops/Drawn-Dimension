import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  ClipboardCheck,
  FileText,
  Globe2,
  Inbox,
  LayoutDashboard,
  MessageCircleMore,
  MessageSquare,
  MessageSquareText,
  ShieldPlus,
  ShoppingBag,
  Users,
  UserSquare2,
} from "lucide-react";

type CMSNavItemDef = {
  id: string;
  label: string;
  description: string;
  segment: string;
  aliases?: string[];
  icon: LucideIcon;
  ownerOnly?: boolean;
};

type CMSNavSectionDef = {
  id: string;
  label: string;
  items: CMSNavItemDef[];
};

export type CMSResolvedNavItem = CMSNavItemDef & {
  href: string;
  sectionId: string;
  sectionLabel: string;
};

export type CMSResolvedNavSection = {
  id: string;
  label: string;
  items: CMSResolvedNavItem[];
};

const cmsNavigationSections: CMSNavSectionDef[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Quick stats, activity summary, and shortcut overview.",
        segment: "",
        aliases: ["dashboard"],
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      {
        id: "team",
        label: "Team Management",
        description: "Leadership and public employee cards shown on the Team page.",
        segment: "team",
        icon: Users,
      },
      {
        id: "works",
        label: "Works",
        description: "Portfolio projects, media, PDF uploads, and display order.",
        segment: "works",
        aliases: ["upload"],
        icon: Briefcase,
      },
      {
        id: "products",
        label: "Products",
        description: "Product catalog, visibility, and storefront content.",
        segment: "products",
        icon: ShoppingBag,
      },
      {
        id: "reviews",
        label: "Reviews",
        description: "Client testimonials, ratings, and review publishing.",
        segment: "reviews",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "employees",
        label: "Employees",
        description: "Team accounts, employee records, and access-linked profiles.",
        segment: "employees",
        icon: UserSquare2,
      },
      {
        id: "work-assign",
        label: "Work Assignments",
        description: "Project assignment flow, delivery tracking, and deadlines.",
        segment: "work-assign",
        icon: ClipboardCheck,
      },
      {
        id: "sent-invoice",
        label: "Sent Invoice",
        description: "Monthly employee invoice builder, email sending, and sent invoice history.",
        segment: "sent-invoice",
        icon: FileText,
      },
      {
        id: "chat",
        label: "Employee Chat",
        description: "Internal employee conversations and attachment history.",
        segment: "chat",
        icon: MessageCircleMore,
      },
      {
        id: "live-chat",
        label: "Live Chat",
        description: "Incoming visitor chats, requests, and conversation status.",
        segment: "live-chat",
        icon: MessageSquareText,
      },
      {
        id: "form-massage",
        label: "Form Messages",
        description: "Contact form submissions and lead inbox management.",
        segment: "form-massage",
        icon: Inbox,
      },

      {
  id: "inquiries",
  label: "Inquiries",
  description: "Project inquiries from the Start Project page.",
  segment: "inquiries",
  icon: Inbox,   // Inbox ইতিমধ্যেই import করা আছে উপরের দিকে
},
    ],
  },
  {
    id: "site",
    label: "Site Setup",
    items: [
      {
        id: "pages",
        label: "Pages",
        description: "Home page, services, FAQ, and other editable page sections.",
        segment: "pages",
        icon: FileText,
      },
      {
        id: "header-footer",
        label: "Header & Footer",
        description: "Navigation links, footer items, and auto service menus.",
        segment: "header-footer",
        icon: FileText,
      },
      {
        id: "world-map",
        label: "World Map",
        description: "Global reach highlights and country completion markers.",
        segment: "world-map",
        icon: Globe2,
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      {
        id: "give-access",
        label: "Access Control",
        description: "Create admins, roles, and manage privileged workspace access.",
        segment: "give-access",
        icon: ShieldPlus,
        ownerOnly: true,
      },
    ],
  },
];

const flattenNavigationItems = () =>
  cmsNavigationSections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionId: section.id,
      sectionLabel: section.label,
    }))
  );

const flatCMSNavigationItems = flattenNavigationItems();

const normalizePathname = (pathname: string) => {
  const [pathOnly] = String(pathname ?? "").split(/[?#]/);
  const normalized = pathOnly.replace(/\/+$/, "");
  return normalized || "/";
};

export const getCMSBasePath = (pathname: string) =>
  normalizePathname(pathname).startsWith("/database") ? "/database" : "/cms";

const getCMSSegment = (pathname: string) => {
  const normalized = normalizePathname(pathname);
  const basePath = getCMSBasePath(normalized);
  const remainder = normalized.slice(basePath.length).replace(/^\/+/, "");
  return remainder.split("/")[0] ?? "";
};

export const buildCMSHref = (basePath: string, segment: string) =>
  segment ? `${basePath}/${segment}` : basePath;

export const resolveCMSRoute = (pathname: string): CMSResolvedNavItem => {
  const segment = getCMSSegment(pathname);
  const matched =
    flatCMSNavigationItems.find((item) => item.segment === segment || item.aliases?.includes(segment)) ??
    flatCMSNavigationItems[0];

  return {
    ...matched,
    href: buildCMSHref(getCMSBasePath(pathname), matched.segment),
  };
};

export const getCMSNavigationSections = (
  basePath: string,
  isMainAdmin: boolean
): CMSResolvedNavSection[] =>
  cmsNavigationSections
    .map((section) => ({
      id: section.id,
      label: section.label,
      items: section.items
        .filter((item) => !item.ownerOnly || isMainAdmin)
        .map((item) => ({
          ...item,
          href: buildCMSHref(basePath, item.segment),
          sectionId: section.id,
          sectionLabel: section.label,
        })),
    }))
    .filter((section) => section.items.length > 0);
