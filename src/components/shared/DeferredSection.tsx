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
  rootMargin = "560px 0px",
  onVisible
}: DeferredSectionProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(anchorRef, { margin: rootMargin, once: true });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!inView || mounted) return;

    let cancelled = false;
    const mountSection = () => {
      if (cancelled) return;
      setMounted(true);
      onVisible?.();
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let timeoutId: number | undefined;
    const idleId = idleWindow.requestIdleCallback?.(mountSection, { timeout: 220 });

    if (typeof idleId !== "number") {
      timeoutId = window.setTimeout(mountSection, 0);
    }

    return () => {
      cancelled = true;
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }
      if (typeof idleId === "number") {
        idleWindow.cancelIdleCallback?.(idleId);
      }
    };
  }, [inView, mounted, onVisible]);

  if (mounted) {
    return <>{children}</>;
  }

  const height = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  return <div ref={anchorRef} style={{ minHeight: height }} />;
};

export default DeferredSection;
