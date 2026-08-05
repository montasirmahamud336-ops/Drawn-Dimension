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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group relative flex h-full flex-col rounded-2xl border-[2.5px] border-border/70 dark:border-border bg-card p-5 md:p-6 shadow-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/40 overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        {review.image && !imageFailed ? (
          <img
            src={review.image}
            alt={review.name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 transition-all group-hover:ring-primary/40"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-foreground tracking-tight">{review.name}</h3>
          <p className="truncate text-xs font-medium text-muted-foreground">{review.role}</p>

          {/* Stars + rating number */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < review.rating
                      ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                      : "fill-transparent text-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-foreground">{review.rating}.0</span>
          </div>
        </div>

        {/* Big decorative quote */}
        <Quote className="h-8 w-8 shrink-0 text-primary/15 transition-colors group-hover:text-primary/30" />
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
            className="text-sm leading-relaxed text-muted-foreground"
          >
            &ldquo;{review.content}&rdquo;
          </p>
        </div>

        {/* Fade only when collapsed & overflowing */}
        {!isExpanded && isOverflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card via-card/80 to-transparent" />
        )}
      </div>

      {/* ── Read more / less ── */}
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-2 flex items-center gap-1 self-start text-xs font-semibold text-primary transition-colors hover:text-primary/80"
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
        <div className="mt-4 border-t border-border/60 pt-3 flex items-center justify-between">
          <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            {review.project}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground/80">Verified Client</span>
        </div>
      )}
    </motion.article>
  );
};

export default ReviewCard;