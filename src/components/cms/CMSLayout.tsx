import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { clearAdminToken, getAdminProfile, getAdminToken, getApiBaseUrl, refreshAdminProfileFromApi } from "@/components/admin/adminAuth";
import { buildCMSHref, getCMSBasePath, getCMSNavigationSections, resolveCMSRoute, type CMSResolvedNavSection } from "./cmsNavigation";
import { Bell, ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Sparkles, Server, ShieldCheck, Play } from "lucide-react";
import { WelcomeIntroOverlay } from "./WelcomeIntroOverlay";

const CMS_SIDEBAR_COLLAPSED_KEY = "cms-sidebar-collapsed";
const CMS_SIDEBAR_SCROLL_KEY = "cms-sidebar-scroll-pos";

type CMSNavigationPanelProps = {
  navSections: CMSResolvedNavSection[];
  activeItemId: string;
  collapsed?: boolean;
  pendingAdvanceCount?: number;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
};

const CMSNavigationPanel = ({
  navSections,
  activeItemId,
  collapsed = false,
  pendingAdvanceCount = 0,
  onNavigate,
  onToggleCollapse,
}: CMSNavigationPanelProps) => {
  const navRef = useRef<HTMLElement | null>(null);

  // Preserve & Restore sidebar scroll position across navigation
  useLayoutEffect(() => {
    const savedPos = sessionStorage.getItem(CMS_SIDEBAR_SCROLL_KEY);
    if (savedPos !== null && navRef.current) {
      navRef.current.scrollTop = parseInt(savedPos, 10);
    }
  }, [activeItemId]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem(CMS_SIDEBAR_SCROLL_KEY, String(e.currentTarget.scrollTop));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Sidebar Brand Header */}
      <div className={cn("mb-4 pb-4 border-b border-border/50 transition-all duration-300", collapsed ? "flex flex-col items-center gap-2.5 px-0" : "flex items-center justify-between gap-2 px-1")}>
        {collapsed ? (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/80 p-1 shadow-sm backdrop-blur-md">
              <img src="/images/logo.png" alt="Drawn Dimension Logo" className="h-7 w-7 object-contain" />
            </div>
            {onToggleCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl border border-border/50 bg-background/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/80 p-1 shadow-sm backdrop-blur-md">
                <img src="/images/logo.png" alt="Drawn Dimension Logo" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">Drawn Dimension</p>
                <p className="text-sm font-bold tracking-tight text-foreground truncate">Studio OS • CMS v2.5</p>
              </div>
            </div>
            {onToggleCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl border border-border/50 bg-background/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Navigation Scroll Area */}
      <nav
        ref={navRef}
        onScroll={handleScroll}
        data-lenis-prevent
        className="cms-nav-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y space-y-5 pr-1"
      >
        {navSections.map((section) => (
          <div key={section.id} className="space-y-1.5">
            {/* Section Header */}
            {collapsed ? (
              <div className="mx-auto h-px w-8 rounded-full bg-border/70 my-2" />
            ) : (
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground/80 my-1">
                {section.label}
              </p>
            )}

            <div className="space-y-1.5">
              {section.items.map((item) => {
                const isActive = item.id === activeItemId;
                const hasBadge = item.id === "advance-requests" && pendingAdvanceCount > 0;

                const navLink = (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center rounded-2xl border transition-all duration-300 ease-in-out w-full overflow-hidden",
                      collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
                      isActive
                        ? "border-primary/30 bg-primary/10 shadow-[0_8px_24px_rgba(239,68,68,0.12)] text-primary backdrop-blur-md"
                        : "border-transparent bg-background/40 hover:border-border/60 hover:bg-background/80 text-foreground/85"
                    )}
                  >
                    {/* Left Active Glow Bar */}
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    )}

                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                          : "bg-muted/70 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>

                    {/* Text Label & Description */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={cn("text-xs font-bold leading-tight truncate", isActive ? "text-foreground" : "text-foreground/90")}>
                            {item.label}
                          </p>
                          {hasBadge && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-extrabold text-destructive-foreground shadow-sm">
                              {pendingAdvanceCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/80 group-hover:text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                    )}

                    {collapsed && hasBadge && (
                      <span className="absolute top-1 right-1 flex h-3 w-3 rounded-full bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
                    )}
                  </Link>
                );

                if (!collapsed) {
                  return navLink;
                }

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right" className="border-border/70 bg-popover/95 font-semibold backdrop-blur-md">
                      {item.label}
                      {hasBadge ? ` (${pendingAdvanceCount} pending)` : ""}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer indicator in sidebar */}
      {!collapsed && (
        <div className="mt-auto pt-4 border-t border-border/40">
          <div className="flex items-center justify-between rounded-xl bg-card/60 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-semibold text-foreground/80">VPS PostgreSQL</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          </div>
        </div>
      )}
    </div>
  );
};

const CMSLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminProfile, setAdminProfile] = useState(getAdminProfile());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(CMS_SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const [pendingAdvanceCount, setPendingAdvanceCount] = useState(0);
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("cms_welcome_intro_seen") !== "1";
  });

  const mainScrollRef = useRef<HTMLElement | null>(null);

  const isMainAdmin = Boolean(adminProfile?.isMain);
  const currentBasePath = getCMSBasePath(location.pathname);
  const navSections = useMemo(
    () => getCMSNavigationSections(currentBasePath, isMainAdmin),
    [currentBasePath, isMainAdmin]
  );
  const currentRoute = useMemo(() => resolveCMSRoute(location.pathname), [location.pathname]);
  const currentDashboardHref = buildCMSHref(currentBasePath, "");

  const toggleSidebarCollapse = () => {
    setDesktopSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(CMS_SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  // Scroll main content container to top on page change
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

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
    const token = getAdminToken();
    if (!token) return;
    void fetch(`${getApiBaseUrl()}/advance-requests/pending-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPendingAdvanceCount(Number(data?.count) || 0))
      .catch(() => setPendingAdvanceCount(0));
  }, [location.pathname]);

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

  const handleLogout = () => {
    clearAdminToken();
    navigate("/database/login", { replace: true });
  };

  const adminName = adminProfile?.fullName || adminProfile?.username || "Admin";

  return (
    <div className="relative flex h-[100dvh] min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.12),transparent_30%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.08),transparent_35%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.95))] text-foreground dark:bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.14),transparent_30%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.1),transparent_35%),linear-gradient(180deg,rgba(9,9,11,0.99),rgba(15,15,20,0.96))]">
      {/* 10-12s Glassmorphic Welcome Animation Overlay on Login / Session Start */}
      {showWelcomeIntro && (
        <WelcomeIntroOverlay
          onComplete={() => {
            setShowWelcomeIntro(false);
            window.sessionStorage.setItem("cms_welcome_intro_seen", "1");
          }}
        />
      )}
      {/* Desktop Sidebar with smooth ease-in-out spring transition */}
      <aside
        className={cn(
          "hidden h-full shrink-0 border-r border-border/40 bg-card/65 py-5 backdrop-blur-2xl transition-all duration-300 ease-in-out lg:flex shadow-2xl z-30 overflow-hidden",
          desktopSidebarCollapsed ? "w-[84px] px-2.5" : "w-[300px] px-4"
        )}
      >
        <CMSNavigationPanel
          navSections={navSections}
          activeItemId={currentRoute.id}
          collapsed={desktopSidebarCollapsed}
          pendingAdvanceCount={pendingAdvanceCount}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-2xl shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              {/* Mobile Drawer Trigger & Title */}
              <div className="flex items-center gap-3 lg:hidden">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl border-border/60" aria-label="Open CMS menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-xs border-r border-border/60 bg-background/95 p-4 sm:max-w-sm backdrop-blur-2xl">
                    <SheetHeader className="sr-only">
                      <SheetTitle>CMS Navigation</SheetTitle>
                    </SheetHeader>
                    <CMSNavigationPanel
                      navSections={navSections}
                      activeItemId={currentRoute.id}
                      pendingAdvanceCount={pendingAdvanceCount}
                      onNavigate={() => setMobileNavOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
                    <span>CMS</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground">{currentRoute.sectionLabel}</span>
                  </div>
                  <p className="text-sm font-bold text-foreground leading-tight">{currentRoute.label}</p>
                </div>
              </div>

              {/* Desktop Title & Breadcrumbs */}
              <div className="hidden min-w-0 lg:block">
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="text-primary font-bold">Drawn Dimension CMS</span>
                  <span className="text-border">/</span>
                  <span>{currentRoute.sectionLabel}</span>
                </div>
                <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">{currentRoute.label}</h1>
              </div>

              {/* Right Utility Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* System Status Pill */}
                <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>VPS Live</span>
                </div>

                {/* Replay Welcome Intro Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-border/60 hover:bg-primary/10 hover:border-primary/30"
                  onClick={() => setShowWelcomeIntro(true)}
                  title="Replay Welcome Intro Animation"
                >
                  <Play className="h-3.5 w-3.5 text-primary" />
                </Button>

                {/* Notifications Bell */}
                <Button variant="outline" size="icon" asChild className="relative rounded-xl border-border/60 hover:bg-primary/10 hover:border-primary/30" aria-label="Advance requests">
                  <Link to={buildCMSHref(currentBasePath, "advance-requests")}>
                    <Bell className="h-4 w-4" />
                    {pendingAdvanceCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-destructive-foreground shadow-md animate-pulse">
                        {pendingAdvanceCount}
                      </span>
                    )}
                  </Link>
                </Button>

                {/* Public Site Button */}
                <Button variant="outline" size="sm" asChild className="hidden rounded-xl border-border/60 sm:inline-flex hover:bg-primary/10 hover:border-primary/30">
                  <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Public Site</span>
                  </a>
                </Button>

                {/* Account Profile Badge */}
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-1.5 pr-3 shadow-sm backdrop-blur-md">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary font-extrabold text-xs">
                    {adminName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-bold leading-tight text-foreground">{adminName}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {isMainAdmin ? "Owner / Primary" : adminProfile?.role || "Manager"}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout} title="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Nested Route Content Container */}
        <main ref={mainScrollRef} data-lenis-prevent className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CMSLayout;
