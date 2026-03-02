import { FormEvent, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { EmployeeItem } from "./EmployeeForm";

export interface WorkAssignmentItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  work_title: string;
  work_details: string | null;
  work_duration: string;
  countdown_end_at: string | null;
  revision_due_at: string | null;
  payment_amount: number | string | null;
  payment_status: "unpaid" | "paid";
  status: "assigned" | "done" | "draft";
  employee_submission_status?: "pending" | "submitted";
  employee_submission_note?: string | null;
  employee_submission_file_url?: string | null;
  employee_submission_at?: string | null;
  created_at?: string;
}

interface WorkAssignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: WorkAssignmentItem | null;
  employees: EmployeeItem[];
  onSuccess: () => void;
}

type AssignDraft = {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  work_title: string;
  work_details: string;
  work_duration: string;
  revision_due_at: string;
  payment_amount: string;
  payment_status: "unpaid" | "paid";
};

const defaultDraft: AssignDraft = {
  employee_id: "",
  employee_name: "",
  employee_email: "",
  work_title: "",
  work_details: "",
  work_duration: "",
  revision_due_at: "",
  payment_amount: "",
  payment_status: "unpaid",
};

const DURATION_OPTIONS = Array.from({ length: 15 }, (_, index) => {
  const days = index + 1;
  return {
    value: String(days),
    label: `${days} Day${days > 1 ? "s" : ""}`,
  };
});

const PAYMENT_OPTIONS: Array<{ value: "unpaid" | "paid"; label: string }> = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

const normalizePaymentStatus = (value: unknown): "unpaid" | "paid" => {
  const status = String(value ?? "").trim().toLowerCase();
  return status === "paid" ? "paid" : "unpaid";
};

const parseDurationDays = (value: string | null | undefined): string => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/\d+/);
  if (!match) return "";
  const numeric = Number(match[0]);
  if (!Number.isFinite(numeric)) return "";
  const days = Math.max(1, Math.min(15, Math.trunc(numeric)));
  return String(days);
};

const toDateTimeInputValue = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toIsoDateTime = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parsePaymentAmount = (value: unknown): number | null => {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(2));
};

