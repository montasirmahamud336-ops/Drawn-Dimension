import { DragEvent, Suspense, lazy, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit, FileText, GripVertical, LayoutGrid, List, Loader2, MonitorPlay, Plus, RotateCcw, Search, Settings2, Sparkles, Tag, Trash2, X } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { moveItemById } from "./reorderUtils";
import { buildCardImageSources } from "@/components/shared/mediaUrl";
import { getProjectPdfDocument, getProjectPrimaryCardMedia, getProjectVisualMedia } from "@/components/shared/projectMedia";
import {
  applyPortfolioFilterCategories,
  getPortfolioFilterCategories,
  getProjectCategoryLabel,
  normalizePortfolioFilterCategories,
  normalizeProjectCategoryOption,
} from "@/components/shared/projectAssociations";

const INITIAL_VISIBLE_WORKS = 6;
const WORKS_LOAD_MORE_STEP = 6;
const EAGER_IMAGE_COUNT = 1;
const DESCRIPTION_PREVIEW_LIMIT = 180;
const CARD_SHELL_STYLE = {
  // Avoid `content-visibility: auto` here: Chrome can repeatedly promote and
  // discard a hovered draggable card while its scroll container is moving.
  contain: "paint",
} as const;
const LOADING_SKELETON_IDS = [1, 2, 3, 4, 5, 6];
const WorkForm = lazy(() => import("./WorkForm"));

type ProjectRecord = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  media?: Array<{ url?: string; type?: string; name?: string | null }> | null;
  category?: string | null;
  linked_service_ids?: number[] | null;
  status?: string | null;
  client?: string | null;
};

type ProjectCardRecord = ProjectRecord & {
  descriptionPreview: string;
  imageSources: ReturnType<typeof buildCardImageSources> | null;
  searchText: string;
};

type WorkCategoryGroup = {
  key: string;
  label: string;
  count: number;
  projectIds: string[];
  isUncategorized: boolean;
};

const getDescriptionPreview = (value: string | null | undefined) => {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "No description provided.";
  if (text.length <= DESCRIPTION_PREVIEW_LIMIT) return text;
  return `${text.slice(0, DESCRIPTION_PREVIEW_LIMIT).trimEnd().replace(/[.,;:!?-]+$/, "")}...`;
};

const normalizeCategoryValue = normalizeProjectCategoryOption;

const normalizeProject = (project: ProjectRecord): ProjectCardRecord => {
  const title = project.title?.trim() || "Untitled Work";
  const primaryPreviewMedia = getProjectPrimaryCardMedia(project);
  const primaryPreviewImageUrl = primaryPreviewMedia?.type === "image"
    ? primaryPreviewMedia.url
    : (typeof project.image_url === "string" ? project.image_url : null);
  return {
    ...project,
    title,
    descriptionPreview: getDescriptionPreview(project.description),
    imageSources: primaryPreviewImageUrl ? buildCardImageSources(primaryPreviewImageUrl) : null,
    searchText: [title, project.category, project.client].filter(Boolean).join(" ").toLowerCase(),
  };
};

type WorkCardProps = {
  activeTab: string;
  eagerImage: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  isReorderEnabled: boolean;
  onDelete: (id: string, isHardDelete: boolean) => void;
  onDragEnd: () => void;
  onDragEnter: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
  onEdit: (project: ProjectRecord) => void;
  onRestore: (id: string) => void;
  project: ProjectCardRecord;
};

