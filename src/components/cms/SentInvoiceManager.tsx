import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { openInvoicePrintWindow, type PrintableInvoice } from "./invoicePrint";

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

type InvoiceCustomItem = {
  id: string;
  title: string;
  description: string;
  amount: string;
};

type DraftInvoiceSnapshot = {
  printableItems: PrintableInvoice["items"];
  apiItems: Array<
    | { work_assignment_id: string }
    | { title: string; description: string | null; amount: number }
  >;
  totalAmount: number;
  invalidCustomItems: number[];
};

const getDefaultMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const createCustomItem = (): InvoiceCustomItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "",
  description: "",
  amount: "",
});

const parseMoney = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(2));
};

const formatCurrency = (value: number) =>
  `BDT ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const formatMonthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
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
        return "Invoice migration is missing. Please run the latest Supabase migration first.";
      }
      if (message.includes("employee_invoices") || message.includes("employee_invoice_line_items")) {
        return "Invoice tables are missing in the database. Please run the latest Supabase migration first.";
      }
      return message;
    }
  }

  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const getDefaultSelectedAssignmentIds = (employee: InvoiceSourceEmployee | null) => {
  if (!employee) return [] as string[];
  return employee.assignments
    .filter((assignment) => !assignment.already_invoiced)
    .map((assignment) => assignment.id);
};

const buildDraftSnapshot = (
  employee: InvoiceSourceEmployee | null,
  selectedAssignmentIds: string[],
  customItems: InvoiceCustomItem[]
): DraftInvoiceSnapshot => {
  const printableItems: PrintableInvoice["items"] = [];
  const apiItems: DraftInvoiceSnapshot["apiItems"] = [];
  const invalidCustomItems: number[] = [];
  let totalAmount = 0;

  if (employee) {
    employee.assignments.forEach((assignment) => {
      if (!selectedAssignmentIds.includes(assignment.id)) return;

      printableItems.push({
        orderCode: assignment.order_code,
        title: assignment.work_title,
        description: null,
        amount: assignment.payment_amount,
      });
      apiItems.push({ work_assignment_id: assignment.id });
      totalAmount += assignment.payment_amount;
    });
  }

  customItems.forEach((item, index) => {
    const hasAnyValue = item.title.trim() || item.description.trim() || item.amount.trim();
    if (!hasAnyValue) return;

    const title = item.title.trim();
    const amount = parseMoney(item.amount);
    if (!title || amount === null || amount <= 0) {
      invalidCustomItems.push(index + 1);
      return;
    }

    printableItems.push({
      orderCode: null,
      title,
      description: item.description.trim() || null,
      amount,
    });
    apiItems.push({
      title,
      description: item.description.trim() || null,
      amount,
    });
    totalAmount += amount;
  });

  return {
    printableItems,
    apiItems,
    totalAmount,
    invalidCustomItems,
  };
};

const buildPrintableInvoiceFromDetail = (detail: SentInvoiceDetail): PrintableInvoice => ({
  invoiceNumber: detail.invoice.invoice_number,
  monthLabel: formatMonthLabel(String(detail.invoice.invoice_month).slice(0, 7)),
  employeeName: detail.invoice.employee_name,
  employeeEmail: detail.invoice.employee_email,
  sentAt: detail.invoice.sent_at,
  totalAmount: detail.items.reduce((sum, item) => sum + item.amount, 0),
  notes: detail.invoice.notes ?? null,
  items: detail.items.map((item) => ({
    orderCode: item.order_code,
    title: item.title,
    description: item.item_type === "custom" ? normalizeInvoiceItemDescription(item.description) : null,
    amount: item.amount,
  })),
});

const SentInvoiceManager = () => {
  const apiBase = getApiBaseUrl();
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue);
  const [monthLabel, setMonthLabel] = useState(formatMonthLabel(getDefaultMonthValue()));
  const [employees, setEmployees] = useState<InvoiceSourceEmployee[]>([]);
  const [sentInvoices, setSentInvoices] = useState<SentInvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<InvoiceCustomItem[]>([]);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<SentInvoiceDetail | null>(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const [resendingInvoiceId, setResendingInvoiceId] = useState<string | null>(null);

  const filteredEmployees = employees.filter((employee) => {
    const target = `${employee.employee_name} ${employee.employee_email} ${employee.profession ?? ""}`.toLowerCase();
    return target.includes(search.toLowerCase());
  });

  const selectedEmployee = employees.find((employee) => employee.employee_id === selectedEmployeeId) ?? null;
  const draftSnapshot = buildDraftSnapshot(selectedEmployee, selectedAssignmentIds, customItems);

  const stats = employees.reduce(
    (summary, employee) => {
      summary.assignmentCount += employee.assignment_count;
      summary.totalAmount += employee.total_amount;
      return summary;
    },
    { assignmentCount: 0, totalAmount: 0 }
  );

  const resetDraftForEmployee = (employee: InvoiceSourceEmployee | null) => {
    setSelectedAssignmentIds(getDefaultSelectedAssignmentIds(employee));
    setCustomItems([]);
    setNotes("");
  };

  const loadSource = async (
    month: string,
    preferredEmployeeId = selectedEmployeeId,
    resetDraft = true
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
        throw new Error(await readErrorMessage(response, "Failed to load invoice source"));
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
        nextEmployees.some((employee) => employee.employee_id === preferredEmployeeId)
          ? preferredEmployeeId
          : nextEmployees[0]?.employee_id ?? "";

      setSelectedEmployeeId(nextEmployeeId);

      if (resetDraft || nextEmployeeId !== preferredEmployeeId) {
        const nextEmployee = nextEmployees.find((employee) => employee.employee_id === nextEmployeeId) ?? null;
        resetDraftForEmployee(nextEmployee);
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load invoice source");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    void loadSource(selectedMonth, selectedEmployeeId, true);
  }, [selectedMonth]);

  const handleSelectEmployee = (employee: InvoiceSourceEmployee) => {
    setSelectedEmployeeId(employee.employee_id);
    resetDraftForEmployee(employee);
  };

  const handleToggleAssignment = (assignmentId: string, checked: boolean) => {
    setSelectedAssignmentIds((current) => {
      if (checked) {
        if (current.includes(assignmentId)) return current;
        return [...current, assignmentId];
      }
      return current.filter((item) => item !== assignmentId);
    });
  };

  const handleCustomItemChange = (itemId: string, patch: Partial<InvoiceCustomItem>) => {
    setCustomItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  };

  const handleDownloadDraft = () => {
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    if (draftSnapshot.invalidCustomItems.length > 0) {
      toast.error(`Please fix custom item ${draftSnapshot.invalidCustomItems.join(", ")}`);
      return;
    }
    if (draftSnapshot.printableItems.length === 0) {
      toast.error("Select at least one assignment or add one custom item");
      return;
    }

    try {
      openInvoicePrintWindow({
        invoiceNumber: `DRAFT-${selectedMonth.replace("-", "")}-${selectedEmployee.employee_name.replace(/\s+/g, "-").toUpperCase()}`,
        monthLabel,
        employeeName: selectedEmployee.employee_name,
        employeeEmail: selectedEmployee.employee_email,
        sentAt: new Date().toISOString(),
        totalAmount: draftSnapshot.totalAmount,
        notes: notes.trim() || null,
        items: draftSnapshot.printableItems,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not open invoice print window");
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
    if (draftSnapshot.invalidCustomItems.length > 0) {
      toast.error(`Please fix custom item ${draftSnapshot.invalidCustomItems.join(", ")}`);
      return;
    }
    if (draftSnapshot.apiItems.length === 0) {
      toast.error("Select at least one assignment or add one custom item");
      return;
    }

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
          notes: notes.trim() || null,
          items: draftSnapshot.apiItems,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to send invoice"));
      }

      const data = await response.json();
      const printableInvoice: PrintableInvoice = {
        invoiceNumber: String(data?.invoice?.invoice_number || ""),
        monthLabel: String(data?.month_label || monthLabel),
        employeeName: selectedEmployee.employee_name,
        employeeEmail: selectedEmployee.employee_email,
        sentAt: String(data?.invoice?.sent_at || new Date().toISOString()),
        totalAmount: parseMoney(data?.invoice?.total_amount) ?? draftSnapshot.totalAmount,
        notes: notes.trim() || null,
        items: draftSnapshot.printableItems,
      };

      toast.success(`Invoice sent to ${selectedEmployee.employee_email}`);
      try {
        openInvoicePrintWindow(printableInvoice);
      } catch (error: unknown) {
        toast.info(error instanceof Error ? error.message : "Invoice sent. Popup could not be opened for printing.");
      }

      await loadSource(selectedMonth, selectedEmployee.employee_id, true);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    } finally {
      setSending(false);
    }
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
      toast.error(error instanceof Error ? error.message : "Could not open invoice print window");
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
    if (!confirm(`Resend ${invoice.invoice_number} to ${invoice.employee_email}?`)) return;

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

      toast.success(`Invoice resent to ${invoice.employee_email}`);
      await loadSource(selectedMonth, selectedEmployeeId, false);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to resend invoice");
    } finally {
      setResendingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sent Invoice</h2>
          <p className="text-muted-foreground">
            Review completed monthly work, remove or add line items, then email invoices to employees.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid gap-2">
            <label htmlFor="invoice-month" className="text-sm font-medium">
              Invoice Month
            </label>
            <Input
              id="invoice-month"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="min-w-[220px]"
            />
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={() => loadSource(selectedMonth, selectedEmployeeId, false)}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardDescription>Employees With Completed Work</CardDescription>
            <CardTitle>{employees.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardDescription>Completed Work Items</CardDescription>
            <CardTitle>{stats.assignmentCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Month-wise delivered work ready for invoice.</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardDescription>Total Amount Tracked</CardDescription>
            <CardTitle>{formatCurrency(stats.totalAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{sentInvoices.length} invoices already sent in this month.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border-border/60 bg-card/65">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-xl">Employee Work List</CardTitle>
              <CardDescription>Choose an employee to build the invoice draft.</CardDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading invoice source...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                No completed employee work found for {monthLabel}.
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const isActive = selectedEmployeeId === employee.employee_id;
                const alreadyInvoicedCount = employee.assignments.filter((assignment) => assignment.already_invoiced).length;

                return (
                  <button
                    key={employee.employee_id}
                    type="button"
                    onClick={() => handleSelectEmployee(employee)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-primary/45 bg-primary/10 shadow-[0_14px_30px_rgba(239,68,68,0.12)]"
                        : "border-border/60 bg-background/50 hover:border-primary/30 hover:bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">{employee.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{employee.employee_email}</p>
                        {employee.profession ? (
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                            {employee.profession}
                          </p>
                        ) : null}
                      </div>
                      {isActive ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary">{employee.assignment_count} works</Badge>
                      <Badge variant="outline">{formatCurrency(employee.total_amount)}</Badge>
                      {alreadyInvoicedCount > 0 ? (
                        <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700">
                          {alreadyInvoicedCount} already invoiced
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-xl">Invoice Builder</CardTitle>
              <CardDescription>
                {selectedEmployee
                  ? `${selectedEmployee.employee_name} · ${monthLabel}`
                  : "Select an employee from the left to start the invoice."}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={handleDownloadDraft} disabled={!selectedEmployee}>
                <Printer className="h-4 w-4" />
                Download / Print
              </Button>
              <Button type="button" className="gap-2" onClick={handleSendInvoice} disabled={!selectedEmployee || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Invoice
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!selectedEmployee ? (
              <div className="rounded-2xl border border-dashed border-border/60 px-6 py-16 text-center text-sm text-muted-foreground">
                Pick an employee to see month-wise completed work and prepare the invoice.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{selectedEmployee.employee_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedEmployee.employee_email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedEmployee.assignments.length} completed works</Badge>
                      <Badge variant="outline">{formatCurrency(selectedEmployee.total_amount)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">Completed Work Items</h3>
                      <p className="text-sm text-muted-foreground">
                        Uncheck any work you do not want to include in this month&apos;s invoice.
                      </p>
                    </div>
                    <Badge variant="outline">{selectedAssignmentIds.length} selected</Badge>
                  </div>

                  <div className="space-y-3">
                    {selectedEmployee.assignments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                        No completed assignments found for this employee in {monthLabel}.
                      </div>
                    ) : (
                      selectedEmployee.assignments.map((assignment) => (
                        <label
                          key={assignment.id}
                          className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ${
                            selectedAssignmentIds.includes(assignment.id)
                              ? "border-primary/35 bg-primary/5"
                              : "border-border/60 bg-background/35 hover:bg-background/60"
                          }`}
                        >
                          <Checkbox
                            checked={selectedAssignmentIds.includes(assignment.id)}
                            onCheckedChange={(checked) => handleToggleAssignment(assignment.id, checked === true)}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="font-medium text-foreground">{assignment.work_title}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                                  {assignment.order_code || "Custom order"} · Completed {formatDateTime(assignment.completed_at)}
                                </p>
                                {assignment.work_details ? (
                                  <p className="mt-2 text-sm text-muted-foreground">{assignment.work_details}</p>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-foreground">{formatCurrency(assignment.payment_amount)}</p>
                                <Badge
                                  className={
                                    assignment.payment_status === "paid"
                                      ? "mt-2 border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
                                      : "mt-2 border-rose-500/30 bg-rose-500/15 text-rose-700"
                                  }
                                >
                                  {assignment.payment_status}
                                </Badge>
                              </div>
                            </div>

                            {assignment.already_invoiced ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {assignment.existing_invoice_numbers.map((invoiceNumber) => (
                                  <Badge key={invoiceNumber} className="border-amber-500/30 bg-amber-500/15 text-amber-700">
                                    Included in {invoiceNumber}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/60 bg-background/35 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">Custom Items</h3>
                      <p className="text-sm text-muted-foreground">
                        Add any extra billable item that is not part of the completed assignment list.
                      </p>
                    </div>
                    <Button type="button" variant="outline" className="gap-2" onClick={() => setCustomItems((current) => [...current, createCustomItem()])}>
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  {customItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                      No custom item added yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customItems.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">Custom item {index + 1}</p>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setCustomItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                            <Input
                              value={item.title}
                              onChange={(event) => handleCustomItemChange(item.id, { title: event.target.value })}
                              placeholder="Extra work title"
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(event) => handleCustomItemChange(item.id, { amount: event.target.value })}
                              placeholder="Amount"
                            />
                          </div>

                          <Textarea
                            value={item.description}
                            onChange={(event) => handleCustomItemChange(item.id, { description: event.target.value })}
                            placeholder="Optional details"
                            rows={3}
                            className="mt-3"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="invoice-notes" className="text-sm font-medium">
                    Notes
                  </label>
                  <Textarea
                    id="invoice-notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional message, payment note, or summary for this invoice..."
                  />
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Invoice Summary</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{draftSnapshot.printableItems.length} items ready</Badge>
                        {draftSnapshot.invalidCustomItems.length > 0 ? (
                          <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700">
                            Fix custom item {draftSnapshot.invalidCustomItems.join(", ")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(draftSnapshot.totalAmount)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl">Sent Invoice History</CardTitle>
            <CardDescription>Invoices already sent for {monthLabel}.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : sentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No invoices have been sent for {monthLabel} yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">{String(invoice.invoice_month).slice(0, 7)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{invoice.employee_name}</p>
                          <p className="text-xs text-muted-foreground">{invoice.employee_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{invoice.item_count} items</p>
                          <p className="text-xs text-muted-foreground">{invoice.assignment_count} linked works</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{formatDateTime(invoice.sent_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="icon" variant="outline" onClick={() => handleViewInvoice(invoice.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => handlePrintSentInvoice(invoice.id)}
                            disabled={printingInvoiceId === invoice.id}
                          >
                            {printingInvoiceId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => handleResendInvoice(invoice)}
                            disabled={resendingInvoiceId === invoice.id}
                          >
                            {resendingInvoiceId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(viewingInvoiceId)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingInvoiceId(null);
            setViewingInvoice(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingInvoice?.invoice.invoice_number || "Invoice Details"}</DialogTitle>
            <DialogDescription>
              {viewingInvoice
                ? `${viewingInvoice.invoice.employee_name} · ${formatMonthLabel(String(viewingInvoice.invoice.invoice_month).slice(0, 7))}`
                : "Invoice details"}
            </DialogDescription>
          </DialogHeader>

          {loadingInvoiceDetail ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading invoice details...
            </div>
          ) : !viewingInvoice ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Invoice details could not be loaded.</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/60 bg-background/40">
                  <CardHeader className="pb-3">
                    <CardDescription>Employee</CardDescription>
                    <CardTitle className="text-lg">{viewingInvoice.invoice.employee_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{viewingInvoice.invoice.employee_email}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-background/40">
                  <CardHeader className="pb-3">
                    <CardDescription>Sent At</CardDescription>
                    <CardTitle className="text-lg">{formatDateTime(viewingInvoice.invoice.sent_at)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Last emailed {formatDateTime(viewingInvoice.invoice.emailed_at)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-background/40">
                  <CardHeader className="pb-3">
                    <CardDescription>Total</CardDescription>
                    <CardTitle className="text-lg">
                      {formatCurrency(viewingInvoice.items.reduce((sum, item) => sum + item.amount, 0))}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{viewingInvoice.items.length} line items</p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingInvoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.order_code || "Custom"}</TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{item.item_type === "custom" ? normalizeInvoiceItemDescription(item.description) || "-" : "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {viewingInvoice.invoice.notes ? (
                <Card className="border-border/60 bg-background/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{viewingInvoice.invoice.notes}</p>
                  </CardContent>
                </Card>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => openInvoicePrintWindow(buildPrintableInvoiceFromDetail(viewingInvoice))}
                >
                  <Printer className="h-4 w-4" />
                  Download / Print
                </Button>
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() =>
                    handleResendInvoice({
                      ...viewingInvoice.invoice,
                      item_count: viewingInvoice.items.length,
                      assignment_count: viewingInvoice.items.filter((item) => item.work_assignment_id).length,
                    })
                  }
                >
                  <Mail className="h-4 w-4" />
                  Resend
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SentInvoiceManager;
