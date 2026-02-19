import { useState, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { SERVICES } from "@/data/servicesData";
import { CMS_BUCKET, ensureCmsBucket } from "@/integrations/supabase/storage";

interface WorkFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: any | null;
    onSuccess: () => void;
}

type MediaItem = {
    url: string;
    type: "image" | "video";
};

type PendingMedia = {
    id: string;
    file: File;
    url: string;
    type: "image" | "video";
};

const detectMediaType = (value: string) => {
    const v = value.toLowerCase();
    if (v.includes(".mp4") || v.includes(".mov") || v.includes(".webm")) return "video";
    return "image";
};

const normalizeMedia = (item: any): MediaItem[] => {
    if (Array.isArray(item?.media) && item.media.length > 0) {
        return item.media
            .filter((m: any) => typeof m?.url === "string" && m.url.length > 0)
            .map((m: any) => ({
                url: m.url,
                type: m.type === "video" ? "video" : "image",
            }));
    }
    if (item?.image_url) {
        return [{ url: item.image_url, type: detectMediaType(item.image_url) }];
    }
    return [];
};

const WorkForm = ({ open, onOpenChange, project, onSuccess }: WorkFormProps) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
    const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);

    const clearPendingMedia = () => {
        setPendingMedia((prev) => {
            prev.forEach((m) => URL.revokeObjectURL(m.url));
            return [];
        });
    };

    useEffect(() => {
        if (!open) return;
        if (project) {
            setValue("title", project.title);
            setValue("client", project.client);
            setValue("creator", project.creator || "");
            setValue("client_name", project.client_name || "");
            setValue("project_cost", project.project_cost || "");
            setValue("project_duration", project.project_duration || "");
            setValue("description", project.description);
            setValue("category", project.category);
            setValue("tags", project.tags ? project.tags.join(", ") : "");
            setValue("live_link", project.live_link);
            setValue("github_link", project.github_link);
            setExistingMedia(normalizeMedia(project));
        } else {
            reset();
            setExistingMedia([]);
        }
        clearPendingMedia();
    }, [project, open, reset, setValue]);

    useEffect(() => {
        return () => {
            clearPendingMedia();
        };
    }, []);

    const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const next: PendingMedia[] = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            url: URL.createObjectURL(file),
            type: file.type.startsWith("video/") ? "video" : "image",
        }));
        setPendingMedia((prev) => [...prev, ...next]);
        e.target.value = "";
    };

    const removeExistingMedia = (index: number) => {
        setExistingMedia((prev) => prev.filter((_, i) => i !== index));
    };

    const removePendingMedia = (id: string) => {
        setPendingMedia((prev) => {
            const target = prev.find((m) => m.id === id);
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((m) => m.id !== id);
        });
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        const apiBase = getApiBaseUrl();
        const token = getAdminToken();
        if (!token) {
            toast.error("Session expired. Please login again.");
            setLoading(false);
            return;
        }

        try {
            let uploadedMedia: MediaItem[] = [];

            if (pendingMedia.length > 0) {
                await ensureCmsBucket();
                uploadedMedia = await Promise.all(
                    pendingMedia.map(async (item) => {
                        const fileExt = item.file.name.split(".").pop() || "bin";
                        const fileName = `works/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from(CMS_BUCKET)
                            .upload(fileName, item.file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage.from(CMS_BUCKET).getPublicUrl(fileName);
                        return { url: publicUrl, type: item.type };
                    })
                );
            }

            const finalMedia = [...existingMedia, ...uploadedMedia];
            if (!project && finalMedia.length === 0) {
                throw new Error("Please upload at least one image or video");
            }

            const rawTags = typeof data.tags === "string" ? data.tags : "";
            const payload = {
                title: data.title,
                client: data.client,
                creator: data.creator || null,
                client_name: data.client_name || null,
                project_cost: data.project_cost || null,
                project_duration: data.project_duration || null,
                description: data.description,
                category: data.category,
                tags: rawTags.split(",").map((t: string) => t.trim()).filter(Boolean),
                live_link: data.live_link,
                github_link: data.github_link,
                media: finalMedia,
                image_url: finalMedia[0]?.url || null,
                status: project?.status || "live",
            };

            const url = project ? `${apiBase}/projects/${project.id}` : `${apiBase}/projects`;
            const method = project ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const contentType = res.headers.get("content-type") || "";
                let message = "Failed to save project";
                if (contentType.includes("application/json")) {
                    const body = await res.json().catch(() => null);
                    message = body?.detail || body?.message || message;
                } else {
                    const text = await res.text().catch(() => "");
                    if (text) message = text;
                }
                throw new Error(message);
            }

            toast.success(project ? "Project updated" : "Project created");
            clearPendingMedia();
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{project ? "Edit Work" : "Upload New Work"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="work-media-upload">Project Media (Images/Videos)</Label>
                        <div className="flex flex-wrap gap-3">
                            {existingMedia.map((media, index) => (
                                <div key={`existing-${index}`} className="relative w-28 h-20 rounded-lg overflow-hidden border border-border">
                                    {media.type === "video" ? (
                                        <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                        <img src={media.url} alt="Existing media" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeExistingMedia(index)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {pendingMedia.map((media) => (
                                <div key={media.id} className="relative w-28 h-20 rounded-lg overflow-hidden border border-border">
                                    {media.type === "video" ? (
                                        <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                        <img src={media.url} alt="Selected media" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removePendingMedia(media.id)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div>
                            <Label htmlFor="work-media-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                <Upload className="w-4 h-4" />
                                Select Multiple Media
                            </Label>
                            <Input
                                id="work-media-upload"
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={handleMediaChange}
                            />
                            <p className="text-xs text-muted-foreground mt-2">You can add images and videos. Remove any item before saving.</p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...register("title", { required: true })} placeholder="Project Title" />
                        {errors.title && <span className="text-destructive text-sm">Title is required</span>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="client">Client Name</Label>
                        <Input id="client" {...register("client")} placeholder="Client Name" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="creator">Created By</Label>
                            <Input id="creator" {...register("creator")} placeholder="Creator Name" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="client_name">Client (Display)</Label>
                            <Input id="client_name" {...register("client_name")} placeholder="Client Name for Detail Page" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="project_cost">Project Cost</Label>
                            <Input id="project_cost" {...register("project_cost")} placeholder="e.g. $25,000" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="project_duration">Project Duration</Label>
                            <Input id="project_duration" {...register("project_duration")} placeholder="e.g. 8 weeks" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register("description")} placeholder="Project Description" rows={4} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={watch("category") || ""}
                                onValueChange={(value) => setValue("category", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICES.map((service) => (
                                        <SelectItem key={service} value={service}>
                                            {service}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tags">Tags (comma separated)</Label>
                            <Input id="tags" {...register("tags")} placeholder="React, Node.js, AI" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="live_link">Live Link</Label>
                            <Input id="live_link" {...register("live_link")} placeholder="https://..." />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="github_link">GitHub Link</Label>
                            <Input id="github_link" {...register("github_link")} placeholder="https://github.com/..." />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {project ? "Save Changes" : "Upload Work"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default WorkForm;
