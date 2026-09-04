import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Briefcase,
  Check,
  Clock,
  Copy,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  MailCheck,
  Plus,
  Printer,
  Receipt,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { openInvoicePrintWindow, type PrintableInvoice } from "./invoicePrint";

// ============ Types ============
type InvoiceSourceAssignment = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  order_code: string | null;
  work_title: string;
  work_details: string | null;
  payment_amount: number;
  payment_status: "unpaid" | "paid";
  completed_at: string | null;
  already_invoiced: boolean;
  existing_invoice_numbers: string[];
};

type InvoiceSourceEmployee = {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  profession: string | null;
  assignment_count: number;
  total_amount: number;
  assignments: InvoiceSourceAssignment[];
};

type SentInvoiceSummary = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  invoice_number: string;
  invoice_month: string;
  total_amount: number;
  status: "sent";
  notes: string | null;
  sent_at: string;
  emailed_at: string;
  item_count: number;
  assignment_count: number;
};

type SentInvoiceDetailItem = {
  id: string;
  invoice_id: string;
  work_assignment_id: string | null;
  item_type: "assignment" | "custom";
  order_code: string | null;
  title: string;
  description: string | null;
  amount: number;
  display_order: number;
};

type SentInvoiceDetail = {
  invoice: Omit<SentInvoiceSummary, "item_count" | "assignment_count"> & {
    currency?: string;
  };
  items: SentInvoiceDetailItem[];
};

type CustomLineItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
};

// ============ Helpers ============
const getDefaultMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getRelativeMonth = (baseMonth: string, offset: number) => {
  const [yearStr, monthStr] = String(baseMonth || getDefaultMonthValue()).split("-");
  const d = new Date(parseInt(yearStr, 10) || new Date().getFullYear(), (parseInt(monthStr, 10) || 1) - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const getInitials = (name?: string | null) => {
  if (!name) return "EM";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EM";
  if (parts.length === 1) return (parts[0].slice(0, 2) || "EM").toUpperCase();
  return ((parts[0][0] || "") + (parts[1][0] || "")).toUpperCase() || "EM";
};

const parseMoney = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(2));
};

const formatCurrency = (value: number) => {
  const safeNum = Number.isFinite(value) ? value : 0;
  return `BDT ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNum)}`;
};

