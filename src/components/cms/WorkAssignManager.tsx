import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ClipboardList,
  CheckCircle2,
  Archive,
  Edit,
  Trash2,
  RotateCcw,
  Clock,
  AlertCircle,
  Check,
  Loader2,
  Calendar,
  Eye,
  Copy,
  ExternalLink,
  DollarSign,
  FileText,
  ArrowLeft,
  ArrowRight,
  User,
  Wallet,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { clearAdminToken, getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import WaveLoading from "@/components/shared/WaveLoading";
import WorkAssignForm, { WorkAssignmentItem } from "./WorkAssignForm";
import { EmployeeItem } from "./EmployeeForm";

const readErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) {
      const message = String(body.message);
      if (message.includes("public.employees") || message.includes("Could not find the table")) {
        return "Employees table missing in database. Please run migrations first.";
      }
      if (message.includes("countdown_end_at") && message.includes("does not exist")) {
        return "Countdown column missing in database. Please run migrations.";
      }
      if (message.includes("payment_amount") && message.includes("does not exist")) {
        return "Payment amount column missing in database. Please run migrations.";
      }
      if (message.includes("order_code") && message.includes("does not exist")) {
        return "Order code column missing in database. Please run migrations.";
      }
      return message;
    }
  }

  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const getInitials = (name?: string | null) => {
  if (!name) return "EM";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EM";
  if (parts.length === 1) return (parts[0].slice(0, 2) || "EM").toUpperCase();
  return ((parts[0][0] || "") + (parts[1][0] || "")).toUpperCase() || "EM";
};

const formatTimeRemaining = (
  endAt: string | null | undefined,
  status: WorkAssignmentItem["status"],
  nowMs: number
) => {
  if (status === "done") return "Done";
  if (!endAt) return "-";

  const targetMs = new Date(endAt).getTime();
  if (!Number.isFinite(targetMs) || targetMs === 0) return "-";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "Expired";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getTimeRemainingBadge = (
  endAt: string | null | undefined,
  status: WorkAssignmentItem["status"],
  nowMs: number
) => {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Done
      </span>
    );
  }
  if (!endAt) return <span className="text-xs text-muted-foreground">-</span>;

  const targetMs = new Date(endAt).getTime();
  if (!Number.isFinite(targetMs) || targetMs === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-3 w-3" /> Expired
      </span>
    );
  }
  if (diffMs <= 24 * 60 * 60 * 1000) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3" /> {formatTimeRemaining(endAt, status, nowMs)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
      <Clock className="h-3 w-3 text-muted-foreground" /> {formatTimeRemaining(endAt, status, nowMs)}
    </span>
  );
};

const parsePaymentAmount = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
};

const formatPaymentAmount = (value: unknown): string => {
  const amount = parsePaymentAmount(value);
  if (amount === null) return "BDT 0.00";
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `BDT ${formatted}`;
};

