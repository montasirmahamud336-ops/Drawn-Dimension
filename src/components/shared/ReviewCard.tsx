import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Review } from "@/components/shared/reviews";

interface ReviewCardProps {
  review: Review;
  index?: number;
}

const COLLAPSED_CONTENT_MAX_HEIGHT = 118;

const ReviewCard = ({ review, index = 0 }: ReviewCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const contentRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    setIsExpanded(false);
  }, [review.id]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }

    const computeOverflow = () => {
      setIsOverflowing(element.scrollHeight > COLLAPSED_CONTENT_MAX_HEIGHT + 2);
    };

    computeOverflow();

    const observer = new ResizeObserver(computeOverflow);
    observer.observe(element);

    return () => observer.disconnect();
  }, [review.content]);

  const initials = useMemo(() => {
    const letters = review.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

    return letters || "DD";
  }, [review.name]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="glass-card relative overflow-hidden p-6 group border-border/60 hover:border-primary/45 hover:-translate-y-1 transition-all duration-300 h-[24.5rem] flex flex-col bg-gradient-to-br from-background via-background to-primary/[0.03]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(239,68,68,0.16),transparent_38%)] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_42%)]" />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <header className="flex items-center gap-4 min-h-[3.5rem]">
        {review.image && !imageFailed ? (
          <img
            src={review.image}
            alt={review.name}
            className="w-14 h-14 rounded-full object-cover object-[center_20%] border-2 border-primary/35 shadow-[0_0_0_3px_rgba(5,5,5,0.85)] shrink-0"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-14 h-14 rounded-full border-2 border-primary/35 bg-primary/15 text-primary font-semibold flex items-center justify-center shadow-[0_0_0_3px_rgba(5,5,5,0.85)] shrink-0">
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="font-semibold text-foreground leading-tight break-words tracking-tight">{review.name}</h3>
          <p className="text-sm text-muted-foreground/95 leading-snug break-words">{review.role}</p>
        </div>
      </header>

      <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-1" aria-label={`Rated ${review.rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, starIndex) => (
          <Star
            key={`${review.id}-star-${starIndex}`}
            className={`w-3.5 h-3.5 ${starIndex < review.rating ? "fill-primary text-primary" : "text-muted-foreground/35"}`}
          />
        ))}
      </div>

      <div className="mt-4 flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 min-h-0">
          <Quote className="w-8 h-8 text-primary/20 absolute -top-2 -left-1" />
          <div
            className={`pl-6 pr-1 relative z-10 rounded-xl border border-border/45 bg-gradient-to-b from-background/70 to-background/25 transition-[max-height] duration-300 ease-out ${
              isExpanded ? "max-h-[11.375rem] overflow-y-auto p-3.5" : "max-h-[7.375rem] overflow-hidden p-3.5"
            }`}
          >
            <p ref={contentRef} className="text-muted-foreground/95 text-sm leading-7 break-words italic">
              {review.content}
            </p>
          </div>
          {!isExpanded && isOverflowing ? (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/90 to-transparent rounded-b-xl" />
          ) : null}
        </div>

        <div className="mt-2 min-h-6 flex items-end justify-end">
          {isOverflowing ? (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4 transition-colors text-primary hover:text-primary/80"
            >
              {isExpanded ? "Read less" : "Read more"}
            </button>
          ) : null}
        </div>
      </div>

      <footer className="relative z-10 mt-4 pt-4 border-t border-border/55">
        <span className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.12] text-primary font-medium inline-flex max-w-full truncate">
          {review.project}
        </span>
      </footer>
    </motion.article>
  );
};

export default ReviewCard;
