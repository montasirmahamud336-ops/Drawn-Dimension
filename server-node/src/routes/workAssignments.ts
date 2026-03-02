import { Router } from "express";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;

const isMailConfigured = () =>
  Boolean(
    env.smtpHost &&
      env.smtpPort &&
      env.smtpUser &&
      env.smtpPass &&
      env.smtpFrom
  );

const getTransporter = () => {
  if (!isMailConfigured()) {
    throw new Error("SMTP is not configured");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });
  }

  return transporter;
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeEmail = (value: unknown) => normalizeText(value).toLowerCase();

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const getBrandLogoUrl = () => {
  const fromEnv = String(env.brandLogoUrl ?? "").trim();
  if (fromEnv) return fromEnv;
  return `${env.siteBaseUrl.replace(/\/+$/, "")}/images/logo.png`;
};

const buildEmployeeLoginLink = (email: string) => {
  const base = env.siteBaseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    email,
    next: "/employee/dashboard",
  });
  return `${base}/auth?${params.toString()}`;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

type AssignmentEmailPayload = {
  assignmentId: string;
  employeeName: string;
  employeeEmail: string;
  workTitle: string;
  workDetails: string;
  workDuration: string;
  revisionDueAt: string | null;
  paymentAmount: number;
  paymentStatus: "unpaid" | "paid";
};

const buildAssignmentEmailHtml = (payload: AssignmentEmailPayload) => {
  const logoUrl = getBrandLogoUrl();
  const safeName = escapeHtml(payload.employeeName || "Employee");
  const safeTitle = escapeHtml(payload.workTitle || "Assigned work");
  const safeDetails = escapeHtml(payload.workDetails || "No details provided.");
  const safeDuration = escapeHtml(payload.workDuration || "Not set");
  const safeRevision = escapeHtml(formatDateTime(payload.revisionDueAt));
  const safePayment = escapeHtml(`BDT ${formatCurrency(payload.paymentAmount)}`);
  const safePaymentStatus = escapeHtml(payload.paymentStatus.toUpperCase());
  const safeAssignmentId = escapeHtml(payload.assignmentId || "-");
  const loginLink = buildEmployeeLoginLink(payload.employeeEmail);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 20px; background: linear-gradient(120deg,#0f172a,#1e293b); color: #fff; text-align: center;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="56" height="56" style="display:block;margin:0 auto 10px;border-radius:10px;object-fit:cover;" />
        <h2 style="margin: 0; font-size: 22px;">New Work Assigned</h2>
      </div>
      <div style="padding: 22px;">
        <p style="margin: 0 0 12px; font-size: 15px;">Hi ${safeName},</p>
        <p style="margin: 0 0 16px; font-size: 15px;">A new task has been assigned to you in DrawnDimension.</p>
        <table style="width:100%; border-collapse:collapse; margin:0 0 16px;">
          <tr><td style="padding:8px 0; font-size:14px; color:#4b5563;">Assignment ID</td><td style="padding:8px 0; font-size:14px; font-weight:600; text-align:right;">${safeAssignmentId}</td></tr>
          <tr><td style="padding:8px 0; font-size:14px; color:#4b5563;">Title</td><td style="padding:8px 0; font-size:14px; font-weight:600; text-align:right;">${safeTitle}</td></tr>
          <tr><td style="padding:8px 0; font-size:14px; color:#4b5563;">Duration</td><td style="padding:8px 0; font-size:14px; font-weight:600; text-align:right;">${safeDuration}</td></tr>
          <tr><td style="padding:8px 0; font-size:14px; color:#4b5563;">Revision Deadline</td><td style="padding:8px 0; font-size:14px; font-weight:600; text-align:right;">${safeRevision}</td></tr>
          <tr><td style="padding:8px 0; font-size:14px; color:#4b5563;">Payment</td><td style="padding:8px 0; font-size:14px; font-weight:600; text-align:right;">${safePayment} (${safePaymentStatus})</td></tr>
        </table>
        <p style="margin: 0 0 16px; font-size: 14px; color: #334155;"><strong>Details:</strong><br/>${safeDetails}</p>
        <a href="${loginLink}" style="display:inline-block;padding:10px 16px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open Employee Dashboard</a>
      </div>
    </div>
  `;
};

const sendAssignmentEmail = async (payload: AssignmentEmailPayload) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: payload.employeeEmail,
    subject: `New work assigned: ${payload.workTitle}`,
    html: buildAssignmentEmailHtml(payload),
  });
};

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
    const createdAssignment = data?.[0] ?? payload;

    let emailNotificationSent = false;
    let emailNotificationError: string | null = null;

    try {
      const status = normalizeStatus(payload.status);
      const employeeEmail = normalizeEmail(payload.employee_email);
      if (status !== "draft" && employeeEmail) {
        await sendAssignmentEmail({
          assignmentId: normalizeText((createdAssignment as { id?: unknown })?.id),
          employeeName: normalizeText(payload.employee_name),
          employeeEmail,
          workTitle: normalizeText(payload.work_title),
          workDetails: normalizeText(payload.work_details),
          workDuration: normalizeText(payload.work_duration),
          revisionDueAt: normalizeText(payload.revision_due_at) || null,
          paymentAmount,
          paymentStatus: normalizePaymentStatus(payload.payment_status),
        });
        emailNotificationSent = true;
      }
    } catch (mailError: unknown) {
      emailNotificationError =
        mailError instanceof Error ? mailError.message : "Failed to send assignment email";
    }

    return res.status(201).json({
      ...createdAssignment,
      email_notification_sent: emailNotificationSent,
      email_notification_error: emailNotificationError,
    });
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
