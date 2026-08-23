import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Cpu, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

type WelcomeIntroOverlayProps = {
  onComplete: () => void;
};

const TOTAL_DURATION_MS = 5500; // 5.5 Seconds Animation

export const WelcomeIntroOverlay = ({ onComplete }: WelcomeIntroOverlayProps) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const websiteLogoSrc = resolveCmsMediaUrl("/images/logo.png");

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / TOTAL_DURATION_MS) * 100));
      setProgress(pct);

      if (elapsed < 1500) {
        setStage(1);
      } else if (elapsed < 3500) {
        setStage(2);
      } else if (elapsed < 4800) {
        setStage(3);
      } else {
        setStage(4);
      }

      if (elapsed >= TOTAL_DURATION_MS) {
        clearInterval(interval);
        handleFinish();
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  const elapsedSec = (Math.min(5.5, (progress / 100) * 5.5)).toFixed(1);

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between overflow-hidden bg-background/95 p-6 backdrop-blur-3xl transition-opacity duration-700 select-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Animated Neon Glow Orbs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/20 blur-[120px] animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[150px] animate-pulse" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/20 blur-[120px] animate-pulse" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 backdrop-blur-xl">
          <Cpu className="h-4 w-4 text-primary animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
            System Booting • Studio OS v2.6
          </span>
        </div>

        <button
          onClick={handleFinish}
          className="group flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2 text-xs font-extrabold text-foreground shadow-lg backdrop-blur-xl hover:border-primary/50 hover:bg-card transition-all"
        >
          <span>Skip Intro</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Center Hero Animation Box */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-auto">
        {/* Holographic Logo Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-36 w-36 rounded-full border border-primary/40 animate-ping opacity-25" />
          <div className="absolute h-44 w-44 rounded-full border border-purple-500/30 animate-pulse" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-primary/40 bg-gradient-to-b from-card via-card/90 to-primary/10 p-4 shadow-2xl shadow-primary/20 backdrop-blur-2xl">
            <img
              src={websiteLogoSrc}
              alt="Drawn Dimension Logo"
              className="h-full w-full object-contain filter drop-shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>

        {/* Dynamic Stage Text Animation */}
        <div className="min-h-[160px] flex flex-col items-center justify-center space-y-3">
          {stage === 1 && (
            <div className="space-y-2 animate-in fade-in zoom-in duration-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono border border-primary/20">
                <Sparkles className="h-3.5 w-3.5 animate-bounce" />
                <span>Initializing System Engine...</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Connecting VPS PostgreSQL & Media Services
              </h1>
            </div>
          )}

          {stage === 2 && (
            <div className="space-y-3 animate-in fade-in zoom-in duration-500">
              <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-primary">
                Welcome To
              </span>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-300 to-emerald-400 filter drop-shadow-sm">
                DRAWN DIMENSION
              </h1>
              <p className="text-sm font-bold text-muted-foreground tracking-wide">
                Engineering Excellence Redefined • Digital Platform CMS
              </p>
            </div>
          )}

          {stage === 3 && (
            <div className="space-y-3 animate-in fade-in zoom-in duration-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
                <span>Studio OS v2.6.0 Active Production Release</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Where Precision Engineering Meets Digital Innovation
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Version Control • VPS Storage • Live Project & Service Management
              </p>
            </div>
          )}

          {stage === 4 && (
            <div className="space-y-3 animate-in fade-in zoom-in duration-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3.5 py-1 text-xs font-extrabold text-primary border border-primary/40">
                <Rocket className="h-4 w-4 animate-bounce" />
                <span>System Ready</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Entering Admin Workspace...
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Progress Bar & Timer Indicator */}
      <div className="relative z-10 w-full max-w-xl space-y-2 pb-4">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground font-bold">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Secure Admin Session</span>
          </span>
          <span>
            {elapsedSec}s / 5.5s ({progress}%)
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-card/80 border border-border/60 backdrop-blur-xl">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 transition-all duration-100 ease-out shadow-[0_0_12px_rgba(59,130,246,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default WelcomeIntroOverlay;
