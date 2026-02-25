import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ClipboardList, CheckCircle2, Archive, Edit, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import WorkAssignForm, { WorkAssignmentItem } from "./WorkAssignForm";
import { EmployeeItem } from "./EmployeeForm";

const readErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) {
      const message = String(body.message);
      if (message.includes("public.employees") || message.includes("Could not find the table")) {
        return "Employees table missing in database. Please run Supabase migration first.";
      }
      if (message.includes("countdown_end_at") && message.includes("does not exist")) {
        return "Countdown column missing in database. Please run latest Supabase migration.";
      }
      if (message.includes("payment_amount") && message.includes("does not exist")) {
        return "Payment amount column missing in database. Please run latest Supabase migration.";
      }
      return message;
    }
  }

  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const formatTimeRemaining = (
  endAt: string | null | undefined,
  status: WorkAssignmentItem["status"],
  nowMs: number
) => {
  if (status === "done") return "Done";
  if (!endAt) return "-";

  const targetMs = new Date(endAt).getTime();
  if (!Number.isFinite(targetMs)) return "-";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "Expired";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getTimeRemainingClass = (
  endAt: string | null | undefined,
  status: WorkAssignmentItem["status"],
  nowMs: number
) => {
  if (status === "done") return "text-green-600 font-medium";
  if (!endAt) return "text-muted-foreground";

  const targetMs = new Date(endAt).getTime();
  if (!Number.isFinite(targetMs)) return "text-muted-foreground";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "text-red-600 font-medium";
  if (diffMs <= 60 * 60 * 1000) return "text-amber-600 font-medium";
  return "text-foreground";
};

const getPaymentBadgeClass = (paymentStatus: WorkAssignmentItem["payment_status"]) => {
  return paymentStatus === "paid"
    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : "bg-rose-500/15 text-rose-600 border-rose-500/30";
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

const WorkAssignManager = () => {
  const [assignments, setAssignments] = useState<WorkAssignmentItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<"assigned" | "done" | "draft">("assigned");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignmentItem | null>(null);

  const apiBase = getApiBaseUrl();

  const fetchAssignments = async () => {
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

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch assignments");
        throw new Error(message);
      }

      const data = await response.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load work assignments");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiBase}/employees?status=live`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch employees");
        throw new Error(message);
      }

      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load employees for assignment");
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [activeTab]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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

      if (!response.ok) {
        throw new Error("Failed to move to draft");
      }

      toast.success("Assignment moved to drafts");
      fetchAssignments();
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

      if (!response.ok) {
        throw new Error("Failed to delete assignment");
      }

      toast.success("Assignment deleted");
      fetchAssignments();
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

      if (!response.ok) {
        throw new Error("Failed to restore");
      }

      toast.success("Assignment restored");
      fetchAssignments();
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

      if (!response.ok) {
        throw new Error("Failed to mark done");
      }

      toast.success("Marked as done");
      fetchAssignments();
    } catch (error) {
      console.error(error);
      toast.error("Could not mark done");
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const target =
      `${assignment.employee_name} ${assignment.employee_email} ${assignment.work_title} ${assignment.work_duration} ${assignment.payment_status} ${assignment.payment_amount ?? ""} ${assignment.countdown_end_at ?? ""}`.toLowerCase();
    return target.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Work Assign To</h2>
          <p className="text-muted-foreground">Assign work to employees and track revisions and completion.</p>
        </div>
        <Button
          onClick={() => {
            setEditingAssignment(null);
            setIsFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Assign
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "assigned" | "done" | "draft")} className="w-[500px]">
          <TabsList>
            <TabsTrigger value="assigned" className="gap-2"><ClipboardList className="w-4 h-4" /> Assigned</TabsTrigger>
            <TabsTrigger value="done" className="gap-2"><CheckCircle2 className="w-4 h-4" /> Done</TabsTrigger>
            <TabsTrigger value="draft" className="gap-2"><Archive className="w-4 h-4" /> Drafts</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            placeholder="Search assignments..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Work</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Time Remaining</TableHead>
              <TableHead>Revision Time</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Loading assignments...
                </TableCell>
              </TableRow>
            ) : filteredAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No assignments found in {activeTab}.
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments.map((assignment) => (
                <TableRow
                  key={assignment.id}
                  className={assignment.status === "done" ? "bg-green-500/10 hover:bg-green-500/15" : ""}
                >
                  <TableCell className="font-medium">{assignment.employee_name}</TableCell>
                  <TableCell>{assignment.employee_email}</TableCell>
                  <TableCell>{assignment.work_title}</TableCell>
                  <TableCell>{assignment.work_duration}</TableCell>
                  <TableCell className={getTimeRemainingClass(assignment.countdown_end_at, assignment.status, nowTick)}>
                    {formatTimeRemaining(assignment.countdown_end_at, assignment.status, nowTick)}
                  </TableCell>
                  <TableCell>
                    {assignment.revision_due_at
                      ? new Date(assignment.revision_due_at).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{formatPaymentAmount(assignment.payment_amount)}</p>
                      <Badge className={getPaymentBadgeClass(assignment.payment_status)}>
                        {assignment.payment_status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={assignment.status === "done"
                        ? "bg-green-500/15 text-green-600 border-green-500/30"
                        : assignment.status === "draft"
                          ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                          : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                      }
                    >
                      {assignment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setEditingAssignment(assignment);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {activeTab === "draft" ? (
                        <>
                          <Button
                            size="icon"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleRestore(assignment.id)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleHardDelete(assignment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {assignment.status !== "done" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleMarkDone(assignment.id)}
                            >
                              Done
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleSoftDelete(assignment)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WorkAssignForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        assignment={editingAssignment}
        employees={employees}
        onSuccess={() => {
          fetchAssignments();
          fetchEmployees();
        }}
      />
    </div>
  );
};

export default WorkAssignManager;
