import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export const GlobalSitePreloader = () => {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    // Smooth progress counter from 0 to 100%
    const startTime = performance.now();
    const duration = 750; // 750ms for snappy yet silky feel

    let animationFrameId: number;

    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Smooth ease-out curve
      const easedProgress = Math.floor((1 - Math.pow(1 - progressRatio, 3)) * 100);
      setProgress(easedProgress);

      if (progressRatio < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setProgress(100);
        setTimeout(() => setIsDone(true), 120);
        setTimeout(() => setIsRemoved(true), 650);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (isRemoved) return null;

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          key="global-preloader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            y: -20,
            scale: 1.02,
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background select-none overflow-hidden"
        >
          {/* Ambient Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/15 blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/20 blur-[80px] pointer-events-none" />

          {/* Center Brand & Wave Content */}
          <div className="relative z-10 flex flex-col items-center gap-6 px-6 max-w-sm w-full text-center">
            
            {/* Brand Logo with Glow */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute -inset-3 rounded-2xl bg-primary/25 blur-xl animate-pulse" />
              <img
                src="/images/logo.png"
                alt="Drawn Dimension"
                className="relative h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* Title & Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="space-y-1.5"
            >
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Drawn <span className="text-primary">Dimension</span>
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                Engineering & Digital Innovation
              </p>
            </motion.div>

            {/* Fluid 6-Bar Glowing Sine Wave */}
            <div className="relative flex items-center justify-center gap-2 h-10 px-4 my-1">
              {[
                { delay: "0s", duration: "1s" },
                { delay: "0.15s", duration: "1s" },
                { delay: "0.3s", duration: "1s" },
                { delay: "0.45s", duration: "1s" },
                { delay: "0.6s", duration: "1s" },
                { delay: "0.75s", duration: "1s" },
              ].map((bar, i) => (
                <span
                  key={i}
                  style={{
                    animation: `ddPreloaderWave ${bar.duration} ease-in-out infinite`,
                    animationDelay: bar.delay,
                  }}
                  className="w-1.5 rounded-full bg-gradient-to-t from-primary/30 via-primary to-primary shadow-sm"
                />
              ))}
            </div>

            {/* Sleek Progress Bar with Percentage */}
            <div className="w-full space-y-2 mt-2">
              <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden p-[1px] border border-border/40">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary rounded-full shadow-sm shadow-primary/50"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.1 }}
                />
              </div>
              
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span className="tracking-wider uppercase">Loading Experience</span>
                <span className="text-primary font-mono font-bold">{progress}%</span>
              </div>
            </div>

          </div>

          {/* Embedded Keyframe CSS */}
          <style>{`
            @keyframes ddPreloaderWave {
              0%, 100% {
                height: 8px;
                opacity: 0.35;
                transform: scaleY(0.35);
              }
              50% {
                height: 32px;
                opacity: 1;
                transform: scaleY(1);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalSitePreloader;
