import { Router } from "express";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest.js";
import { isNonEmptyString } from "../utils/validation.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;

type FormMessageStatus = "unread" | "read" | "archived" | "all";

const normalizeText = (value: unknown, maxLength: number) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, maxLength);
};

const normalizeEmail = (value: unknown) => normalizeText(value, 254).toLowerCase();

const normalizeStatus = (value: unknown): FormMessageStatus => {
  const status = String(value ?? "unread").trim().toLowerCase();
  if (status === "read") return "read";
  if (status === "archived") return "archived";
  if (status === "all") return "all";
  return "unread";
};

const isMailConfigured = () =>
  Boolean(
    env.smtpHost &&
      env.smtpPort &&
      env.smtpUser &&
      env.smtpPass &&
      env.smtpFrom &&
      env.contactFormNotificationEmail
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
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
};

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

const buildContactFormNotificationHtml = (payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  details: string;
  sourcePage: string;
  createdAt: string;
}) => {
  const logoUrl = getBrandLogoUrl();
  const safeName = escapeHtml(`${payload.firstName} ${payload.lastName}`.trim());
  const safeEmail = escapeHtml(payload.email);
  const safePhone = escapeHtml(payload.phone || "-");
  const safeService = escapeHtml(payload.service);
  const safeDetails = escapeHtml(payload.details);
  const safeSourcePage = escapeHtml(payload.sourcePage || "/contact");
  const safeCreatedAt = escapeHtml(new Date(payload.createdAt).toLocaleString());

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 18px 20px; background: #111827; color: #fff; display: flex; align-items: center; gap: 12px;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="40" height="40" style="display:block;border-radius:8px;object-fit:cover;" />
        <div>
          <div style="font-size: 16px; font-weight: 700;">DrawnDimension</div>
          <div style="font-size: 12px; opacity: 0.85;">New Contact Form Message</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Phone:</strong> ${safePhone}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Service:</strong> ${safeService}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Page:</strong> ${safeSourcePage}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Time:</strong> ${safeCreatedAt}</p>
        <p style="margin: 10px 0 0; font-size: 15px;"><strong>Message:</strong></p>
        <div style="margin-top: 8px; padding: 12px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; white-space: pre-wrap;">${safeDetails}</div>
      </div>
    </div>
  `;
};

const sendContactFormNotification = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  details: string;
  sourcePage: string;
  createdAt: string;
}) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: env.contactFormNotificationEmail,
    subject: `New Contact Message: ${payload.email}`,
    html: buildContactFormNotificationHtml(payload),
  });
};

router.post("/form-messages", async (req, res) => {
  try {
    const firstName = normalizeText(req.body?.firstName, 120);
    const lastName = normalizeText(req.body?.lastName, 120);
    const email = normalizeEmail(req.body?.email);
    const phone = normalizeText(req.body?.phone, 80);
    const service = normalizeText(req.body?.service, 200);
    const details = normalizeText(req.body?.details, 8000);
    const sourcePage = normalizeText(req.body?.sourcePage, 120) || "/contact";

    if (
      !isNonEmptyString(firstName) ||
      !isNonEmptyString(lastName) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(service) ||
      !isNonEmptyString(details)
    ) {
      return res.status(400).json({
        message: "firstName, lastName, email, service, and details are required"
      });
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      service,
      details,
      source_page: sourcePage,
      status: "unread" as const
    };

    const data = await insertRow("/contact_form_messages", payload);
    const created = Array.isArray(data) ? data[0] : payload;
    let emailNotificationSent = false;
    let emailNotificationError: string | null = null;

    try {
      await sendContactFormNotification({
        firstName,
        lastName,
        email,
        phone,
        service,
        details,
        sourcePage,
        createdAt: String((created as { created_at?: unknown })?.created_at ?? new Date().toISOString()),
      });
      emailNotificationSent = true;
    } catch (mailError: unknown) {
      emailNotificationError =
        mailError instanceof Error ? mailError.message : "Failed to send contact notification";
    }

    return res.status(201).json({
      status: "ok",
      id: (created as { id?: string })?.id ?? null,
      email_notification_sent: emailNotificationSent,
      email_notification_error: emailNotificationError,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to submit form message"
    });
  }
});

router.get("/form-messages", requireAuth, async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status);
    const query = String(req.query.q ?? "").trim().toLowerCase();
    const filters: string[] = [];

    if (status !== "all") {
      filters.push(`status=eq.${encodeURIComponent(status)}`);
    }

    const queryString = filters.length
      ? `?${filters.join("&")}&order=created_at.desc&limit=1000`
      : "?order=created_at.desc&limit=1000";

    const rows = await selectRows(`/contact_form_messages${queryString}`);
    const messages = Array.isArray(rows) ? rows : [];

    const filtered = query
      ? messages.filter((item: any) => {
          const haystack = [
            item?.first_name,
            item?.last_name,
            item?.email,
            item?.phone,
            item?.service,
            item?.details,
          ]
            .map((value) => String(value ?? "").toLowerCase())
            .join(" ");
          return haystack.includes(query);
        })
      : messages;

    return res.json(filtered);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch form messages"
    });
  }
});

router.patch("/form-messages/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      return res.status(400).json({ message: "Message id is required" });
    }

    const patch: Record<string, unknown> = {};
    if ("status" in (req.body ?? {})) {
      patch.status = normalizeStatus(req.body?.status);
      if (patch.status === "all") {
        patch.status = "unread";
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No patch data provided" });
    }

    const data = await updateRow(
      `/contact_form_messages?id=eq.${encodeURIComponent(id)}`,
      patch
    );
    return res.json(Array.isArray(data) ? data[0] ?? {} : {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update form message"
    });
  }
});

router.delete("/form-messages/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      return res.status(400).json({ message: "Message id is required" });
    }

    await deleteRow(`/contact_form_messages?id=eq.${encodeURIComponent(id)}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete form message"
    });
  }
});

export default router;