const WorkCard = memo(({
  activeTab,
  eagerImage,
  isDragging,
  isDropTarget,
  isReorderEnabled,
  onDelete,
  onDragEnd,
  onDragEnter,
  onDragStart,
  onDrop,
  onEdit,
  onRestore,
  project,
}: WorkCardProps) => {
  const allMedia = useMemo(() => getProjectVisualMedia(project), [project]);
  const hasPdf = Boolean(getProjectPdfDocument(project));
  const [slideIndex, setSlideIndex] = useState(0);
  const currentMedia = allMedia[slideIndex] ?? getProjectPrimaryCardMedia(project);
  const hasMany = allMedia.length > 1;

  const fallbackUrl = currentMedia?.type === "image" ? (project.imageSources?.fallbackSrc ?? currentMedia.url) : "";
  const [variantFailed, setVariantFailed] = useState(false);
  const currentSources = useMemo(() => currentMedia?.type === "image" ? buildCardImageSources(currentMedia.url) : null, [currentMedia]);
  const displaySrc = variantFailed ? (currentSources?.fallbackSrc ?? fallbackUrl) : (currentSources?.src ?? fallbackUrl);
  const [isImageReady, setIsImageReady] = useState(currentMedia?.type !== "image");

  useEffect(() => {
    setVariantFailed(false);
    setIsImageReady(currentMedia?.type !== "image");
  }, [currentMedia?.type, currentMedia?.url]);

  const prevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMany) return;
    setSlideIndex((i) => (i - 1 + allMedia.length) % allMedia.length);
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMany) return;
    setSlideIndex((i) => (i + 1) % allMedia.length);
  };

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isReorderEnabled) {
      event.preventDefault();
    }
  }, [isReorderEnabled]);

  return (
    <div
      className={`group relative ${isReorderEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-60 scale-[0.98]" : ""} ${isDropTarget ? "ring-2 ring-primary rounded-3xl" : ""} transition-all duration-200`}
      draggable={isReorderEnabled}
      onDragStart={() => onDragStart(project.id)}
      onDragEnter={() => onDragEnter(project.id)}
      onDragOver={handleDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(project.id);
      }}
      onDragEnd={onDragEnd}
      style={CARD_SHELL_STYLE}
    >
      <div className="rounded-3xl border border-border/60 bg-card/90 overflow-hidden shadow-md hover:shadow-2xl hover:border-primary/50 transition-all duration-300 flex flex-col h-full group/card">
        {/* Media Frame (16/10 ratio matching portfolio) */}
        <div className="relative overflow-hidden aspect-[16/10] bg-muted/30 group/media">
          {currentMedia?.type === "video" ? (
            <video
              src={currentMedia.url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="none"
            />
          ) : currentMedia?.type === "pdf" ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-card via-muted/40 to-muted/80 text-foreground p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/20 shadow-md">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">PDF Project</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">Click Edit to view document</p>
            </div>
          ) : displaySrc ? (
            <>
              <div
                className={`absolute inset-0 bg-muted/30 ${isImageReady ? "opacity-0" : "opacity-100"}`}
                aria-hidden="true"
              />
              <img
                src={displaySrc}
                srcSet={variantFailed ? undefined : currentSources?.srcSet ?? project.imageSources?.srcSet}
                alt={project.title}
                loading={eagerImage ? "eager" : "lazy"}
                fetchpriority={eagerImage ? "high" : "low"}
                decoding="async"
                width={640}
                height={400}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                onLoad={() => setIsImageReady(true)}
                onError={() => {
                  if (!variantFailed && (currentSources?.srcSet || project.imageSources?.srcSet)) {
                    setVariantFailed(true);
                  } else {
                    setIsImageReady(true);
                  }
                }}
                className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105 ${isImageReady ? "opacity-100" : "opacity-0"}`}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/30 text-muted-foreground text-xs">
              No Visual Media
            </div>
          )}

          {/* Category Pill Tag Overlay (Matching Portfolio style) */}
          <div className="absolute top-3.5 left-3.5 z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border border-white/20 bg-black/65 backdrop-blur-md text-white shadow-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {project.category || "Uncategorized"}
            </span>
          </div>

          {/* Media Count / PDF Badge */}
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
            {hasPdf && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                <FileText className="h-3.5 w-3.5 text-primary" />
                PDF
              </span>
            )}
            {hasMany && (
              <span className="inline-flex items-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                {slideIndex + 1}/{allMedia.length}
              </span>
            )}
            {project.status === "draft" && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/90 text-black font-bold shadow-md">
                Draft
              </span>
            )}
          </div>

          {/* Slide Navigation Buttons */}
          {hasMany && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-primary transition-all duration-200 opacity-0 group-hover/media:opacity-100 shadow-lg z-20 cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-primary transition-all duration-200 opacity-0 group-hover/media:opacity-100 shadow-lg z-20 cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Reorder Drag Handle */}
          {isReorderEnabled && (
            <div
              draggable
              className="absolute right-3 bottom-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white shadow-md cursor-grab active:cursor-grabbing hover:bg-black"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          {/* Admin Hover Action Buttons Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-20">
            <Button
              size="sm"
              className="bg-white text-zinc-900 hover:bg-white/90 font-bold shadow-xl cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
            >
              <Edit className="w-4 h-4 mr-1.5" /> Edit
            </Button>

            {activeTab === "draft" ? (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(project.id);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="shadow-xl font-bold cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id, true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="shadow-xl font-bold cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id, false);
                }}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Draft
              </Button>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-semibold text-foreground/80 truncate max-w-[180px]">
                {project.client ? `Client: ${project.client}` : "DrawnDimension"}
              </span>
              <span className="uppercase text-[10px] font-mono tracking-wider text-muted-foreground">Case Study</span>
            </div>
            <h3
              onClick={() => onEdit(project)}
              className="text-base sm:text-lg font-bold text-foreground leading-snug group-hover/card:text-primary transition-colors line-clamp-2 cursor-pointer"
            >
              {project.title}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {project.descriptionPreview}
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-border/40 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Edit Details <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-muted-foreground">
              {allMedia.length} visual asset{allMedia.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.activeTab === nextProps.activeTab
  && prevProps.eagerImage === nextProps.eagerImage
  && prevProps.isDragging === nextProps.isDragging
  && prevProps.isDropTarget === nextProps.isDropTarget
  && prevProps.isReorderEnabled === nextProps.isReorderEnabled
  && prevProps.onDelete === nextProps.onDelete
  && prevProps.onDragEnd === nextProps.onDragEnd
  && prevProps.onDragEnter === nextProps.onDragEnter
  && prevProps.onDragStart === nextProps.onDragStart
  && prevProps.onDrop === nextProps.onDrop
  && prevProps.onEdit === nextProps.onEdit
  && prevProps.onRestore === nextProps.onRestore
  && prevProps.project === nextProps.project
));

WorkCard.displayName = "WorkCard";

const CompactWorkRow = memo(({
  project,
  activeTab,
  onEdit,
  onDelete,
  onRestore,
}: {
  project: ProjectCardRecord;
  activeTab: string;
  onEdit: (project: ProjectRecord) => void;
  onDelete: (id: string, isHardDelete: boolean) => void;
  onRestore: (id: string) => void;
}) => {
  const previewMedia = getProjectPrimaryCardMedia(project);

  return (
    <div
      onClick={() => onEdit(project)}
      className="group cursor-pointer rounded-2xl border border-border/60 bg-card/80 hover:border-primary/50 hover:bg-card p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-muted/40 relative border border-border/40">
          {previewMedia?.type === "video" ? (
            <video src={previewMedia.url} className="w-full h-full object-cover" muted />
          ) : previewMedia?.type === "pdf" ? (
            <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
              <FileText className="w-5 h-5" />
            </div>
          ) : previewMedia?.url ? (
            <img src={previewMedia.url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
              No Media
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              {project.category || "General"}
            </span>
            {project.client && (
              <span className="text-[11px] text-muted-foreground truncate">
                • {project.client}
              </span>
            )}
            {project.status === "draft" && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold uppercase">
                Draft
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {project.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate max-w-xl mt-0.5">
            {project.descriptionPreview}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold" onClick={() => onEdit(project)}>
          <Edit className="w-3.5 h-3.5" /> Edit
        </Button>
        {activeTab === "draft" ? (
          <>
            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs font-semibold" onClick={() => onRestore(project.id)}>
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </Button>
            <Button size="sm" variant="destructive" className="h-8 text-xs font-semibold" onClick={() => onDelete(project.id, true)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold" onClick={() => onDelete(project.id, false)}>
            <Trash2 className="w-3.5 h-3.5" /> Draft
          </Button>
        )}
      </div>
    </div>
  );
});

CompactWorkRow.displayName = "CompactWorkRow";

const WorksManager = () => {
  const [projects, setProjects] = useState<ProjectCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [isFilterManagerOpen, setIsFilterManagerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_WORKS);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [categoryActionKey, setCategoryActionKey] = useState<string | null>(null);
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [portfolioSettings, setPortfolioSettings] = useState<Record<string, unknown>>({});
  const [managedCategories, setManagedCategories] = useState<string[]>([]);
  const projectsRef = useRef<ProjectCardRecord[]>([]);
  const draggingProjectIdRef = useRef<string | null>(null);
  const dropTargetProjectIdRef = useRef<string | null>(null);
  const deferredSearch = useDeferredValue(searchInput);

  const apiBase = getApiBaseUrl();
  const token = getAdminToken();
  const searchQuery = deferredSearch.trim().toLowerCase();
  const isReorderEnabled = activeCategory === "All" && searchQuery.length === 0 && !isSavingOrder && viewMode === "grid";

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const syncDragState = useCallback((draggingId: string | null, targetId: string | null) => {
    draggingProjectIdRef.current = draggingId;
    dropTargetProjectIdRef.current = targetId;
    setDraggingProjectId(draggingId);
    setDropTargetProjectId(targetId);
  }, []);

  const fetchProjects = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/projects?status=${activeTab}`, { signal });
      if (res.ok) {
        const data = await res.json();
        const nextProjects = Array.isArray(data)
          ? (data as ProjectRecord[]).map(normalizeProject)
          : [];
        setProjects(nextProjects);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Failed to fetch projects", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [activeTab, apiBase]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_WORKS);
  }, [activeTab, activeCategory, searchQuery, projects.length]);

  useEffect(() => {
    setEditingCategoryKey(null);
    setEditingCategoryValue("");
    setCategoryActionKey(null);
    setNewCategoryValue("");
  }, [activeTab]);

  const loadPortfolioCategories = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/home-page-settings`);
      if (!response.ok) {
        throw new Error("Failed to load portfolio category settings");
      }

      const payload = await response.json();
      const nextSettings = payload && typeof payload === "object"
        ? payload as Record<string, unknown>
        : {};
      setPortfolioSettings(nextSettings);
      setManagedCategories(getPortfolioFilterCategories(nextSettings));
    } catch (error) {
      console.error("Failed to load portfolio category settings", error);
    }
  }, [apiBase]);

  useEffect(() => {
    void loadPortfolioCategories();
  }, [loadPortfolioCategories]);

  const saveProjectOrder = useCallback(async (orderedProjects: ProjectCardRecord[]) => {
    try {
      setIsSavingOrder(true);
      const res = await fetch(`${apiBase}/projects/reorder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderedIds: orderedProjects.map((project) => project.id),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save order");
      }

      toast.success("Work order updated");
    } catch (error) {
      toast.error("Could not save work order");
      void fetchProjects();
    } finally {
      setIsSavingOrder(false);
    }
  }, [apiBase, fetchProjects, token]);

  const handleDragStart = useCallback((projectId: string) => {
    if (!isReorderEnabled) return;
    syncDragState(projectId, projectId);
  }, [isReorderEnabled, syncDragState]);

  const handleDragEnter = useCallback((targetProjectId: string) => {
    const sourceProjectId = draggingProjectIdRef.current;
    if (!isReorderEnabled || !sourceProjectId || sourceProjectId === targetProjectId || dropTargetProjectIdRef.current === targetProjectId) {
      return;
    }

    dropTargetProjectIdRef.current = targetProjectId;
    setDropTargetProjectId(targetProjectId);
  }, [isReorderEnabled]);

  const handleDragEnd = useCallback(() => {
    syncDragState(null, null);
  }, [syncDragState]);

  const handleDrop = useCallback((targetProjectId: string) => {
    const sourceProjectId = draggingProjectIdRef.current;

    if (!isReorderEnabled || !sourceProjectId) {
      syncDragState(null, null);
      return;
    }

    let orderedProjects = projectsRef.current;

    if (sourceProjectId !== targetProjectId) {
      setProjects((prev) => {
        const next = moveItemById(prev, sourceProjectId, targetProjectId);
        projectsRef.current = next;
        orderedProjects = next;
        return next;
      });
    }

    syncDragState(null, null);

    if (sourceProjectId !== targetProjectId && orderedProjects.length > 0) {
      void saveProjectOrder(orderedProjects);
    }
  }, [isReorderEnabled, saveProjectOrder, syncDragState]);

  const handleDelete = useCallback(async (id: string, isHardDelete: boolean) => {
    if (!confirm(isHardDelete ? "Are you sure you want to PERMANENTLY delete this?" : "Move this work to Drafts?")) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/projects/${id}`, isHardDelete ? {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      } : {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "draft" }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success(isHardDelete ? "Work deleted permanently" : "Work moved to Drafts");
      void fetchProjects();
    } catch (error) {
      toast.error("Operation failed");
    }
  }, [apiBase, fetchProjects, token]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "live" }),
      });

      if (res.ok) {
        toast.success("Work restored to Live");
        void fetchProjects();
      }
    } catch (error) {
      toast.error("Restore failed");
    }
  }, [apiBase, fetchProjects, token]);

  const handleOpenCreate = useCallback(() => {
    setEditingProject(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((project: ProjectRecord) => {
    setEditingProject(project);
    setIsFormOpen(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (activeCategory !== "All") {
        const norm = normalizeCategoryValue(project.category);
        if (activeCategory === "Uncategorized") {
          if (norm.length > 0) return false;
        } else {
          const label = getProjectCategoryLabel(project.category);
          if (label.toLowerCase() !== activeCategory.toLowerCase()) return false;
        }
      }

      if (searchQuery && !project.searchText.includes(searchQuery)) {
        return false;
      }

      return true;
    });
  }, [projects, activeCategory, searchQuery]);

  const categoryGroups = useMemo<WorkCategoryGroup[]>(() => {
    const groups = new Map<string, WorkCategoryGroup>();
    const managedRank = new Map<string, number>();

    normalizePortfolioFilterCategories(managedCategories).forEach((category, index) => {
      managedRank.set(category, index);
      groups.set(category, {
        key: category,
        label: category,
        count: 0,
        projectIds: [],
        isUncategorized: false,
      });
    });

    projects.forEach((project) => {
      const normalizedCategory = normalizeCategoryValue(project.category);
      const isUncategorized = normalizedCategory.length === 0;
      const label = getProjectCategoryLabel(project.category);
      const key = isUncategorized ? "__uncategorized__" : normalizedCategory;
      const existing = groups.get(key);

      if (existing) {
        existing.count += 1;
        existing.projectIds.push(project.id);
        return;
      }

      groups.set(key, {
        key,
        label,
        count: 1,
        projectIds: [project.id],
        isUncategorized,
      });
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aRank = managedRank.get(a.key);
      const bRank = managedRank.get(b.key);
      const resolvedARank = typeof aRank === "number" ? aRank : Number.MAX_SAFE_INTEGER;
      const resolvedBRank = typeof bRank === "number" ? bRank : Number.MAX_SAFE_INTEGER;

      if (resolvedARank !== resolvedBRank) {
        return resolvedARank - resolvedBRank;
      }

      return b.count - a.count || a.label.localeCompare(b.label);
    });
  }, [managedCategories, projects]);

  const filterPillCategories = useMemo(() => {
    const list = ["All"];
    categoryGroups.forEach((group) => {
      if (!group.isUncategorized && !list.includes(group.label)) {
        list.push(group.label);
      }
    });
    const uncategorizedGroup = categoryGroups.find((g) => g.isUncategorized && g.count > 0);
    if (uncategorizedGroup) {
      list.push("Uncategorized");
    }
    return list;
  }, [categoryGroups]);

  const handleStartCategoryEdit = useCallback((group: WorkCategoryGroup) => {
    setEditingCategoryKey(group.key);
    setEditingCategoryValue(group.isUncategorized ? "" : group.label);
  }, []);

  const handleCancelCategoryEdit = useCallback(() => {
    setEditingCategoryKey(null);
    setEditingCategoryValue("");
  }, []);

  const fetchAllProjects = useCallback(async () => {
    const response = await fetch(`${apiBase}/projects?status=all`);
    if (!response.ok) {
      throw new Error("Failed to load works for category update");
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload as ProjectRecord[] : [];
  }, [apiBase]);

  const saveManagedCategories = useCallback(async (categories: string[]) => {
    if (!token) {
      throw new Error("Session expired. Please login again.");
    }

    const payload = applyPortfolioFilterCategories(portfolioSettings, categories);
    const response = await fetch(`${apiBase}/home-page-settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to save category settings");
    }

    const saved = await response.json();
    const nextSettings = saved && typeof saved === "object"
      ? saved as Record<string, unknown>
      : payload;
    setPortfolioSettings(nextSettings);
    setManagedCategories(getPortfolioFilterCategories(nextSettings));
  }, [apiBase, portfolioSettings, token]);

  const updateProjectsCategory = useCallback(async (projectIds: string[], category: string | null) => {
    const nextCategory = category && category.trim().length > 0 ? category.trim() : null;
    const responses = await Promise.all(
      projectIds.map((projectId) =>
        fetch(`${apiBase}/projects/${projectId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ category: nextCategory }),
        })
      )
    );

    const failed = responses.find((response) => !response.ok);
    if (failed) {
      throw new Error("Failed to update one or more works");
    }
  }, [apiBase, token]);

  const resolveCategoryProjectIds = useCallback(async (group: WorkCategoryGroup) => {
    const allProjects = await fetchAllProjects();
    return allProjects
      .filter((project) => {
        const normalizedCategory = normalizeCategoryValue(project.category);
        return group.isUncategorized
          ? normalizedCategory.length === 0
          : normalizedCategory === group.key;
      })
      .map((project) => String(project.id))
      .filter((id) => id.length > 0);
  }, [fetchAllProjects]);

  const handleSaveCategory = useCallback(async (group: WorkCategoryGroup) => {
    const nextLabel = normalizeCategoryValue(editingCategoryValue);
    if (!nextLabel) {
      toast.error("Enter a category name");
      return;
    }

    if (nextLabel.toLowerCase() === "all") {
      toast.error("All is reserved");
      return;
    }

    if (!group.isUncategorized && nextLabel === group.label) {
      handleCancelCategoryEdit();
      return;
    }

    const duplicateCategory = categoryGroups.some(
      (item) => item.key !== group.key && item.label.toLowerCase() === nextLabel.toLowerCase()
    );
    if (duplicateCategory) {
      toast.error("Category already exists");
      return;
    }

    try {
      setCategoryActionKey(group.key);
      const projectIds = await resolveCategoryProjectIds(group);
      const nextManagedCategories = normalizePortfolioFilterCategories([
        ...managedCategories.filter((category) => normalizeCategoryValue(category) !== group.key),
        nextLabel,
      ]);

      if (projectIds.length > 0) {
        await updateProjectsCategory(projectIds, nextLabel);
      }
      await saveManagedCategories(nextManagedCategories);
      toast.success("Category updated");
      handleCancelCategoryEdit();
      await fetchProjects();
    } catch (error) {
      console.error("Failed to update work category", error);
      toast.error("Could not update category");
    } finally {
      setCategoryActionKey(null);
    }
  }, [categoryGroups, editingCategoryValue, fetchProjects, handleCancelCategoryEdit, managedCategories, resolveCategoryProjectIds, saveManagedCategories, updateProjectsCategory]);

  const handleRemoveCategory = useCallback(async (group: WorkCategoryGroup) => {
    if (group.isUncategorized) {
      return;
    }

    if (!confirm(`Remove "${group.label}" and move its works to Uncategorized?`)) {
      return;
    }

    try {
      setCategoryActionKey(group.key);
      const projectIds = await resolveCategoryProjectIds(group);
      const nextManagedCategories = normalizePortfolioFilterCategories(
        managedCategories.filter((category) => normalizeCategoryValue(category) !== group.key)
      );

      if (projectIds.length > 0) {
        await updateProjectsCategory(projectIds, null);
      }
      await saveManagedCategories(nextManagedCategories);
      toast.success("Category removed");
      if (editingCategoryKey === group.key) {
        handleCancelCategoryEdit();
      }
      await fetchProjects();
    } catch (error) {
      console.error("Failed to remove work category", error);
      toast.error("Could not remove category");
    } finally {
      setCategoryActionKey(null);
    }
  }, [editingCategoryKey, fetchProjects, handleCancelCategoryEdit, managedCategories, resolveCategoryProjectIds, saveManagedCategories, updateProjectsCategory]);

  const handleAddCategory = useCallback(async () => {
    const nextLabel = normalizeCategoryValue(newCategoryValue);
    if (!nextLabel) {
      toast.error("Enter a category name");
      return;
    }

    if (nextLabel.toLowerCase() === "all") {
      toast.error("All is reserved");
      return;
    }

    const alreadyExists = categoryGroups.some((group) => group.label.toLowerCase() === nextLabel.toLowerCase());
    if (alreadyExists) {
      toast.error("Category already exists");
      return;
    }

    try {
      setCategoryActionKey("__add__");
      await saveManagedCategories([...managedCategories, nextLabel]);
      setNewCategoryValue("");
      toast.success("Category added");
    } catch (error) {
      console.error("Failed to add work category", error);
      toast.error("Could not add category");
    } finally {
      setCategoryActionKey(null);
    }
  }, [categoryGroups, managedCategories, newCategoryValue, saveManagedCategories]);

  const visibleProjects = useMemo(
    () => filteredProjects.slice(0, visibleCount),
    [filteredProjects, visibleCount],
  );

  const canLoadMore = visibleCount < filteredProjects.length;

  return (
    <div className="space-y-6">
      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Portfolio Works</h2>
          <p className="text-sm text-muted-foreground">
            Curate, reorder, and publish engineering projects and case studies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "live" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterManagerOpen((open) => !open)}
              className={`gap-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isFilterManagerOpen ? "border-primary text-primary bg-primary/10" : ""
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Manage Filters</span>
              {categoryGroups.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono">
                  {categoryGroups.length}
                </span>
              )}
              {isFilterManagerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
          <Button onClick={handleOpenCreate} className="gap-2 rounded-xl text-xs font-semibold shadow-lg shadow-primary/20 cursor-pointer">
            <Plus className="w-4 h-4" /> Upload Work
          </Button>
        </div>
      </div>

      {/* Interactive Controls Row: Tabs, Search, View Mode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-md">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setActiveCategory("All");
          }}
          className="w-auto"
        >
          <TabsList className="bg-muted/60 p-1 rounded-xl h-9">
            <TabsTrigger value="live" className="gap-1.5 rounded-lg text-xs font-semibold px-3">
              <MonitorPlay className="w-3.5 h-3.5" /> Live Works
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-1.5 rounded-lg text-xs font-semibold px-3">
              <RotateCcw className="w-3.5 h-3.5" /> Drafts
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Real-time Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search works by title, client, or category..."
            className="pl-8 pr-8 h-9 rounded-xl bg-muted/30 border-border/50 focus:border-primary/60 text-xs"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className="text-xs font-medium text-muted-foreground hidden lg:inline">
            Showing <span className="text-foreground font-bold">{filteredProjects.length}</span> works
          </span>
          <div className="flex items-center p-0.5 rounded-xl bg-muted/40 border border-border/50">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              title="Compact List View"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "compact"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Compact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio Category Filter Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
        {filterPillCategories.map((category) => {
          const count =
            category === "All"
              ? projects.length
              : category === "Uncategorized"
              ? projects.filter((p) => !normalizeCategoryValue(p.category)).length
              : projects.filter((p) => getProjectCategoryLabel(p.category).toLowerCase() === category.toLowerCase()).length;

          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 border border-primary scale-[1.02]"
                  : "bg-card border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {category}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Collapsible Filter Categories Management Panel */}
      {activeTab === "live" && isFilterManagerOpen ? (
        <div className="border border-primary/25 bg-card/90 backdrop-blur-xl p-5 rounded-3xl space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Portfolio Filter Settings
              </div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Edit public portfolio filter categories</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Rename or remove the category filter pills shown on the public portfolio page. The <span className="font-medium text-foreground">All</span> filter remains fixed.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs font-medium text-muted-foreground shrink-0">
              {categoryGroups.length} categor{categoryGroups.length === 1 ? "y" : "ies"} defined
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border/60 bg-background/35 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={newCategoryValue}
                onChange={(event) => setNewCategoryValue(event.target.value)}
                placeholder="Add a new filter category (e.g. 3D Product Modeling)"
                disabled={categoryActionKey === "__add__"}
                className="h-10 text-sm"
              />
              <Button
                type="button"
                className="gap-2 md:min-w-[160px] h-10 font-semibold cursor-pointer"
                onClick={() => void handleAddCategory()}
                disabled={categoryActionKey === "__add__"}
              >
                {categoryActionKey === "__add__" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Category
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              New categories will appear on the public portfolio filter bar immediately.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {categoryGroups.map((group) => {
              const isEditing = editingCategoryKey === group.key;
              const isBusy = categoryActionKey === group.key;

              return (
                <div key={group.key} className="rounded-2xl border border-border/60 bg-background/45 p-4 space-y-3">
                  {isEditing ? (
                    <>
                      <Input
                        value={editingCategoryValue}
                        onChange={(event) => setEditingCategoryValue(event.target.value)}
                        placeholder={group.isUncategorized ? "Name this category" : "Category name"}
                        autoFocus
                        disabled={isBusy}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          {group.count} live work{group.count === 1 ? "" : "s"}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCancelCategoryEdit}
                            disabled={isBusy}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSaveCategory(group)}
                            disabled={isBusy}
                          >
                            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{group.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.count} live work{group.count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {group.count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleStartCategoryEdit(group)}
                          disabled={isBusy}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {!group.isUncategorized ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-2 text-destructive hover:text-destructive"
                            onClick={() => void handleRemoveCategory(group)}
                            disabled={isBusy}
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Remove
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">Rename this to remove the Uncategorized filter.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Drag & Drop Reorder Helper Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground px-1 gap-1">
        <p>
          {isReorderEnabled
            ? "⠿ Drag and drop cards to adjust display order on the public portfolio."
            : activeCategory !== "All"
            ? `Viewing "${activeCategory}". Switch to "All" category to reorder cards.`
            : searchQuery.length > 0
            ? "Clear search input to enable drag-and-drop reordering."
            : viewMode !== "grid"
            ? "Switch to Grid view to drag and reorder."
            : ""}
        </p>
        {isSavingOrder && (
          <span className="flex items-center gap-1.5 text-primary font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving new order...
          </span>
        )}
      </div>

      {/* Main Content Area: Loading vs Grid vs Compact View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LOADING_SKELETON_IDS.map((id) => (
            <div key={id} className="h-96 bg-muted/20 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProjects.map((project, index) => (
                <WorkCard
                  key={project.id}
                  activeTab={activeTab}
                  eagerImage={index < EAGER_IMAGE_COUNT}
                  isDragging={draggingProjectId === project.id}
                  isDropTarget={dropTargetProjectId === project.id && draggingProjectId !== project.id}
                  isReorderEnabled={isReorderEnabled}
                  onDelete={handleDelete}
                  onDragEnd={handleDragEnd}
                  onDragEnter={handleDragEnter}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onEdit={handleOpenEdit}
                  onRestore={handleRestore}
                  project={project}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleProjects.map((project) => (
                <CompactWorkRow
                  key={project.id}
                  project={project}
                  activeTab={activeTab}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}

          {filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/5 rounded-3xl border border-dashed border-border/50 text-center px-4">
              <MonitorPlay className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-base font-semibold text-foreground">
                No works found in {activeTab}
                {activeCategory !== "All" ? ` under "${activeCategory}"` : ""}
                {searchQuery ? ` matching "${searchInput}"` : ""}.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Try switching categories, clearing search filters, or uploading a new work.
              </p>
              {(activeCategory !== "All" || searchQuery) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs font-semibold rounded-xl cursor-pointer"
                  onClick={() => {
                    setActiveCategory("All");
                    setSearchInput("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="rounded-2xl px-6 font-semibold cursor-pointer"
                onClick={() => setVisibleCount((count) => count + WORKS_LOAD_MORE_STEP)}
              >
                Load more works ({filteredProjects.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      {isFormOpen ? (
        <Suspense fallback={null}>
          <WorkForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            project={editingProject}
            onSuccess={handleFormSuccess}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default WorksManager;
