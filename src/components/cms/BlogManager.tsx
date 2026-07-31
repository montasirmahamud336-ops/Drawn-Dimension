import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const pagesHref = buildCMSHref(getCMSBasePath(location.pathname), "pages");
  const [open, setOpen] = useState(false); // combobox open state

  const requireToken = () => {
    const token = getAdminToken();
    if (token) return token;
    toast.error("Session expired. Please login again.");
    return null;
  };

  const loadServices = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/services?status=live`);
      if (!res.ok) throw new Error("Failed to fetch services");
      const data = await res.json();
      const items = (Array.isArray(data) ? data : []) as ServiceBasic[];
      setServices(items);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load services"));
      setServices([]);
    }
  }, [apiBase]);

  const loadBlogs = useCallback(async () => {
    if (selectedServiceId < 0) {
      setBlogs([]);
      setLoading(false);
      return;
    }

    const filters = [`status=${statusTab}`];
    if (selectedServiceId > 0) {
      filters.push(`serviceId=${encodeURIComponent(String(selectedServiceId))}`);
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/service-blogs?${filters.join("&")}`);
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      const data = await res.json();
      setBlogs(Array.isArray(data) ? (data as ServiceBlogRecord[]) : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load blog posts"));
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedServiceId, statusTab]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const serviceMap = useMemo(() => {
    const map = new Map<number, ServiceBasic>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return blogs;
    return blogs.filter((blog) =>
      [blog.title, blog.excerpt, blog.content, blog.slug]
        .join(" ")
        .toLowerCase()
        .includes(key),
    );
  }, [blogs, search]);

  const openNewEditor = () => {
    setEditingId(null);
    setForm(
      createForm(
        selectedServiceId > 0 ? selectedServiceId : null,
        statusTab === "live" ? "live" : "draft",
      ),
    );
    setEditorOpen(true);
  };

  const openEditEditor = (blog: ServiceBlogRecord) => {
    setEditingId(blog.id);
    setForm({
      service_id: blog.service_id,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      cover_image_url: blog.cover_image_url || "",
      status: blog.status,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(pagesHref);
  };

  const setField = <K extends keyof BlogForm>(key: K, value: BlogForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCoverImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_BLOG_IMAGE_BYTES) {
      toast.error("Image size must be 2MB or less");
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
      return;
    }

    const token = requireToken();
    if (!token) return;

    setUploadingCover(true);
    try {
      await ensureCmsBucket();
      const extension =
        (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "") ||
        "jpg";
      const path = `blogs/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const publicUrl = await uploadCmsFile(file, path);
      setField("cover_image_url", publicUrl);
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
    const cleanHtmlContent = sanitizeRichHtml(form.content);
    const plainContent = stripHtmlToText(cleanHtmlContent);
    if (!form.title.trim() || !plainContent) {
      toast.error("Blog title and content are required");
      return;
    }

    const payload = {
      service_id: form.service_id,
      title: form.title.trim(),
      slug: slugifyText(form.slug || form.title),
      excerpt: form.excerpt.trim() || null,
      content: cleanHtmlContent,
      cover_image_url: form.cover_image_url.trim() || null,
      status: form.status,
    };

    setSubmitting(true);
    try {
      const res = await fetch(
        editingId
          ? `${apiBase}/service-blogs/${editingId}`
          : `${apiBase}/service-blogs`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save blog post");
      }

      const saved = (await res.json()) as ServiceBlogRecord;
      setEditingId(saved.id);
      setForm({
        service_id: saved.service_id,
        title: saved.title,
        slug: saved.slug,
        excerpt: saved.excerpt,
        content: saved.content,
        cover_image_url: saved.cover_image_url || "",
        status: saved.status,
      });
      if (saved.status !== statusTab) {
        setStatusTab(saved.status);
      } else {
        await loadBlogs();
      }
      toast.success(
        saved.status === "live" ? "Blog published" : "Blog saved to draft",
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
    <div className="space-y-6">
      {/* ---------- Unified Top Bar ---------- */}
      <div className="glass-card p-3 border-border/60 flex flex-wrap items-center gap-3">
        {/* Back button + Page title */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold whitespace-nowrap">Blog</h2>
        </div>

        {/* ========== Premium Service Combobox ========== */}
        <div className="flex-1 min-w-[240px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between bg-background/80 backdrop-blur-sm border-border/60 hover:border-primary/30 transition-all font-medium"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-4 h-4 text-primary/70 shrink-0" />
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
            <PopoverContent className="w-[320px] p-0 border-border/60 backdrop-blur-md bg-card/95 shadow-xl">
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
                      className="cursor-pointer"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${selectedServiceId === 0 ? "opacity-100" : "opacity-0"}`}
                      />
                      <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
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
                        className="cursor-pointer"
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

        {/* Status tabs */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={statusTab === "live" ? "default" : "outline"}
            onClick={() => setStatusTab("live")}
          >
            Live
          </Button>
          <Button
            size="sm"
            variant={statusTab === "draft" ? "default" : "outline"}
            onClick={() => setStatusTab("draft")}
          >
            Draft
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${statusTab} blogs...`}
            className="pl-9"
          />
        </div>

        {/* New Blog button */}
        <Button
          onClick={openNewEditor}
          disabled={selectedServiceId < 0}
          className="gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New Blog
        </Button>
      </div>

      {/* ---------- Editor Panel (unchanged) ---------- */}
      {editorOpen && (
        <div className="glass-card p-4 md:p-5 border-border/60 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit Blog Post" : "Create Blog Post"}
            </h3>
            <Button variant="outline" size="sm" onClick={closeEditor} className="gap-1">
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={form.status === "live" ? "default" : "outline"}
                onClick={() => setField("status", "live")}
              >
                Live
              </Button>
              <Button
                size="sm"
                variant={form.status === "draft" ? "default" : "outline"}
                onClick={() => setField("status", "draft")}
              >
                Draft
              </Button>
            </div>
          </div>

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
            placeholder="Blog title"
          />
          <Input
            value={form.slug}
            onChange={(e) => setField("slug", slugifyText(e.target.value))}
            placeholder="blog-slug"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Cover Image (optional)</p>
            <div className="rounded-md border border-border/70 bg-background/40 p-3 space-y-3">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageSelect}
                className="hidden"
              />
              {form.cover_image_url ? (
                <div className="relative w-full max-w-xs rounded-lg overflow-hidden border border-border">
                  <img
                    src={form.cover_image_url}
                    alt="Blog cover preview"
                    className="w-full h-40 object-cover"
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
                  className="gap-2"
                >
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {form.cover_image_url ? "Change Image" : "Upload Image"}
                </Button>
                {form.cover_image_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setField("cover_image_url", "")}
                    disabled={uploadingCover}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" /> Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">Max file size: 2MB</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Meta Description (SEO)</p>
            <Textarea
              rows={3}
              value={form.excerpt}
              onChange={(e) => setField("excerpt", e.target.value)}
              placeholder="Write SEO meta description (recommended 140-160 characters)"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Blog Content</p>
            <RichTextEditor
              value={form.content}
              onChange={(content) => setField("content", content)}
              placeholder="Write blog content with headings, colors, and formatted text..."
            />
          </div>

          <Button onClick={saveBlog} disabled={submitting || uploadingCover} className="gap-2">
            <Save className="w-4 h-4" />
            Save Blog
          </Button>
        </div>
      )}

      {/* ---------- Content Area ---------- */}
      {selectedServiceId < 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3 glass-card border-border/60">
          <FileQuestion className="w-12 h-12 text-primary/60" />
          <p className="text-lg font-medium">Select a service from the dropdown</p>
          <p className="text-sm">Choose a service above to view and manage its blog posts.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((blog) => {
            const serviceName = blog.service_id
              ? serviceMap.get(blog.service_id)?.name || "Unknown service"
              : "General";
            return (
              <div key={blog.id} className="glass-card p-4 border-border/60">
                <p className="text-xs text-muted-foreground">
                  {serviceName} | {blog.status.toUpperCase()}
                </p>
                <h4 className="font-semibold text-foreground mt-1">{blog.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">/{blog.slug}</p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{blog.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditEditor(blog)} className="gap-1">
                    <PencilLine className="w-4 h-4" /> Edit
                  </Button>
                  {blog.status === "live" && (
                    <a href={`/blog/${blog.slug}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="gap-1">
                        <ExternalLink className="w-4 h-4" /> View
                      </Button>
                    </a>
                  )}
                  {statusTab === "live" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(blog, "draft")}
                      className="gap-1 text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                    >
                      <Trash2 className="w-4 h-4" /> Draft
                    </Button>
                  )}
                  {statusTab === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(blog, "live")}
                        className="gap-1 text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10"
                      >
                        <RotateCcw className="w-4 h-4" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteBlog(blog)}
                        className="gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-12 glass-card border-border/60">
              No {statusTab} blog posts found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogManager;