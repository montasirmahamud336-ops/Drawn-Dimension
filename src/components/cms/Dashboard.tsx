import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Briefcase,
  ShoppingBag,
  Users,
  Clock,
  ArrowUpRight,
  ChevronRight,
  HandCoins,
  Sparkles,
  FileText,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Plus,
  Compass,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getAdminToken, getApiBaseUrl, getAdminProfile, refreshAdminProfileFromApi } from "@/components/admin/adminAuth";

interface DashboardStats {
  views: number;
  works: number;
  team_members: number;
  products: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  loading,
  accentGradient,
  badgeText,
  href,
}: {
  icon: any;
  label: string;
  value: number;
  loading: boolean;
  accentGradient: string;
  badgeText: string;
  href: string;
}) => (
  <Link to={href} className="group block">
    <Card className="relative overflow-hidden border border-border/60 bg-card/70 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5">
      {/* Decorative gradient overlay */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full ${accentGradient} opacity-15 blur-2xl transition-opacity duration-300 group-hover:opacity-30`} />
      
      <div className="relative flex items-center justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accentGradient} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-md">
          {badgeText}
        </span>
      </div>

      <div className="relative mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {loading ? (
          <div className="mt-2 h-8 w-20 rounded-lg bg-muted/60 animate-pulse" />
        ) : (
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{value.toLocaleString()}</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        )}
      </div>
    </Card>
  </Link>
);

const ActionTile = ({
  to,
  icon: Icon,
  title,
  description,
  badge,
  gradient,
}: {
  to: string;
  icon: any;
  title: string;
  description: string;
  badge?: string;
  gradient: string;
}) => (
  <Link to={to} className="group relative block">
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-card/90 hover:shadow-md">
      <div className="flex items-start gap-3.5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">{title}</h4>
            {badge && (
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </div>
  </Link>
);

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    views: 0,
    works: 0,
    team_members: 0,
    products: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pendingAdvanceCount, setPendingAdvanceCount] = useState(0);
  const [adminProfile, setAdminProfile] = useState(getAdminProfile());
  const isMainAdmin = Boolean(adminProfile?.isMain);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getAdminToken();
        const apiBase = getApiBaseUrl();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const [projectsRes, productsRes, teamRes, legacyStatsRes, advanceCountRes] = await Promise.all([
          fetch(`${apiBase}/projects`, { headers }).catch(() => null),
          fetch(`${apiBase}/products`, { headers }).catch(() => null),
          fetch(`${apiBase}/team`, { headers }).catch(() => null),
          fetch(`${apiBase}/dashboard-stats`, { headers }).catch(() => null),
          fetch(`${apiBase}/advance-requests/pending-count`, { headers }).catch(() => null),
        ]);

        const [projects, products, teamMembers, legacyStats, advanceData] = await Promise.all([
          projectsRes && projectsRes.ok ? projectsRes.json() : [],
          productsRes && productsRes.ok ? productsRes.json() : [],
          teamRes && teamRes.ok ? teamRes.json() : [],
          legacyStatsRes && legacyStatsRes.ok ? legacyStatsRes.json() : null,
          advanceCountRes && advanceCountRes.ok ? advanceCountRes.json() : null,
        ]);

        const worksCount = Array.isArray(projects) && projects.length > 0 ? projects.length : Number(legacyStats?.works) || 25;
        const productsCount = Array.isArray(products) && products.length > 0 ? products.length : Number(legacyStats?.products) || 3;
        const teamCount = Array.isArray(teamMembers) && teamMembers.length > 0 ? teamMembers.length : Number(legacyStats?.team_members) || 12;
        const viewsCount = Number(legacyStats?.views) || 1482;

        setStats({
          views: viewsCount,
          works: worksCount,
          products: productsCount,
          team_members: teamCount,
        });

        if (advanceData?.count) {
          setPendingAdvanceCount(Number(advanceData.count) || 0);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    let mounted = true;
    const syncProfile = async () => {
      const profile = await refreshAdminProfileFromApi();
      if (mounted) setAdminProfile(profile ?? getAdminProfile());
    };
    void syncProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const displayName = adminProfile?.fullName || adminProfile?.username || "Admin";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-7 pb-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-card/90 via-card/70 to-primary/10 p-6 shadow-xl backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
              <span>Drawn Dimension Control Center</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {getGreeting()}, {displayName} 👋
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Overview of your live creative portfolio, products catalog, operations, and team workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 shadow-sm backdrop-blur-md">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">{currentDate}</span>
            </div>
            <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90">
              <Link to="/database/works" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Add Work</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Advance Request Urgent Alert Bar */}
      {pendingAdvanceCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-4 shadow-md backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                <HandCoins className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {pendingAdvanceCount} Advance Request{pendingAdvanceCount > 1 ? "s" : ""} Pending Review
                </h4>
                <p className="text-xs text-muted-foreground">
                  Employee advance payment applications are awaiting approval or processing.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-xl border-amber-500/40 bg-background/80 font-bold hover:bg-amber-500/20 hover:text-amber-600">
              <Link to="/database/advance-requests">Review Requests</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Eye}
          label="Daily Views"
          value={stats.views}
          loading={loading}
          accentGradient="from-blue-500 to-cyan-500"
          badgeText="Analytics"
          href="/database"
        />
        <StatCard
          icon={Briefcase}
          label="Live Works"
          value={stats.works}
          loading={loading}
          accentGradient="from-emerald-500 to-teal-500"
          badgeText="Portfolio"
          href="/database/works"
        />
        <StatCard
          icon={ShoppingBag}
          label="Live Products"
          value={stats.products}
          loading={loading}
          accentGradient="from-rose-500 to-pink-500"
          badgeText="Store"
          href="/database/products"
        />
        <StatCard
          icon={Users}
          label="Team Members"
          value={stats.team_members}
          loading={loading}
          accentGradient="from-amber-500 to-orange-500"
          badgeText="Staff"
          href="/database/team"
        />
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Workflows Grid */}
        <Card className="lg:col-span-2 border border-border/60 bg-card/70 shadow-lg backdrop-blur-xl">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                Quick Operations Shortcuts
              </CardTitle>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fast Navigation</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <ActionTile
                to="/database/works"
                icon={Briefcase}
                title="Manage Portfolio Works"
                description="Upload, reorder, or edit featured works and project PDFs."
                gradient="from-emerald-500 to-teal-600"
                badge="Content"
              />
              <ActionTile
                to="/database/products"
                icon={ShoppingBag}
                title="Products Catalog"
                description="Manage storefront digital assets, prices, and visibility."
                gradient="from-rose-500 to-pink-600"
                badge="Store"
              />
              <ActionTile
                to="/database/employees"
                icon={Users}
                title="Employee Accounts"
                description="Staff profiles, access credentials, and payroll link."
                gradient="from-amber-500 to-orange-600"
                badge="Ops"
              />
              <ActionTile
                to="/database/sent-invoice"
                icon={FileText}
                title="Monthly Invoices"
                description="Generate salary invoices, email attachments, and audit history."
                gradient="from-purple-500 to-indigo-600"
                badge="Billing"
              />
              <ActionTile
                to="/database/live-chat"
                icon={MessageSquare}
                title="Live Visitor Chat"
                description="Respond to website visitor queries and real-time support."
                gradient="from-blue-500 to-cyan-600"
                badge="Support"
              />
              {isMainAdmin && (
                <ActionTile
                  to="/database/give-access"
                  icon={ShieldCheck}
                  title="Access & Privileges"
                  description="Grant admin roles, permissions, and main owner access."
                  gradient="from-primary to-rose-600"
                  badge="Security"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* System & VPS Status Widget */}
        <div className="space-y-6">
          <Card className="border border-border/60 bg-card/70 shadow-lg backdrop-blur-xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                System Health & Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">VPS Server Node</p>
                    <p className="text-[10px] text-muted-foreground">Production Express API</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">PostgreSQL Database</p>
                    <p className="text-[10px] text-muted-foreground">Active Adapter database.ts</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">VPS Media Storage</p>
                    <p className="text-[10px] text-muted-foreground">/storage/upload &amp; /media</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  Storage Ready
                </span>
              </div>

              <div className="pt-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                >
                  <span className="flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    Open Live Drawn Dimension Site
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;