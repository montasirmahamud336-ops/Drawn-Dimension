import { supabase } from "@/integrations/supabase/client";
import { getReviewsApiBase } from "@/components/shared/reviewsApi";

export interface Review {
  id: string;
  name: string;
  role: string;
  image: string | null;
  content: string;
  rating: number;
  project: string;
  createdAt: string;
}

export interface ReviewSubmission {
  name: string;
  role: string;
  content: string;
  project: string;
  rating: number;
  image?: string | null;
}

type ReviewRow = {
  id?: string;
  name?: string | null;
  role?: string | null;
  image_url?: string | null;
  image?: string | null;
  avatar_url?: string | null;
  content?: string | null;
  review?: string | null;
  message?: string | null;
  text?: string | null;
  rating?: number | null;
  stars?: number | null;
  score?: number | null;
  service_tag?: string | null;
  project?: string | null;
  service?: string | null;
  category?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  display_order?: number | null;
  is_published?: boolean | null;
  status?: string | null;
};

const MAX_NAME_LENGTH = 80;
const MAX_ROLE_LENGTH = 120;
const MAX_SERVICE_LENGTH = 60;
const MAX_CONTENT_LENGTH = 4000;

const sanitizeText = (value: string | null | undefined, fallback: string, maxLength: number) => {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return fallback;
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const normalizeRating = (rating: number | null | undefined) => {
  if (!Number.isFinite(rating)) {
    return 5;
  }

  const rounded = Math.round(Number(rating));
  return Math.min(5, Math.max(1, rounded));
};

const mapReviewRow = (row: ReviewRow, index: number): Review => {
  const image = row.image_url ?? row.image ?? row.avatar_url ?? null;
  const content = row.content ?? row.review ?? row.message ?? row.text ?? null;
  const rating = row.rating ?? row.stars ?? row.score ?? null;
  const project = row.service_tag ?? row.project ?? row.service ?? row.category ?? null;
  const createdAt = row.created_at ?? row.updated_at ?? new Date(0).toISOString();

  return {
    id: row.id ?? `review-${index}`,
    name: sanitizeText(row.name, "Anonymous Client", MAX_NAME_LENGTH),
    role: sanitizeText(row.role, "Verified Client", MAX_ROLE_LENGTH),
    image: image?.trim() ? image.trim() : null,
    content: sanitizeText(content, "No review details were provided.", MAX_CONTENT_LENGTH),
    rating: normalizeRating(rating),
    project: sanitizeText(project, "General Service", MAX_SERVICE_LENGTH),
    createdAt,
  };
};

const isPublished = (row: ReviewRow) => {
  if (typeof row.is_published === "boolean") {
    return row.is_published;
  }

  if (typeof row.status === "string") {
    const s = row.status.toLowerCase();
    return s === "published" || s === "live";
  }

  return true;
};

const isRecoverableQueryError = (error: { code?: string; message?: string }) => {
  if (error.code && ["42P01", "42703", "PGRST205", "42501"].includes(error.code)) {
    return true;
  }

  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("column") && message.includes("not found") ||
    message.includes("permission denied") ||
    message.includes("row-level security policy")
  );
};

export const fetchPublishedReviews = async (): Promise<Review[]> => {
  try {
    const response = await fetch(`${getReviewsApiBase()}/reviews?status=live`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      image: item.image_url,
      content: item.content,
      rating: item.rating,
      project: item.project || "General Service",
      createdAt: item.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching reviews from API:", error);
    // Fallback? No, we want to rely on API.
    return [];
  }
};

export const submitReview = async (submission: ReviewSubmission): Promise<void> => {
  const name = sanitizeText(submission.name, "Anonymous Client", MAX_NAME_LENGTH);
  const role = sanitizeText(submission.role, "Verified Client", MAX_ROLE_LENGTH);
  const content = sanitizeText(submission.content, "", MAX_CONTENT_LENGTH);
  const project = sanitizeText(submission.project, "General Service", MAX_SERVICE_LENGTH);
  const rating = normalizeRating(submission.rating);
  const image = submission.image?.trim() || null;

  if (!content) {
    throw new Error("Review content is required.");
  }

  try {
    const response = await fetch(`${getReviewsApiBase()}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        role,
        content,
        project,
        rating,
        image_url: image, // Map back to API field
        status: "live"
      }),
    });

    if (!response.ok) {
      console.error("Submission failed", await response.text());
      throw new Error("Failed to submit review");
    }
  } catch (error) {
    console.error("Error submitting review:", error);
    throw error;
  }
};

export const subscribeToPublishedReviews = (onChange: () => void) => {
  const testimonialsChannel = supabase
    .channel("public:testimonials")
    .on("postgres_changes", { event: "*", schema: "public", table: "testimonials" }, onChange)
    .subscribe();

  const reviewsChannel = supabase
    .channel("public:reviews")
    .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(testimonialsChannel);
    void supabase.removeChannel(reviewsChannel);
  };
};
