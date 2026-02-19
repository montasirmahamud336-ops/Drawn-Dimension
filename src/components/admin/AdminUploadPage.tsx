import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type PreviewFile = {
  file: File;
  url: string;
};

type Service = {
  id: number;
  name: string;
};

const AdminUploadPage = () => {
  const apiBase = getApiBaseUrl();
  const token = getAdminToken();
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [projectTags, setProjectTags] = useState("");
  const [projectFiles, setProjectFiles] = useState<PreviewFile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  useEffect(() => {
    const loadServices = async () => {
      const res = await fetch(`${apiBase}/services`);
      if (res.ok) {
        const data = await res.json();
        setServices(Array.isArray(data) ? data : []);
      }
    };
    loadServices();
  }, [apiBase]);

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
    if (selectedServiceId) {
      form.append("service_id", selectedServiceId);
    }
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
    setSelectedServiceId("");
    clearProjectFiles();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">Upload New Project</div>
        <Button onClick={submitProject}>Upload</Button>
      </div>

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
            <Label>Category (from Services)</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Category (optional text)</Label>
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
  );
};

export default AdminUploadPage;
