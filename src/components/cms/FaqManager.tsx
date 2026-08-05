import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  FileQuestion,
  HelpCircle,
  Layers,
  Loader2,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import type { ContentStatus, ServiceBasic, ServiceFaqRecord } from "@/components/shared/serviceContent";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildCMSHref, getCMSBasePath } from "@/components/cms/cmsNavigation";

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

type FaqManagerProps = {
  onBack?: () => void;
};

const FaqManager = ({ onBack }: FaqManagerProps) => {
  const apiBase = getApiBaseUrl();
  const location = useLocation();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceBasic[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(-1);
  const [statusTab, setStatusTab] = useState<ContentStatus>("live");
  const [faqs, setFaqs] = useState<ServiceFaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FaqForm>(createForm());
  const [open, setOpen] = useState(false);
  const pagesHref = buildCMSHref(getCMSBasePath(location.pathname), "pages");

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
      if (items.length > 0 && selectedServiceId < 0) {
        setSelectedServiceId(items[0].id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load services"));
      setServices([]);
    }
  }, [apiBase, selectedServiceId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const loadFaqs = useCallback(async () => {
    if (selectedServiceId < 0) return;
    setLoading(true);
    try {
      let url = `${apiBase}/service-faqs?status=${statusTab}`;
      if (selectedServiceId > 0) {
        url += `&service_id=${selectedServiceId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch FAQs");
      const data = await res.json();
      setFaqs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load FAQs"));
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedServiceId, statusTab]);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(pagesHref);
  };

  const openNewEditor = () => {
    if (selectedServiceId <= 0) return;
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
    setForm(createForm(selectedServiceId > 0 ? selectedServiceId : 0, statusTab));
  };

  const setField = <K extends keyof FaqForm>(key: K, value: FaqForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveFaq = async () => {
    const token = requireToken();
    if (!token) return;
    if (form.service_id <= 0) {
      toast.error("Please select a valid service for this FAQ");
      return;
    }
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    setSubmitting(true);
    try {
      const isEditing = editingId !== null;
      const url = isEditing
        ? `${apiBase}/service-faqs/${editingId}`
        : `${apiBase}/service-faqs`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_id: form.service_id,
          question: form.question.trim(),
          answer: form.answer.trim(),
          status: form.status,
          display_order: form.display_order,
        }),
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
    <div className="space-y-6 pb-8">
      {/* Header Bar */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-card/90 via-card/75 to-amber-500/10 p-5 shadow-xl backdrop-blur-2xl sm:p-6">
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
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-500">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Service Knowledge Base</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                FAQ Management
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={openNewEditor}
              disabled={selectedServiceId <= 0}
              className="rounded-xl font-bold bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New FAQ</span>
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
                  <Layers className="h-4 w-4 text-primary shrink-0" />
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
                      <Layers className="mr-2 h-4 w-4 text-primary" />
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
            placeholder={`Search ${statusTab} FAQs...`}
            className="pl-9 rounded-xl border-border/60 bg-background/80 text-xs font-medium"
          />
        </div>
      </div>

      {/* Editor Drawer / Card */}
      {editorOpen && (
        <div className="rounded-3xl border border-amber-500/30 bg-card/85 p-6 shadow-xl backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {editingId ? "Edit FAQ" : "Create New FAQ"}
            </h3>
            <Button variant="ghost" size="sm" onClick={closeEditor} className="rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Target Service</label>
              <Input
                value={services.find((s) => s.id === form.service_id)?.name || "General Service"}
                readOnly
                className="rounded-xl border-border/60 bg-muted/40 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Display Order</label>
              <Input
                type="number"
                min={0}
                value={form.display_order}
                onChange={(e) => setField("display_order", Number(e.target.value) || 0)}
                placeholder="0"
                className="rounded-xl border-border/60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">FAQ Question</label>
            <Input
              value={form.question}
              onChange={(e) => setField("question", e.target.value)}
              placeholder="e.g. What is the turnaround time for web design projects?"
              className="rounded-xl border-border/60 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">FAQ Answer</label>
            <Textarea
              rows={4}
              value={form.answer}
              onChange={(e) => setField("answer", e.target.value)}
              placeholder="Detailed answer text..."
              className="rounded-xl border-border/60 text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={form.status === "live" ? "default" : "outline"}
                onClick={() => setField("status", "live")}
                className="rounded-xl font-bold text-xs"
              >
                Live
              </Button>
              <Button
                type="button"
                size="sm"
                variant={form.status === "draft" ? "default" : "outline"}
                onClick={() => setField("status", "draft")}
                className="rounded-xl font-bold text-xs"
              >
                Draft
              </Button>
            </div>

            <Button onClick={saveFaq} disabled={submitting} className="rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save FAQ</span>
            </Button>
          </div>
        </div>
      )}

      {/* FAQ Items List */}
      {selectedServiceId < 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl">
          <FileQuestion className="h-10 w-10 text-amber-500/60" />
          <p className="text-base font-bold text-foreground">Select a Service Page</p>
          <p className="text-xs text-muted-foreground">Choose a service from the dropdown above to view its FAQs.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-2xl bg-card/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((faq) => (
            <div
              key={faq.id}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/75 p-5 shadow-md backdrop-blur-xl transition-all duration-200 hover:border-amber-500/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-extrabold uppercase text-muted-foreground">
                      Order #{faq.display_order}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        faq.status === "live"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {faq.status}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground leading-snug">{faq.question}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shadow-sm border border-amber-500/20">
                  <HelpCircle className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/40 pt-3">
                <Button size="sm" variant="outline" onClick={() => openEditEditor(faq)} className="rounded-xl text-xs font-bold gap-1 h-8">
                  <PencilLine className="h-3.5 w-3.5" /> Edit
                </Button>

                {statusTab === "live" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(faq, "draft")}
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
                      onClick={() => updateStatus(faq, "live")}
                      className="rounded-xl text-xs font-bold gap-1 h-8 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore Live
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteFaq(faq)} className="rounded-xl text-xs font-bold gap-1 h-8">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-14 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl">
              No {statusTab} FAQs found for this service page.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FaqManager;