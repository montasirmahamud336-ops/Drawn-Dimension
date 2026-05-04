import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Briefcase, ShoppingBag, Users, Clock, ArrowUpRight, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getAdminToken, getApiBaseUrl, getAdminProfile, refreshAdminProfileFromApi } from "@/components/admin/adminAuth";

interface DashboardStats {
  views: number;
  works: number;
  team_members: number;
  products: number;
}

const StatItem = ({
  icon: Icon,
  label,
  value,
  loading,
  accentColor,
}: {
  icon: any;
  label: string;
  value: number;
  loading: boolean;
  accentColor: string;
}) => (
  <Card className="relative border-0 bg-white shadow-sm ring-1 ring-gray-200/80 rounded-xl hover:shadow-md transition-shadow duration-200">
    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${accentColor}`} />
    <CardContent className="p-5 pl-6">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${accentColor.replace("bg-", "bg-opacity-10 bg-").replace("-500", "-50")} text-current`}>
          <Icon className={`w-5 h-5 ${accentColor.replace("bg-", "text-")}`} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          {loading ? (
            <div className="h-7 w-12 mt-1 rounded bg-gray-100 animate-pulse" />
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    views: 0,
    works: 0,
    team_members: 0,
    products: 0,
  });
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState(getAdminProfile());
  const isMainAdmin = Boolean(adminProfile?.isMain);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getAdminToken();
        const apiBase = getApiBaseUrl();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const [projectsRes, productsRes, teamRes, legacyStatsRes] = await Promise.all([
          fetch(`${apiBase}/projects?status=live`, { headers }),
          fetch(`${apiBase}/products?status=live`, { headers }),
          fetch(`${apiBase}/team?status=live`, { headers }),
          fetch(`${apiBase}/dashboard-stats`, { headers }).catch(() => null),
        ]);

        const [projects, products, teamMembers, legacyStats] = await Promise.all([
          projectsRes.ok ? projectsRes.json() : [],
          productsRes.ok ? productsRes.json() : [],
          teamRes.ok ? teamRes.json() : [],
          legacyStatsRes && legacyStatsRes.ok ? legacyStatsRes.json() : null,
        ]);

        setStats({
          views: typeof legacyStats?.views === "number" ? legacyStats.views : 0,
          works: Array.isArray(projects) ? projects.length : 0,
          products: Array.isArray(products) ? products.length : 0,
          team_members: Array.isArray(teamMembers) ? teamMembers.length : 0,
        });
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
    return () => { mounted = false; };
  }, []);

  const displayName = adminProfile?.fullName || adminProfile?.username || "Admin";

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatItem
          icon={Eye}
          label="Daily Views"
          value={stats.views}
          loading={loading}
          accentColor="bg-blue-500"
        />
        <StatItem
          icon={Briefcase}
          label="Live Works"
          value={stats.works}
          loading={loading}
          accentColor="bg-emerald-500"
        />
        <StatItem
          icon={ShoppingBag}
          label="Live Products"
          value={stats.products}
          loading={loading}
          accentColor="bg-rose-500"
        />
        <StatItem
          icon={Users}
          label="Team Members"
          value={stats.team_members}
          loading={loading}
          accentColor="bg-amber-500"
        />
      </div>

      {/* Recent Activity & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-0 bg-white shadow-sm ring-1 ring-gray-200/80 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Clock className="w-10 h-10 mb-3 stroke-1" />
              <p className="text-sm font-medium text-gray-500">No recent activity</p>
              <p className="text-xs mt-1">New content changes will show up here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-gray-200/80 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <QuickLink to="/database/works" icon={Briefcase} label="Manage Works" />
            <QuickLink to="/database/products" icon={ShoppingBag} label="Manage Products" />
            <QuickLink to="/database/team" icon={Users} label="Team Members" />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="p-2 rounded-md bg-gray-100 text-gray-600 group-hover:bg-gray-200 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-700">Open Website</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const QuickLink = ({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) => (
  <Link
    to={to}
    className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors group"
  >
    <div className="p-2 rounded-md bg-gray-100 text-gray-600 group-hover:bg-gray-200 transition-colors">
      <Icon className="w-4 h-4" />
    </div>
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  </Link>
);

export default Dashboard;