export type ContentStatus = "live" | "draft";

export type ServiceBasic = {
  id: number;
  name: string;
  slug?: string | null;
  status?: ContentStatus;
};

export type ServiceFaqRecord = {
  id: number;
  service_id: number;
  question: string;
  answer: string;
  status: ContentStatus;
  display_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ServiceBlogRecord = {
  id: number;
  service_id: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url?: string | null;
  status: ContentStatus;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const slugifyText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
