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
import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Eye, FileText, GripVertical, Loader2, Maximize2, Plus, Search, Sparkles, Tag, Upload, X } from "lucide-react";
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
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState("");
    const [showAdditionalServices, setShowAdditionalServices] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isCategoryOpen) return;
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
        };
    }, [isCategoryOpen]);

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

    const findMatchingService = useCallback((categoryName: string | undefined | null) => {
        if (!categoryName || typeof categoryName !== "string") return null;
        const norm = categoryName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!norm) return null;
        return serviceOptions.find((s) => {
            const sNorm = s.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            const slugNorm = (s.slug || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            return sNorm === norm || slugNorm === norm;
        }) || null;
    }, [serviceOptions]);

    const allCategories = useMemo(() => {
        const serviceCategoryNames = serviceOptions.map((s) => s.name);
        return mergeUniqueCategoryOptions(serviceCategoryNames, categoryOptions);
    }, [serviceOptions, categoryOptions]);

    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return allCategories;
        const q = categorySearch.trim().toLowerCase();
        return allCategories.filter((cat) => cat.toLowerCase().includes(q));
    }, [allCategories, categorySearch]);

    const isExactCategoryMatch = useMemo(() => {
        if (!categorySearch.trim()) return true;
        const q = categorySearch.trim().toLowerCase();
        return allCategories.some((cat) => cat.toLowerCase() === q);
    }, [allCategories, categorySearch]);

    const selectedServiceIds = normalizeProjectServiceIds(watch("linked_service_ids"));
    const watchedTitle = watch("title");
    const watchedCategory = watch("category");
    const watchedClient = watch("client");
    const watchedDescription = watch("description");
    const watchedDuration = watch("project_duration");
    const coverMedia = orderedVisualMedia[0] ?? null;
    const currentDoc = pendingDocument || existingDocument;

    const matchedService = useMemo(() => {
        return findMatchingService(watchedCategory);
    }, [findMatchingService, watchedCategory]);

    const handleSelectCategory = useCallback((catName: string) => {
        const normalized = normalizeCategoryOption(catName);
        setValue("category", normalized, { shouldDirty: true });
        setCategorySearch("");
        setIsCategoryOpen(false);

        // Auto-connect matching service page
        const matched = findMatchingService(normalized);
        if (matched) {
            setValue("linked_service_ids", [matched.id], { shouldDirty: true });
        }
    }, [findMatchingService, setValue]);

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
            let finalServiceIds = selectedServiceIds;
            const autoMatched = findMatchingService(data.category);
            if (autoMatched && !finalServiceIds.includes(autoMatched.id)) {
                finalServiceIds = [...finalServiceIds, autoMatched.id];
            }

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
                linked_service_ids: finalServiceIds,
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
            <DialogContent
                className="sm:max-w-5xl md:max-w-6xl w-[96vw] max-h-[92vh] p-0 flex flex-col overflow-hidden rounded-2xl border-border/80 bg-background shadow-2xl"
                onPointerDownOutside={(e) => {
                    e.preventDefault();
                }}
                onInteractOutside={(e) => {
                    if (previewMediaId) {
                        e.preventDefault();
                    }
                }}
                onEscapeKeyDown={(e) => {
                    if (previewMediaId) {
                        e.preventDefault();
                        setPreviewMediaId(null);
                    }
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/70 px-6 pr-14 py-4 bg-muted/20 shrink-0">
                    <div>
                        <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2.5">
                            <span>{project ? "Edit Work" : "Upload New Work"}</span>
                            <span className="text-xs font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                {project ? "Update Project" : "New Showcase Item"}
                            </span>
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Manage visuals, specifications, categories, and live portfolio card appearance.
                        </p>
                    </div>
                </div>

                {/* Main Form Area */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overscroll-contain">
                        {/* LEFT COLUMN: Media Hub + Live Portfolio Card Preview */}
                        <div className="lg:col-span-5 space-y-5">
                            {/* Visual Media Section */}
                            <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Upload className="w-3.5 h-3.5 text-primary" /> Visual Media ({orderedVisualMedia.length})
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                        1st image = Card Cover
                                    </span>
                                </div>

                                <label
                                    htmlFor="work-media-upload"
                                    className="group flex flex-col items-center justify-center p-4 border-2 border-dashed border-border/70 hover:border-primary/60 rounded-xl bg-muted/15 hover:bg-primary/5 transition-all cursor-pointer text-center"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <span className="mt-2 text-xs font-bold text-foreground">Click to upload images or videos</span>
                                    <span className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, WebP, MP4 • Multiple supported</span>
                                    <Input
                                        id="work-media-upload"
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleMediaChange}
                                    />
                                </label>

                                {orderedVisualMedia.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 p-1.5 rounded-lg bg-muted/20 border border-border/40 max-h-48 overflow-y-auto">
                                        {orderedVisualMedia.map((media, index) => {
                                            const isDragging = draggingMediaId === media.id;
                                            const isDropTarget = dropTargetMediaId === media.id && draggingMediaId !== media.id;
                                            const isCover = index === 0;

                                            return (
                                                <div
                                                    key={media.id}
                                                    className={`group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted/40 transition-all ${isDragging ? "opacity-65" : ""} ${isDropTarget ? "border-primary ring-2 ring-primary/35" : "border-border"}`}
                                                    onDragEnter={() => handleMediaDragEnter(media.id)}
                                                    onDragOver={(event) => event.preventDefault()}
                                                    onDrop={(event) => {
                                                        event.preventDefault();
                                                        handleMediaDrop(media.id);
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewMediaId(media.id);
                                                        }}
                                                        className="absolute inset-0 z-0 cursor-pointer"
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
                                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                                                    {isCover && (
                                                        <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                                                            Cover
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewMediaId(media.id);
                                                        }}
                                                        className="absolute bottom-1 right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-primary transition-colors cursor-pointer"
                                                        title="Full preview"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </button>

                                                    <div
                                                        role="button"
                                                        tabIndex={-1}
                                                        draggable
                                                        onClick={(event) => event.stopPropagation()}
                                                        onDragStart={(event) => handleMediaDragStart(media.id, event)}
                                                        onDragEnd={handleMediaDragEnd}
                                                        className="absolute left-1 top-1 z-20 flex h-5 w-5 cursor-grab items-center justify-center rounded-full bg-black/70 text-white shadow-sm active:cursor-grabbing hover:bg-black/90"
                                                        title="Drag to reorder"
                                                        aria-label="Drag to reorder media"
                                                    >
                                                        <GripVertical className="h-3 w-3" />
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
                                                        className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-destructive shadow-sm transition-colors cursor-pointer"
                                                        aria-label="Remove media"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* PDF Attachment Section */}
                            <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-primary" /> Project PDF (Optional)
                                    </Label>
                                    <label
                                        htmlFor="work-pdf-upload"
                                        className="cursor-pointer text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        <Upload className="w-3 h-3" /> Choose PDF
                                    </label>
                                    <Input
                                        id="work-pdf-upload"
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        onChange={handlePdfChange}
                                    />
                                </div>

                                {existingDocument && (
                                    <div className="relative flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5 pr-9">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium text-foreground">
                                                {existingDocument.name || getFallbackFileName(existingDocument.url)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">Current PDF document</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeExistingDocument}
                                            className="absolute top-2.5 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-destructive transition-colors"
                                            aria-label="Remove PDF"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                {pendingDocument && (
                                    <div className="relative flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-2.5 pr-9">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium text-foreground">
                                                {pendingDocument.name || pendingDocument.file.name}
                                            </p>
                                            <p className="text-[10px] text-primary">Ready to upload</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removePendingDocument}
                                            className="absolute top-2.5 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-destructive transition-colors"
                                            aria-label="Remove selected PDF"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                {!existingDocument && !pendingDocument && (
                                    <p className="text-[11px] text-muted-foreground">
                                        If attached, visitors can scroll the full document on the detail page.
                                    </p>
                                )}
                            </div>

                            {/* LIVE PORTFOLIO CARD PREVIEW (Portfolio style grid card) */}
                            <div className="rounded-xl border border-primary/25 bg-gradient-to-b from-primary/5 via-card/80 to-card p-3.5 space-y-2.5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Portfolio Card Preview
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                        Live Grid Style
                                    </span>
                                </div>

                                <div className="rounded-xl border border-border/80 bg-card/95 overflow-hidden shadow-md">
                                    <div className="relative aspect-[16/10] bg-muted/40 overflow-hidden">
                                        {coverMedia ? (
                                            coverMedia.type === "video" ? (
                                                <video src={coverMedia.url} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <img src={coverMedia.url} alt="Cover preview" className="w-full h-full object-cover" />
                                            )
                                        ) : currentDoc ? (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-card via-muted/40 to-muted/80 text-foreground p-4 text-center">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <p className="text-[11px] font-bold text-primary uppercase">PDF Documentation</p>
                                                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{currentDoc.name || "Document Attached"}</p>
                                            </div>
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground bg-muted/20">
                                                <Upload className="w-5 h-5 opacity-40" />
                                                <p className="text-[11px]">Upload media to preview card</p>
                                            </div>
                                        )}

                                        {/* Category Pill Tag Overlay */}
                                        <div className="absolute top-2.5 left-2.5 z-10">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 bg-black/70 backdrop-blur-md text-white shadow-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                {watchedCategory || "General"}
                                            </span>
                                        </div>

                                        {/* Media Count Badge */}
                                        {orderedVisualMedia.length > 1 && (
                                            <div className="absolute top-2.5 right-2.5 z-10">
                                                <span className="inline-flex items-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                                                    1/{orderedVisualMedia.length}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3.5 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span className="font-semibold text-foreground/80 truncate max-w-[140px]">{watchedClient || "Client Name"}</span>
                                            <span>{watchedDuration || "Duration"}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground truncate">
                                            {watchedTitle || "Project Title Preview"}
                                        </h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {watchedDescription || "Project description preview will appear here dynamically as you type..."}
                                        </p>
                                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                                            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">CASE STUDY</span>
                                            <span className="text-primary font-bold inline-flex items-center gap-1 text-[11px]">
                                                View Specs <ArrowRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Form Fields */}
                        <div className="lg:col-span-7 space-y-4">
                            {/* Basic Details */}
                            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="title" className="text-xs font-semibold">Title *</Label>
                                    <Input id="title" {...register("title", { required: true })} placeholder="e.g. Vertical Tank Farm" />
                                    {errors.title && <span className="text-destructive text-xs">Title is required</span>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="client" className="text-xs font-semibold">Client Name</Label>
                                        <Input id="client" {...register("client")} placeholder="e.g. Acme Industries" />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="creator" className="text-xs font-semibold">Created By</Label>
                                        <Input id="creator" {...register("creator")} placeholder="e.g. Engineer Name" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="project_cost" className="text-xs font-semibold">Project Cost</Label>
                                        <Input id="project_cost" {...register("project_cost")} placeholder="e.g. $25,000" />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="project_duration" className="text-xs font-semibold">Project Duration</Label>
                                        <Input id="project_duration" {...register("project_duration")} placeholder="e.g. 8 weeks" />
                                    </div>
                                </div>
                            </div>

                            {/* Categorization, Auto-Linking & Tags */}
                            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Portfolio Category Custom Dropdown */}
                                    <div className="grid gap-1.5 relative" ref={categoryDropdownRef}>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="category-trigger" className="text-xs font-semibold flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 text-primary" /> Portfolio Category *
                                            </Label>
                                            {watchedCategory && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setValue("category", "", { shouldDirty: true });
                                                    }}
                                                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown Trigger Button */}
                                        <button
                                            id="category-trigger"
                                            type="button"
                                            onClick={() => setIsCategoryOpen((prev) => !prev)}
                                            className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-xs transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                                isCategoryOpen ? "border-primary ring-2 ring-primary/20" : "border-input hover:border-primary/50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {watchedCategory ? (
                                                    <span className="font-semibold text-foreground truncate">{watchedCategory}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Select or type category...</span>
                                                )}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isCategoryOpen ? "rotate-180 text-primary" : ""}`} />
                                        </button>

                                        {/* Dropdown Menu Popup */}
                                        {isCategoryOpen && (
                                            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-2xl p-2 space-y-2 animate-in fade-in-50 zoom-in-95 duration-150">
                                                {/* Search & Custom Category Input */}
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input
                                                        autoFocus
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                if (categorySearch.trim()) {
                                                                    handleSelectCategory(categorySearch.trim());
                                                                }
                                                            } else if (e.key === "Escape") {
                                                                setIsCategoryOpen(false);
                                                            }
                                                        }}
                                                        placeholder="Search or enter new category..."
                                                        className="pl-8 h-8 text-xs bg-muted/40"
                                                    />
                                                </div>

                                                {/* Options List */}
                                                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                                                    {/* Create New Category Option (if typed text is not an exact match) */}
                                                    {categorySearch.trim().length > 0 && !isExactCategoryMatch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectCategory(categorySearch.trim())}
                                                            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium cursor-pointer"
                                                        >
                                                            <span className="truncate">Use &quot;{categorySearch.trim()}&quot;</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded">New</span>
                                                        </button>
                                                    )}

                                                    {filteredCategories.length === 0 && !categorySearch.trim() ? (
                                                        <p className="text-center py-4 text-xs text-muted-foreground">
                                                            {categoryOptionsLoading || serviceOptionsLoading ? "Loading options..." : "No categories found"}
                                                        </p>
                                                    ) : (
                                                        filteredCategories.map((cat) => {
                                                            const isSelected = watchedCategory === cat;
                                                            const isService = serviceOptions.some((s) => s.name.toLowerCase() === cat.toLowerCase());

                                                            return (
                                                                <button
                                                                    key={cat}
                                                                    type="button"
                                                                    onClick={() => handleSelectCategory(cat)}
                                                                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                                                                        isSelected
                                                                            ? "bg-primary text-primary-foreground font-semibold"
                                                                            : "hover:bg-muted text-foreground"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                                                        <span className="truncate">{cat}</span>
                                                                    </div>
                                                                    {isService && (
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
                                                                            isSelected ? "bg-primary-foreground/20 text-white" : "bg-primary/10 text-primary border border-primary/20"
                                                                        }`}>
                                                                            Service Page
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tags Input */}
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="tags" className="text-xs font-semibold">Tags (comma separated)</Label>
                                        <Input id="tags" {...register("tags")} placeholder="e.g. Piping, P&ID, AutoCAD, CFD" />
                                        <p className="text-[10px] text-muted-foreground">
                                            Comma-separated keywords for portfolio filtering.
                                        </p>
                                    </div>
                                </div>

                                {/* Auto-Connection Banner to Service Page */}
                                {matchedService ? (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="truncate">
                                                Connected to <strong>{matchedService.name}</strong> service page automatically.
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 shrink-0 ml-2">
                                            Auto-Linked
                                        </span>
                                    </div>
                                ) : watchedCategory ? (
                                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-xs text-blue-700 dark:text-blue-300">
                                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span>
                                            Portfolio Category set to <strong>{watchedCategory}</strong> (Creates a new portfolio filter button).
                                        </span>
                                    </div>
                                ) : null}

                                {/* Collapsible Additional Service Pages Toggle (Zero Waste of Space!) */}
                                <div className="pt-1 border-t border-border/40">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdditionalServices((prev) => !prev)}
                                        className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                                    >
                                        {showAdditionalServices ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                        <span>{showAdditionalServices ? "Hide additional service pages" : "Connect to additional service pages (optional)"}</span>
                                        {selectedServiceIds.length > (matchedService ? 1 : 0) && (
                                            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                                {selectedServiceIds.length} connected
                                            </span>
                                        )}
                                    </button>

                                    {showAdditionalServices && (
                                        <div className="mt-2 p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2 animate-in fade-in-50 duration-200">
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span>Check any additional service pages to also display this work:</span>
                                                <span className="font-medium text-foreground">{selectedServiceIds.length} selected</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                                                {serviceOptions.map((service) => {
                                                    const isChecked = selectedServiceIds.includes(service.id);
                                                    const isPrimary = matchedService?.id === service.id;

                                                    return (
                                                        <label
                                                            key={service.id}
                                                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                                                                isChecked
                                                                    ? "border-primary/60 bg-primary/10 text-primary font-medium"
                                                                    : "border-border/60 bg-card hover:border-primary/40"
                                                            }`}
                                                        >
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => toggleLinkedService(service.id, checked === true)}
                                                            />
                                                            <span className="truncate flex-1">{service.name}</span>
                                                            {isPrimary && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold shrink-0">
                                                                    Category Service
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-1.5">
                                <Label htmlFor="description" className="text-xs font-semibold">Description</Label>
                                <Textarea
                                    id="description"
                                    {...register("description")}
                                    placeholder="Describe the engineering scope, process flow, tools used, and deliverables..."
                                    rows={4}
                                    className="resize-y text-xs leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border/80 bg-muted/30 px-6 py-3.5 flex items-center justify-between shrink-0">
                        <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2">
                            <span>{orderedVisualMedia.length} visual asset(s) attached</span>
                            {(pendingDocument || existingDocument) && <span className="text-primary font-medium">• 1 PDF attached</span>}
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-md shadow-primary/25">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {project ? "Save Changes" : "Upload Work"}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>

            {/* PREVIEW LIGHTBOX - SAFE & SEPARATE */}
            {previewMedia && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8"
                    onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        setPreviewMediaId(null);
                    }}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                    }}
                >
                    <div
                        className="relative max-h-[90vh] max-w-4xl w-full flex flex-col items-center justify-center"
                        onClick={(event) => {
                            event.stopPropagation();
                        }}
                        onPointerDown={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                setPreviewMediaId(null);
                            }}
                            className="absolute -right-3 -top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-xl transition-colors hover:bg-primary cursor-pointer"
                            aria-label="Close media preview"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        {previewMedia.type === "video" ? (
                            <video
                                src={previewMedia.url}
                                className="max-h-[82dvh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
                                controls
                                autoPlay
                                playsInline
                            />
                        ) : (
                            <img
                                src={previewMedia.url}
                                alt={previewMedia.name || "Work media preview"}
                                className="max-h-[82dvh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
                            />
                        )}
                        <div className="mt-3 flex items-center justify-between w-full rounded-xl bg-black/70 border border-white/15 px-4 py-3 text-sm text-white">
                            <p className="min-w-0 truncate font-medium">
                                {previewMedia.name || `Media ${orderedVisualMedia.findIndex((item) => item.id === previewMedia.id) + 1}`}
                            </p>
                            <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wider text-white/80">
                                {previewMedia.type}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </Dialog>
    );
};

export default WorkForm;
