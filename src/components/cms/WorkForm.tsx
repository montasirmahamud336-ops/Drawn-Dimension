import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { FileText, GripVertical, Loader2, Maximize2, Upload, X } from "lucide-react";
import { ensureCmsBucket, uploadCmsFile } from "@/integrations/supabase/storage";
import {
    getProjectPdfDocument,
    getProjectPrimaryImageUrl,
    getProjectVisualMedia,
    type ProjectMediaItem,
} from "@/components/shared/projectMedia";
import {
    getPortfolioFilterCategories,
    normalizeProjectServiceIds,
} from "@/components/shared/projectAssociations";
import { moveItemById } from "./reorderUtils";

interface WorkFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: any | null;
    onSuccess: () => void;
}

type MediaItem = {
    id?: string;
    url: string;
    type: ProjectMediaItem["type"];
    name?: string | null;
};

type VisualMediaType = Extract<ProjectMediaItem["type"], "image" | "video">;

type VisualMediaItem = {
    id: string;
    url: string;
    type: VisualMediaType;
    name?: string | null;
};

type PendingMedia = {
    id: string;
    file: File;
    url: string;
    type: VisualMediaType;
    name?: string | null;
};

type PendingDocument = {
    id: string;
    file: File;
    url: string;
    type: "pdf";
    name?: string | null;
};

type OrderedVisualMediaItem = VisualMediaItem & {
    origin: "existing" | "pending";
};

type ServiceOption = {
    id: number;
    name: string;
    slug?: string | null;
};

const DEFAULT_CATEGORY_OPTIONS = ["Web Design", "CAD & 3D", "Engineering", "Branding"];

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
    mergeUniqueCategoryOptions(DEFAULT_CATEGORY_OPTIONS, [typeof category === "string" ? category : undefined]);

const getFallbackFileName = (url: string) => {
    try {
        const parsed = new URL(url);
        const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
        return lastSegment ? decodeURIComponent(lastSegment) : "document.pdf";
    } catch {
        return "document.pdf";
    }
};

const createMediaId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const buildExistingVisualMedia = (item: any): VisualMediaItem[] =>
    getProjectVisualMedia(item).map((media) => ({
        id: createMediaId("existing"),
        url: media.url,
        type: media.type === "video" ? "video" : "image",
        name: media.name,
    }));

