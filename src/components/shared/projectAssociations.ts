export type ProjectAssociationRecord = {
  category?: unknown;
  linked_service_ids?: unknown;
  service_id?: unknown;
};

const normalizeText = (value: unknown) => String(value ?? "").trim();
export const normalizeProjectCategoryOption = (value: unknown) =>
  normalizeText(value).replace(/\s+/g, " ");

const normalizeServiceId = (value: unknown) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const parseArrayString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return [] as unknown[];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to PostgreSQL array-style parsing.
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const normalizeProjectServiceIds = (value: unknown): number[] => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? parseArrayString(value)
      : [];

  const seen = new Set<number>();
  const normalized: number[] = [];

  source.forEach((item) => {
    const serviceId = normalizeServiceId(item);
    if (!serviceId || seen.has(serviceId)) return;
    seen.add(serviceId);
    normalized.push(serviceId);
  });

  return normalized;
};

export const getProjectCategoryLabel = (value: unknown) => {
  const category = normalizeProjectCategoryOption(value);
  return category || "Uncategorized";
};

export const normalizePortfolioFilterCategories = (value: unknown) => {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  source.forEach((item) => {
    const category = normalizeProjectCategoryOption(item);
    if (!category || seen.has(category)) return;
    seen.add(category);
    normalized.push(category);
  });

  return normalized;
};

export const getPortfolioFilterCategories = (settings: unknown) => {
  const source = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
  const sections = source.sections && typeof source.sections === "object"
    ? (source.sections as Record<string, unknown>)
    : {};
  const portfolio = sections.portfolio && typeof sections.portfolio === "object"
    ? (sections.portfolio as Record<string, unknown>)
    : {};

  return normalizePortfolioFilterCategories(portfolio.filter_categories);
};

export const applyPortfolioFilterCategories = (settings: unknown, categories: string[]) => {
  const source = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
  const sections = source.sections && typeof source.sections === "object"
    ? { ...(source.sections as Record<string, unknown>) }
    : {};
  const portfolio = sections.portfolio && typeof sections.portfolio === "object"
    ? { ...(sections.portfolio as Record<string, unknown>) }
    : {};

  portfolio.filter_categories = normalizePortfolioFilterCategories(categories);
  sections.portfolio = portfolio;

  return {
    ...source,
    sections,
  };
};

export const buildProjectCategoryFilters = (
  projects: ProjectAssociationRecord[],
  managedCategories: string[] = []
) => {
  const seen = new Set<string>();
  const categories = ["All"];

  normalizePortfolioFilterCategories(managedCategories).forEach((category) => {
    if (seen.has(category)) return;
    seen.add(category);
    categories.push(category);
  });

  projects.forEach((project) => {
    const category = getProjectCategoryLabel(project?.category);
    if (seen.has(category)) return;
    seen.add(category);
    categories.push(category);
  });

  return categories;
};

export const projectMatchesService = (project: ProjectAssociationRecord, serviceId: number | null | undefined) => {
  if (!serviceId) return false;

  const linkedServiceIds = normalizeProjectServiceIds(project?.linked_service_ids);
  if (linkedServiceIds.length > 0) {
    return linkedServiceIds.includes(serviceId);
  }

  const legacyServiceId = normalizeServiceId(project?.service_id);
  return legacyServiceId === serviceId;
};
