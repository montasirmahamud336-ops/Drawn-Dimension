export type ProjectMediaType = "image" | "video" | "pdf";

export type ProjectMediaItem = {
  url: string;
  type: ProjectMediaType;
  name?: string | null;
};

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".ogg"];
const PDF_EXTENSIONS = [".pdf"];

const hasMatchingExtension = (value: string, extensions: string[]) => {
  const normalized = value.toLowerCase();
  return extensions.some((extension) => normalized.includes(extension));
};

export const detectProjectMediaType = (value: string) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "image" as const;
  if (hasMatchingExtension(normalized, PDF_EXTENSIONS)) return "pdf" as const;
  if (hasMatchingExtension(normalized, VIDEO_EXTENSIONS)) return "video" as const;
  return "image" as const;
};

const normalizeMediaEntry = (entry: any): ProjectMediaItem | null => {
  if (typeof entry?.url !== "string" || entry.url.trim().length === 0) {
    return null;
  }

  const explicitType = entry.type === "image" || entry.type === "video" || entry.type === "pdf"
    ? entry.type
    : null;

  return {
    url: entry.url,
    type: explicitType ?? detectProjectMediaType(entry.url),
    name: typeof entry?.name === "string" && entry.name.trim().length > 0 ? entry.name.trim() : null,
  };
};

export const getProjectMediaList = (item: any): ProjectMediaItem[] => {
  if (Array.isArray(item?.media) && item.media.length > 0) {
    return item.media
      .map(normalizeMediaEntry)
      .filter((entry): entry is ProjectMediaItem => Boolean(entry));
  }

  if (typeof item?.image_url === "string" && item.image_url.trim().length > 0) {
    return [{ url: item.image_url, type: detectProjectMediaType(item.image_url), name: null }];
  }

  return [];
};

export const getProjectPdfDocument = (item: any) =>
  getProjectMediaList(item).find((media) => media.type === "pdf") ?? null;

export const getProjectVisualMedia = (item: any) =>
  getProjectMediaList(item).filter((media) => media.type !== "pdf");

export const getProjectPrimaryImageUrl = (media: ProjectMediaItem[]) =>
  media.find((item) => item.type === "image")?.url ?? null;

export const getProjectPrimaryCardMedia = (item: any) => {
  const media = getProjectMediaList(item);
  return media.find((entry) => entry.type === "image")
    ?? media.find((entry) => entry.type === "video")
    ?? media.find((entry) => entry.type === "pdf")
    ?? null;
};

