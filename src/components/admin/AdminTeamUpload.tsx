import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

const AdminTeamUpload = () => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const apiBase = getApiBaseUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token || !image) return;

    setLoading(true);
    const form = new FormData();
    form.append("name", name);
    form.append("role", role);
    form.append("description", description);
    form.append("image", image);

    await fetch(`${apiBase}/team`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    setName("");
    setRole("");
    setDescription("");
    setImage(null);
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="text-2xl font-bold">Upload Team Member</div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="image">Employee Image</Label>
          <Input id="image" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </form>
    </div>
  );
};

export default AdminTeamUpload;
