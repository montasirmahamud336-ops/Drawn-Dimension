import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronsUpDown,
  ExternalLink,
  FileQuestion,
  Layers,
  Loader2,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import RichTextEditor from "@/components/cms/RichTextEditor";
import { ensureCmsBucket, uploadCmsFile } from "@/integrations/supabase/storage";
import {
  slugifyText,
  type ContentStatus,
  type ServiceBasic,
  type ServiceBlogRecord,
} from "@/components/shared/serviceContent";
import { sanitizeRichHtml, stripHtmlToText } from "@/components/shared/richText";
import { buildCMSHref, getCMSBasePath } from "@/components/cms/cmsNavigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type BlogForm = {
  service_id: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  status: ContentStatus;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const MAX_BLOG_IMAGE_BYTES = 2 * 1024 * 1024;

const createForm = (
  serviceId: number | null = null,
  status: ContentStatus = "draft",
): BlogForm => ({
  service_id: serviceId,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  status,
});

type BlogManagerProps = {
  onBack?: () => void;
};

const BlogManager = ({ onBack }: BlogManagerProps) => {
  const apiBase = getApiBaseUrl();
  const location = useLocation();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceBasic[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(-1);
  const [statusTab, setStatusTab] = useState<ContentStatus>("live");
  const [blogs, setBlogs] = useState<ServiceBlogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<BlogForm>(createForm());
  const [open, setOpen] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const pagesHref = buildCMSHref(getCMSBasePath(location.pathname), "pages");

  const requireToken = () => {
    const token = getAdminToken();
    if (token) return token;
    toast.error("Session expired. Please login again.");
    return null;
  };

  const serviceMap = useMemo(
    () => new Map(services.map((item) => [item.id, item])),
    [services]
  );

  const loadServices = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/services?status=live`);
      if (!res.ok) throw new Error("Failed to fetch services");
      const data = await res.json();
      const items = (Array.isArray(data) ? data : []) as ServiceBasic[];
      setServices(items);
      if (items.length > 0 && selectedServiceId < 0) {
        setSelectedServiceId(0);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load services"));
      setServices([]);
    }
  }, [apiBase, selectedServiceId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const loadBlogs = useCallback(async () => {
    if (selectedServiceId < 0) return;
    setLoading(true);
    try {
      let url = `${apiBase}/service-blogs?status=${statusTab}`;
      if (selectedServiceId > 0) {
        url += `&service_id=${selectedServiceId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load blog posts"));
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedServiceId, statusTab]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return blogs;
    return blogs.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q)
    );
  }, [blogs, search]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(pagesHref);
  };

  const openNewEditor = () => {
    if (selectedServiceId < 0) return;
    setEditingId(null);
    setForm(
      createForm(
        selectedServiceId > 0 ? selectedServiceId : null,
        statusTab
      )
    );
    setEditorOpen(true);
  };

  const openEditEditor = (blog: ServiceBlogRecord) => {
    setEditingId(blog.id);
    setForm({
      service_id: blog.service_id ?? null,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      cover_image_url: blog.cover_image_url ?? "",
      status: blog.status,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(
      createForm(
        selectedServiceId > 0 ? selectedServiceId : null,
        statusTab
      )
    );
  };

  const setField = <K extends keyof BlogForm>(key: K, value: BlogForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCoverImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP, SVG)");
      return;
    }
    if (file.size > MAX_BLOG_IMAGE_BYTES) {
      toast.error("Cover image size must be 2MB or smaller");
      return;
    }

    const token = requireToken();
    if (!token) return;

    setUploadingCover(true);
    try {
      await ensureCmsBucket(token);
      const uploadedUrl = await uploadCmsFile(file, token);
      setField("cover_image_url", uploadedUrl);
      toast.success("Cover image uploaded");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload cover image"));
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    }
  };

  const saveBlog = async () => {
    const token = requireToken();
    if (!token) return;

    const title = form.title.trim();
    const slug = slugifyText(form.slug || title);
    const content = sanitizeRichHtml(form.content.trim());
    const fallbackExcerpt = stripHtmlToText(content).slice(0, 160);
    const excerpt = form.excerpt.trim() || fallbackExcerpt;

    if (!title) {
      toast.error("Blog title is required");
      return;
    }
    if (!slug) {
      toast.error("Valid slug is required");
      return;
    }
    if (!stripHtmlToText(content).trim()) {
      toast.error("Blog content cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const isEditing = editingId !== null;
      const url = isEditing
        ? `${apiBase}/service-blogs/${editingId}`
        : `${apiBase}/service-blogs`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_id: form.service_id,
          title,
          slug,
          excerpt,
          content,
          cover_image_url: form.cover_image_url.trim() || null,
          status: form.status,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save blog post");
      }

      const saved = (await res.json()) as ServiceBlogRecord;
      setEditingId(saved.id);
      setForm({
        service_id: saved.service_id ?? null,
        title: saved.title,
        slug: saved.slug,
        excerpt: saved.excerpt,
        content: saved.content,
        cover_image_url: saved.cover_image_url ?? "",
        status: saved.status,
      });

      if (saved.status !== statusTab) {
        setStatusTab(saved.status);
      } else {
        await loadBlogs();
      }
      toast.success(
        saved.status === "live"
          ? "Blog post saved and live"
          : "Blog post saved to draft"
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save blog post"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (
    blog: ServiceBlogRecord,
    nextStatus: ContentStatus,
  ) => {
    const token = requireToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/service-blogs/${blog.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update blog status");
      await loadBlogs();
      toast.success(
        nextStatus === "live"
          ? "Blog restored to live"
          : "Blog moved to draft",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update blog status"));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteBlog = async (blog: ServiceBlogRecord) => {
    const token = requireToken();
    if (!token) return;
    if (!window.confirm(`Permanently delete "${blog.title}"?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/service-blogs/${blog.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete blog post");
      if (editingId === blog.id) closeEditor();
      await loadBlogs();
      toast.success("Blog deleted permanently");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete blog post"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Bar */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-card/90 via-card/75 to-emerald-500/10 p-5 shadow-xl backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBack}
              className="rounded-xl border-border/60 hover:bg-primary/10 hover:border-primary/30"
              title="Go back to Pages"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Editorial & Content Publishing</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                Blog Articles & News
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={openNewEditor}
              disabled={selectedServiceId < 0}
              className="rounded-xl font-bold bg-emerald-500 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-600 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Article</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-md backdrop-blur-xl flex flex-wrap items-center gap-3">
        {/* Service Combobox */}
        <div className="flex-1 min-w-[240px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between rounded-xl bg-background/80 border-border/60 font-semibold hover:border-primary/30"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate">
                    {selectedServiceId === -1
                      ? "Select a Service"
                      : selectedServiceId === 0
                      ? "🌐 All Services"
                      : services.find((s) => s.id === selectedServiceId)?.name || "Select a Service"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 border-border/60 backdrop-blur-2xl bg-popover/95 shadow-xl rounded-2xl">
              <Command>
                <CommandInput placeholder="Search services..." className="h-10" />
                <CommandList className="max-h-64 overflow-y-auto">
                  <CommandEmpty>No service found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="All Services"
                      onSelect={() => {
                        setSelectedServiceId(0);
                        setOpen(false);
                      }}
                      className="cursor-pointer font-semibold"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${selectedServiceId === 0 ? "opacity-100" : "opacity-0"}`}
                      />
                      <Layers className="mr-2 h-4 w-4 text-emerald-500" />
                      🌐 All Services
                    </CommandItem>
                    {services.map((service) => (
                      <CommandItem
                        key={service.id}
                        value={service.name}
                        onSelect={() => {
                          setSelectedServiceId(service.id);
                          setOpen(false);
                        }}
                        className="cursor-pointer font-medium"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${selectedServiceId === service.id ? "opacity-100" : "opacity-0"}`}
                        />
                        <span className="truncate">{service.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Live / Draft Status Tabs */}
        <div className="flex rounded-xl bg-background/80 border border-border/60 p-1">
          <Button
            size="sm"
            variant={statusTab === "live" ? "default" : "ghost"}
            onClick={() => setStatusTab("live")}
            className="rounded-lg text-xs font-bold px-3.5"
          >
            Live
          </Button>
          <Button
            size="sm"
            variant={statusTab === "draft" ? "default" : "ghost"}
            onClick={() => setStatusTab("draft")}
            className="rounded-lg text-xs font-bold px-3.5"
          >
            Draft
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${statusTab} articles...`}
            className="pl-9 rounded-xl border-border/60 bg-background/80 text-xs font-medium"
          />
        </div>
      </div>

      {/* Article Editor Panel */}
      {editorOpen && (
        <div className="rounded-3xl border border-emerald-500/30 bg-card/85 p-6 shadow-xl backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              {editingId ? "Edit Article" : "Create New Article"}
            </h3>
            <Button variant="ghost" size="sm" onClick={closeEditor} className="rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Target Service Page</label>
              <select
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-xs font-bold"
                value={form.service_id ?? ""}
                onChange={(e) =>
                  setField("service_id", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">General (All Services)</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Publishing Status</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.status === "live" ? "default" : "outline"}
                  onClick={() => setField("status", "live")}
                  className="flex-1 rounded-xl font-bold text-xs"
                >
                  Live
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.status === "draft" ? "default" : "outline"}
                  onClick={() => setField("status", "draft")}
                  className="flex-1 rounded-xl font-bold text-xs"
                >
                  Draft
                </Button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Article Title</label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title,
                    slug: prev.slug ? prev.slug : slugifyText(title),
                  }));
                }}
                placeholder="e.g. Modern UI Design Trends in 2026"
                className="rounded-xl border-border/60 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">URL Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setField("slug", slugifyText(e.target.value))}
                placeholder="modern-ui-design-trends"
                className="rounded-xl border-border/60 font-mono text-xs"
              />
            </div>
          </div>

          {/* Cover Image Uploader */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Cover Image (Optional)</label>
            <div className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageSelect}
                className="hidden"
              />
              {form.cover_image_url ? (
                <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-border/60 shadow-md">
                  <img
                    src={form.cover_image_url}
                    alt="Blog cover preview"
                    className="w-full h-44 object-cover"
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No cover image uploaded</div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {form.cover_image_url ? "Change Cover Image" : "Upload Cover Image"}
                </Button>
                {form.cover_image_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setField("cover_image_url", "")}
                    disabled={uploadingCover}
                    className="rounded-xl text-xs font-bold gap-1 text-destructive"
                  >
                    <X className="h-4 w-4" /> Remove Image
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Meta Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Meta Description (SEO)</label>
            <Textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => setField("excerpt", e.target.value)}
              placeholder="Write SEO meta description summary..."
              className="rounded-xl border-border/60 text-xs"
            />
          </div>

          {/* Rich Content Editor */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Article Content</label>
            <RichTextEditor
              value={form.content}
              onChange={(content) => setField("content", content)}
              placeholder="Write blog article content with formatting, headings, and images..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveBlog} disabled={submitting || uploadingCover} className="rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Article</span>
            </Button>
          </div>
        </div>
      )}

      {/* Article List / Grid */}
      {selectedServiceId < 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl">
          <FileQuestion className="h-10 w-10 text-emerald-500/60" />
          <p className="text-base font-bold text-foreground">Select a Service Page</p>
          <p className="text-xs text-muted-foreground">Choose a service from the dropdown above to view its blog posts.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-40 rounded-2xl bg-card/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((blog) => {
            const serviceName = blog.service_id
              ? serviceMap.get(blog.service_id)?.name || "Service"
              : "General";
            return (
              <div
                key={blog.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/75 p-5 shadow-md backdrop-blur-xl transition-all duration-200 hover:border-emerald-500/40 flex flex-col justify-between"
              >
                <div>
                  {blog.cover_image_url && (
                    <div className="mb-3.5 h-36 w-full rounded-xl overflow-hidden border border-border/40">
                      <img
                        src={blog.cover_image_url}
                        alt={blog.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-extrabold uppercase text-muted-foreground">
                      {serviceName}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        blog.status === "live"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {blog.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground leading-snug group-hover:text-emerald-500 transition-colors">
                    {blog.title}
                  </h4>
                  <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5">/{blog.slug}</p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{blog.excerpt}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                  <Button size="sm" variant="outline" onClick={() => openEditEditor(blog)} className="rounded-xl text-xs font-bold gap-1 h-8">
                    <PencilLine className="h-3.5 w-3.5" /> Edit
                  </Button>
                  {blog.status === "live" && (
                    <a href={`/blog/${blog.slug}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1 h-8">
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </Button>
                    </a>
                  )}
                  {statusTab === "live" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(blog, "draft")}
                      className="rounded-xl text-xs font-bold gap-1 h-8 text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Move to Draft
                    </Button>
                  )}
                  {statusTab === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(blog, "live")}
                        className="rounded-xl text-xs font-bold gap-1 h-8 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore Live
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteBlog(blog)} className="rounded-xl text-xs font-bold gap-1 h-8">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-14 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl">
              No {statusTab} blog articles found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogManager;