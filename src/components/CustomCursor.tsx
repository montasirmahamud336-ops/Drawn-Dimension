import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const CustomCursor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasMouseMoved, setHasMouseMoved] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Use MotionValues instead of State for high-performance updates
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for main cursor
  const cursorX = useSpring(mouseX, { stiffness: 500, damping: 28 });
  const cursorY = useSpring(mouseY, { stiffness: 500, damping: 28 });

  // Smoother, laggy springs for the ring
  const ringX = useSpring(mouseX, { stiffness: 150, damping: 15 });
  const ringY = useSpring(mouseY, { stiffness: 150, damping: 15 });

  useEffect(() => {
    // Only show on devices with pointer (not touch)
    const hasPointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!hasPointer || prefersReducedMotion || connection?.saveData) return;

    setIsVisible(true);

    const updatePosition = (e: MouseEvent) => {
      if (!hasMouseMoved) {
        setHasMouseMoved(true);
      }
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("a, button, [role='button'], input, textarea, select, .cursor-pointer")) {
        setIsHovering(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("a, button, [role='button'], input, textarea, select, .cursor-pointer")) {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", updatePosition);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [hasMouseMoved, mouseX, mouseY]);

  if (!isVisible || !hasMouseMoved) return null;

  return (
    <>
      {/* Main cursor dot */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-primary rounded-full pointer-events-none z-[10001] mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: isHovering ? 0.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      />
      {/* Outer ring */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 border-2 border-primary rounded-full pointer-events-none z-[10000]"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          opacity: isHovering ? 0.5 : 0.3,
        }}
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
      />
      <style>{`
        body,
        a,
        button,
        [role='button'],
        .cursor-pointer {
          cursor: none !important;
        }

        input,
        textarea,
        select,
        [contenteditable='true'] {
          cursor: text !important;
        }
      `}</style>
    </>
  );
};

export default CustomCursor;
