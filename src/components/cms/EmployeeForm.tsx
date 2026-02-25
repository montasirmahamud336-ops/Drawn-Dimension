import { FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

export interface EmployeeItem {
  id: string;
  name: string;
  profession: string;
  email: string;
  mobile: string | null;
  status: "live" | "draft";
  created_at?: string;
}

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeItem | null;
  onSuccess: () => void;
}

type EmployeeDraft = {
  name: string;
  profession: string;
  email: string;
  mobile: string;
  login_password: string;
};

const defaultDraft: EmployeeDraft = {
  name: "",
  profession: "",
  email: "",
  mobile: "",
  login_password: "",
};

const EmployeeForm = ({ open, onOpenChange, employee, onSuccess }: EmployeeFormProps) => {
  const [draft, setDraft] = useState<EmployeeDraft>(defaultDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (employee) {
      setDraft({
        name: employee.name ?? "",
        profession: employee.profession ?? "",
        email: employee.email ?? "",
        mobile: employee.mobile ?? "",
        login_password: "",
      });
      return;
    }

    setDraft(defaultDraft);
  }, [open, employee]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = draft.name.trim();
    const profession = draft.profession.trim();
    const email = draft.email.trim();
    const loginPassword = draft.login_password.trim();

    if (!name || !profession || !email) {
      toast.error("Name, profession, and email are required");
      return;
    }

    if (!employee && loginPassword.length < 6) {
      toast.error("Password is required (minimum 6 characters)");
      return;
    }

    if (employee && loginPassword.length > 0 && loginPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
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
      const url = employee ? `${apiBase}/employees/${employee.id}` : `${apiBase}/employees`;
      const method = employee ? "PATCH" : "POST";

      const payload = {
        name,
        profession,
        email,
        mobile: draft.mobile.trim() || null,
        login_password: loginPassword || null,
        status: employee?.status || "live",
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
        let message = "Failed to save employee";

        if (contentType.includes("application/json")) {
          const body = await response.json().catch(() => null);
          message = body?.message || message;
        } else {
          const text = await response.text().catch(() => "");
          if (text) message = text;
        }

        throw new Error(message);
      }

      const body = await response.json().catch(() => null);

      if (!employee && body?.email_notification_sent === false) {
        toast.warning("Employee created, but welcome email could not be sent.");
      } else {
        toast.success(employee ? "Employee updated" : "Employee created");
      }

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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="employee-name">Name</Label>
            <Input
              id="employee-name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Employee name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee-profession">Profession</Label>
            <Input
              id="employee-profession"
              value={draft.profession}
              onChange={(event) => setDraft((prev) => ({ ...prev, profession: event.target.value }))}
              placeholder="Designer / Engineer / ..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee-email">Email</Label>
            <Input
              id="employee-email"
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="name@company.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee-mobile">Mobile</Label>
            <Input
              id="employee-mobile"
              value={draft.mobile}
              onChange={(event) => setDraft((prev) => ({ ...prev, mobile: event.target.value }))}
              placeholder="+880..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee-login-password">
              {employee ? "Login Password (optional)" : "Login Password"}
            </Label>
            <Input
              id="employee-login-password"
              type="password"
              value={draft.login_password}
              onChange={(event) => setDraft((prev) => ({ ...prev, login_password: event.target.value }))}
              placeholder={employee ? "Leave blank to keep current password" : "Minimum 6 characters"}
            />
            {employee && (
              <p className="text-xs text-muted-foreground">
                Leave it empty if you do not want to change this employee's login password.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {employee ? "Save Changes" : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeForm;
