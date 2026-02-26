import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "framer-motion";

interface DeferredSectionProps {
  children: ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
  onVisible?: () => void;
}

const DeferredSection = ({
  children,
  minHeight = 360,
  rootMargin = "280px 0px",
  onVisible
}: DeferredSectionProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(anchorRef, { margin: rootMargin, once: true });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!inView || mounted) return;
    setMounted(true);
    onVisible?.();
  }, [inView, mounted, onVisible]);

  if (mounted) {
    return <>{children}</>;
  }

  const height = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  return <div ref={anchorRef} style={{ minHeight: height }} />;
};

export default DeferredSection;
