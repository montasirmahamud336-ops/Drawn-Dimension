import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

const TAB_UPLOAD = "upload";
const TAB_TEAM = "team";
const TAB_WORKS = "works";

const tabLabels: Record<string, string> = {
  [TAB_UPLOAD]: "Upload New Project",
  [TAB_TEAM]: "Members Info",
  [TAB_WORKS]: "Existing Work"
};

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
  media: ProjectMedia[];
  created_at: string;
};

type TeamMember = {
  id: number;
  name: string;
  role: string;
  contact_info: string | null;
  description: string;
  image_url: string;
};

type PreviewFile = {
  file: File;
  url: string;
};

const AdminCMS = () => {
  const apiBase = getApiBaseUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? TAB_UPLOAD;
  const [activeTab, setActiveTab] = useState(initialTab);

  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [projectTags, setProjectTags] = useState("");
  const [projectFiles, setProjectFiles] = useState<PreviewFile[]>([]);

  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberContact, setMemberContact] = useState("");
  const [memberDescription, setMemberDescription] = useState("");
  const [memberImage, setMemberImage] = useState<PreviewFile | null>(null);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [addMediaFiles, setAddMediaFiles] = useState<PreviewFile[]>([]);
  const [editMemberImage, setEditMemberImage] = useState<PreviewFile | null>(null);

  const token = useMemo(() => getAdminToken(), []);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${apiBase}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch(`${apiBase}/team`);
      if (res.ok) {
        const data = await res.json();
        setTeam(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTeam();
  }, []);

  const clearProjectFiles = () => {
    projectFiles.forEach((p) => URL.revokeObjectURL(p.url));
    setProjectFiles([]);
  };

  const handleProjectFiles = (files: FileList | null) => {
    if (!files) return;
    const next: PreviewFile[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({ file, url: URL.createObjectURL(file) });
    });

    const combined = [...projectFiles, ...next].slice(0, 20);
    setProjectFiles(combined);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleProjectFiles(e.dataTransfer.files);
  };

  const removeProjectFile = (index: number) => {
    const target = projectFiles[index];
    if (target) URL.revokeObjectURL(target.url);
    setProjectFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitProject = async () => {
    if (!token) return;
    if (projectFiles.length < 15 || projectFiles.length > 20) {
      toast({ title: "Select 15-20 images", description: "Upload between 15 and 20 images per project." });
      return;
    }

    const form = new FormData();
    form.append("title", projectTitle);
    form.append("description", projectDescription);
    form.append("category", projectCategory);
    form.append("tags", projectTags);
    projectFiles.forEach((p) => form.append("media", p.file));

    const res = await fetch(`${apiBase}/projects`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    if (!res.ok) {
      toast({ title: "Upload failed", description: "Could not create project." });
      return;
    }

    toast({ title: "Project created", description: "Your project is live." });
    setProjectTitle("");
    setProjectDescription("");
    setProjectCategory("");
    setProjectTags("");
    clearProjectFiles();
    fetchProjects();
  };

  const deleteProject = async (id: number) => {
    if (!token) return;
    const res = await fetch(`${apiBase}/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      toast({ title: "Deleted", description: "Project removed." });
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
        tags: editProject.tags
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

  const submitMember = async () => {
    if (!token || !memberImage) return;

    const form = new FormData();
    form.append("name", memberName);
    form.append("role", memberRole);
    form.append("contact_info", memberContact);
    form.append("description", memberDescription);
    form.append("image", memberImage.file);

    const res = await fetch(`${apiBase}/team`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    if (!res.ok) {
      toast({ title: "Failed", description: "Could not add member." });
      return;
    }

    toast({ title: "Member added", description: "Team updated." });
    setMemberName("");
    setMemberRole("");
    setMemberContact("");
    setMemberDescription("");
    if (memberImage) URL.revokeObjectURL(memberImage.url);
    setMemberImage(null);
    fetchTeam();
  };

  const deleteMember = async (id: number) => {
    if (!token) return;
    const res = await fetch(`${apiBase}/team/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      toast({ title: "Deleted", description: "Team member removed." });
      setTeam((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const saveMemberEdits = async () => {
    if (!token || !editMember) return;

    const form = new FormData();
    form.append("name", editMember.name);
    form.append("role", editMember.role);
    form.append("contact_info", editMember.contact_info ?? "");
    form.append("description", editMember.description);
    if (editMemberImage) {
      form.append("image", editMemberImage.file);
    }

    await fetch(`${apiBase}/team/${editMember.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    toast({ title: "Updated", description: "Member updated." });
    if (editMemberImage) URL.revokeObjectURL(editMemberImage.url);
    setEditMemberImage(null);
    setEditMember(null);
    fetchTeam();
  };

  const tabs = [TAB_UPLOAD, TAB_TEAM, TAB_WORKS];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setTab(tab)}
          >
            {tabLabels[tab]}
          </Button>
        ))}
      </div>

      {activeTab === TAB_UPLOAD && (
        <div className="space-y-6">
          <div className="text-xl font-semibold">Upload New Project</div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div
                className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/20"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <p className="text-sm text-muted-foreground">Drag & drop 15-20 images here</p>
                <div className="mt-3">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleProjectFiles(e.target.files)}
                  />
                </div>
              </div>

              {projectFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {projectFiles.map((p, index) => (
                    <div key={p.url} className="relative group">
                      <img src={p.url} alt="preview" className="h-24 w-full object-cover rounded-lg" />
                      <button
                        className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                        onClick={() => removeProjectFile(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={4} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Input value={projectCategory} onChange={(e) => setProjectCategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={projectTags} onChange={(e) => setProjectTags(e.target.value)} />
              </div>
              <Button onClick={submitProject}>Submit Project</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === TAB_TEAM && (
        <div className="space-y-6">
          <div className="text-xl font-semibold">Members Info</div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {loadingTeam ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-40 rounded-xl bg-muted/20" />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {team.map((m) => (
                    <div key={m.id} className="glass-card p-4 border-border/50">
                      <div className="flex gap-3">
                        <img src={`${apiBase}${m.image_url}`} className="h-16 w-16 rounded-full object-cover" />
                        <div className="flex-1">
                          <div className="font-semibold">{m.name}</div>
                          <div className="text-sm text-muted-foreground">{m.role}</div>
                          {m.contact_info && <div className="text-xs text-muted-foreground">{m.contact_info}</div>}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{m.description}</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditMember(m)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMember(m.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Employee Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (memberImage) URL.revokeObjectURL(memberImage.url);
                    setMemberImage({ file, url: URL.createObjectURL(file) });
                  }}
                />
                {memberImage && <img src={memberImage.url} className="h-20 w-20 rounded-full object-cover" />}
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Info</Label>
                <Input value={memberContact} onChange={(e) => setMemberContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={memberDescription} onChange={(e) => setMemberDescription(e.target.value)} />
              </div>
              <Button onClick={submitMember}>Add Member</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === TAB_WORKS && (
        <div className="space-y-6">
          <div className="text-xl font-semibold">Existing Work</div>
          {loadingProjects ? (
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
                      {p.category && <Badge variant="secondary">{p.category}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditProject(p)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProject(p.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {editMember && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={editMember.role} onChange={(e) => setEditMember({ ...editMember, role: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Info</Label>
                <Input value={editMember.contact_info ?? ""} onChange={(e) => setEditMember({ ...editMember, contact_info: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={editMember.description} onChange={(e) => setEditMember({ ...editMember, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Update Image (optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (editMemberImage) URL.revokeObjectURL(editMemberImage.url);
                    setEditMemberImage({ file, url: URL.createObjectURL(file) });
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
                <Button onClick={saveMemberEdits}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCMS;