const formatMonthLabel = (value: string) => {
  if (!value) return "-";
  const [year, month] = String(value).split("-").map(Number);
  if (!year || !month || Number.isNaN(year) || Number.isNaN(month)) return String(value);
  try {
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-BD", {
      year: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  } catch {
    return String(value);
  }
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDateOnly = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const normalizeInvoiceItemDescription = (value: string | null | undefined) => {
  const normalized = value?.trim() || "";
  if (!normalized) return null;
  if (normalized.toLowerCase() === "no additional details") return null;
  return normalized;
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) {
      const message = String(body.message);
      if (message.includes("completed_at") && message.includes("does not exist")) {
        return "Invoice migration is missing. Please run database migrations first.";
      }
      if (message.includes("employee_invoices") || message.includes("employee_invoice_line_items")) {
        return "Invoice tables are missing in the database. Please check PostgreSQL migrations.";
      }
      return message;
    }
  }

  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const buildPrintableInvoiceFromDetail = (detail: SentInvoiceDetail): PrintableInvoice => ({
  invoiceNumber: detail.invoice.invoice_number,
  monthLabel: formatMonthLabel(String(detail.invoice.invoice_month || "").slice(0, 7)),
  employeeName: detail.invoice.employee_name,
  employeeEmail: detail.invoice.employee_email,
  sentAt: detail.invoice.sent_at,
  totalAmount: (detail.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
  notes: detail.invoice.notes ?? null,
  items: (detail.items || []).map((item) => ({
    orderCode: item.order_code,
    title: item.title,
    description: item.item_type === "custom" ? normalizeInvoiceItemDescription(item.description) : null,
    amount: Number(item.amount) || 0,
  })),
});

export default function SentInvoiceManager() {
  const apiBase = getApiBaseUrl();

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<"studio" | "history" | "insights">("studio");
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue);
  const [monthLabel, setMonthLabel] = useState(formatMonthLabel(getDefaultMonthValue()));

  // Data state
  const [employees, setEmployees] = useState<InvoiceSourceEmployee[]>([]);
  const [sentInvoices, setSentInvoices] = useState<SentInvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Studio Builder state
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<"all" | "pending" | "invoiced">("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomLineItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newCustomTitle, setNewCustomTitle] = useState("");
  const [newCustomDesc, setNewCustomDesc] = useState("");
  const [newCustomAmount, setNewCustomAmount] = useState("");
  const [sending, setSending] = useState(false);

  // History state
  const [historySearch, setHistorySearch] = useState("");
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<SentInvoiceDetail | null>(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const [resendingInvoiceId, setResendingInvoiceId] = useState<string | null>(null);

  // Load Data from API
  const loadSource = useCallback(
    async (
      month: string,
      preferredEmployeeId = selectedEmployeeId,
      preserveSelections = false
    ) => {
      const token = getAdminToken();
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${apiBase}/employee-invoices/source?month=${encodeURIComponent(month)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to load invoice data"));
        }

        const data = await response.json();
        const nextEmployees = Array.isArray(data?.employees) ? (data.employees as InvoiceSourceEmployee[]) : [];
        const nextSentInvoices = Array.isArray(data?.sent_invoices)
          ? (data.sent_invoices as SentInvoiceSummary[])
          : [];

        setEmployees(nextEmployees);
        setSentInvoices(nextSentInvoices);
        setMonthLabel(String(data?.month_label || formatMonthLabel(month)));

        const nextEmployeeId =
          nextEmployees.some((emp) => emp.employee_id === preferredEmployeeId)
            ? preferredEmployeeId
            : nextEmployees[0]?.employee_id ?? "";

        setSelectedEmployeeId(nextEmployeeId);

        if (!preserveSelections || nextEmployeeId !== preferredEmployeeId) {
          const nextEmployee = nextEmployees.find((emp) => emp.employee_id === nextEmployeeId) ?? null;
          if (nextEmployee && Array.isArray(nextEmployee.assignments)) {
            const defaultIds = nextEmployee.assignments
              .filter((a) => !a.already_invoiced)
              .map((a) => a.id);
            setSelectedAssignmentIds(defaultIds.length > 0 ? defaultIds : nextEmployee.assignments.map((a) => a.id));
          } else {
            setSelectedAssignmentIds([]);
          }
          setCustomItems([]);
          setInvoiceNotes("");
        }
      } catch (error: unknown) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to load invoice records");
      } finally {
        setLoading(false);
      }
    },
    [apiBase, selectedEmployeeId]
  );

  useEffect(() => {
    void loadSource(selectedMonth, selectedEmployeeId, false);
  }, [selectedMonth, loadSource, selectedEmployeeId]);

  // Selected Employee & Draft Snapshot
  const selectedEmployee = useMemo(() => {
    return (employees || []).find((emp) => emp && emp.employee_id === selectedEmployeeId) ?? null;
  }, [employees, selectedEmployeeId]);

  const selectedAssignments = useMemo(() => {
    if (!selectedEmployee || !Array.isArray(selectedEmployee.assignments)) return [];
    return selectedEmployee.assignments.filter((a) => a && selectedAssignmentIds.includes(a.id));
  }, [selectedEmployee, selectedAssignmentIds]);

  const assignmentsSubtotal = useMemo(() => {
    return selectedAssignments.reduce((sum, item) => sum + (Number(item.payment_amount) || 0), 0);
  }, [selectedAssignments]);

  const customItemsSubtotal = useMemo(() => {
    return (customItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [customItems]);

  const grandTotal = assignmentsSubtotal + customItemsSubtotal;

  // Filtered employees list for sidebar
  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((employee) => {
      if (!employee) return false;
      const name = String(employee.employee_name || "").toLowerCase();
      const email = String(employee.employee_email || "").toLowerCase();
      const prof = String(employee.profession || "").toLowerCase();
      const query = (employeeSearch || "").toLowerCase().trim();

      if (query && !name.includes(query) && !email.includes(query) && !prof.includes(query)) {
        return false;
      }

      const empAssignments = Array.isArray(employee.assignments) ? employee.assignments : [];
      const hasUninvoiced = empAssignments.some((a) => a && !a.already_invoiced);
      const isFullyInvoiced = empAssignments.length > 0 && empAssignments.every((a) => a && a.already_invoiced);

      if (employeeFilter === "pending") return hasUninvoiced;
      if (employeeFilter === "invoiced") return isFullyInvoiced;
      return true;
    });
  }, [employees, employeeSearch, employeeFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    let totalAssignments = 0;
    let totalGrossAmount = 0;
    let totalUnbilledAmount = 0;
    let totalUnbilledTasks = 0;

    (employees || []).forEach((emp) => {
      if (!emp) return;
      totalAssignments += Number(emp.assignment_count) || 0;
      totalGrossAmount += Number(emp.total_amount) || 0;
      const empAssignments = Array.isArray(emp.assignments) ? emp.assignments : [];
      empAssignments.forEach((a) => {
        if (a && !a.already_invoiced) {
          totalUnbilledAmount += Number(a.payment_amount) || 0;
          totalUnbilledTasks += 1;
        }
      });
    });

    const sentTotalAmount = (sentInvoices || []).reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

    return {
      employeeCount: (employees || []).length,
      assignmentCount: totalAssignments,
      grossAmount: totalGrossAmount,
      unbilledAmount: totalUnbilledAmount,
      unbilledTasks: totalUnbilledTasks,
      sentCount: (sentInvoices || []).length,
      sentTotalAmount,
    };
  }, [employees, sentInvoices]);

  // Filtered sent history
  const filteredSentInvoices = useMemo(() => {
    if (!historySearch.trim()) return sentInvoices || [];
    const query = historySearch.toLowerCase().trim();
    return (sentInvoices || []).filter((inv) => {
      if (!inv) return false;
      const num = String(inv.invoice_number || "").toLowerCase();
      const name = String(inv.employee_name || "").toLowerCase();
      const email = String(inv.employee_email || "").toLowerCase();
      return num.includes(query) || name.includes(query) || email.includes(query);
    });
  }, [sentInvoices, historySearch]);

  // Handlers
  const handleSelectEmployee = (employee: InvoiceSourceEmployee) => {
    if (!employee) return;
    setSelectedEmployeeId(employee.employee_id);
    const empAssignments = Array.isArray(employee.assignments) ? employee.assignments : [];
    const defaultIds = empAssignments.filter((a) => a && !a.already_invoiced).map((a) => a.id);
    setSelectedAssignmentIds(defaultIds.length > 0 ? defaultIds : empAssignments.map((a) => a.id));
    setCustomItems([]);
    setInvoiceNotes("");
  };

  const handleToggleAssignment = (assignmentId: string, checked: boolean) => {
    setSelectedAssignmentIds((prev) => (checked ? [...prev, assignmentId] : prev.filter((id) => id !== assignmentId)));
  };

  const handleSelectAllUninvoiced = () => {
    if (!selectedEmployee || !Array.isArray(selectedEmployee.assignments)) return;
    const uninvoiced = selectedEmployee.assignments.filter((a) => a && !a.already_invoiced).map((a) => a.id);
    setSelectedAssignmentIds(uninvoiced);
  };

  const handleSelectAll = () => {
    if (!selectedEmployee || !Array.isArray(selectedEmployee.assignments)) return;
    setSelectedAssignmentIds(selectedEmployee.assignments.map((a) => a.id));
  };

  const handleClearSelection = () => {
    setSelectedAssignmentIds([]);
  };

  const handleAddCustomItem = () => {
    const title = newCustomTitle.trim();
    const amount = Number(newCustomAmount);

    if (!title) {
      toast.error("Please enter an item title");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    const newItem: CustomLineItem = {
      id: `custom-${Date.now()}`,
      title,
      description: newCustomDesc.trim(),
      amount,
    };

    setCustomItems((prev) => [...prev, newItem]);
    setNewCustomTitle("");
    setNewCustomDesc("");
    setNewCustomAmount("");
    setShowAddCustomModal(false);
    toast.success("Custom item added");
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const buildDraftPrintableInvoice = (): PrintableInvoice | null => {
    if (!selectedEmployee) return null;
    const items: PrintableInvoice["items"] = [];

    selectedAssignments.forEach((a) => {
      items.push({
        orderCode: a.order_code,
        title: a.work_title,
        description: a.work_details,
        amount: Number(a.payment_amount) || 0,
      });
    });

    customItems.forEach((c) => {
      items.push({
        orderCode: "Custom",
        title: c.title,
        description: c.description || null,
        amount: Number(c.amount) || 0,
      });
    });

    return {
      invoiceNumber: `DRAFT-${String(selectedMonth).replace("-", "")}-${String(selectedEmployee.employee_name || "STAFF").replace(/\s+/g, "-").toUpperCase()}`,
      monthLabel,
      employeeName: selectedEmployee.employee_name || "Staff",
      employeeEmail: selectedEmployee.employee_email || "",
      sentAt: new Date().toISOString(),
      totalAmount: grandTotal,
      notes: invoiceNotes.trim() || null,
      items,
    };
  };

  const handleDownloadDraft = () => {
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    if (selectedAssignments.length === 0 && customItems.length === 0) {
      toast.error("Select at least one task or add a custom item");
      return;
    }

    const printable = buildDraftPrintableInvoice();
    if (!printable) return;

    try {
      openInvoicePrintWindow(printable);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not open print window");
    }
  };

  const handleSendInvoice = async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    if (selectedAssignments.length === 0 && customItems.length === 0) {
      toast.error("Select at least one task or add a custom item");
      return;
    }

    const apiItems = [
      ...selectedAssignments.map((a) => ({ work_assignment_id: a.id })),
      ...customItems.map((c) => ({
        title: c.title,
        description: c.description || null,
        amount: c.amount,
      })),
    ];

    setSending(true);
    try {
      const response = await fetch(`${apiBase}/employee-invoices/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_id: selectedEmployee.employee_id,
          invoice_month: selectedMonth,
          notes: invoiceNotes.trim() || null,
          items: apiItems,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to send invoice"));
      }

      const data = await response.json();
      const printableInvoice: PrintableInvoice = {
        invoiceNumber: String(data?.invoice?.invoice_number || ""),
        monthLabel: String(data?.month_label || monthLabel),
        employeeName: selectedEmployee.employee_name || "Staff",
        employeeEmail: selectedEmployee.employee_email || "",
        sentAt: String(data?.invoice?.sent_at || new Date().toISOString()),
        totalAmount: parseMoney(data?.invoice?.total_amount) ?? grandTotal,
        notes: invoiceNotes.trim() || null,
        items: [
          ...selectedAssignments.map((a) => ({
            orderCode: a.order_code,
            title: a.work_title,
            description: a.work_details,
            amount: Number(a.payment_amount) || 0,
          })),
          ...customItems.map((c) => ({
            orderCode: "Custom",
            title: c.title,
            description: c.description || null,
            amount: Number(c.amount) || 0,
          })),
        ],
      };

      toast.success(`Invoice ${printableInvoice.invoiceNumber} emailed to ${selectedEmployee.employee_email}!`);
      
      try {
        openInvoicePrintWindow(printableInvoice);
      } catch {
        // popup blocker is fine
      }

      void loadSource(selectedMonth, selectedEmployee.employee_id, false);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to dispatch invoice");
    } finally {
      setSending(false);
    }
  };

  const fetchInvoiceDetail = async (invoiceId: string) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return null;
    }

    const response = await fetch(`${apiBase}/employee-invoices/${encodeURIComponent(invoiceId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Failed to load invoice details"));
    }

    const payload = (await response.json()) as SentInvoiceDetail;
    return {
      invoice: {
        ...payload.invoice,
        total_amount: parseMoney(payload.invoice.total_amount) ?? 0,
      },
      items: Array.isArray(payload.items)
        ? payload.items.map((item) => ({
            ...item,
            amount: parseMoney(item.amount) ?? 0,
          }))
        : [],
    } as SentInvoiceDetail;
  };

  const handleViewInvoice = async (invoiceId: string) => {
    setViewingInvoiceId(invoiceId);
    setLoadingInvoiceDetail(true);
    try {
      const detail = await fetchInvoiceDetail(invoiceId);
      if (!detail) return;
      setViewingInvoice(detail);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load invoice");
      setViewingInvoiceId(null);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  const handlePrintSentInvoice = async (invoiceId: string) => {
    setPrintingInvoiceId(invoiceId);
    try {
      const detail = await fetchInvoiceDetail(invoiceId);
      if (!detail) return;
      openInvoicePrintWindow(buildPrintableInvoiceFromDetail(detail));
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not open print window");
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const handleResendInvoice = async (invoice: SentInvoiceSummary) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }
    if (!confirm(`Resend invoice ${invoice.invoice_number} to ${invoice.employee_email}?`)) return;

    setResendingInvoiceId(invoice.id);
    try {
      const response = await fetch(`${apiBase}/employee-invoices/${encodeURIComponent(invoice.id)}/resend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to resend invoice"));
      }

      toast.success(`Invoice successfully resent to ${invoice.employee_email}`);
      void loadSource(selectedMonth, selectedEmployeeId, true);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to resend invoice");
    } finally {
      setResendingInvoiceId(null);
    }
  };

  const copyToClipboard = (text: string, label = "Invoice number") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-3.5 pb-8">
      {/* ================= COMPACT HEADER BAR ================= */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">Sent Invoices</h1>
              <Badge variant="outline" className="h-5 rounded-md border-primary/30 bg-primary/5 px-2 text-[10px] font-bold text-primary">
                {monthLabel}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Monthly milestones & invoice dispatch studio</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-border/70 bg-background/80 p-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(getRelativeMonth(selectedMonth, -1))}
              className="h-7 px-2 text-xs font-semibold hover:bg-primary/10"
            >
              Prev
            </Button>
            <Button
              variant={selectedMonth === getDefaultMonthValue() ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedMonth(getDefaultMonthValue())}
              className="h-7 px-2.5 text-xs font-bold"
            >
              This Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(getRelativeMonth(selectedMonth, 1))}
              className="h-7 px-2 text-xs font-semibold hover:bg-primary/10"
            >
              Next
            </Button>
          </div>

          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 w-[145px] rounded-xl border-border/80 bg-background font-medium text-xs shadow-sm"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadSource(selectedMonth, selectedEmployeeId, true)}
            disabled={loading}
            className="h-8 w-8 rounded-xl p-0 shadow-sm hover:border-primary/40"
            title="Refresh source data"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>

      {/* ================= COMPACT HIGH-DENSITY KPI STRIP ================= */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* KPI 1 */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-3.5 py-2.5 shadow-sm backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Billable Staff</p>
            <p className="text-base font-black tracking-tight text-foreground">
              {stats.employeeCount} <span className="text-[11px] font-normal text-muted-foreground">members</span>
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-3.5 py-2.5 shadow-sm backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed Tasks</p>
              {stats.unbilledTasks > 0 && (
                <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-bold text-amber-600">
                  {stats.unbilledTasks} pending
                </span>
              )}
            </div>
            <p className="text-base font-black tracking-tight text-foreground">
              {stats.assignmentCount} <span className="text-[11px] font-normal text-muted-foreground">tasks</span>
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-3.5 py-2.5 shadow-sm backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Month Volume</p>
            <p className="text-base font-black tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(stats.grossAmount)}
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-3.5 py-2.5 shadow-sm backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <MailCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Invoices Sent</p>
            <p className="text-base font-black tracking-tight text-foreground">
              {stats.sentCount} <span className="text-[11px] font-normal text-muted-foreground">statements</span>
            </p>
          </div>
        </div>
      </div>

      {/* ================= COMPACT TAB SWITCHER ================= */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => setActiveTab("studio")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              activeTab === "studio"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Invoice Studio
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck className="h-3.5 w-3.5" />
            Sent Archive
            {sentInvoices.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {sentInvoices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              activeTab === "insights"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Payroll Insights
          </button>
        </div>
      </div>

      {/* ================= TAB 1: INVOICE STUDIO ================= */}
      {activeTab === "studio" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          {/* Left Column: Compact Employee Directory */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur-xl space-y-2.5">
            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter staff by name..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="h-7.5 rounded-xl border-border/70 bg-background/80 pl-8 text-xs focus:border-primary"
                />
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setEmployeeFilter("all")}
                  className={`flex-1 rounded-lg py-0.5 text-center text-[10px] font-bold transition-all ${
                    employeeFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All ({employees.length})
                </button>
                <button
                  onClick={() => setEmployeeFilter("pending")}
                  className={`flex-1 rounded-lg py-0.5 text-center text-[10px] font-bold transition-all ${
                    employeeFilter === "pending"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Pending Unbilled
                </button>
                <button
                  onClick={() => setEmployeeFilter("invoiced")}
                  className={`flex-1 rounded-lg py-0.5 text-center text-[10px] font-bold transition-all ${
                    employeeFilter === "invoiced"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Invoiced
                </button>
              </div>
            </div>

            {/* Employee Cards List */}
            <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-0.5">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  Loading staff...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                  No matching employees found.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeId === emp.employee_id;
                  const initials = getInitials(emp.employee_name);

                  return (
                    <button
                      key={emp.employee_id}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`group w-full rounded-xl border p-2 text-left transition-all duration-150 ${
                        isSelected
                          ? "border-primary/80 bg-primary/10 shadow-xs ring-1 ring-primary/30"
                          : "border-border/60 bg-background/50 hover:border-primary/40 hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold shadow-xs ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-xs font-bold text-foreground">
                              {emp.employee_name}
                            </p>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary stroke-[3]" />
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground truncate">
                              {emp.assignment_count} works
                            </span>
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(emp.total_amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Compact Invoice Canvas */}
          <div className="space-y-2.5">
            {!selectedEmployee ? (
              <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/30 p-6 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground/40" />
                <h3 className="mt-2 text-sm font-bold text-foreground">Select an employee</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pick a team member from the directory to review tasks and send an invoice.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Selected Profile Banner */}
                <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-gradient-to-r from-card/90 via-card/70 to-primary/5 p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground shadow-xs">
                      {getInitials(selectedEmployee.employee_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">
                          {selectedEmployee.employee_name}
                        </h3>
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground">
                          {selectedEmployee.profession || selectedEmployee.employee_email}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{selectedEmployee.employee_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadDraft}
                      disabled={selectedAssignments.length === 0 && customItems.length === 0}
                      className="h-8 rounded-xl px-3 text-xs font-bold shadow-xs hover:border-primary/40"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Print Draft
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSendInvoice}
                      disabled={sending || (selectedAssignments.length === 0 && customItems.length === 0)}
                      className="h-8 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Send Invoice
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Task Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Completed Tasks ({selectedEmployee.assignments?.length || 0})
                    </span>
                    <Badge variant="secondary" className="h-5 text-[10px] font-bold">
                      {selectedAssignmentIds.length} Selected
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllUninvoiced}
                      className="h-6 rounded-md px-2 text-[11px] font-semibold hover:bg-background"
                    >
                      Uninvoiced
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-6 rounded-md px-2 text-[11px] font-semibold hover:bg-background"
                    >
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="h-6 rounded-md px-2 text-[11px] font-semibold text-muted-foreground hover:bg-background"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddCustomModal(true)}
                      className="h-6 rounded-md border-primary/30 bg-primary/5 px-2 text-[11px] font-bold text-primary hover:bg-primary/10"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Custom Item
                    </Button>
                  </div>
                </div>

                {/* Task Checklist Items */}
                <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-0.5">
                  {(selectedEmployee.assignments || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                      No completed tasks for this employee.
                    </div>
                  ) : (
                    selectedEmployee.assignments.map((assignment) => {
                      const isChecked = selectedAssignmentIds.includes(assignment.id);
                      return (
                        <label
                          key={assignment.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-2 transition-all duration-100 ${
                            isChecked
                              ? "border-primary/50 bg-primary/[0.04] shadow-xs"
                              : "border-border/60 bg-background/50 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleToggleAssignment(assignment.id, checked === true)
                              }
                              className="h-4 w-4 rounded"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px] font-bold text-foreground">
                                  {assignment.order_code || "TASK"}
                                </span>
                                <span className="truncate text-xs font-bold text-foreground">
                                  {assignment.work_title}
                                </span>
                                {assignment.already_invoiced && (
                                  <span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:text-amber-400">
                                    Invoiced
                                  </span>
                                )}
                              </div>
                              {assignment.work_details && (
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                  {assignment.work_details}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(Number(assignment.payment_amount) || 0)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Custom Adjustments */}
                {customItems.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-primary uppercase">Custom Line Items ({customItems.length})</span>
                      <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(customItemsSubtotal)}</span>
                    </div>
                    <div className="space-y-1">
                      {customItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-background/80 px-2.5 py-1 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground">{item.title}</span>
                            {item.description && (
                              <span className="text-[10px] text-muted-foreground ml-2">{item.description}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(item.amount)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCustomItem(item.id)}
                              className="h-5 w-5 text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks & Total Strip */}
                <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background p-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                  <div className="flex-1 max-w-sm">
                    <Input
                      placeholder="Invoice notes / bank reference (optional)..."
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      className="h-8 rounded-xl border-border/70 bg-background/90 text-xs"
                    />
                  </div>

                  <div className="flex items-baseline justify-between sm:justify-end gap-3 text-right">
                    <div className="text-xs text-muted-foreground">
                      <span>Tasks: {formatCurrency(assignmentsSubtotal)}</span>
                      {customItemsSubtotal > 0 && <span className="ml-2 text-emerald-600">+{formatCurrency(customItemsSubtotal)}</span>}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-bold text-primary">Total:</span>
                      <span className="text-xl font-black text-foreground">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: SENT ARCHIVE ================= */}
      {activeTab === "history" && (
        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/60 bg-card/60 p-2.5 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search invoice number, employee..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-7.5 rounded-xl border-border/70 bg-background/80 pl-8 text-xs focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-lg text-[10px] font-bold border-primary/30 bg-primary/5 text-primary">
                {sentInvoices.length} Sent
              </Badge>
              <Badge variant="outline" className="rounded-lg text-[10px] font-bold border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                Total {formatCurrency(stats.sentTotalAmount)}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
              Loading sent invoices...
            </div>
          ) : filteredSentInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
              No sent invoices for {monthLabel}.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-border/60 bg-card/60 p-3.5 shadow-sm backdrop-blur-md space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {inv.invoice_number}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(inv.invoice_number)}
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy invoice number</TooltipContent>
                      </Tooltip>
                    </div>

                    <Badge className="h-5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-bold">
                      Sent
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs border-y border-border/40 py-1.5">
                    <div>
                      <p className="font-bold text-foreground">{inv.employee_name}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.employee_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inv.total_amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{inv.item_count} items</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-muted-foreground">{formatDateOnly(inv.sent_at)}</span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvoice(inv.id)}
                        className="h-6.5 rounded-lg px-2 text-[10px] font-bold"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintSentInvoice(inv.id)}
                        disabled={printingInvoiceId === inv.id}
                        className="h-6.5 rounded-lg px-2 text-[10px] font-bold"
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvoice(inv)}
                        disabled={resendingInvoiceId === inv.id}
                        className="h-6.5 rounded-lg px-2 text-[10px] font-bold"
                      >
                        <Mail className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: INSIGHTS ================= */}
      {activeTab === "insights" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-foreground">Completion Progress</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Billed Ratio</span>
                <span className="text-primary">
                  {stats.grossAmount > 0
                    ? Math.round((stats.sentTotalAmount / stats.grossAmount) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${
                      stats.grossAmount > 0
                        ? Math.min(100, Math.round((stats.sentTotalAmount / stats.grossAmount) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="rounded-xl border border-border/50 p-2">
                  <p className="text-[10px] text-muted-foreground">Invoiced</p>
                  <p className="font-bold">{formatCurrency(stats.sentTotalAmount)}</p>
                </div>
                <div className="rounded-xl border border-border/50 p-2">
                  <p className="text-[10px] text-muted-foreground">Unbilled</p>
                  <p className="font-bold text-amber-600">{formatCurrency(stats.unbilledAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-foreground">Staff Earnings</h3>
            <div className="max-h-[160px] space-y-1.5 overflow-y-auto pr-0.5">
              {employees
                .slice()
                .sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0))
                .map((emp, index) => (
                  <div
                    key={emp.employee_id}
                    className="flex items-center justify-between rounded-xl border border-border/40 p-2 text-xs"
                  >
                    <span className="font-bold text-foreground">
                      #{index + 1} {emp.employee_name}
                    </span>
                    <span className="font-bold text-emerald-600">{formatCurrency(Number(emp.total_amount) || 0)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM ITEM MODAL ================= */}
      <Dialog open={showAddCustomModal} onOpenChange={setShowAddCustomModal}>
        <DialogContent className="rounded-2xl border border-border/80 bg-card/95 p-5 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Custom Line Item</DialogTitle>
            <DialogDescription className="text-xs">
              Add a bonus, stipend, or manual adjustment to this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold">Item Title *</label>
              <Input
                placeholder="e.g. Performance Bonus"
                value={newCustomTitle}
                onChange={(e) => setNewCustomTitle(e.target.value)}
                className="h-8 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold">Description (Optional)</label>
              <Input
                placeholder="e.g. Approved project stipend"
                value={newCustomDesc}
                onChange={(e) => setNewCustomDesc(e.target.value)}
                className="h-8 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold">Amount (BDT) *</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 2000"
                value={newCustomAmount}
                onChange={(e) => setNewCustomAmount(e.target.value)}
                className="h-8 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-1.5 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCustomModal(false)}
              className="h-7.5 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCustomItem}
              className="h-7.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= VIEW INVOICE DETAIL MODAL ================= */}
      <Dialog
        open={Boolean(viewingInvoiceId)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingInvoiceId(null);
            setViewingInvoice(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl border border-border/80 bg-card/95 p-5">
          <DialogHeader className="border-b border-border/50 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {viewingInvoice?.invoice.invoice_number || "Invoice Statement"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {viewingInvoice
                    ? `${viewingInvoice.invoice.employee_name} · ${formatMonthLabel(
                        String(viewingInvoice.invoice.invoice_month || "").slice(0, 7)
                      )}`
                    : "Loading..."}
                </DialogDescription>
              </div>
              <Badge className="h-5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                Sent
              </Badge>
            </div>
          </DialogHeader>

          {loadingInvoiceDetail ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
              Loading statement...
            </div>
          ) : !viewingInvoice ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Invoice details could not be loaded.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-border/60 p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Recipient</p>
                  <p className="font-bold truncate mt-0.5">{viewingInvoice.invoice.employee_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{viewingInvoice.invoice.employee_email}</p>
                </div>
                <div className="rounded-xl border border-border/60 p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Sent Date</p>
                  <p className="font-bold mt-0.5">{formatDateOnly(viewingInvoice.invoice.sent_at)}</p>
                  <p className="text-[10px] text-muted-foreground">Emailed to staff</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5">
                  <p className="text-[10px] uppercase text-primary font-bold">Total</p>
                  <p className="font-black text-foreground text-sm mt-0.5">
                    {formatCurrency((viewingInvoice.items || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{viewingInvoice.items.length} items</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/60 bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="p-2 font-bold">#</th>
                      <th className="p-2 font-bold">Code</th>
                      <th className="p-2 font-bold">Work Title</th>
                      <th className="p-2 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(viewingInvoice.items || []).map((item, index) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{index + 1}</td>
                        <td className="p-2 font-mono font-bold">{item.order_code || "Custom"}</td>
                        <td className="p-2">
                          <span className="font-semibold text-foreground">{item.title}</span>
                          {item.description && item.description !== "No additional details" && (
                            <p className="text-[10px] text-muted-foreground">{item.description}</p>
                          )}
                        </td>
                        <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(Number(item.amount) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingInvoice.invoice.notes && (
                <div className="rounded-xl border border-border/60 p-2.5 text-xs">
                  <p className="font-bold text-foreground mb-0.5">Notes</p>
                  <p className="text-muted-foreground">{viewingInvoice.invoice.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openInvoicePrintWindow(buildPrintableInvoiceFromDetail(viewingInvoice))}
                  className="h-8 rounded-xl text-xs font-bold"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print PDF
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    handleResendInvoice({
                      ...viewingInvoice.invoice,
                      item_count: viewingInvoice.items.length,
                      assignment_count: viewingInvoice.items.filter((i) => i.work_assignment_id).length,
                    })
                  }
                  className="h-8 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Resend Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}