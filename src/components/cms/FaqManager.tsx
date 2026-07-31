import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  FileQuestion,
  Layers,
  Loader2,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Search,
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
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load services"));
      setServices([]);
    }
  }, [apiBase]);

  const loadFaqs = useCallback(async () => {
    if (selectedServiceId < 0) {
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
    () => services.find((s) => s.id === selectedServiceId)?.name || "",
    [selectedServiceId, services],
  );

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return faqs;
    return faqs.filter((faq) => [faq.question, faq.answer].join(" ").toLowerCase().includes(key));
  }, [faqs, search]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(pagesHref);
  };

  const openNewEditor = () => {
    if (selectedServiceId <= 0) {
      toast.error("Select a service first.");
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
      const res = await fetch(
        editingId ? `${apiBase}/service-faqs/${editingId}` : `${apiBase}/service-faqs`,
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
      {/* ---------- Unified Top Bar ---------- */}
      <div className="glass-card p-3 border-border/60 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack} title="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold whitespace-nowrap">FAQ</h2>
        </div>

        {/* Service Combobox */}
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

        {/* Status Tabs */}
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
            placeholder={`Search ${statusTab} FAQ...`}
            className="pl-9"
          />
        </div>

        {/* New FAQ Button */}
        <Button
          onClick={openNewEditor}
          disabled={selectedServiceId < 0 || selectedServiceId === 0}
          className="gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New FAQ
        </Button>
      </div>

      {/* ---------- Editor Panel ---------- */}
      {editorOpen && (
        <div className="glass-card p-4 md:p-5 border-border/60 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit FAQ" : "Create FAQ"}
            </h3>
            <Button variant="outline" size="sm" onClick={closeEditor} className="gap-1">
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Input value={services.find((s) => s.id === form.service_id)?.name || ""} readOnly />
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

          <Button onClick={saveFaq} disabled={submitting} className="gap-2">
            <Save className="w-4 h-4" />
            Save FAQ
          </Button>
        </div>
      )}

      {/* ---------- Content Area ---------- */}
      {selectedServiceId < 0 || selectedServiceId === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3 glass-card border-border/60">
          <FileQuestion className="w-12 h-12 text-primary/60" />
          <p className="text-lg font-medium">Select a service from the dropdown</p>
          <p className="text-sm">Choose a service above to view and manage its FAQs.</p>
        </div>
      ) : loading ? (
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
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/35 flex items-center justify-center shrink-0">
                  <FileQuestion className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditEditor(faq)} className="gap-1">
                  <PencilLine className="w-4 h-4" /> Edit
                </Button>
                {statusTab === "live" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(faq, "draft")}
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
                      onClick={() => updateStatus(faq, "live")}
                      className="gap-1 text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10"
                    >
                      <RotateCcw className="w-4 h-4" /> Restore
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteFaq(faq)} className="gap-1">
                      <Trash2 className="w-4 h-4" /> Delete
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
    </div>
  );
};

export default FaqManager;