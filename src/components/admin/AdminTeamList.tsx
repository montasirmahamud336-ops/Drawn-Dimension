import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type TeamMember = {
  id: number;
  name: string;
  role: string;
  description: string;
  image_url: string;
};

const AdminTeamList = () => {
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = getApiBaseUrl();

  const load = async () => {
    const res = await fetch(`${apiBase}/team`);
    const data = await res.json().catch(() => []);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [apiBase]);

  const handleDelete = async (id: number) => {
    const token = getAdminToken();
    if (!token) return;

    const res = await fetch(`${apiBase}/team/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      setItems((prev) => prev.filter((m) => m.id !== id));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">Team Management</div>
        <Button asChild size="sm">
          <Link to="/database/team/upload">Upload Team Member</Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <div key={m.id} className="glass-card border-border/50 overflow-hidden">
            <div className="h-40 bg-muted/20">
              <img src={`${apiBase}${m.image_url}`} alt={m.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 space-y-2">
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.role}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{m.description}</div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(m.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-muted-foreground">No team members found.</div>}
      </div>
    </div>
  );
};

export default AdminTeamList;
