import { cn } from "@/lib/utils";

type CMSWorkspaceCardProps = {
  adminDisplayName: string;
  adminMeta: string;
  className?: string;
};

const CMSWorkspaceCard = ({ adminDisplayName, adminMeta, className }: CMSWorkspaceCardProps) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-3xl border border-border/60 bg-[linear-gradient(150deg,rgba(255,255,255,0.92),rgba(255,245,245,0.78))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(150deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]",
      className
    )}
  >
    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80">Drawn Dimension</p>
        <div className="mt-3 flex items-end gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">CMS</h2>
          <span className="pb-1 text-sm font-medium text-muted-foreground">Workspace</span>
        </div>
        <p className="mt-2 max-w-[22rem] text-sm leading-6 text-muted-foreground">
          Content, operations, messages, and site settings in one place.
        </p>
      </div>
      <span className="inline-flex shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        {adminMeta}
      </span>
    </div>

    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/72 px-3.5 py-3 dark:bg-background/35">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold uppercase text-primary">
        {adminDisplayName.slice(0, 2)}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Signed In</p>
        <p className="truncate text-sm font-semibold text-foreground">{adminDisplayName}</p>
      </div>
    </div>
  </div>
);

export default CMSWorkspaceCard;