const toPaymentInputValue = (value: unknown): string => {
  const amount = parsePaymentAmount(value);
  if (amount === null) return "";
  const fixed = amount.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const formatPaymentPreview = (value: unknown): string => {
  const amount = parsePaymentAmount(value);
  if (amount === null) return "BDT 0.00";
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `BDT ${formatted}`;
};

const WorkAssignForm = ({ open, onOpenChange, assignment, employees, onSuccess }: WorkAssignFormProps) => {
  const [draft, setDraft] = useState<AssignDraft>(defaultDraft);
  const [saving, setSaving] = useState(false);
  const paymentPreview = useMemo(
    () => formatPaymentPreview(draft.payment_amount),
    [draft.payment_amount]
  );

  const employeeOptions = assignment && !employees.some((employee) => employee.id === assignment.employee_id)
    ? [
      ...employees,
      {
        id: assignment.employee_id,
        name: assignment.employee_name,
        profession: "Linked employee",
        email: assignment.employee_email,
        mobile: null,
        status: "live" as const,
      },
    ]
    : employees;

  useEffect(() => {
    if (!open) return;

    if (assignment) {
      setDraft({
        employee_id: assignment.employee_id ?? "",
        employee_name: assignment.employee_name ?? "",
        employee_email: assignment.employee_email ?? "",
        work_title: assignment.work_title ?? "",
        work_details: assignment.work_details ?? "",
        work_duration: parseDurationDays(assignment.work_duration),
        revision_due_at: toDateTimeInputValue(assignment.revision_due_at),
        payment_amount: toPaymentInputValue(assignment.payment_amount),
        payment_status: normalizePaymentStatus(assignment.payment_status),
      });
      return;
    }

    setDraft(defaultDraft);
  }, [open, assignment]);

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employeeOptions.find((item) => item.id === employeeId);
    if (!employee) return;

    setDraft((prev) => ({
      ...prev,
      employee_id: employee.id,
      employee_name: employee.name,
      employee_email: employee.email,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.employee_id || !draft.work_title.trim() || !draft.work_duration.trim()) {
      toast.error("Employee, work title, and duration are required");
      return;
    }

    const selectedDays = Number(draft.work_duration);
    if (!Number.isFinite(selectedDays) || selectedDays < 1 || selectedDays > 15) {
      toast.error("Please select a valid duration between 1 and 15 days");
      return;
    }

    const paymentAmount = parsePaymentAmount(draft.payment_amount);
    if (paymentAmount === null || paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than 0");
      return;
    }

    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setSaving(true);

    try {
      const apiBase = getApiBaseUrl();
      const url = assignment ? `${apiBase}/work-assignments/${assignment.id}` : `${apiBase}/work-assignments`;
      const method = assignment ? "PATCH" : "POST";
      const durationLabel = `${selectedDays} Day${selectedDays > 1 ? "s" : ""}`;

      const existingDurationDays = parseDurationDays(assignment?.work_duration);
      const shouldResetCountdown =
        !assignment ||
        !assignment.countdown_end_at ||
        existingDurationDays !== String(selectedDays);

      const countdownEndAt = shouldResetCountdown
        ? new Date(Date.now() + selectedDays * 24 * 60 * 60 * 1000).toISOString()
        : assignment.countdown_end_at;

      const payload = {
        employee_id: draft.employee_id,
        employee_name: draft.employee_name,
        employee_email: draft.employee_email,
        work_title: draft.work_title.trim(),
        work_details: draft.work_details.trim() || null,
        work_duration: durationLabel,
        countdown_end_at: countdownEndAt,
        revision_due_at: toIsoDateTime(draft.revision_due_at),
        payment_amount: paymentAmount,
        payment_status: draft.payment_status,
        status: assignment?.status || "assigned",
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let message = "Failed to save assignment";

        if (contentType.includes("application/json")) {
          const body = await response.json().catch(() => null);
          message = body?.message || message;
        } else {
          const text = await response.text().catch(() => "");
          if (text) message = text;
        }

        if (message.includes("countdown_end_at") && message.includes("does not exist")) {
          message = "Countdown column missing in database. Please run latest Supabase migration.";
        }
        if (message.includes("payment_amount") && message.includes("does not exist")) {
          message = "Payment amount column missing in database. Please run latest Supabase migration.";
        }

        throw new Error(message);
      }

      const responseBody = await response.json().catch(() => null);
      if (
        !assignment &&
        responseBody &&
        responseBody.email_notification_sent === false &&
        responseBody.email_notification_error
      ) {
        toast.warning(`Assignment saved, but email was not sent: ${responseBody.email_notification_error}`);
      }

      toast.success(assignment ? "Assignment updated" : "Work assigned");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit Assignment" : "Assign Work"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid gap-2">
            <Label>Employee</Label>
            <Select value={draft.employee_id} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} ({employee.profession})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assign-email">Employee Email</Label>
              <Input id="assign-email" value={draft.employee_email} readOnly />
            </div>
            <div className="grid gap-2">
              <Label>Work Duration</Label>
              <Select
                value={draft.work_duration}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, work_duration: value }))}
              >
                <SelectTrigger id="assign-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment</Label>
              <Select
                value={draft.payment_status}
                onValueChange={(value: "unpaid" | "paid") => setDraft((prev) => ({ ...prev, payment_status: value }))}
              >
                <SelectTrigger id="assign-payment">
                  <SelectValue placeholder="Select payment" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Countdown</Label>
              <Input value="Starts automatically after assign" readOnly />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-title">Work Title</Label>
            <Input
              id="assign-title"
              value={draft.work_title}
              onChange={(event) => setDraft((prev) => ({ ...prev, work_title: event.target.value }))}
              placeholder="Landing page redesign"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assign-revision">Revision Time</Label>
              <Input
                id="assign-revision"
                type="datetime-local"
                value={draft.revision_due_at}
                onChange={(event) => setDraft((prev) => ({ ...prev, revision_due_at: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assign-payment-amount">Payment Amount</Label>
              <Input
                id="assign-payment-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.payment_amount}
                onChange={(event) => setDraft((prev) => ({ ...prev, payment_amount: event.target.value }))}
                placeholder="e.g. 15000"
              />
              <p className="text-xs text-muted-foreground">Preview: {paymentPreview}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-details">Work Details</Label>
            <Textarea
              id="assign-details"
              rows={4}
              value={draft.work_details}
              onChange={(event) => setDraft((prev) => ({ ...prev, work_details: event.target.value }))}
              placeholder="Optional notes or specific requirements"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {assignment ? "Save Changes" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkAssignForm;
