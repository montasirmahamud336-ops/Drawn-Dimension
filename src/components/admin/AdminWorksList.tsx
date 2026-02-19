import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type Project = {
  id: number;
  title: string;
  description: string;
  category: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
};

const AdminWorksList = () => {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = getApiBaseUrl();

  const load = async () => {
    const res = await fetch(`${apiBase}/projects`);
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

    const res = await fetch(`${apiBase}/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">Works / Projects</div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <div key={p.id} className="glass-card border-border/50 overflow-hidden">
            <div className="h-40 bg-muted/20">
              {p.media_type === "image" ? (
                <img src={`${apiBase}${p.media_url}`} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <video src={`${apiBase}${p.media_url}`} className="w-full h-full object-cover" controls />
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground">{p.category}</div>
              <div className="font-semibold">{p.title}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{p.description}</div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-muted-foreground">No works found.</div>}
      </div>
    </div>
  );
};

export default AdminWorksList;
