const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "a",
  "span",
  "blockquote",
  "code",
  "pre",
]);

const BLOCKED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "meta", "link"]);
const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-weight",
  "font-style",
  "font-family",
  "text-decoration",
  "text-align",
  "font-size",
  "line-height",
]);

const sanitizeHref = (href: string) => {
  const value = href.trim();
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("/") ||
    value.startsWith("#")
  ) {
    return value;
  }
  return "";
};

const sanitizeStyleValue = (styleValue: string) =>
  styleValue
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const [rawProp, ...restValue] = declaration.split(":");
      const prop = String(rawProp || "").trim().toLowerCase();
      const value = restValue.join(":").trim();
      if (!ALLOWED_STYLE_PROPS.has(prop)) return "";
      if (!value) return "";
      const lowered = value.toLowerCase();
      if (lowered.includes("javascript:") || lowered.includes("expression(") || lowered.includes("url(")) return "";
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");

const unwrapElement = (element: Element) => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

const sanitizeNode = (node: Node) => {
  Array.from(node.childNodes).forEach((child) => sanitizeNode(child));

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  if (BLOCKED_TAGS.has(tag)) {
    element.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    unwrapElement(element);
    return;
  }

  Array.from(element.attributes).forEach((attribute) => {
    const attrName = attribute.name.toLowerCase();
    const attrValue = attribute.value ?? "";

    if (attrName.startsWith("on")) {
      element.removeAttribute(attribute.name);
      return;
    }

    if (attrName === "href" && tag === "a") {
      const cleanHref = sanitizeHref(attrValue);
      if (!cleanHref) {
        element.removeAttribute("href");
        return;
      }
      element.setAttribute("href", cleanHref);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
      return;
    }

    if (attrName === "style") {
      const cleanStyle = sanitizeStyleValue(attrValue);
      if (!cleanStyle) {
        element.removeAttribute("style");
      } else {
        element.setAttribute("style", cleanStyle);
      }
      return;
    }

    if (attrName === "data-heading-level" && tag === "p" && attrValue === "7") {
      return;
    }

    if (attrName === "target" || attrName === "rel") {
      if (tag === "a") return;
      element.removeAttribute(attribute.name);
      return;
    }

    if (attrName === "class") {
      element.removeAttribute("class");
      return;
    }

    if (!["href", "style"].includes(attrName)) {
      element.removeAttribute(attribute.name);
    }
  });
};

const normalizeRichTextHtml = (html: string) => {
  const cleaned = html
    .replace(/<div><br><\/div>/gi, "")
    .replace(/<p><br><\/p>/gi, "")
    .replace(/&nbsp;/gi, " ");
  return cleaned.trim();
};

export const stripHtmlToText = (value: string) =>
  String(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeRichHtml = (value: string) => {
  const source = String(value ?? "");
  if (!source.trim()) return "";

  if (typeof window === "undefined") {
    return normalizeRichTextHtml(source);
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(`<div>${source}</div>`, "text/html");
  const root = documentNode.body.firstElementChild;
  if (!root) return "";

  sanitizeNode(root);
  return normalizeRichTextHtml(root.innerHTML);
};
