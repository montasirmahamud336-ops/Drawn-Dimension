export const PRODUCT_CATEGORY_OPTIONS = [
  "WordPress Website",
  "E-commerce Website",
  "Portfolio Website",
  "Realstate Website",
  "Python Tools",
] as const;

export const WEB_DESIGN_CATEGORIES = PRODUCT_CATEGORY_OPTIONS.filter(
  (category) => category !== "Python Tools",
);

export const PYTHON_TOOLS_CATEGORY = "Python Tools" as const;

