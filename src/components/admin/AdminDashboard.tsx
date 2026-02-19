import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ projects: 0, team: 0 });
  const apiBase = getApiBaseUrl();

  useEffect(() => {
    const load = async () => {
      const [projectsRes, teamRes] = await Promise.all([
        fetch(`${apiBase}/projects`),
        fetch(`${apiBase}/team`)
      ]);

      const projects = await projectsRes.json().catch(() => []);
      const team = await teamRes.json().catch(() => []);
      setStats({
        projects: Array.isArray(projects) ? projects.length : 0,
        team: Array.isArray(team) ? team.length : 0
      });
    };
    load();
  }, [apiBase]);

  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold">Dashboard</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-6 border-border/50">
          <div className="text-sm text-muted-foreground">Live Projects</div>
          <div className="text-3xl font-bold">{stats.projects}</div>
        </div>
        <div className="glass-card p-6 border-border/50">
          <div className="text-sm text-muted-foreground">Active Team Members</div>
          <div className="text-3xl font-bold">{stats.team}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
