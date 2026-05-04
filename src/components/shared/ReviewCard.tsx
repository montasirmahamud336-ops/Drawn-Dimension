// ReviewCard.tsx — redesigned with light‑theme visibility
import { motion } from "framer-motion";
import { Quote, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Review } from "@/components/shared/reviews";

interface ReviewCardProps {
  review: Review;
  index?: number;
}

const COLLAPSED_CONTENT_MAX_HEIGHT = 120;

const ReviewCard = ({ review, index = 0 }: ReviewCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setIsExpanded(false);
  }, [review.id]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const check = () =>
      setIsOverflowing(element.scrollHeight > COLLAPSED_CONTENT_MAX_HEIGHT + 2);

    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [review.content]);

  const initials = useMemo(
    () =>
      review.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "DD",
    [review.name],
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative flex h-full flex-col rounded-2xl border border-border/40 bg-card/80 dark:border-white/[0.07] dark:bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-500 hover:border-primary/25 dark:hover:border-primary/25 hover:bg-card/90 dark:hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5"
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        {review.image && !imageFailed ? (
          <img
            src={review.image}
            alt={review.name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-border/30 dark:ring-white/10 transition-colors group-hover:ring-primary/20"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-primary/10 transition-colors group-hover:ring-primary/20">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{review.name}</h3>
          <p className="truncate text-xs text-muted-foreground/70">{review.role}</p>

          {/* Stars + rating number */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex gap-px">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < review.rating
                      ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                      : "fill-transparent text-muted-foreground/20 dark:text-white/[0.06]"
                  }`}
                />
              ))}
            </div>
            <span className="text-[13px] font-semibold text-foreground/80">{review.rating}.0</span>
          </div>
        </div>

        {/* Big decorative quote */}
        <Quote className="h-8 w-8 shrink-0 text-primary/[0.10] dark:text-primary/[0.10] transition-colors group-hover:text-primary/20" />
      </div>

      {/* ── Content ── */}
      <div className="relative mt-4 flex-1">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? "max-h-[20rem]" : "max-h-[7.5rem]"
          }`}
        >
          <p
            ref={contentRef}
            className="text-sm leading-relaxed text-muted-foreground/90"
          >
            &ldquo;{review.content}&rdquo;
          </p>
        </div>

        {/* Fade only when collapsed & overflowing */}
        {!isExpanded && isOverflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/30 dark:from-background/10 via-background/10 dark:via-background/5 to-transparent" />
        )}
      </div>

      {/* ── Read more / less ── */}
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-2 flex items-center gap-1 self-start text-xs font-medium text-primary/80 transition-colors hover:text-primary"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}

      {/* ── Footer tag ── */}
      {review.project && (
        <div className="mt-3 border-t border-border/20 dark:border-white/[0.04] pt-3">
          <span className="inline-block rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary/70">
            {review.project}
          </span>
        </div>
      )}
    </motion.article>
  );
};

export default ReviewCard;