import { Router } from "express";
import { selectRows, updateRow } from "../lib/supabaseRest.js";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";

const router = Router();

const normalizeEmail = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const normalizeOptionalText = (value: unknown, maxLength = 2000) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
};

const normalizeOptionalUrl = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return null;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const getLinkedEmployees = async (user: { id: string; email?: string | null }) => {
  const userEmail = normalizeEmail(user.email);

  const employeesById = await selectRows(
    `/employees?linked_user_id=eq.${encodeURIComponent(user.id)}&status=eq.live&order=created_at.desc`
  );

  let employees = Array.isArray(employeesById) ? employeesById : [];

  if (employees.length === 0 && userEmail) {
    const employeesByEmail = await selectRows(
      `/employees?linked_user_email=ilike.${encodeURIComponent(userEmail)}&status=eq.live&order=created_at.desc`
    );
    employees = Array.isArray(employeesByEmail) ? employeesByEmail : [];
  }

  if (employees.length === 0 && userEmail) {
    const directEmailMatch = await selectRows(
      `/employees?email=ilike.${encodeURIComponent(userEmail)}&status=eq.live&order=created_at.desc`
    );
    employees = Array.isArray(directEmailMatch) ? directEmailMatch : [];
  }

  return employees;
};

router.get("/employee/dashboard", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const employees = await getLinkedEmployees(user);

    if (employees.length === 0) {
      return res.json({ employee: null, assignments: [] });
    }

    const primaryEmployee = employees[0];
    const employeeIds = employees
      .map((employee: any) => String(employee?.id ?? "").trim())
      .filter((id: string) => id.length > 0);

    if (employeeIds.length === 0) {
      return res.json({ employee: primaryEmployee, assignments: [] });
    }

    const inClause = employeeIds.join(",");
    const assignments = await selectRows(
      `/work_assignments?employee_id=in.(${inClause})&status=neq.draft&order=created_at.desc`
    );

    return res.json({
      employee: primaryEmployee,
      assignments: Array.isArray(assignments) ? assignments : []
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load employee dashboard"
    });
  }
});

router.patch("/employee/profile", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const employees = await getLinkedEmployees(user);
    if (employees.length === 0) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const primaryEmployee = employees[0];
    const employeeId = String(primaryEmployee?.id ?? "").trim();
    if (!employeeId) {
      return res.status(400).json({ message: "Invalid employee profile" });
    }

    const patch: Record<string, unknown> = {};

    if ("mobile" in (req.body ?? {})) {
      patch.mobile = normalizeOptionalText(req.body?.mobile, 60);
    }

    if ("profile_image_url" in (req.body ?? {})) {
      const incoming = req.body?.profile_image_url;
      if (incoming === null || String(incoming).trim() === "") {
        patch.profile_image_url = null;
      } else {
        const normalizedUrl = normalizeOptionalUrl(incoming);
        if (!normalizedUrl) {
          return res.status(400).json({ message: "Profile image URL must be a valid http/https URL" });
        }
        patch.profile_image_url = normalizedUrl;
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No profile changes provided" });
    }

    const updated = await updateRow(`/employees?id=eq.${encodeURIComponent(employeeId)}`, patch);
    return res.json(updated?.[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update employee profile"
    });
  }
});

router.patch("/employee/work-assignments/:id/submit", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const assignmentId = String(req.params.id ?? "").trim();
    if (!assignmentId) {
      return res.status(400).json({ message: "Assignment id is required" });
    }

    const employees = await getLinkedEmployees(user);
    if (employees.length === 0) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const allowedEmployeeIds = new Set(
      employees
        .map((employee: any) => String(employee?.id ?? "").trim())
        .filter((id: string) => id.length > 0)
    );

    if (allowedEmployeeIds.size === 0) {
      return res.status(400).json({ message: "Invalid employee profile mapping" });
    }

    const rows = await selectRows(
      `/work_assignments?id=eq.${encodeURIComponent(assignmentId)}&limit=1`
    );
    const assignment = Array.isArray(rows) ? rows[0] : null;

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const assignmentEmployeeId = String(assignment?.employee_id ?? "").trim();
    if (!allowedEmployeeIds.has(assignmentEmployeeId)) {
      return res.status(403).json({ message: "You are not allowed to submit this assignment" });
    }

    const currentStatus = String(assignment?.status ?? "").toLowerCase();
    if (currentStatus === "done" || currentStatus === "draft") {
      return res.status(400).json({ message: "This assignment can no longer be submitted" });
    }

    const submissionNote = normalizeOptionalText(req.body?.submission_note, 5000);
    const submissionFileUrl = normalizeOptionalUrl(req.body?.submission_file_url);

    if (!submissionNote && !submissionFileUrl) {
      return res.status(400).json({ message: "Add a submission note or delivery link before submitting" });
    }

    const patch = {
      employee_submission_status: "submitted",
      employee_submission_note: submissionNote,
      employee_submission_file_url: submissionFileUrl,
      employee_submission_at: new Date().toISOString(),
    };

    const updated = await updateRow(`/work_assignments?id=eq.${encodeURIComponent(assignmentId)}`, patch);
    return res.json(updated?.[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to submit assignment"
    });
  }
});

export default router;
