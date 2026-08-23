import { cn } from "@/lib/utils";
import { Sparkles, ShieldCheck } from "lucide-react";

type CMSWorkspaceCardProps = {
  adminDisplayName: string;
  adminMeta: string;
  className?: string;
};

const CMSWorkspaceCard = ({ adminDisplayName, adminMeta, className }: CMSWorkspaceCardProps) => (
  <div
    className={cn(
      "group relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card/90 via-card/60 to-primary/5 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-primary/5",
      className
    )}
  >
    {/* Decorative glow lines */}
    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20" />
    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
          <Sparkles className="h-3 w-3 animate-pulse text-primary" />
          <span>Drawn Dimension OS</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">CMS</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">v2.6 Workspace</span>
        </div>
        <p className="mt-1.5 max-w-[22rem] text-xs leading-relaxed text-muted-foreground/90">
          Centralized control suite for site content, operations, staff & inquiries.
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur-md">
        <ShieldCheck className="h-3 w-3" />
        {adminMeta}
      </span>
    </div>

    <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-inner backdrop-blur-md dark:bg-background/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-rose-600 text-sm font-bold uppercase text-primary-foreground shadow-md shadow-primary/20">
        {adminDisplayName.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Active Session</p>
        <p className="truncate text-xs font-bold text-foreground">{adminDisplayName}</p>
      </div>
      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Connected" />
    </div>
  </div>
);

export default CMSWorkspaceCard;

