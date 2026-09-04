import { Sparkles } from "lucide-react";

interface WaveLoadingProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const WaveLoading = ({
  text = "Loading DrawnDimension...",
  fullScreen = false,
  className = "",
}: WaveLoadingProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullScreen
          ? "fixed inset-0 z-50 min-h-screen w-screen bg-background/95 backdrop-blur-xl"
          : "w-full py-12"
      } ${className}`}
    >
      {/* Brand logo for full-page loading */}
      {fullScreen && (
        <div className="relative mb-2">
          <div className="absolute -inset-2 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
          <img
            src="/images/logo.png"
            alt="Drawn Dimension"
            className="relative h-12 w-12 object-contain"
          />
        </div>
      )}

      {/* Wave Bars Container with Ambient Glowing Effect */}
      <div className="relative flex items-center justify-center gap-1.5 h-12 px-6">
        {/* Ambient background glow */}
        <div className="absolute inset-0 -z-10 mx-auto h-8 w-32 rounded-full bg-primary/25 blur-xl animate-pulse pointer-events-none" />

        {/* 6 Fluid Gradient Wave Bars */}
        {[
          { delay: "0s", duration: "1.1s" },
          { delay: "0.15s", duration: "1.1s" },
          { delay: "0.3s", duration: "1.1s" },
          { delay: "0.45s", duration: "1.1s" },
          { delay: "0.6s", duration: "1.1s" },
          { delay: "0.75s", duration: "1.1s" },
        ].map((bar, i) => (
          <span
            key={i}
            style={{
              animation: `ddWaveBars ${bar.duration} ease-in-out infinite`,
              animationDelay: bar.delay,
            }}
            className="w-1.5 rounded-full bg-gradient-to-t from-primary/40 via-primary to-primary shadow-sm"
          />
        ))}
      </div>

      {/* Animated Text with Shimmer / Pulse */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/85 animate-pulse">
          {text}
        </p>
      </div>

      {/* Embedded CSS for the Wave Animation */}
      <style>{`
        @keyframes ddWaveBars {
          0%, 100% {
            height: 8px;
            opacity: 0.3;
            transform: scaleY(0.35);
          }
          50% {
            height: 36px;
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
};

export default WaveLoading;