const formatOrderCode = (assignment?: Pick<WorkAssignmentItem, "id" | "order_code"> | null): string => {
  if (!assignment) return "-";
  const directOrderCode = String(assignment.order_code ?? "").trim().toUpperCase();
  if (directOrderCode) return directOrderCode;

  const sanitized = String(assignment.id ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  if (!sanitized) return "-";
  return `ORD-${sanitized.slice(0, 8)}`;
};

const formatAssignedDateTime = (value: string | null | undefined) => {
  if (!value) return { dateStr: "-", timeStr: "-", full: "-" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { dateStr: "-", timeStr: "-", full: "-" };

  const dateStr = date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timeStr = date.toLocaleTimeString("en-BD", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const full = `${dateStr}, ${timeStr}`;
  return { dateStr, timeStr, full };
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthOptions = () => {
  const options: Array<{ value: string; label: string }> = [
    { value: "all", label: "All Months / All Time" },
  ];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({
      value: ym,
      label: i === 0 ? `This Month (${label})` : label,
    });
  }
  return options;
};

const handleAdminUnauthorized = () => {
  clearAdminToken();
  toast.error("Session expired. Please login again.");
  window.location.replace("/database/login?switch=1");
};

export default function WorkAssignManager() {
  const [assignments, setAssignments] = useState<WorkAssignmentItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<"assigned" | "done" | "draft">("assigned");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignmentItem | null>(null);
  const [detailsAssignment, setDetailsAssignment] = useState<WorkAssignmentItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  // Done Tab specific states
  const [selectedDoneEmployeeId, setSelectedDoneEmployeeId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentYearMonth());

  const apiBase = getApiBaseUrl();
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const fetchAssignments = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/work-assignments?status=${activeTab}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch assignments");
        throw new Error(message);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setAssignments(list);

      // Keep detailsAssignment in sync if currently viewing one
      if (detailsAssignment) {
        const updated = list.find((item: WorkAssignmentItem) => item.id === detailsAssignment.id);
        if (updated) setDetailsAssignment(updated);
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load work assignments");
    } finally {
      setLoading(false);
    }
  }, [activeTab, apiBase, detailsAssignment]);

  const fetchEmployees = useCallback(async () => {
    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiBase}/employees?status=live`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch employees");
        throw new Error(message);
      }

      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load employees for assignment");
    }
  }, [apiBase]);

  useEffect(() => {
    void fetchAssignments();
  }, [activeTab]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // 1-Click Toggle Paid / Unpaid
  const handleTogglePaymentStatus = async (assignment: WorkAssignmentItem) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    const currentStatus = assignment.payment_status;
    const nextStatus: "paid" | "unpaid" = currentStatus === "paid" ? "unpaid" : "paid";

    // Optimistic UI update
    setAssignments((prev) =>
      prev.map((item) => (item.id === assignment.id ? { ...item, payment_status: nextStatus } : item))
    );

    if (detailsAssignment?.id === assignment.id) {
      setDetailsAssignment((prev) => (prev ? { ...prev, payment_status: nextStatus } : null));
    }

    setUpdatingPaymentId(assignment.id);
    try {
      const response = await fetch(`${apiBase}/work-assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_status: nextStatus }),
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update payment status");
      }

      toast.success(
        nextStatus === "paid"
          ? `Marked as Paid (${formatOrderCode(assignment)})`
          : `Marked as Unpaid (${formatOrderCode(assignment)})`
      );
    } catch (error: unknown) {
      console.error(error);
      toast.error("Could not update payment status");
      // Rollback on failure
      setAssignments((prev) =>
        prev.map((item) => (item.id === assignment.id ? { ...item, payment_status: currentStatus } : item))
      );
      if (detailsAssignment?.id === assignment.id) {
        setDetailsAssignment((prev) => (prev ? { ...prev, payment_status: currentStatus } : null));
      }
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleSoftDelete = async (assignment: WorkAssignmentItem) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (!confirm("Move this assignment to Drafts?")) return;

    try {
      const response = await fetch(`${apiBase}/work-assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "draft" }),
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to move to draft");
      }

      toast.success("Assignment moved to drafts");
      setIsDetailsOpen(false);
      void fetchAssignments();
    } catch (error) {
      console.error(error);
      toast.error("Operation failed");
    }
  };

  const handleHardDelete = async (assignmentId: string) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (!confirm("Permanently delete this assignment?")) return;

    try {
      const response = await fetch(`${apiBase}/work-assignments/${assignmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete assignment");
      }

      toast.success("Assignment permanently deleted");
      setIsDetailsOpen(false);
      void fetchAssignments();
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    }
  };

  const handleRestore = async (assignmentId: string) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/work-assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "assigned" }),
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to restore");
      }

      toast.success("Assignment restored to active list");
      setIsDetailsOpen(false);
      void fetchAssignments();
    } catch (error) {
      console.error(error);
      toast.error("Restore failed");
    }
  };

  const handleMarkDone = async (assignmentId: string) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/work-assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "done" }),
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to mark done");
      }

      toast.success("Marked as done");
      setIsDetailsOpen(false);
      void fetchAssignments();
    } catch (error) {
      console.error(error);
      toast.error("Could not mark done");
    }
  };

  const handleOpenDetails = (assignment: WorkAssignmentItem) => {
    setDetailsAssignment(assignment);
    setIsDetailsOpen(true);
  };

  // Filter assignments by search query
  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((assignment) => {
      if (!assignment) return false;
      const name = String(assignment.employee_name || "").toLowerCase();
      const code = formatOrderCode(assignment).toLowerCase();
      const title = String(assignment.work_title || "").toLowerCase();
      const duration = String(assignment.work_duration || "").toLowerCase();
      const pStatus = String(assignment.payment_status || "").toLowerCase();
      const pAmount = String(assignment.payment_amount ?? "").toLowerCase();
      const query = (search || "").toLowerCase().trim();

      if (!query) return true;
      return (
        name.includes(query) ||
        code.includes(query) ||
        title.includes(query) ||
        duration.includes(query) ||
        pStatus.includes(query) ||
        pAmount.includes(query)
      );
    });
  }, [assignments, search]);

  const totalValue = useMemo(() => {
    return filteredAssignments.reduce((sum, a) => sum + (parsePaymentAmount(a.payment_amount) ?? 0), 0);
  }, [filteredAssignments]);

  // ================= DONE TAB: EMPLOYEE GROUPING & METRICS =================
  const doneEmployeeGroups = useMemo(() => {
    if (activeTab !== "done") return [];

    // Filter assignments by selected month
    const monthFilteredAssignments = (assignments || []).filter((assignment) => {
      if (!assignment) return false;
      if (selectedMonth === "all") return true;

      const dateStr = assignment.created_at || assignment.countdown_end_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return false;

      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return ym === selectedMonth;
    });

    // Group by employee_id or normalized employee email
    const map = new Map<string, {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      profession: string;
      profileImageUrl: string | null;
      tasksCount: number;
      totalAmount: number;
      paidAmount: number;
      unpaidAmount: number;
      assignments: WorkAssignmentItem[];
    }>();

    // Map existing live employees for profile details
    const employeeProfileMap = new Map<string, EmployeeItem & { profile_image_url?: string | null }>();
    employees.forEach((emp) => {
      if (emp.id) employeeProfileMap.set(emp.id, emp as EmployeeItem & { profile_image_url?: string | null });
      if (emp.email) employeeProfileMap.set(emp.email.toLowerCase(), emp as EmployeeItem & { profile_image_url?: string | null });
    });

    monthFilteredAssignments.forEach((assignment) => {
      const empId = assignment.employee_id || assignment.employee_email || "unknown";
      const profile = employeeProfileMap.get(assignment.employee_id) || employeeProfileMap.get((assignment.employee_email || "").toLowerCase());

      const existing = map.get(empId) || {
        employeeId: assignment.employee_id || empId,
        employeeName: assignment.employee_name || profile?.name || "Unknown Employee",
        employeeEmail: assignment.employee_email || profile?.email || "",
        profession: profile?.profession || "Team Member",
        profileImageUrl: profile?.profile_image_url || null,
        tasksCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        assignments: [],
      };

      const amt = parsePaymentAmount(assignment.payment_amount) ?? 0;
      existing.tasksCount += 1;
      existing.totalAmount += amt;
      if (assignment.payment_status === "paid") {
        existing.paidAmount += amt;
      } else {
        existing.unpaidAmount += amt;
      }
      existing.assignments.push(assignment);

      map.set(empId, existing);
    });

    const list = Array.from(map.values());

    // Apply search filter if active
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((emp) =>
      emp.employeeName.toLowerCase().includes(q) ||
      emp.employeeEmail.toLowerCase().includes(q) ||
      emp.profession.toLowerCase().includes(q)
    );
  }, [activeTab, assignments, selectedMonth, employees, search]);

  // Selected employee's done assignments for drill-down view
  const selectedDoneEmployee = useMemo(() => {
    if (!selectedDoneEmployeeId) return null;
    return doneEmployeeGroups.find(
      (emp) => emp.employeeId === selectedDoneEmployeeId || emp.employeeEmail.toLowerCase() === selectedDoneEmployeeId.toLowerCase()
    ) || null;
  }, [doneEmployeeGroups, selectedDoneEmployeeId]);

  return (
    <div className="space-y-4 pb-8">
      {/* ================= COMPACT HEADER BAR ================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Work Assignments</h1>
            <p className="text-xs text-muted-foreground">Assign work to team members, track countdowns, revisions, and deliveries</p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingAssignment(null);
            setIsFormOpen(true);
          }}
          className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Assign New Work
        </Button>
      </div>

      {/* ================= TABS & SEARCH BAR ================= */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Modern Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => {
              setActiveTab("assigned");
              setSelectedDoneEmployeeId(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "assigned"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Assigned
            {activeTab === "assigned" && assignments.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {assignments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("done");
              setSelectedDoneEmployeeId(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "done"
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done
            {activeTab === "done" && assignments.length > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {assignments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("draft");
              setSelectedDoneEmployeeId(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "draft"
                ? "bg-background text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            Drafts
            {activeTab === "draft" && assignments.length > 0 && (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {assignments.length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Month Filter / Total Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "done" && (
            <div className="w-48">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8.5 rounded-xl border-border/70 bg-background/80 text-xs font-medium focus:border-primary">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8.5 rounded-xl border-border/70 bg-background/80 pl-8 text-xs focus:border-primary"
              placeholder={activeTab === "done" && !selectedDoneEmployeeId ? "Search employee name, email..." : "Search assignments..."}
            />
          </div>

          <Badge variant="outline" className="hidden sm:inline-flex h-8.5 rounded-xl border-border/70 px-3 text-xs font-bold bg-background/80">
            Total: <span className="ml-1 text-emerald-600 dark:text-emerald-400">{formatPaymentAmount(totalValue)}</span>
          </Badge>
        </div>
      </div>

      {/* ================= VIEW SWITCHER ================= */}
      {activeTab === "done" && !selectedDoneEmployeeId ? (
        /* ================= DONE TAB: EMPLOYEE CARDS DIRECTORY ================= */
        <div className="space-y-4">
          {/* Section Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Completed Works Directory & Payouts
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select an employee below to view their individual completed assignments, details, and manage payment statuses.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-7 rounded-lg border-border/70 bg-background/80 px-2.5 text-xs font-bold">
                {doneEmployeeGroups.length} Team Member{doneEmployeeGroups.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline" className="h-7 rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Total: {formatPaymentAmount(doneEmployeeGroups.reduce((s, e) => s + e.totalAmount, 0))}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
              <WaveLoading text="Loading completed work records..." />
            </div>
          ) : doneEmployeeGroups.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/60 py-16 text-center text-xs text-muted-foreground backdrop-blur-xl">
              <CheckCircle2 className="mx-auto mb-2 h-9 w-9 text-muted-foreground/30" />
              <p className="font-bold text-foreground text-sm">No completed works found for the selected period.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedMonth !== "all" ? "Try selecting 'All Months / All Time' in the dropdown above." : "Completed assignments will appear grouped by employee here."}
              </p>
              {selectedMonth !== "all" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedMonth("all")}
                  className="mt-3 h-8 rounded-xl text-xs font-bold"
                >
                  View All Months
                </Button>
              )}
            </div>
          ) : (
            /* Employee Grid */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doneEmployeeGroups.map((group) => {
                const initials = getInitials(group.employeeName);
                const hasUnpaid = group.unpaidAmount > 0;

                return (
                  <div
                    key={group.employeeId}
                    onClick={() => setSelectedDoneEmployeeId(group.employeeId)}
                    className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card/90 hover:shadow-md"
                  >
                    <div>
                      {/* Employee Top Profile Row */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary shadow-xs ring-1 ring-primary/20">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {group.employeeName}
                            </h3>
                            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {group.tasksCount} Work{group.tasksCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {group.profession}
                          </p>
                          {group.employeeEmail && (
                            <p className="truncate text-[10px] text-muted-foreground/80 font-mono">
                              {group.employeeEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Financial Card Breakdown */}
                      <div className="mt-3.5 space-y-2 rounded-xl border border-border/50 bg-muted/30 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Payout:</span>
                          <span className="font-bold text-foreground">{formatPaymentAmount(group.totalAmount)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Paid:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              {formatPaymentAmount(group.paidAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Unpaid:</span>
                            <span className={`font-bold text-xs ${hasUnpaid ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                              {formatPaymentAmount(group.unpaidAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                      <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        View Completed Works
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "done" && selectedDoneEmployee ? (
        /* ================= DONE TAB: DRILL-DOWN INTO SINGLE EMPLOYEE ================= */
        <div className="space-y-4">
          {/* Top Banner with Back Button & Employee Info */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDoneEmployeeId(null)}
                className="h-9 rounded-xl border-border/70 text-xs font-bold"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Employees
              </Button>

              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary shadow-xs">
                  {getInitials(selectedDoneEmployee.employeeName)}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {selectedDoneEmployee.employeeName}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDoneEmployee.profession} • {selectedDoneEmployee.employeeEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Summary Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="h-7 rounded-lg border-border/70 bg-background/80 px-2.5 text-xs font-bold">
                {selectedDoneEmployee.tasksCount} Works Done
              </Badge>
              <Badge variant="outline" className="h-7 rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Paid: {formatPaymentAmount(selectedDoneEmployee.paidAmount)}
              </Badge>
              {selectedDoneEmployee.unpaidAmount > 0 && (
                <Badge variant="outline" className="h-7 rounded-lg border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  Unpaid: {formatPaymentAmount(selectedDoneEmployee.unpaidAmount)}
                </Badge>
              )}
            </div>
          </div>

          {/* Table of that Employee's Done Works */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Work Title</TableHead>
                  <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Date & Time</TableHead>
                  <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Duration</TableHead>
                  <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payment Amount</TableHead>
                  <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payment Status</TableHead>
                  <TableHead className="py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {selectedDoneEmployee.assignments.map((assignment) => {
                  const isPaid = assignment.payment_status === "paid";
                  const isUpdatingThis = updatingPaymentId === assignment.id;
                  const assignedTime = formatAssignedDateTime(assignment.created_at);

                  return (
                    <TableRow
                      key={assignment.id}
                      onClick={() => handleOpenDetails(assignment)}
                      className="group cursor-pointer transition-colors hover:bg-muted/40"
                      title="Click to view full details"
                    >
                      {/* Work Title */}
                      <TableCell className="py-3">
                        <div className="max-w-[240px] min-w-[140px]">
                          <p className="truncate text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {assignment.work_title || "Untitled Work"}
                          </p>
                          {assignment.work_details && (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {assignment.work_details}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Assigned Date & Time */}
                      <TableCell className="py-3 whitespace-nowrap">
                        {assignment.created_at ? (
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-foreground">
                              {assignedTime.dateStr}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {assignedTime.timeStr}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {assignment.work_duration || "-"}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      </TableCell>

                      {/* Payment Amount */}
                      <TableCell className="py-3 whitespace-nowrap">
                        <p className="text-xs font-bold text-foreground">
                          {formatPaymentAmount(assignment.payment_amount)}
                        </p>
                      </TableCell>

                      {/* 1-Click Interactive Payment Status Toggle Button */}
                      <TableCell className="py-3 whitespace-nowrap">
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => void handleTogglePaymentStatus(assignment)}
                            disabled={isUpdatingThis}
                            title={isPaid ? "Click to mark as Unpaid" : "Click to mark as Paid"}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                              isPaid
                                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500/50"
                                : "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25 hover:border-rose-500/50"
                            }`}
                          >
                            {isUpdatingThis ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isPaid ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            )}
                            <span className="capitalize">{assignment.payment_status || "unpaid"}</span>
                          </button>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenDetails(assignment)}
                            className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="View Full Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingAssignment(assignment);
                              setIsFormOpen(true);
                            }}
                            className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Assignment"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => void handleRestore(assignment.id)}
                            className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                            title="Re-open / Restore to Active"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => void handleSoftDelete(assignment)}
                            className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            title="Move to Drafts"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* ================= ASSIGNED & DRAFT TABS: STREAMLINED TABLE ================= */
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40">
                <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Work Title</TableHead>
                <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Date & Time</TableHead>
                <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Duration</TableHead>
                <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Timeline / Timer</TableHead>
                <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payment Amount</TableHead>
                <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Work Status</TableHead>
                <TableHead className="py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-xs text-muted-foreground">
                    <WaveLoading text="Loading work assignments..." />
                  </TableCell>
                </TableRow>
              ) : filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    No assignments found in <strong className="text-foreground">{activeTab}</strong>.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => {
                  const initials = getInitials(assignment.employee_name);
                  const isDone = assignment.status === "done";
                  const assignedTime = formatAssignedDateTime(assignment.created_at);

                  return (
                    <TableRow
                      key={assignment.id}
                      onClick={() => handleOpenDetails(assignment)}
                      className="group cursor-pointer transition-colors hover:bg-muted/40"
                      title="Click to view full details"
                    >
                      {/* Employee Profile */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary shadow-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">
                              {assignment.employee_name || "Unknown"}
                            </p>
                            {assignment.employee_email && (
                              <p className="truncate text-[10px] text-muted-foreground">
                                {assignment.employee_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Work Title */}
                      <TableCell className="py-3">
                        <div className="max-w-[220px] min-w-[140px]">
                          <p className="truncate text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {assignment.work_title || "Untitled Work"}
                          </p>
                          {assignment.work_details && (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {assignment.work_details}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Assigned Date & Time */}
                      <TableCell className="py-3 whitespace-nowrap">
                        {assignment.created_at ? (
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-foreground">
                              {assignedTime.dateStr}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {assignedTime.timeStr}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {assignment.work_duration || "-"}
                        </span>
                      </TableCell>

                      {/* Timeline / Countdown */}
                      <TableCell className="py-3 whitespace-nowrap">
                        {getTimeRemainingBadge(assignment.countdown_end_at, assignment.status, nowTick)}
                      </TableCell>

                      {/* Payment Amount */}
                      <TableCell className="py-3 whitespace-nowrap">
                        <p className="text-xs font-bold text-foreground">
                          {formatPaymentAmount(assignment.payment_amount)}
                        </p>
                      </TableCell>

                      {/* Work Status Badge */}
                      <TableCell className="py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`h-5 rounded-md text-[10px] font-bold ${
                            isDone
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : assignment.status === "draft"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : assignment.employee_submission_status === "submitted"
                                  ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                  : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {isDone
                            ? "Done"
                            : assignment.status === "draft"
                              ? "Draft"
                              : assignment.employee_submission_status === "submitted"
                                ? "Submitted"
                                : "Assigned"}
                        </Badge>
                        {assignment.employee_submission_at && !isDone && (
                          <p className="mt-0.5 text-[9px] text-muted-foreground">
                            {formatDateTime(assignment.employee_submission_at)}
                          </p>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Quick View Details Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenDetails(assignment)}
                            className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="View Full Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Edit Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingAssignment(assignment);
                              setIsFormOpen(true);
                            }}
                            className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Assignment Details"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          {activeTab === "draft" ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => void handleRestore(assignment.id)}
                                className="h-7.5 w-7.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                title="Restore to Active"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => void handleHardDelete(assignment.id)}
                                className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                title="Delete Permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!isDone && (
                                <Button
                                  size="sm"
                                  onClick={() => void handleMarkDone(assignment.id)}
                                  className="h-7 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700"
                                >
                                  <Check className="mr-1 h-3 w-3 stroke-[3]" /> Done
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => void handleSoftDelete(assignment)}
                                className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                title="Move to Drafts"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ================= FULL DETAILS DIALOG ================= */}
      <WorkAssignmentDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        assignment={detailsAssignment}
        nowTick={nowTick}
        updatingPaymentId={updatingPaymentId}
        onTogglePayment={handleTogglePaymentStatus}
        onEdit={(assignment) => {
          setIsDetailsOpen(false);
          setEditingAssignment(assignment);
          setIsFormOpen(true);
        }}
        onMarkDone={handleMarkDone}
        onRestore={handleRestore}
        onSoftDelete={handleSoftDelete}
        onHardDelete={handleHardDelete}
      />

      {/* ================= ASSIGN/EDIT FORM DIALOG ================= */}
      <WorkAssignForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        assignment={editingAssignment}
        employees={employees}
        onSuccess={() => {
          void fetchAssignments();
          void fetchEmployees();
        }}
      />
    </div>
  );
}

interface WorkAssignmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: WorkAssignmentItem | null;
  nowTick: number;
  updatingPaymentId: string | null;
  onTogglePayment: (assignment: WorkAssignmentItem) => void;
  onEdit: (assignment: WorkAssignmentItem) => void;
  onMarkDone: (id: string) => void;
  onRestore: (id: string) => void;
  onSoftDelete: (assignment: WorkAssignmentItem) => void;
  onHardDelete: (id: string) => void;
}

function WorkAssignmentDetailsDialog({
  open,
  onOpenChange,
  assignment,
  nowTick,
  updatingPaymentId,
  onTogglePayment,
  onEdit,
  onMarkDone,
  onRestore,
  onSoftDelete,
  onHardDelete,
}: WorkAssignmentDetailsDialogProps) {
  if (!assignment) return null;

  const isDone = assignment.status === "done";
  const isDraft = assignment.status === "draft";
  const isPaid = assignment.payment_status === "paid";
  const isUpdatingPayment = updatingPaymentId === assignment.id;
  const orderCode = formatOrderCode(assignment);
  const initials = getInitials(assignment.employee_name);
  const assignedDateTime = formatAssignedDateTime(assignment.created_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2.5 py-0.5 font-mono text-xs font-bold text-foreground shadow-xs">
                  {orderCode}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(orderCode);
                    toast.success("Order Code copied!");
                  }}
                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                  title="Copy Order Code"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Badge
                  variant="outline"
                  className={`h-5 rounded-md text-[10px] font-bold ${
                    isDone
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : isDraft
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : assignment.employee_submission_status === "submitted"
                          ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                          : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {isDone
                    ? "Done"
                    : isDraft
                      ? "Draft"
                      : assignment.employee_submission_status === "submitted"
                        ? "Submitted"
                        : "Assigned"}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {assignment.work_title || "Untitled Assignment"}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-4">
          {/* Employee & Payment Summary Card */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Employee Info */}
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary shadow-xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned Employee</p>
                <p className="truncate text-sm font-bold text-foreground">
                  {assignment.employee_name || "Unknown"}
                </p>
                {assignment.employee_email && (
                  <a
                    href={`mailto:${assignment.employee_email}`}
                    className="truncate text-xs text-muted-foreground hover:text-primary transition-colors block"
                  >
                    {assignment.employee_email}
                  </a>
                )}
              </div>
            </div>

            {/* Payment Info with 1-Click Toggle */}
            <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" /> Payment Amount & Status
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-base font-extrabold text-foreground">
                  {formatPaymentAmount(assignment.payment_amount)}
                </p>
                <button
                  type="button"
                  onClick={() => onTogglePayment(assignment)}
                  disabled={isUpdatingPayment}
                  title={isPaid ? "Click to toggle to Unpaid" : "Click to toggle to Paid"}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                    isPaid
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500/50"
                      : "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25 hover:border-rose-500/50"
                  }`}
                >
                  {isUpdatingPayment ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isPaid ? (
                    <Check className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  )}
                  <span className="capitalize">{assignment.payment_status || "unpaid"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Schedule & Timing Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-xl border border-border/60 bg-muted/20 p-3.5">
            {/* Assigned Date & Time */}
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" /> Assigned Date & Time
              </p>
              <p className="text-xs font-bold text-foreground">
                {assignedDateTime.dateStr}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {assignedDateTime.timeStr}
              </p>
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Duration
              </p>
              <p className="text-xs font-bold text-foreground">
                {assignment.work_duration || "Not specified"}
              </p>
            </div>

            {/* Countdown / Due Timeline */}
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Timeline / Timer
              </p>
              <div>
                {getTimeRemainingBadge(assignment.countdown_end_at, assignment.status, nowTick)}
              </div>
              {assignment.countdown_end_at && (
                <p className="text-[10px] text-muted-foreground">
                  Due: {formatDateTime(assignment.countdown_end_at)}
                </p>
              )}
            </div>

            {/* Revision Due Date if set */}
            {assignment.revision_due_at && (
              <div className="space-y-1 col-span-2 sm:col-span-3 pt-2 border-t border-border/40">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <RotateCcw className="h-3 w-3 text-amber-500" /> Revision Due Date
                </p>
                <p className="text-xs font-bold text-foreground">
                  {formatDateTime(assignment.revision_due_at)}
                </p>
              </div>
            )}
          </div>

          {/* Work Description / Details */}
          <div className="space-y-1.5">
            <p className="flex items-center gap-1 text-xs font-bold text-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" /> Work Details & Instructions
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {assignment.work_details?.trim() || "No detailed instructions provided for this assignment."}
            </div>
          </div>

          {/* Employee Submission Section (if submitted) */}
          {assignment.employee_submission_status === "submitted" && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                  <CheckCircle2 className="h-4 w-4" /> Employee Submission Delivered
                </span>
                {assignment.employee_submission_at && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {formatDateTime(assignment.employee_submission_at)}
                  </span>
                )}
              </div>

              {assignment.employee_submission_note && (
                <div className="rounded-lg bg-background/80 p-3 border border-border/50 text-xs text-foreground/90 whitespace-pre-wrap">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Employee Note:</p>
                  {assignment.employee_submission_note}
                </div>
              )}

              {assignment.employee_submission_file_url && (
                <div className="pt-1">
                  <a
                    href={assignment.employee_submission_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Submitted Files / Links
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="border-t border-border/60 bg-muted/30 px-6 py-3 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            {isDraft ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRestore(assignment.id)}
                  className="h-8 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 text-xs font-bold"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onHardDelete(assignment.id)}
                  className="h-8 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </>
            ) : (
              <>
                {!isDone && (
                  <Button
                    size="sm"
                    onClick={() => onMarkDone(assignment.id)}
                    className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5 stroke-[3]" /> Mark as Done
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSoftDelete(assignment)}
                  className="h-8 rounded-xl border-border/70 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 text-xs font-bold"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Move to Draft
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(assignment)}
              className="h-8 rounded-xl border-border/70 text-xs font-bold"
            >
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Assignment
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
