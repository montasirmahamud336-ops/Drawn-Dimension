import { DragEvent, Suspense, lazy, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, FileText, GripVertical, Loader2, MonitorPlay, Plus, RotateCcw, Search, Tag, Trash2 } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { moveItemById } from "./reorderUtils";
import { buildCardImageSources } from "@/components/shared/mediaUrl";
import { getProjectPdfDocument, getProjectPrimaryCardMedia } from "@/components/shared/projectMedia";
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
  contentVisibility: "auto",
  containIntrinsicSize: "420px",
  contain: "layout paint style",
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
  const previewMedia = useMemo(() => getProjectPrimaryCardMedia(project), [project]);
  const imageSrc = previewMedia?.type === "image" ? (project.imageSources?.src ?? previewMedia.url) : "";
  const hasPdf = Boolean(getProjectPdfDocument(project));
  const [isImageReady, setIsImageReady] = useState(previewMedia?.type !== "image");

  useEffect(() => {
    setIsImageReady(previewMedia?.type !== "image");
  }, [previewMedia?.type, imageSrc]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isReorderEnabled) {
      event.preventDefault();
    }
  }, [isReorderEnabled]);

  return (
    <div
      className={`group relative ${isReorderEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-70" : ""} ${isDropTarget ? "ring-1 ring-primary/35 rounded-3xl" : ""}`}
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
      <div className="glass-card cms-card-lite overflow-hidden h-full flex flex-col border-border/50 bg-secondary/10 transition-none">
        <div className="relative overflow-hidden aspect-video bg-muted/10">
          {previewMedia?.type === "video" ? (
            <video
              src={previewMedia.url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="none"
            />
          ) : previewMedia?.type === "pdf" ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white to-zinc-100 text-zinc-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-[0_10px_24px_-16px_rgba(239,68,68,0.55)]">
                <FileText className="h-7 w-7" />
              </div>
              <div className="px-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700">PDF Project</p>
                <p className="mt-1 text-xs text-zinc-500">Open edit or details view to inspect the full file.</p>
              </div>
            </div>
          ) : imageSrc ? (
            <>
              <div
                className={`absolute inset-0 bg-muted/30 transition-opacity duration-200 ${isImageReady ? "opacity-0" : "opacity-100"}`}
                aria-hidden="true"
              />
              <img
                src={imageSrc}
                srcSet={project.imageSources?.srcSet}
                alt={project.title}
                loading={eagerImage ? "eager" : "lazy"}
                fetchpriority={eagerImage ? "high" : "low"}
                decoding="async"
                width={640}
                height={360}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                onLoad={() => setIsImageReady(true)}
                onError={() => setIsImageReady(true)}
                className={`w-full h-full object-cover transition-opacity duration-200 ${isImageReady ? "opacity-100" : "opacity-0"}`}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/30 text-muted-foreground">
              No Image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent opacity-40" />

          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg hover:scale-105 transition-transform"
              onClick={() => onEdit(project)}
            >
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>

            {activeTab === "draft" ? (
              <>
                <Button
                  size="icon"
                  className="bg-green-600 hover:bg-green-700 shadow-lg hover:scale-105 transition-transform"
                  onClick={() => onRestore(project.id)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="shadow-lg hover:scale-105 transition-transform"
                  onClick={() => onDelete(project.id, true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="shadow-lg hover:scale-105 transition-transform"
                onClick={() => onDelete(project.id, false)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Draft
              </Button>
            )}
          </div>

          <div className="absolute top-4 left-4 z-10">
            <span className="text-xs px-3 py-1 rounded-full bg-primary/90 text-primary-foreground shadow-glow">
              {project.category || "Uncategorized"}
            </span>
          </div>

          {hasPdf && (
            <div className="absolute bottom-4 left-4 z-10">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
                <FileText className="h-3.5 w-3.5" />
                PDF
              </span>
            </div>
          )}

          {project.status === "draft" && (
            <div className="absolute top-4 right-4 z-10">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/90 text-black font-medium shadow-sm">
                Draft
              </span>
            </div>
          )}
        </div>

        <div className="p-6 flex-grow flex flex-col justify-between relative z-10">
          <div>
            {isReorderEnabled && (
              <div className="flex justify-end mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/90 rounded-full border border-border/60 bg-background/40 px-2 py-1">
                  <GripVertical className="w-3.5 h-3.5" />
                  Drag
                </span>
              </div>
            )}
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
              {project.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
              {project.descriptionPreview}
            </p>
          </div>

          {project.client && (
            <div className="mt-auto pt-4 border-t border-border/50">
              <p className="text-xs font-bold tracking-wider text-primary uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                CLIENT: <span className="text-foreground/80 font-normal normal-case">{project.client}</span>
              </p>
            </div>
          )}
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

const WorksManager = () => {
  const [projects, setProjects] = useState<ProjectCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
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
  const isReorderEnabled = searchQuery.length === 0 && !isSavingOrder;

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
  }, [activeTab, searchQuery, projects.length]);

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

  const filteredProjects = useMemo(
    () => projects.filter((project) => !searchQuery || project.searchText.includes(searchQuery)),
    [projects, searchQuery],
  );

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Works</h2>
          <p className="text-muted-foreground">Manage your portfolio projects.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Upload Work
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="live" className="gap-2"><MonitorPlay className="w-4 h-4" /> Live Works</TabsTrigger>
            <TabsTrigger value="draft" className="gap-2"><RotateCcw className="w-4 h-4" /> Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {isReorderEnabled
          ? "Drag and drop cards to control website display order."
          : "Clear search text before dragging cards to reorder."}
      </p>

      {activeTab === "live" ? (
        <div className="glass-card border-border/60 bg-secondary/10 p-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                Portfolio Filters
              </div>
              <h3 className="mt-3 text-lg font-semibold text-foreground">Edit the filter buttons from here</h3>
              <p className="text-sm text-muted-foreground">
                Rename or remove the category pills shown on the public Our Work page. The <span className="font-medium text-foreground">All</span> button stays fixed.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              {categoryGroups.length} live categor{categoryGroups.length === 1 ? "y" : "ies"}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border/60 bg-background/35 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={newCategoryValue}
                onChange={(event) => setNewCategoryValue(event.target.value)}
                placeholder="Add a new filter category"
                disabled={categoryActionKey === "__add__"}
              />
              <Button
                type="button"
                className="gap-2 md:min-w-[160px]"
                onClick={() => void handleAddCategory()}
                disabled={categoryActionKey === "__add__"}
              >
                {categoryActionKey === "__add__" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Category
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              New categories will appear on the public Our Work filter bar immediately, even before any work is assigned.
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LOADING_SKELETON_IDS.map((id) => (
            <div key={id} className="h-96 bg-muted/20 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
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

            {filteredProjects.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5 rounded-3xl border border-dashed border-border/50">
                <MonitorPlay className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No works found in {activeTab}.</p>
                <p className="text-sm opacity-60">Upload a new work to get started.</p>
              </div>
            )}
          </div>

          {canLoadMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((count) => count + WORKS_LOAD_MORE_STEP)}
              >
                Load more works
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
