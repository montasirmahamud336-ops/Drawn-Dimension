import { Router } from "express";
import { selectRows } from "../lib/supabaseRest.js";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";

const router = Router();

const normalizeEmail = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

router.get("/employee/dashboard", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

export default router;
