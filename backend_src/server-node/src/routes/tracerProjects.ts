import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { deleteRow, insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

const router = Router();

type ProjectStatus = "pending" | "in-progress" | "completed";

const PROJECT_STATUSES = new Set<ProjectStatus>(["pending", "in-progress", "completed"]);

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeStatus = (value: unknown): ProjectStatus => {
  const status = normalizeText(value).toLowerCase();
  return PROJECT_STATUSES.has(status as ProjectStatus) ? status as ProjectStatus : "pending";
};

const normalizeAmount = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(2));
};

const normalizeDate = (value: unknown): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;
  const normalized = raw.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return normalized;
};

const isDuplicateError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("23505") || message.includes("duplicate key");
};

const buildProjectPatch = (source: Record<string, unknown>, requireBaseFields: boolean) => {
  const patch: Record<string, unknown> = {};

  if (requireBaseFields || "name" in source) {
    const name = normalizeText(source.name);
    if (!name) return { error: "Project name is required" as const };
    patch.name = name;
  }

  if (requireBaseFields || "client_name" in source) {
    const clientName = normalizeText(source.client_name);
    if (!clientName) return { error: "Client name is required" as const };
    patch.client_name = clientName;
  }

  if ("order_number" in source || requireBaseFields) {
    patch.order_number = normalizeText(source.order_number) || null;
  }

  if ("date" in source || requireBaseFields) {
    const date = normalizeDate(source.date);
    if (!date && requireBaseFields) return { error: "Project date is required" as const };
    if (date) patch.date = date;
  }

  if ("amount" in source || requireBaseFields) {
    const amount = normalizeAmount(source.amount);
    if (source.amount !== null && source.amount !== undefined && normalizeText(source.amount) && amount === null) {
      return { error: "Amount must be a valid non-negative number" as const };
    }
    patch.amount = amount;
  }

  if ("status" in source || requireBaseFields) {
    patch.status = normalizeStatus(source.status);
  }

  if ("description" in source || requireBaseFields) {
    patch.description = normalizeText(source.description) || null;
  }

  return { patch };
};

const getProjectById = async (id: string) => {
  const rows = await selectRows(
    `/project_tracer_projects?id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return Array.isArray(rows) ? rows[0] ?? null : null;
};

router.get("/tracer-projects", requireAuth, async (req, res) => {
  try {
    const status = normalizeText(req.query.status).toLowerCase();
    const filters: string[] = [];
    if (status && status !== "all") {
      filters.push(`status=eq.${encodeURIComponent(normalizeStatus(status))}`);
    }

    const query = filters.length
      ? `?${filters.join("&")}&order=date.desc,created_at.desc`
      : "?order=date.desc,created_at.desc";

    const data = await selectRows(`/project_tracer_projects${query}`);
    return res.json(Array.isArray(data) ? data : []);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch projects",
    });
  }
});

router.get("/tracer-projects/:id/assignments", requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const assignments = await selectRows(
      `/work_assignments?project_id=eq.${encodeURIComponent(req.params.id)}&order=created_at.desc`
    );
    const rows = Array.isArray(assignments) ? assignments : [];
    const employeeIds = Array.from(
      new Set(
        rows
          .map((row: any) => normalizeText(row?.employee_id))
          .filter(Boolean)
      )
    );

    let employeeMap = new Map<string, any>();
    if (employeeIds.length > 0) {
      const employees = await selectRows(
        `/employees?id=in.(${employeeIds.map((id) => encodeURIComponent(id)).join(",")})`
      );
      employeeMap = new Map(
        (Array.isArray(employees) ? employees : []).map((employee: any) => [
          normalizeText(employee?.id),
          employee,
        ])
      );
    }

    return res.json(
      rows.map((assignment: any) => {
        const employee = employeeMap.get(normalizeText(assignment?.employee_id));
        return {
          ...assignment,
          employee: employee
            ? {
              id: employee.id,
              name: employee.name,
              email: employee.email,
              profession: employee.profession,
            }
            : null,
          employee_display_name: normalizeText(employee?.name) || normalizeText(assignment?.employee_name),
        };
      })
    );
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch project assignments",
    });
  }
});

router.get("/tracer-projects/:id", requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    return res.json(project);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch project",
    });
  }
});

router.post("/tracer-projects", requireAuth, async (req, res) => {
  const { patch, error } = buildProjectPatch(req.body ?? {}, true);
  if (error) return res.status(400).json({ message: error });

  try {
    const data = await insertRow("/project_tracer_projects", patch);
    return res.status(201).json(Array.isArray(data) ? data[0] ?? patch : patch);
  } catch (e: unknown) {
    if (isDuplicateError(e)) {
      return res.status(409).json({ message: "Order number already exists" });
    }
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to create project",
    });
  }
});

const updateProject = async (req: Request, res: Response) => {
  const { patch, error } = buildProjectPatch(req.body ?? {}, false);
  if (error) return res.status(400).json({ message: error });
  if (!patch || Object.keys(patch).length === 0) {
    return res.status(400).json({ message: "No valid fields provided" });
  }

  try {
    const data = await updateRow(
      `/project_tracer_projects?id=eq.${encodeURIComponent(req.params.id)}`,
      patch
    );
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    return res.json(data[0]);
  } catch (e: unknown) {
    if (isDuplicateError(e)) {
      return res.status(409).json({ message: "Order number already exists" });
    }
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to update project",
    });
  }
};

router.put("/tracer-projects/:id", requireAuth, updateProject);
router.patch("/tracer-projects/:id", requireAuth, updateProject);

router.delete("/tracer-projects/:id", requireAuth, async (req, res) => {
  try {
    const existing = await getProjectById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }

    await deleteRow(`/project_tracer_projects?id=eq.${encodeURIComponent(req.params.id)}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete project",
    });
  }
});

export default router;
