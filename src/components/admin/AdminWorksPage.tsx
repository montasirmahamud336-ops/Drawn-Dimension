import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type ProjectMedia = {
  id: number;
  url: string;
  type: "image" | "video";
};

type Project = {
  id: number;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
  is_live: boolean;
  service_id: number | null;
  service_name: string | null;
  media: ProjectMedia[];
  created_at: string;
};

type PreviewFile = {
  file: File;
  url: string;
};

const AdminWorksPage = () => {
  const apiBase = getApiBaseUrl();
  const token = getAdminToken();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [addMediaFiles, setAddMediaFiles] = useState<PreviewFile[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const status = showDrafts ? "draft" : "live";
      const res = await fetch(`${apiBase}/projects?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [showDrafts]);

  const softDeleteProject = async (id: number) => {
    if (!token) return;
    const res = await fetch(`${apiBase}/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      toast({ title: "Moved to Drafts", description: "Project hidden from frontend." });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const restoreProject = async (id: number) => {
    if (!token) return;
    const res = await fetch(`${apiBase}/projects/${id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_live: true })
    });

    if (res.ok) {
      toast({ title: "Restored", description: "Project is live again." });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const saveProjectEdits = async () => {
    if (!token || !editProject) return;

    await fetch(`${apiBase}/projects/${editProject.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: editProject.title,
        description: editProject.description,
        category: editProject.category,
        tags: editProject.tags,
        service_id: editProject.service_id
      })
    });

    if (addMediaFiles.length > 0) {
      const form = new FormData();
      addMediaFiles.forEach((f) => form.append("media", f.file));
      await fetch(`${apiBase}/projects/${editProject.id}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
    }

    toast({ title: "Updated", description: "Project updated successfully." });
    addMediaFiles.forEach((f) => URL.revokeObjectURL(f.url));
    setAddMediaFiles([]);
    setEditProject(null);
    fetchProjects();
  };

  const removeProjectMedia = async (projectId: number, mediaId: number) => {
    if (!token) return;
    const res = await fetch(`${apiBase}/projects/${projectId}/media/${mediaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok && editProject) {
      setEditProject({
        ...editProject,
        media: editProject.media.filter((m) => m.id !== mediaId)
      });
    }
  };

  const handleAddMedia = (files: FileList | null) => {
    if (!files) return;
    const next: PreviewFile[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({ file, url: URL.createObjectURL(file) });
    });
    setAddMediaFiles((prev) => [...prev, ...next].slice(0, 20));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">Live Works</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowDrafts((prev) => !prev)}>
            {showDrafts ? "Live" : "Drafts"}
          </Button>
          <Button asChild>
            <Link to="/database/upload">Upload</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/20" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="glass-card border-border/50 overflow-hidden">
              <div className="grid grid-cols-3 gap-1 h-32 bg-muted/10">
                {p.media.slice(0, 3).map((m) => (
                  <img key={m.id} src={`${apiBase}${m.url}`} className="h-32 w-full object-cover" />
                ))}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{p.title}</div>
                  {(p.service_name || p.category) && (
                    <Badge variant="secondary">{p.service_name ?? p.category}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditProject(p)}>Edit</Button>
                  {showDrafts ? (
                    <Button size="sm" onClick={() => restoreProject(p.id)}>Restore</Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => softDeleteProject(p.id)}>Delete</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editProject && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={editProject.title} onChange={(e) => setEditProject({ ...editProject, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={editProject.category ?? ""} onChange={(e) => setEditProject({ ...editProject, category: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={editProject.description} onChange={(e) => setEditProject({ ...editProject, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input value={editProject.tags?.join(", ") ?? ""} onChange={(e) => setEditProject({ ...editProject, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
              </div>

              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-3 gap-2">
                  {editProject.media.map((m) => (
                    <div key={m.id} className="relative">
                      <img src={`${apiBase}${m.url}`} className="h-24 w-full object-cover rounded" />
                      <button
                        className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded"
                        onClick={() => removeProjectMedia(editProject.id, m.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add More Images</Label>
                <Input type="file" multiple accept="image/*" onChange={(e) => handleAddMedia(e.target.files)} />
                {addMediaFiles.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {addMediaFiles.map((f) => (
                      <img key={f.url} src={f.url} className="h-20 w-full object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
                <Button onClick={saveProjectEdits}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWorksPage;
