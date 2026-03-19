import { useState, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { SERVICES } from "@/data/servicesData";
import { ensureCmsBucket, uploadCmsFile } from "@/integrations/supabase/storage";
import {
    getProjectPdfDocument,
    getProjectPrimaryImageUrl,
    getProjectVisualMedia,
    type ProjectMediaItem,
} from "@/components/shared/projectMedia";

interface WorkFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: any | null;
    onSuccess: () => void;
}

type MediaItem = {
    url: string;
    type: ProjectMediaItem["type"];
    name?: string | null;
};

type PendingMedia = {
    id: string;
    file: File;
    url: string;
    type: ProjectMediaItem["type"];
    name?: string | null;
};

const normalizeCategoryOption = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");

const mergeUniqueCategoryOptions = (...groups: (Array<string | undefined | null> | undefined)[]) => {
    const seen = new Set<string>();
    const merged: string[] = [];

    groups.forEach((group) => {
        (group || []).forEach((raw) => {
            const normalized = normalizeCategoryOption(raw);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            merged.push(normalized);
        });
    });

    return merged;
};

const buildFallbackCategoryOptions = (category?: unknown) =>
    mergeUniqueCategoryOptions([...SERVICES], [typeof category === "string" ? category : undefined]);

const getFallbackFileName = (url: string) => {
    try {
        const parsed = new URL(url);
        const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
        return lastSegment ? decodeURIComponent(lastSegment) : "document.pdf";
    } catch {
        return "document.pdf";
    }
};

const WorkForm = ({ open, onOpenChange, project, onSuccess }: WorkFormProps) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
    const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
    const [existingDocument, setExistingDocument] = useState<MediaItem | null>(null);
    const [pendingDocument, setPendingDocument] = useState<PendingMedia | null>(null);
    const [categoryOptions, setCategoryOptions] = useState<string[]>(() => buildFallbackCategoryOptions(project?.category));
    const [categoryOptionsLoading, setCategoryOptionsLoading] = useState(false);

    const clearPendingAssets = () => {
        setPendingMedia((prev) => {
            prev.forEach((item) => URL.revokeObjectURL(item.url));
            return [];
        });
        setPendingDocument((prev) => {
            if (prev?.url) {
                URL.revokeObjectURL(prev.url);
            }
            return null;
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
            setExistingMedia(getProjectVisualMedia(project));
            setExistingDocument(getProjectPdfDocument(project));
        } else {
            reset();
            setExistingMedia([]);
            setExistingDocument(null);
        }
        clearPendingAssets();
    }, [project, open, reset, setValue]);

    useEffect(() => {
        const fallbackOptions = buildFallbackCategoryOptions(project?.category);
        setCategoryOptions(fallbackOptions);

        if (!open) return;

        let cancelled = false;
        const apiBase = getApiBaseUrl();

        const loadServiceOptions = async () => {
            setCategoryOptionsLoading(true);
            try {
                const response = await fetch(`${apiBase}/services?status=all`);
                if (!response.ok) {
                    throw new Error(`Failed to load services (${response.status})`);
                }

                const payload = await response.json();
                const liveServiceNames = Array.isArray(payload)
                    ? payload
                        .map((item) => normalizeCategoryOption(item?.name))
                        .filter(Boolean)
                    : [];

                if (!cancelled) {
                    setCategoryOptions(mergeUniqueCategoryOptions(liveServiceNames, fallbackOptions));
                }
            } catch (error) {
                if (!cancelled) {
                    setCategoryOptions(fallbackOptions);
                }
                console.error("Failed to load work categories from services", error);
            } finally {
                if (!cancelled) {
                    setCategoryOptionsLoading(false);
                }
            }
        };

        void loadServiceOptions();

        return () => {
            cancelled = true;
        };
    }, [open, project?.category]);

    useEffect(() => {
        return () => {
            clearPendingAssets();
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
            name: file.name,
        }));
        setPendingMedia((prev) => [...prev, ...next]);
        e.target.value = "";
    };

    const handlePdfChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            toast.error("Please select a PDF file");
            e.target.value = "";
            return;
        }

        setPendingDocument((prev) => {
            if (prev?.url) {
                URL.revokeObjectURL(prev.url);
            }
            return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                url: URL.createObjectURL(file),
                type: "pdf",
                name: file.name,
            };
        });
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

    const removeExistingDocument = () => {
        setExistingDocument(null);
    };

    const removePendingDocument = () => {
        setPendingDocument((prev) => {
            if (prev?.url) {
                URL.revokeObjectURL(prev.url);
            }
            return null;
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
            let uploadedDocument: MediaItem | null = null;

            if (pendingMedia.length > 0) {
                await ensureCmsBucket();
                uploadedMedia = await Promise.all(
                    pendingMedia.map(async (item) => {
                        const fileExt = item.file.name.split(".").pop() || "bin";
                        const fileName = `works/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                        const publicUrl = await uploadCmsFile(item.file, fileName);
                        return { url: publicUrl, type: item.type, name: item.name };
                    })
                );
            }

            if (pendingDocument) {
                await ensureCmsBucket();
                const fileExt = pendingDocument.file.name.split(".").pop() || "pdf";
                const fileName = `works/documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                const publicUrl = await uploadCmsFile(pendingDocument.file, fileName);
                uploadedDocument = {
                    url: publicUrl,
                    type: "pdf",
                    name: pendingDocument.file.name,
                };
            }

            const finalMedia = [
                ...existingMedia,
                ...uploadedMedia,
                ...(uploadedDocument ? [uploadedDocument] : existingDocument ? [existingDocument] : []),
            ];
            if (!project && finalMedia.length === 0) {
                throw new Error("Please upload at least one image, video, or PDF");
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
                image_url: getProjectPrimaryImageUrl(finalMedia),
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
            clearPendingAssets();
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
            <DialogContent className="sm:max-w-[700px] max-h-[85dvh] overflow-y-auto overscroll-contain">
                <DialogHeader>
                    <DialogTitle>{project ? "Edit Work" : "Upload New Work"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="work-media-upload">Project Media (Images/Videos, Optional)</Label>
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
                            <p className="text-xs text-muted-foreground mt-2">You can add images and videos here. PDF-only works are also supported from the PDF field below.</p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="work-pdf-upload">Project PDF</Label>
                        <div className="flex flex-wrap gap-3">
                            {existingDocument && (
                                <div className="relative flex min-w-[220px] max-w-full items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 pr-12">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {existingDocument.name || getFallbackFileName(existingDocument.url)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Existing PDF document</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeExistingDocument}
                                        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                                        aria-label="Remove existing PDF"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {pendingDocument && (
                                <div className="relative flex min-w-[220px] max-w-full items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 pr-12">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{pendingDocument.name || pendingDocument.file.name}</p>
                                        <p className="text-xs text-muted-foreground">Ready to upload</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removePendingDocument}
                                        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                                        aria-label="Remove selected PDF"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="work-pdf-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                <FileText className="w-4 h-4" />
                                Select PDF Document
                            </Label>
                            <Input
                                id="work-pdf-upload"
                                type="file"
                                accept=".pdf,application/pdf"
                                className="hidden"
                                onChange={handlePdfChange}
                            />
                            <p className="text-xs text-muted-foreground mt-2">Upload one PDF for a PDF-based work. The work card will use the first page as its preview and visitors can scroll the full document on the detail page.</p>
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
                                    <SelectValue placeholder={categoryOptionsLoading ? "Loading services..." : "Select a service"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map((service) => (
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