const WorkForm = ({ open, onOpenChange, project, onSuccess }: WorkFormProps) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [existingMedia, setExistingMedia] = useState<VisualMediaItem[]>([]);
    const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
    const [existingDocument, setExistingDocument] = useState<MediaItem | null>(null);
    const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
    const [mediaOrderIds, setMediaOrderIds] = useState<string[]>([]);
    const [draggingMediaId, setDraggingMediaId] = useState<string | null>(null);
    const [dropTargetMediaId, setDropTargetMediaId] = useState<string | null>(null);
    const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
    const [categoryOptions, setCategoryOptions] = useState<string[]>(() => buildFallbackCategoryOptions(project?.category));
    const [categoryOptionsLoading, setCategoryOptionsLoading] = useState(false);
    const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
    const [serviceOptionsLoading, setServiceOptionsLoading] = useState(false);
    const draggingMediaIdRef = useRef<string | null>(null);
    const pendingMediaRef = useRef<PendingMedia[]>([]);
    const pendingDocumentRef = useRef<PendingDocument | null>(null);

    useEffect(() => {
        pendingMediaRef.current = pendingMedia;
    }, [pendingMedia]);

    useEffect(() => {
        pendingDocumentRef.current = pendingDocument;
    }, [pendingDocument]);

    const pruneMediaUiState = useCallback((ids: string[]) => {
        if (ids.length === 0) return;
        const removedIds = new Set(ids);
        setMediaOrderIds((prev) => prev.filter((id) => !removedIds.has(id)));
        setDraggingMediaId((prev) => (prev && removedIds.has(prev) ? null : prev));
        setDropTargetMediaId((prev) => (prev && removedIds.has(prev) ? null : prev));
        setPreviewMediaId((prev) => (prev && removedIds.has(prev) ? null : prev));
        if (draggingMediaIdRef.current && removedIds.has(draggingMediaIdRef.current)) {
            draggingMediaIdRef.current = null;
        }
    }, []);

    const clearPendingAssets = useCallback(() => {
        const pendingIds = pendingMediaRef.current.map((item) => item.id);
        pendingMediaRef.current.forEach((item) => URL.revokeObjectURL(item.url));
        if (pendingDocumentRef.current?.url) {
            URL.revokeObjectURL(pendingDocumentRef.current.url);
        }
        pendingMediaRef.current = [];
        pendingDocumentRef.current = null;
        pruneMediaUiState(pendingIds);
        setPendingMedia([]);
        setPendingDocument(null);
    }, [pruneMediaUiState]);

    const orderedVisualMedia = useMemo<OrderedVisualMediaItem[]>(() => {
        const allItems = [
            ...existingMedia.map((item) => ({ ...item, origin: "existing" as const })),
            ...pendingMedia.map((item) => ({ ...item, origin: "pending" as const })),
        ];
        const itemsById = new Map(allItems.map((item) => [item.id, item]));
        const seenIds = new Set<string>();
        const orderedItems: OrderedVisualMediaItem[] = [];

        mediaOrderIds.forEach((id) => {
            const item = itemsById.get(id);
            if (!item || seenIds.has(id)) return;
            seenIds.add(id);
            orderedItems.push(item);
        });

        allItems.forEach((item) => {
            if (!seenIds.has(item.id)) {
                orderedItems.push(item);
            }
        });

        return orderedItems;
    }, [existingMedia, mediaOrderIds, pendingMedia]);

    const previewMedia = orderedVisualMedia.find((item) => item.id === previewMediaId) ?? null;

    useEffect(() => {
        if (!open) return;
        clearPendingAssets();
        draggingMediaIdRef.current = null;
        setDraggingMediaId(null);
        setDropTargetMediaId(null);
        setPreviewMediaId(null);
        if (project) {
            const nextExistingMedia = buildExistingVisualMedia(project);
            setValue("title", project.title);
            setValue("client", project.client);
            setValue("creator", project.creator || "");
            setValue("project_cost", project.project_cost || "");
            setValue("project_duration", project.project_duration || "");
            setValue("description", project.description);
            setValue("category", project.category);
            setValue("linked_service_ids", normalizeProjectServiceIds(project.linked_service_ids));
            setValue("tags", project.tags ? project.tags.join(", ") : "");
            setExistingMedia(nextExistingMedia);
            setMediaOrderIds(nextExistingMedia.map((item) => item.id));
            setExistingDocument(getProjectPdfDocument(project));
        } else {
            reset();
            setValue("linked_service_ids", []);
            setExistingMedia([]);
            setMediaOrderIds([]);
            setExistingDocument(null);
        }
    }, [clearPendingAssets, project, open, reset, setValue]);

    useEffect(() => {
        const fallbackOptions = buildFallbackCategoryOptions(project?.category);
        setCategoryOptions(fallbackOptions);

        if (!open) return;

        let cancelled = false;
        const apiBase = getApiBaseUrl();

        const loadCategoryOptions = async () => {
            setCategoryOptionsLoading(true);
            try {
                const [projectsResponse, settingsResponse] = await Promise.all([
                    fetch(`${apiBase}/projects?status=all`),
                    fetch(`${apiBase}/home-page-settings`),
                ]);
                if (!projectsResponse.ok) {
                    throw new Error(`Failed to load work categories (${projectsResponse.status})`);
                }

                const [projectsPayload, settingsPayload] = await Promise.all([
                    projectsResponse.json(),
                    settingsResponse.ok ? settingsResponse.json() : Promise.resolve({}),
                ]);
                const existingCategories = Array.isArray(projectsPayload)
                    ? projectsPayload
                        .map((item) => normalizeCategoryOption(item?.category))
                        .filter(Boolean)
                    : [];
                const managedCategories = getPortfolioFilterCategories(settingsPayload);

                if (!cancelled) {
                    setCategoryOptions(mergeUniqueCategoryOptions(managedCategories, existingCategories, fallbackOptions));
                }
            } catch (error) {
                if (!cancelled) {
                    setCategoryOptions(fallbackOptions);
                }
                console.error("Failed to load work categories from projects", error);
            } finally {
                if (!cancelled) {
                    setCategoryOptionsLoading(false);
                }
            }
        };

        void loadCategoryOptions();

        return () => {
            cancelled = true;
        };
    }, [open, project?.category]);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        const apiBase = getApiBaseUrl();

        const loadServiceOptions = async () => {
            setServiceOptionsLoading(true);
            try {
                const response = await fetch(`${apiBase}/services?status=all`);
                if (!response.ok) {
                    throw new Error(`Failed to load services (${response.status})`);
                }

                const payload = await response.json();
                const nextOptions = Array.isArray(payload)
                    ? payload
                        .map((item) => ({
                            id: Number(item?.id),
                            name: String(item?.name ?? "").trim(),
                            slug: typeof item?.slug === "string" ? item.slug : null,
                        }))
                        .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.name.length > 0)
                        .sort((a, b) => a.name.localeCompare(b.name))
                    : [];

                if (!cancelled) {
                    setServiceOptions(nextOptions);
                }
            } catch (error) {
                if (!cancelled) {
                    setServiceOptions([]);
                }
                console.error("Failed to load service options for works", error);
            } finally {
                if (!cancelled) {
                    setServiceOptionsLoading(false);
                }
            }
        };

        void loadServiceOptions();

        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        return () => {
            clearPendingAssets();
        };
    }, [clearPendingAssets]);

    useEffect(() => {
        if (!open) {
            draggingMediaIdRef.current = null;
            setDraggingMediaId(null);
            setDropTargetMediaId(null);
            setPreviewMediaId(null);
        }
    }, [open]);

    useEffect(() => {
        if (previewMediaId && !orderedVisualMedia.some((item) => item.id === previewMediaId)) {
            setPreviewMediaId(null);
        }
    }, [orderedVisualMedia, previewMediaId]);

    useEffect(() => {
        if (!previewMedia) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setPreviewMediaId(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [previewMedia]);

    const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const next: PendingMedia[] = files.map((file) => ({
            id: createMediaId("pending"),
            file,
            url: URL.createObjectURL(file),
            type: file.type.startsWith("video/") ? "video" : "image",
            name: file.name,
        }));
        setPendingMedia((prev) => [...prev, ...next]);
        setMediaOrderIds((prev) => [...prev, ...next.map((item) => item.id)]);
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
                id: createMediaId("pdf"),
                file,
                url: URL.createObjectURL(file),
                type: "pdf",
                name: file.name,
            };
        });
        e.target.value = "";
    };

    const removeExistingMedia = (id: string) => {
        pruneMediaUiState([id]);
        setExistingMedia((prev) => prev.filter((item) => item.id !== id));
    };

    const removePendingMedia = (id: string) => {
        pruneMediaUiState([id]);
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

    const handleMediaDragStart = useCallback((mediaId: string, event: DragEvent<HTMLElement>) => {
        draggingMediaIdRef.current = mediaId;
        setDraggingMediaId(mediaId);
        setDropTargetMediaId(mediaId);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", mediaId);
    }, []);

    const handleMediaDragEnter = useCallback((targetId: string) => {
        setDropTargetMediaId((current) => {
            const activeMediaId = draggingMediaIdRef.current;
            if (!activeMediaId || activeMediaId === targetId || current === targetId) {
                return current;
            }
            return targetId;
        });
    }, []);

    const handleMediaDrop = useCallback((targetId: string) => {
        const activeMediaId = draggingMediaIdRef.current;
        if (!activeMediaId) {
            setDropTargetMediaId(null);
            return;
        }

        if (activeMediaId !== targetId) {
            setMediaOrderIds((prev) => moveItemById(prev.map((id) => ({ id })), activeMediaId, targetId).map((item) => item.id));
        }

        draggingMediaIdRef.current = null;
        setDraggingMediaId(null);
        setDropTargetMediaId(null);
    }, []);

    const handleMediaDragEnd = useCallback(() => {
        draggingMediaIdRef.current = null;
        setDraggingMediaId(null);
        setDropTargetMediaId(null);
    }, []);

    const selectedServiceIds = normalizeProjectServiceIds(watch("linked_service_ids"));

    const toggleLinkedService = (serviceId: number, checked: boolean) => {
        const nextServiceIds = checked
            ? Array.from(new Set([...selectedServiceIds, serviceId]))
            : selectedServiceIds.filter((id) => id !== serviceId);
        setValue("linked_service_ids", nextServiceIds, { shouldDirty: true });
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
            let uploadedMediaEntries: Array<{ id: string; media: MediaItem }> = [];
            let uploadedDocument: MediaItem | null = null;

            if (pendingMedia.length > 0) {
                await ensureCmsBucket();
                uploadedMediaEntries = await Promise.all(
                    pendingMedia.map(async (item) => {
                        const fileExt = item.file.name.split(".").pop() || "bin";
                        const fileName = `works/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                        const publicUrl = await uploadCmsFile(item.file, fileName);
                        return {
                            id: item.id,
                            media: { url: publicUrl, type: item.type, name: item.name },
                        };
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

            const existingMediaMap = new Map(
                existingMedia.map((item) => [item.id, { url: item.url, type: item.type, name: item.name } satisfies MediaItem])
            );
            const uploadedMediaMap = new Map(uploadedMediaEntries.map((entry) => [entry.id, entry.media]));
            const orderedVisualIds = orderedVisualMedia.map((item) => item.id);
            const finalVisualMedia = orderedVisualIds
                .map((id) => existingMediaMap.get(id) ?? uploadedMediaMap.get(id))
                .filter((item): item is MediaItem => Boolean(item));
            const finalMedia = [
                ...finalVisualMedia,
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
                client_name: null,
                project_cost: data.project_cost || null,
                project_duration: data.project_duration || null,
                description: data.description,
                category: data.category,
                tags: rawTags.split(",").map((t: string) => t.trim()).filter(Boolean),
                linked_service_ids: selectedServiceIds,
                live_link: null,
                github_link: null,
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
                            {orderedVisualMedia.map((media, index) => {
                                const isDragging = draggingMediaId === media.id;
                                const isDropTarget = dropTargetMediaId === media.id && draggingMediaId !== media.id;
                                const isCover = index === 0;

                                return (
                                    <div
                                        key={media.id}
                                        className={`group relative h-20 w-28 overflow-hidden rounded-lg border bg-muted/20 transition-all ${isDragging ? "opacity-65" : ""} ${isDropTarget ? "border-primary ring-2 ring-primary/35" : "border-border"}`}
                                        onDragEnter={() => handleMediaDragEnter(media.id)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            handleMediaDrop(media.id);
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMediaId(media.id)}
                                            className="absolute inset-0 z-0"
                                            aria-label={`Preview ${media.name || `media ${index + 1}`}`}
                                        />
                                        {media.type === "video" ? (
                                            <video
                                                src={media.url}
                                                className="h-full w-full object-cover pointer-events-none"
                                                muted
                                                playsInline
                                                draggable={false}
                                            />
                                        ) : (
                                            <img
                                                src={media.url}
                                                alt={media.name || `Selected media ${index + 1}`}
                                                className="h-full w-full object-cover pointer-events-none"
                                                draggable={false}
                                            />
                                        )}
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80" />
                                        <div className="pointer-events-none absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                                            <Maximize2 className="h-3 w-3" />
                                            View
                                        </div>
                                        {isCover && (
                                            <div className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow-sm">
                                                Cover
                                            </div>
                                        )}
                                        <div
                                            role="button"
                                            tabIndex={-1}
                                            draggable
                                            onClick={(event) => event.stopPropagation()}
                                            onDragStart={(event) => handleMediaDragStart(media.id, event)}
                                            onDragEnd={handleMediaDragEnd}
                                            className="absolute left-1 top-1 z-20 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-black/70 text-white shadow-sm active:cursor-grabbing"
                                            title="Drag to reorder"
                                            aria-label="Drag to reorder media"
                                        >
                                            <GripVertical className="h-3.5 w-3.5" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (media.origin === "existing") {
                                                    removeExistingMedia(media.id);
                                                } else {
                                                    removePendingMedia(media.id);
                                                }
                                            }}
                                            className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-sm"
                                            aria-label="Remove media"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            })}
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
                            <p className="text-xs text-muted-foreground mt-2">Drag the grip icon to set the cover image order, and click any thumbnail to view it full size. PDF-only works are also supported from the PDF field below.</p>
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

                    <div className="grid gap-2">
                        <Label htmlFor="creator">Created By</Label>
                        <Input id="creator" {...register("creator")} placeholder="Creator Name" />
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
                            <Label htmlFor="category">Portfolio Category</Label>
                            <Input
                                id="category"
                                list="portfolio-category-options"
                                {...register("category")}
                                placeholder={categoryOptionsLoading ? "Loading categories..." : "Type or choose a category"}
                            />
                            <datalist id="portfolio-category-options">
                                {categoryOptions.map((category) => (
                                    <option key={category} value={category} />
                                ))}
                            </datalist>
                            <p className="text-xs text-muted-foreground">
                                Type a new category to create a new filter button on Our Work. If no work uses a category anymore, that button disappears automatically.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tags">Tags (comma separated)</Label>
                            <Input id="tags" {...register("tags")} placeholder="React, Node.js, AI" />
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <Label>Show On Service Pages</Label>
                            {serviceOptionsLoading ? (
                                <span className="text-xs text-muted-foreground">Loading services...</span>
                            ) : null}
                        </div>
                        <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                            {serviceOptions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No services available right now. Publish services first from CMS Pages.
                                </p>
                            ) : (
                                serviceOptions.map((service) => {
                                    const isChecked = selectedServiceIds.includes(service.id);

                                    return (
                                        <label
                                            key={service.id}
                                            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${isChecked ? "border-primary/50 bg-primary/10" : "border-border bg-background/70 hover:border-primary/35"}`}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(checked) => toggleLinkedService(service.id, checked === true)}
                                                className="mt-0.5"
                                            />
                                            <span className="space-y-1">
                                                <span className="block text-sm font-medium text-foreground">{service.name}</span>
                                                <span className="block text-xs text-muted-foreground">
                                                    This work will appear in the selected service page slider as well as the main Our Work page.
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })
                            )}
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
            {previewMedia && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm">
                    <button
                        type="button"
                        className="absolute inset-0"
                        onClick={() => setPreviewMediaId(null)}
                        aria-label="Close media preview"
                    />
                    <div className="relative z-10 flex h-full items-center justify-center p-4 sm:p-8">
                        <div className="relative max-h-full max-w-[min(100%,1100px)]" onClick={(event) => event.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => setPreviewMediaId(null)}
                                className="absolute -right-2 -top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white shadow-lg transition-colors hover:bg-primary"
                                aria-label="Close media preview"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            {previewMedia.type === "video" ? (
                                <video
                                    src={previewMedia.url}
                                    className="max-h-[88dvh] max-w-full rounded-2xl object-contain shadow-[0_22px_60px_rgba(0,0,0,0.45)]"
                                    controls
                                    autoPlay
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={previewMedia.url}
                                    alt={previewMedia.name || "Work media preview"}
                                    className="max-h-[88dvh] max-w-full rounded-2xl object-contain shadow-[0_22px_60px_rgba(0,0,0,0.45)]"
                                />
                            )}
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-black/55 px-4 py-3 text-sm text-white">
                                <p className="min-w-0 truncate font-medium">
                                    {previewMedia.name || `Media ${orderedVisualMedia.findIndex((item) => item.id === previewMedia.id) + 1}`}
                                </p>
                                <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.08em] text-white/80">
                                    {previewMedia.type}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </Dialog>
    );
};

export default WorkForm;
