import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  Database, 
  Globe, 
  Layers, 
  Lock, 
  Radio, 
  Rocket, 
  ShieldCheck, 
  Terminal, 
  Zap 
} from "lucide-react";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

type WelcomeIntroOverlayProps = {
  onComplete: () => void;
};

const TOTAL_DURATION_MS = 4200; // Snappy 4.2s cinematic experience

export const WelcomeIntroOverlay = ({ onComplete }: WelcomeIntroOverlayProps) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [isExiting, setIsExiting] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const websiteLogoSrc = resolveCmsMediaUrl("/images/logo.png");

  // Keep live UTC clock for authentic enterprise OS telemetry
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener: ESC, Space, or Enter to skip instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        triggerExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Precise animation frame timeline
  useEffect(() => {
    const startTime = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.floor((elapsed / TOTAL_DURATION_MS) * 100));
      setProgress(pct);

      if (elapsed < 1100) {
        setStage(1);
      } else if (elapsed < 2350) {
        setStage(2);
      } else if (elapsed < 3500) {
        setStage(3);
      } else {
        setStage(4);
      }

      if (elapsed >= TOTAL_DURATION_MS) {
        triggerExit();
      } else {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const triggerExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  const elapsedSec = (Math.min(4.2, (progress / 100) * 4.2)).toFixed(1);

  // Micro-telemetry lines
  const telemetryLogs = useMemo(() => [
    { text: "SECURE_TUNNEL: TLS_1.3 [AES_256_GCM]", ok: true },
    { text: "CORE_DATABASE: VPS_POSTGRESQL // CONNECTED", ok: true },
    { text: "MEDIA_CDN: /MEDIA REPOSITORY MOUNTED", ok: true },
    { text: "STUDIO_OS_KERNEL: INITIALIZED (V3.0.0)", ok: true },
  ], []);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col justify-between overflow-hidden bg-[#03060a] text-white select-none p-4 sm:p-7"
        >
          {/* ================= BACKGROUND ATMOSPHERE (CLEAN & CONTROLLED) ================= */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Corner-only ambient glows to ensure high center contrast */}
            <div className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-red-600/10 blur-[150px]" />
            <div className="absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full bg-cyan-600/10 blur-[150px]" />

            {/* Subtle Isometric Cyber Grid */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />

            {/* Faint laser scan line */}
            <motion.div
              animate={{ y: ["-10%", "110%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-red-500/10 to-transparent pointer-events-none"
            />
          </div>

          {/* ================= TOP HUD HEADER ================= */}
          <div className="relative z-30 flex w-full items-center justify-between">
            {/* Left Telemetry Badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-1.5 backdrop-blur-xl shadow-lg">
                <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300 font-mono">
                  STUDIO OS • KERNEL BOOT
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 font-mono text-[10px] text-zinc-300 backdrop-blur-xl">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span className="font-semibold text-zinc-200">AUTH: ROOT_ADMIN</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300">{currentTime || "UTC-00:00"}</span>
              </div>
            </div>

            {/* Right Skip & Action Button */}
            <button
              type="button"
              onClick={triggerExit}
              className="group flex items-center gap-2 rounded-xl border border-white/20 bg-zinc-900/90 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-red-500/60 hover:bg-zinc-800 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
            >
              <span>Enter Studio</span>
              <span className="hidden sm:inline-block font-mono text-[10px] text-zinc-300 px-1.5 py-0.5 rounded bg-black/60 border border-white/10">
                ESC
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-red-400 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>

          {/* ================= CENTER STAGE: REACTOR & TEXT POD ================= */}
          <div className="relative z-30 mx-auto my-auto flex w-full max-w-3xl flex-col items-center justify-center text-center py-2">
            
            {/* 1. Concentric Holographic Gyroscope Reactor (Strictly Bounded Dimensions) */}
            <div className="relative flex items-center justify-center h-48 w-48 sm:h-52 sm:w-52 shrink-0 mb-6 sm:mb-8">
              {/* Outer Shockwave Ring */}
              <motion.div
                animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.2, 0.45, 0.2] }}
                transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border border-red-500/30"
              />

              {/* Counter-Clockwise Outer SVG Tech Ring */}
              <motion.svg
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)] pointer-events-none"
                viewBox="0 0 200 200"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="6 8"
                  className="text-red-500/40"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="28 110"
                  className="text-red-400"
                />
              </motion.svg>

              {/* Clockwise Middle Gyro Ring with Calibrated Ticks */}
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
                className="absolute inset-6 h-[calc(100%-48px)] w-[calc(100%-48px)] pointer-events-none"
                viewBox="0 0 160 160"
              >
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="4 6"
                  className="text-cyan-400/40"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="30 85"
                  className="text-cyan-400"
                />
              </motion.svg>

              {/* Core Glow Beacon */}
              <div className="absolute h-24 w-24 rounded-full bg-red-500/20 blur-xl animate-pulse" />

              {/* Inner Floating Glassmorphism Logo Capsule */}
              <motion.div
                animate={{ y: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl border border-red-500/50 bg-gradient-to-b from-[#111422] to-[#080912] p-3.5 shadow-[0_0_30px_rgba(239,68,68,0.35)] backdrop-blur-2xl ring-1 ring-white/15"
              >
                {/* Hologram Corner Brackets */}
                <span className="absolute -top-1 -left-1 h-2.5 w-2.5 border-t-2 border-l-2 border-red-400" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 border-t-2 border-r-2 border-red-400" />
                <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 border-b-2 border-l-2 border-red-400" />
                <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-red-400" />

                <img
                  src={websiteLogoSrc}
                  alt="Drawn Dimension Logo"
                  className="h-full w-full object-contain filter drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                />
              </motion.div>
            </div>

            {/* 2. High-Contrast Text Podium (Isolated Dark Glass Pod - ZERO Bleed/Overlap) */}
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0d16]/90 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl">
              <div className="min-h-[125px] flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  {/* STAGE 1 */}
                  {stage === 1 && (
                    <motion.div
                      key="stage-1"
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 1.02 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-2"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-950/70 px-3.5 py-1 text-xs font-bold text-cyan-300 font-mono shadow-md">
                        <Cpu className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                        <span>QUANTUM KERNEL INITIALIZATION</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
                        Establishing High-Speed VPS Data Channels
                      </h2>
                      <p className="text-xs sm:text-sm font-mono text-zinc-300 font-medium">
                        Synchronizing PostgreSQL schemas • Verifying encrypted tokens
                      </p>
                    </motion.div>
                  )}

                  {/* STAGE 2 */}
                  {stage === 2 && (
                    <motion.div
                      key="stage-2"
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 1.02 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-2.5"
                    >
                      <span className="inline-block text-[11px] font-extrabold uppercase tracking-[0.3em] text-red-400 font-mono">
                        WELCOME TO THE COMMAND CENTER
                      </span>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_15px_rgba(239,68,68,0.5)]">
                        DRAWN DIMENSION
                      </h1>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-200 tracking-wide">
                        Engineering Excellence Redefined • Studio OS v3.0.0 Enterprise CMS
                      </p>
                    </motion.div>
                  )}

                  {/* STAGE 3 */}
                  {stage === 3 && (
                    <motion.div
                      key="stage-3"
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 1.02 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-3 w-full"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-950/70 px-3.5 py-1 text-xs font-bold text-emerald-300 font-mono shadow-md">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                        <span>ALL ARCHITECTURE SUBSYSTEMS ONLINE</span>
                      </div>

                      {/* 4 High-Contrast Telemetry Chips with Solid Backgrounds */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/85 p-2.5 text-left shadow-md">
                          <Database className="h-4 w-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">PostgreSQL</p>
                            <p className="text-[10px] font-mono font-bold text-emerald-400">SYNCED (100%)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/85 p-2.5 text-left shadow-md">
                          <Layers className="h-4 w-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">VPS Storage</p>
                            <p className="text-[10px] font-mono font-bold text-cyan-400">/MEDIA ACTIVE</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/85 p-2.5 text-left shadow-md">
                          <Globe className="h-4 w-4 text-purple-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">Global Reach</p>
                            <p className="text-[10px] font-mono font-bold text-purple-400">46 COUNTRIES</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/85 p-2.5 text-left shadow-md">
                          <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">API Gateway</p>
                            <p className="text-[10px] font-mono font-bold text-amber-400">0.12ms READY</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STAGE 4 */}
                  {stage === 4 && (
                    <motion.div
                      key="stage-4"
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 1.02 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-2"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-red-500/60 bg-red-950/80 px-4 py-1 text-xs font-bold text-red-300 font-mono shadow-lg">
                        <Rocket className="h-3.5 w-3.5 animate-bounce text-red-400" />
                        <span>CONVERGENCE COMPLETE • ENTERING WORKSPACE</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
                        Welcome to Studio OS
                      </h2>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ================= BOTTOM HUD & PROGRESS METRICS ================= */}
          <div className="relative z-30 mx-auto w-full max-w-2xl space-y-2.5 pb-2">
            {/* Micro Terminal Log Stream */}
            <div className="hidden sm:flex items-center justify-between font-mono text-[10px] px-1">
              <div className="flex items-center gap-2">
                <Terminal className="h-3 w-3 text-red-400" />
                <span className="text-red-400 font-bold">LOG:</span>
                <span className="text-zinc-200 font-semibold">
                  {telemetryLogs[stage - 1]?.text || "WORKSPACE_ENGAGED"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-bold">STATUS_NORMAL</span>
              </div>
            </div>

            {/* Futuristic Segmented Progress Bar */}
            <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/20 bg-black/90 shadow-inner backdrop-blur-xl">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-cyan-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>

            {/* Bottom Diagnostic Readouts */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-bold text-zinc-200">End-to-End Cryptographic Session</span>
              </span>
              <span className="font-bold text-red-400">
                {progress}% • {elapsedSec}s / 4.2s
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeIntroOverlay;
