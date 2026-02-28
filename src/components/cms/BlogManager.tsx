import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, PencilLine, Plus, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import RichTextEditor from "@/components/cms/RichTextEditor";
import {
  slugifyText,
  type ContentStatus,
  type ServiceBasic,
  type ServiceBlogRecord,
} from "@/components/shared/serviceContent";
import { sanitizeRichHtml, stripHtmlToText } from "@/components/shared/richText";

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

const createForm = (serviceId: number | null = null, status: ContentStatus = "draft"): BlogForm => ({
  service_id: serviceId,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  status,
});

const BlogManager = () => {
  const apiBase = getApiBaseUrl();
  const [services, setServices] = useState<ServiceBasic[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [statusTab, setStatusTab] = useState<ContentStatus>("live");
  const [blogs, setBlogs] = useState<ServiceBlogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<BlogForm>(createForm());

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
      if (items.length > 0) {
        setSelectedServiceId((prev) => (prev > 0 ? prev : items[0].id));
        setForm((prev) => ({ ...prev, service_id: prev.service_id || items[0].id }));
      } else {
        setSelectedServiceId(0);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load services"));
      setServices([]);
      setSelectedServiceId(0);
    }
  }, [apiBase]);

  const loadBlogs = useCallback(async () => {
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
      [blog.title, blog.excerpt, blog.content, blog.slug].join(" ").toLowerCase().includes(key)
    );
  }, [blogs, search]);

  const openNewEditor = () => {
    setEditingId(null);
    setForm(createForm(selectedServiceId || null, statusTab === "live" ? "live" : "draft"));
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

  const setField = <K extends keyof BlogForm>(key: K, value: BlogForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
      const res = await fetch(editingId ? `${apiBase}/service-blogs/${editingId}` : `${apiBase}/service-blogs`, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

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
      toast.success(saved.status === "live" ? "Blog published" : "Blog saved to draft");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save blog post"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (blog: ServiceBlogRecord, nextStatus: ContentStatus) => {
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
      toast.success(nextStatus === "live" ? "Blog restored to live" : "Blog moved to draft");
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
      <div>
        <h2 className="text-3xl font-bold">Blog</h2>
        <p className="text-muted-foreground">Create service-wise blog posts with live and draft workflow.</p>
      </div>

      <div className="glass-card p-4 border-border/60">
        <div className="flex flex-wrap gap-2">
          <Button variant={selectedServiceId === 0 ? "default" : "outline"} onClick={() => setSelectedServiceId(0)}>
            All Services
          </Button>
          {services.map((service) => (
            <Button
              key={service.id}
              variant={selectedServiceId === service.id ? "default" : "outline"}
              onClick={() => setSelectedServiceId(service.id)}
            >
              {service.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-4 border-border/60">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
            <div className="flex gap-2">
              <Button variant={statusTab === "live" ? "default" : "outline"} onClick={() => setStatusTab("live")}>
                Live
              </Button>
              <Button variant={statusTab === "draft" ? "default" : "outline"} onClick={() => setStatusTab("draft")}>
                Draft
              </Button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${statusTab} blogs...`}
                className="pl-9"
              />
            </div>
            <Button onClick={openNewEditor} className="gap-2">
              <Plus className="w-4 h-4" />
              New Blog
            </Button>
          </div>
        </div>

        {editorOpen && (
          <div className="glass-card p-4 md:p-5 border-border/60 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{editingId ? "Edit Blog Post" : "Create Blog Post"}</h3>
              <Button variant="outline" size="sm" onClick={closeEditor} className="gap-1">
                <X className="w-4 h-4" />
                Close
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.service_id ?? ""}
                onChange={(e) => setField("service_id", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">General (All Services)</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" variant={form.status === "live" ? "default" : "outline"} onClick={() => setField("status", "live")}>
                  Live
                </Button>
                <Button size="sm" variant={form.status === "draft" ? "default" : "outline"} onClick={() => setField("status", "draft")}>
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
            <Input
              value={form.cover_image_url}
              onChange={(e) => setField("cover_image_url", e.target.value)}
              placeholder="Cover image URL (optional)"
            />
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

            <Button onClick={saveBlog} disabled={submitting} className="gap-2">
              <Save className="w-4 h-4" />
              Save Blog
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((blog) => {
              const serviceName = blog.service_id ? serviceMap.get(blog.service_id)?.name || "Unknown service" : "General";
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
                      <PencilLine className="w-4 h-4" />
                      Edit
                    </Button>
                    {blog.status === "live" && (
                      <a href={`/blog/${blog.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="gap-1">
                          <ExternalLink className="w-4 h-4" />
                          View
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
                        <Trash2 className="w-4 h-4" />
                        Draft
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
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteBlog(blog)} className="gap-1">
                          <Trash2 className="w-4 h-4" />
                          Delete
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
    </div>
  );
};

export default BlogManager;
