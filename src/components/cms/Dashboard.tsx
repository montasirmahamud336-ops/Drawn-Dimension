import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Briefcase, ShoppingBag, Users } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

interface DashboardStats {
    views: number;
    works: number;
    team_members: number;
    products: number;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
    <Card className="border-border/40 bg-card/50 backdrop-blur shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className={`w-4 h-4 ${color}`} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
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

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = getAdminToken();
                const apiBase = getApiBaseUrl();
                const headers: Record<string, string> = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }

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

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your website activity and content.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Daily Website Views"
                    value={loading ? "..." : stats.views}
                    icon={Eye}
                    color="text-blue-500"
                />
                <StatCard
                    title="Live Works"
                    value={loading ? "..." : stats.works}
                    icon={Briefcase}
                    color="text-emerald-500"
                />
                <StatCard
                    title="Live Products"
                    value={loading ? "..." : stats.products}
                    icon={ShoppingBag}
                    color="text-pink-500"
                />
                <StatCard
                    title="Team Members"
                    value={loading ? "..." : stats.team_members}
                    icon={Users}
                    color="text-orange-500"
                />
            </div>

            {/* Placeholder for recent activity or charts if requested later */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-border/40 bg-card/50">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="text-sm text-muted-foreground text-center py-10">
                            No recent activity recorded.
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-border/40 bg-card/50">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Shortcuts could go here */}
                            <p className="text-sm text-muted-foreground">Select a category from the sidebar to manage content.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
