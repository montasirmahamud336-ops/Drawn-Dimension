import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

const AdminUploadWork = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const apiBase = getApiBaseUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token || !media) return;

    setLoading(true);
    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("category", category);
    form.append("media", media);

    await fetch(`${apiBase}/projects`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    setTitle("");
    setDescription("");
    setCategory("");
    setMedia(null);
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="text-2xl font-bold">Upload New Work</div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="media">Media (image or video)</Label>
          <Input id="media" type="file" accept="image/*,video/*" onChange={(e) => setMedia(e.target.files?.[0] ?? null)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} required />
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

export default AdminUploadWork;
