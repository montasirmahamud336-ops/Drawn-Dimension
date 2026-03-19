export type HeaderFooterLink = {
  id: string;
  label: string;
  href: string;
};

export type HeaderFooterSettings = {
  header_links: HeaderFooterLink[];
  footer_links: HeaderFooterLink[];
  header_service_order: number[];
  footer_service_order: number[];
  updated_at: string | null;
  needs_migration?: boolean;
};

export const DEFAULT_HEADER_LINKS: HeaderFooterLink[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "about", label: "About", href: "/about" },
  { id: "services", label: "Services", href: "/services" },
  { id: "products", label: "Products", href: "/products" },
  { id: "our-works", label: "Our Works", href: "/portfolio" },
  { id: "reviews", label: "Reviews", href: "/testimonials" },
  { id: "contact", label: "Contact", href: "/contact" },
];

export const DEFAULT_FOOTER_LINKS: HeaderFooterLink[] = [
  { id: "about-us", label: "About Us", href: "/about" },
  { id: "our-portfolio", label: "Our Portfolio", href: "/portfolio" },
  { id: "testimonials", label: "Testimonials", href: "/testimonials" },
  { id: "faq", label: "FAQ", href: "/faq" },
  { id: "blog", label: "Blog", href: "/blog" },
  { id: "contact", label: "Contact", href: "/contact" },
];

export const DEFAULT_FOOTER_SERVICE_LINKS: HeaderFooterLink[] = [
  { id: "service-web-development", label: "Web Development", href: "/services/web-design" },
  { id: "service-autocad", label: "AutoCAD Drawings", href: "/services/autocad" },
  { id: "service-solidworks", label: "3D SolidWorks", href: "/services/solidworks" },
  { id: "service-pfd-pid", label: "P&ID Diagrams", href: "/services/pfd-pid" },
  { id: "service-hazop", label: "HAZOP Studies", href: "/services/hazop" },
  { id: "service-graphic-design", label: "Graphic Design", href: "/services/graphic-design" },
];

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeOrderList = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<number>();
  for (const item of value) {
    const id = Number(item);
    if (!Number.isInteger(id) || id <= 0) continue;
    unique.add(id);
  }
  return Array.from(unique);
};

const normalizeId = (value: unknown, fallbackPrefix: string, index: number) => {
  const candidate = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return candidate || `${fallbackPrefix}-${index + 1}`;
};

const cloneLinks = (items: HeaderFooterLink[]) => items.map((item) => ({ ...item }));

const normalizeLinks = (
  value: unknown,
  fallback: HeaderFooterLink[],
  fallbackPrefix: "header" | "footer"
): HeaderFooterLink[] => {
  if (!Array.isArray(value)) {
    return cloneLinks(fallback);
  }

  const seenIds = new Set<string>();
  const result: HeaderFooterLink[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawItem = value[index];
    if (!rawItem || typeof rawItem !== "object") continue;

    const item = rawItem as Partial<HeaderFooterLink>;
    const label = normalizeText(item.label);
    const href = normalizeText(item.href);
    if (!label || !href) continue;

    const baseId = normalizeId(item.id ?? label, fallbackPrefix, index);
    let id = baseId;
    let suffix = 1;
    while (seenIds.has(id)) {
      suffix += 1;
      id = `${baseId}-${suffix}`;
    }

    seenIds.add(id);
    result.push({ id, label, href });
  }

  if (result.length === 0) {
    return cloneLinks(fallback);
  }

  return result;
};

export const normalizeHeaderFooterSettings = (value: unknown): HeaderFooterSettings => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    header_links: normalizeLinks(source.header_links, DEFAULT_HEADER_LINKS, "header"),
    footer_links: normalizeLinks(source.footer_links, DEFAULT_FOOTER_LINKS, "footer"),
    header_service_order: normalizeOrderList(source.header_service_order),
    footer_service_order: normalizeOrderList(source.footer_service_order),
    updated_at: typeof source.updated_at === "string" ? source.updated_at : null,
    needs_migration: Boolean(source.needs_migration),
  };
};

export const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href.trim());
