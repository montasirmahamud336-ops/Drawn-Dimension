import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1], // Smooth cubic ease-out
      }}
      className={`w-full min-h-screen ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
