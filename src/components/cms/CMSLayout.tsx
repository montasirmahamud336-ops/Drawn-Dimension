import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { clearAdminToken, getAdminProfile, refreshAdminProfileFromApi } from "@/components/admin/adminAuth";
import { buildCMSHref, getCMSBasePath, getCMSNavigationSections, resolveCMSRoute, type CMSResolvedNavSection } from "./cmsNavigation";
import { ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const CMS_SIDEBAR_COLLAPSED_KEY = "cms-sidebar-collapsed";

type CMSNavigationPanelProps = {
  navSections: CMSResolvedNavSection[];
  activeItemId: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
};

const CMSNavigationPanel = ({
  navSections,
  activeItemId,
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: CMSNavigationPanelProps) => (
  <div className="flex h-full min-h-0 flex-col">
    {onToggleCollapse ? (
      <div className={cn("mb-4", collapsed ? "flex justify-center" : "flex items-center justify-between gap-3 px-1")}>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">CMS Navigation</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Workspace Menu</p>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 border-border/60 bg-background/70 hover:bg-background"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
    ) : null}

    <nav
      data-lenis-prevent
      className={cn(
        "cms-nav-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y",
        collapsed ? "space-y-4 pr-0" : "space-y-6 pr-1"
      )}
    >
      {navSections.map((section) => (
        <div key={section.id} className={cn("space-y-2", collapsed && "space-y-3")}>
          {collapsed ? (
            <div className="mx-auto h-px w-8 rounded-full bg-border/70" />
          ) : (
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">
              {section.label}
            </p>
          )}
          <div className="space-y-2">
            {section.items.map((item) => {
              const isActive = item.id === activeItemId;
              const navLink = (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex rounded-2xl border transition-all duration-200",
                    collapsed ? "items-center justify-center px-0 py-3" : "items-start gap-3 px-3.5 py-3",
                    isActive
                      ? "border-primary/25 bg-primary/[0.08] shadow-[0_12px_28px_rgba(239,68,68,0.12)]"
                      : "border-transparent bg-background/50 hover:border-border/60 hover:bg-background/85"
                  )}
                >
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-xl transition-colors",
                      collapsed ? "h-11 w-11" : "mt-0.5 h-10 w-10",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  {collapsed ? null : (
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold", isActive ? "text-foreground" : "text-foreground/90")}>
                        {item.label}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  )}
                </Link>
              );

              if (!collapsed) {
                return navLink;
              }

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent side="right" className="border-border/60 bg-background/95">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  </div>
);

const CMSLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminProfile, setAdminProfile] = useState(getAdminProfile());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(CMS_SIDEBAR_COLLAPSED_KEY) === "1";
  });

  const isMainAdmin = Boolean(adminProfile?.isMain);
  const currentBasePath = getCMSBasePath(location.pathname);
  const navSections = useMemo(
    () => getCMSNavigationSections(currentBasePath, isMainAdmin),
    [currentBasePath, isMainAdmin]
  );
  const currentRoute = useMemo(() => resolveCMSRoute(location.pathname), [location.pathname]);
  const currentDashboardHref = buildCMSHref(currentBasePath, "");

  useEffect(() => {
    let mounted = true;
    const syncProfile = async () => {
      const profile = await refreshAdminProfileFromApi();
      if (mounted) {
        setAdminProfile(profile);
        if (!profile) {
          navigate("/database/login", { replace: true });
        }
      }
    };

    void syncProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    lenis?.stop();

    return () => {
      lenis?.start();
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CMS_SIDEBAR_COLLAPSED_KEY, desktopSidebarCollapsed ? "1" : "0");
  }, [desktopSidebarCollapsed]);

  const handleLogout = () => {
    clearAdminToken();
    navigate("/database/login", { replace: true });
  };

  return (
    <div className="flex h-[100dvh] min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.08),transparent_24%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.08),transparent_24%),linear-gradient(180deg,rgba(9,9,11,0.98),rgba(9,9,11,0.94))]">
      <aside
        className={cn(
          "hidden h-full shrink-0 border-r border-border/40 bg-card/55 py-5 backdrop-blur-xl transition-[width,padding] duration-300 lg:flex",
          desktopSidebarCollapsed ? "w-[96px] px-3" : "w-[320px] px-5"
        )}
      >
        <CMSNavigationPanel
          navSections={navSections}
          activeItemId={currentRoute.id}
          collapsed={desktopSidebarCollapsed}
          onToggleCollapse={() => setDesktopSidebarCollapsed((current) => !current)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 shrink-0 border-b border-border/50 bg-background/82 backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 lg:hidden">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open CMS menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-sm border-r border-border/60 bg-background/96 p-4 sm:max-w-sm">
                    <SheetHeader className="sr-only">
                      <SheetTitle>CMS Navigation</SheetTitle>
                    </SheetHeader>
                    <CMSNavigationPanel
                      navSections={navSections}
                      activeItemId={currentRoute.id}
                      onNavigate={() => setMobileNavOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">CMS</p>
                  <p className="text-sm font-semibold text-foreground">{currentRoute.sectionLabel}</p>
                </div>
              </div>

              <div className="hidden min-w-0 lg:block">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>CMS</span>
                  <span className="text-border">/</span>
                  <span>{currentRoute.sectionLabel}</span>
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{currentRoute.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{currentRoute.description}</p>
              </div>

              <div className="flex items-center gap-2 self-start lg:self-auto">
                <Button variant="outline" asChild className="hidden sm:inline-flex">
                  <Link to={currentDashboardHref}>Dashboard</Link>
                </Button>
                <Button variant="outline" asChild className="hidden sm:inline-flex">
                  <Link to="/" target="_blank" rel="noreferrer">
                    Open Site
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {currentRoute.sectionLabel}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">{currentRoute.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{currentRoute.description}</p>
            </div>
          </div>
        </header>

        <main
          data-lenis-prevent
          className="cms-main-scroll flex-1 min-h-0 overflow-hidden"
        >
          <div className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-6 lg:px-10 lg:py-8 h-full overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CMSLayout;
