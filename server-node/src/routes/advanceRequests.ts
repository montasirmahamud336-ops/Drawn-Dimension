import { Router } from "express";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/database.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;
const text = (value: unknown) => String(value ?? "").trim();
const money = (value: unknown) => {
  const amount = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : null;
};
const getLinkedEmployee = async (user: { id: string; email?: string | null }) => {
  const byId = await selectRows(`/employees?linked_user_id=eq.${encodeURIComponent(user.id)}&status=eq.live&limit=1`);
  if (Array.isArray(byId) && byId[0]) return byId[0];
  const email = text(user.email).toLowerCase();
  const byEmail = email ? await selectRows(`/employees?email=ilike.${encodeURIComponent(email)}&status=eq.live&limit=1`) : [];
  return Array.isArray(byEmail) ? byEmail[0] ?? null : null;
};
const mailAdmin = async (request: Record<string, unknown>) => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.officialNotificationEmail) return false;
  transporter ??= nodemailer.createTransport({ host: env.smtpHost, port: env.smtpPort, secure: env.smtpSecure, auth: { user: env.smtpUser, pass: env.smtpPass } });
  await transporter.sendMail({ from: env.smtpFrom, to: env.officialNotificationEmail, subject: `Advance request: ${text(request.employee_name)}`, text: `${text(request.employee_name)} requested BDT ${text(request.amount)} advance.\n\nReason: ${text(request.reason)}\n\nReview it in CMS > Advance Requests.` });
  return true;
};

router.post("/employee/advance-requests", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const employee = req.user ? await getLinkedEmployee(req.user) : null;
    if (!employee) return res.status(404).json({ message: "No employee profile linked to this account" });
    const amount = money(req.body?.amount);
    const reason = text(req.body?.reason);
    if (!amount) return res.status(400).json({ message: "Enter a valid advance amount" });
    if (!reason || reason.split(/\s+/).filter(Boolean).length > 100) return res.status(400).json({ message: "Reason is required and must be within 100 words" });
    const payload = { employee_id: employee.id, employee_name: text(employee.name), employee_email: text(employee.email) || null, amount, reason, status: "pending" };
    const created = (await insertRow("/employee_advance_requests", payload))?.[0] ?? payload;
    let email_notification_sent = false;
    try { email_notification_sent = await mailAdmin(created as Record<string, unknown>); } catch { /* request remains recorded even if mail fails */ }
    return res.status(201).json({ ...created, email_notification_sent });
  } catch (error: unknown) { return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create advance request" }); }
});

router.get("/advance-requests", requireAuth, async (_req, res) => {
  try { return res.json((await selectRows("/employee_advance_requests?order=requested_at.desc")) ?? []); }
  catch (error: unknown) { return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch advance requests" }); }
});
router.get("/advance-requests/pending-count", requireAuth, async (_req, res) => {
  try { const rows = await selectRows("/employee_advance_requests?status=eq.pending&select=id"); return res.json({ count: Array.isArray(rows) ? rows.length : 0 }); }
  catch { return res.json({ count: 0 }); }
});
router.patch("/advance-requests/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const status = text(req.body?.status).toLowerCase();
    const validStatuses = ["approved", "rejected", "repaid", "settled", "pending", "paid"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status option. Choose approved, rejected, repaid, or paid." });
    }
    const patch = {
      status,
      admin_note: text(req.body?.admin_note) || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.admin?.fullName || req.admin?.username || "Admin"
    };
    const updated = await updateRow(`/employee_advance_requests?id=eq.${encodeURIComponent(req.params.id)}`, patch);
    if (!updated?.[0]) return res.status(404).json({ message: "Advance request not found" });
    return res.json(updated[0]);
  } catch (error: unknown) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to review advance request" });
  }
});

router.delete("/advance-requests/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const deleted = await deleteRow(`/employee_advance_requests?id=eq.${encodeURIComponent(req.params.id)}`);
    return res.json({ message: "Advance request deleted successfully", deleted });
  } catch (error: unknown) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete advance request" });
  }
});

export default router;
