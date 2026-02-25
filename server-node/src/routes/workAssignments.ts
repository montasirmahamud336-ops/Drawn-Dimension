import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest.js";

const router = Router();

const normalizeStatus = (value: unknown) => {
  const status = String(value ?? "assigned").toLowerCase();
  if (status === "done") return "done";
  if (status === "draft") return "draft";
  if (status === "all") return "all";
  return "assigned";
};

const normalizePaymentStatus = (value: unknown) => {
  const status = String(value ?? "unpaid").toLowerCase();
  if (status === "paid") return "paid";
  return "unpaid";
};

const normalizePaymentAmount = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(2));
};

const parseDurationDays = (value: unknown): number | null => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/\d+/);
  if (!match) return null;
  const numeric = Number(match[0]);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(1, Math.min(15, Math.trunc(numeric)));
};

const buildCountdownEndAt = (days: number) => {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
};

router.get("/work-assignments", requireAuth, async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status);
    const employeeId = String(req.query.employeeId ?? "").trim();
    const filters: string[] = [];

    if (status !== "all") {
      filters.push(`status=eq.${encodeURIComponent(status)}`);
    }

    if (employeeId) {
      filters.push(`employee_id=eq.${encodeURIComponent(employeeId)}`);
    }

    const query = filters.length
      ? `?${filters.join("&")}&order=created_at.desc`
      : "?order=created_at.desc";

    const data = await selectRows(`/work_assignments${query}`);
    return res.json(data ?? []);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch assignments"
    });
  }
});

router.post("/work-assignments", requireAuth, async (req, res) => {
  try {
    const parsedDays = parseDurationDays(req.body?.work_duration);
    const countdownEndAt = req.body?.countdown_end_at ?? (parsedDays ? buildCountdownEndAt(parsedDays) : null);
    const paymentAmount = normalizePaymentAmount(req.body?.payment_amount);

    if (paymentAmount === null || paymentAmount <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0"
      });
    }

    const payload = {
      employee_id: req.body?.employee_id,
      employee_name: req.body?.employee_name,
      employee_email: req.body?.employee_email,
      work_title: req.body?.work_title,
      work_details: req.body?.work_details ?? null,
      work_duration: req.body?.work_duration,
      countdown_end_at: countdownEndAt,
      revision_due_at: req.body?.revision_due_at ?? null,
      payment_amount: paymentAmount,
      payment_status: normalizePaymentStatus(req.body?.payment_status),
      status: normalizeStatus(req.body?.status)
    };

    const data = await insertRow("/work_assignments", payload);
    return res.status(201).json(data?.[0] ?? payload);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create assignment"
    });
  }
});

router.patch("/work-assignments/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const patch: Record<string, unknown> = { ...(req.body ?? {}) };

    if ("status" in patch) {
      patch.status = normalizeStatus(patch.status);
    }

    if ("payment_status" in patch) {
      patch.payment_status = normalizePaymentStatus(patch.payment_status);
    }

    if ("payment_amount" in patch) {
      const paymentAmount = normalizePaymentAmount(patch.payment_amount);
      if (paymentAmount === null || paymentAmount <= 0) {
        return res.status(400).json({
          message: "Payment amount must be greater than 0"
        });
      }
      patch.payment_amount = paymentAmount;
    }

    if ("work_duration" in patch && !("countdown_end_at" in patch)) {
      const parsedDays = parseDurationDays(patch.work_duration);
      if (parsedDays) {
        patch.countdown_end_at = buildCountdownEndAt(parsedDays);
      }
    }

    const data = await updateRow(`/work_assignments?id=eq.${encodeURIComponent(id)}`, patch);
    return res.json(data?.[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update assignment"
    });
  }
});

router.delete("/work-assignments/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteRow(`/work_assignments?id=eq.${encodeURIComponent(id)}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete assignment"
    });
  }
});

export default router;
