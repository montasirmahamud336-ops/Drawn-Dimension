import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileQuestion, PencilLine, Plus, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import type { ContentStatus, ServiceBasic, ServiceFaqRecord } from "@/components/shared/serviceContent";

type FaqForm = {
  service_id: number;
  question: string;
  answer: string;
  status: ContentStatus;
  display_order: number;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const createForm = (serviceId = 0, status: ContentStatus = "live"): FaqForm => ({
  service_id: serviceId,
  question: "",
  answer: "",
  status,
  display_order: 0,
});

const FaqManager = () => {
  const apiBase = getApiBaseUrl();
  const [services, setServices] = useState<ServiceBasic[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [statusTab, setStatusTab] = useState<ContentStatus>("live");
  const [faqs, setFaqs] = useState<ServiceFaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FaqForm>(createForm());

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

  const loadFaqs = useCallback(async () => {
    if (!selectedServiceId) {
      setFaqs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/service-faqs?status=${statusTab}&serviceId=${encodeURIComponent(String(selectedServiceId))}`
      );
      if (!res.ok) throw new Error("Failed to fetch FAQs");
      const data = await res.json();
      setFaqs(Array.isArray(data) ? (data as ServiceFaqRecord[]) : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load FAQs"));
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedServiceId, statusTab]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const selectedServiceName = useMemo(
    () => services.find((service) => service.id === selectedServiceId)?.name || "Select a service",
    [selectedServiceId, services]
  );

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return faqs;
    return faqs.filter((faq) => [faq.question, faq.answer].join(" ").toLowerCase().includes(key));
  }, [faqs, search]);

  const openNewEditor = () => {
    if (!selectedServiceId) {
      toast.error("Add and publish services first from Pages.");
      return;
    }
    setEditingId(null);
    setForm(createForm(selectedServiceId, statusTab));
    setEditorOpen(true);
  };

  const openEditEditor = (faq: ServiceFaqRecord) => {
    setEditingId(faq.id);
    setForm({
      service_id: faq.service_id,
      question: faq.question,
      answer: faq.answer,
      status: faq.status,
      display_order: faq.display_order,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const setField = <K extends keyof FaqForm>(key: K, value: FaqForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveFaq = async () => {
    const token = requireToken();
    if (!token) return;
    if (!form.service_id) {
      toast.error("Service is required");
      return;
    }
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    const payload = {
      service_id: form.service_id,
      question: form.question.trim(),
      answer: form.answer.trim(),
      status: form.status,
      display_order: Math.max(0, Math.floor(Number(form.display_order) || 0)),
    };

    setSubmitting(true);
    try {
      const res = await fetch(editingId ? `${apiBase}/service-faqs/${editingId}` : `${apiBase}/service-faqs`, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to save FAQ");
      }

      const saved = (await res.json()) as ServiceFaqRecord;
      setEditingId(saved.id);
      setForm({
        service_id: saved.service_id,
        question: saved.question,
        answer: saved.answer,
        status: saved.status,
        display_order: saved.display_order,
      });
      if (saved.status !== statusTab) {
        setStatusTab(saved.status);
      } else {
        await loadFaqs();
      }
      toast.success(saved.status === "live" ? "FAQ saved and live" : "FAQ saved to draft");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save FAQ"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (faq: ServiceFaqRecord, nextStatus: ContentStatus) => {
    const token = requireToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/service-faqs/${faq.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update FAQ status");
      await loadFaqs();
      toast.success(nextStatus === "live" ? "FAQ restored to live" : "FAQ moved to draft");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update FAQ status"));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteFaq = async (faq: ServiceFaqRecord) => {
    const token = requireToken();
    if (!token) return;
    if (!window.confirm(`Permanently delete FAQ: "${faq.question}"?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/service-faqs/${faq.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete FAQ");
      if (editingId === faq.id) closeEditor();
      await loadFaqs();
      toast.success("FAQ deleted permanently");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete FAQ"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">FAQ</h2>
        <p className="text-muted-foreground">Manage page-wise service FAQs with live and draft workflow.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
        <aside className="glass-card p-3 border-border/60 space-y-2 h-fit">
          <p className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Service Pages</p>
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                setSelectedServiceId(service.id);
                setForm((prev) => ({ ...prev, service_id: service.id }));
              }}
              className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                selectedServiceId === service.id
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border/60 hover:border-primary/30"
              }`}
            >
              <span className="font-medium">{service.name}</span>
            </button>
          ))}
          {services.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground">No live services found in Pages.</div>
          )}
        </aside>

        <section className="space-y-4">
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
                  placeholder={`Search ${statusTab} FAQ...`}
                  className="pl-9"
                />
              </div>
              <Button onClick={openNewEditor} className="gap-2">
                <Plus className="w-4 h-4" />
                New FAQ
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Selected page: <span className="font-medium text-foreground">{selectedServiceName}</span>
            </p>
          </div>

          {editorOpen && (
            <div className="glass-card p-4 md:p-5 border-border/60 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{editingId ? "Edit FAQ" : "Create FAQ"}</h3>
                <Button variant="outline" size="sm" onClick={closeEditor} className="gap-1">
                  <X className="w-4 h-4" />
                  Close
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <Input value={selectedServiceName} readOnly />
                <Input
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={(e) => setField("display_order", Number(e.target.value) || 0)}
                  placeholder="Display order"
                />
              </div>
              <Input
                value={form.question}
                onChange={(e) => setField("question", e.target.value)}
                placeholder="FAQ question"
              />
              <Textarea
                rows={5}
                value={form.answer}
                onChange={(e) => setField("answer", e.target.value)}
                placeholder="FAQ answer"
              />
              <div className="flex gap-2">
                <Button size="sm" variant={form.status === "live" ? "default" : "outline"} onClick={() => setField("status", "live")}>
                  Live
                </Button>
                <Button size="sm" variant={form.status === "draft" ? "default" : "outline"} onClick={() => setField("status", "draft")}>
                  Draft
                </Button>
              </div>

              <Button onClick={saveFaq} disabled={submitting} className="gap-2">
                <Save className="w-4 h-4" />
                Save FAQ
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
              {filtered.map((faq) => (
                <div key={faq.id} className="glass-card p-4 border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Order: {faq.display_order} | Status: {faq.status.toUpperCase()}
                      </p>
                      <h4 className="font-semibold text-foreground">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{faq.answer}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/35 flex items-center justify-center">
                      <FileQuestion className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditEditor(faq)} className="gap-1">
                      <PencilLine className="w-4 h-4" />
                      Edit
                    </Button>
                    {statusTab === "live" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(faq, "draft")}
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
                          onClick={() => updateStatus(faq, "live")}
                          className="gap-1 text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteFaq(faq)} className="gap-1">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 && (
                <div className="text-center text-muted-foreground py-12 glass-card border-border/60">
                  No {statusTab} FAQs found for this service page.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FaqManager;
