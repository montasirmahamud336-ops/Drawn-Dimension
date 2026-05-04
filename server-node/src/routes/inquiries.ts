import { Router, type Request, type Response } from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import { query } from "../db.js";
import { env } from "../config/env.js";
import { normalizeObjectPath, storeUploadedFile } from "../lib/mediaStorage.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10,
  },
});

const normalizeText = (value: unknown, maxLength: number) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
};

const normalizeStatus = (value: unknown) =>
  String(value ?? "").trim().toLowerCase() === "draft" ? "draft" : "active";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const isMailConfigured = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);

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

const getBrandLogoUrl = () => {
  const fromEnv = String(env.brandLogoUrl ?? "").trim();
  if (fromEnv) return fromEnv;
  return `${env.siteBaseUrl.replace(/\/+$/, "")}/images/logo.png`;
};

const buildInquiryNotificationHtml = (payload: {
  id: number;
  email: string;
  name: string;
  projectTitle: string;
  description: string;
  createdAt: string;
  files: Array<{ file_name: string; file_path: string }>;
}) => {
  const logoUrl = getBrandLogoUrl();
  const safeEmail = escapeHtml(payload.email);
  const safeName = escapeHtml(payload.name || "-");
  const safeTitle = escapeHtml(payload.projectTitle || "-");
  const safeDescription = escapeHtml(payload.description || "-");
  const safeCreatedAt = escapeHtml(new Date(payload.createdAt).toLocaleString());
  const fileItems = payload.files.length
    ? payload.files
        .map((file) => {
          const url = `${env.siteBaseUrl.replace(/\/+$/, "")}/${file.file_path}`;
          return `<li><a href="${escapeHtml(url)}" style="color:#2563eb;">${escapeHtml(file.file_name)}</a></li>`;
        })
        .join("")
    : "<li>No attachments</li>";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 18px 20px; background: #111827; color: #fff; display: flex; align-items: center; gap: 12px;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="40" height="40" style="display:block;border-radius:8px;object-fit:cover;" />
        <div>
          <div style="font-size: 16px; font-weight: 700;">DrawnDimension</div>
          <div style="font-size: 12px; opacity: 0.85;">New Project Inquiry</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Inquiry ID:</strong> ${payload.id}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Contact:</strong> ${safeEmail}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Project:</strong> ${safeTitle}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Time:</strong> ${safeCreatedAt}</p>
        <p style="margin: 10px 0 0; font-size: 15px;"><strong>Message:</strong></p>
        <div style="margin-top: 8px; padding: 12px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; white-space: pre-wrap;">${safeDescription}</div>
        <p style="margin: 16px 0 8px; font-size: 15px;"><strong>Attachments:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">${fileItems}</ul>
      </div>
    </div>
  `;
};

const buildInquiryThankYouHtml = (payload: { name: string; projectTitle: string }) => {
  const logoUrl = getBrandLogoUrl();
  const safeName = escapeHtml(payload.name || "there");
  const safeTitle = escapeHtml(payload.projectTitle || "your inquiry");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 18px 20px; background: #111827; color: #fff; display: flex; align-items: center; gap: 12px;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="40" height="40" style="display:block;border-radius:8px;object-fit:cover;" />
        <div>
          <div style="font-size: 16px; font-weight: 700;">DrawnDimension</div>
          <div style="font-size: 12px; opacity: 0.85;">Project Inquiry Received</div>
        </div>
      </div>
      <div style="padding: 22px 20px; color: #111827;">
        <p style="margin: 0 0 12px; font-size: 15px;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6;">
          Thanks for your inquiry about <strong>${safeTitle}</strong>. We have received your message, and our team will reach you shortly.
        </p>
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6;">
          Thanks for staying with DrawnDimension.
        </p>
        <p style="margin: 18px 0 0; font-size: 15px;">
          Regards,<br />
          <strong>DrawnDimension Team</strong>
        </p>
      </div>
    </div>
  `;
};

const sendInquiryEmails = async (payload: {
  id: number;
  email: string;
  name: string;
  projectTitle: string;
  description: string;
  createdAt: string;
  files: Array<{ file_name: string; file_path: string }>;
}) => {
  const mailer = getTransporter();
  const adminTo = env.officialNotificationEmail || env.contactFormNotificationEmail || env.smtpUser;
  const tasks: Promise<unknown>[] = [];

  if (adminTo) {
    tasks.push(
      mailer.sendMail({
        from: env.smtpFrom,
        to: adminTo,
        subject: `New Project Inquiry: ${payload.email}`,
        html: buildInquiryNotificationHtml(payload),
      })
    );
  }

  if (isValidEmail(payload.email)) {
    tasks.push(
      mailer.sendMail({
        from: env.smtpFrom,
        to: payload.email,
        subject: "Thanks for your inquiry - DrawnDimension",
        html: buildInquiryThankYouHtml({
          name: payload.name,
          projectTitle: payload.projectTitle,
        }),
      })
    );
  }

  await Promise.allSettled(tasks);
};

const buildFileUrlPath = (objectPath: string) => {
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `media/${encodeURIComponent(env.storageBucket)}/${encodedPath}`;
};

const getInquiryFiles = (req: Request) => {
  const files = req.files;
  return Array.isArray(files) ? files : [];
};

const createInquiry = async (req: Request, res: Response) => {
  try {
    const email = normalizeText(req.body?.email, 254)?.toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await query(
      `
        INSERT INTO project_inquiries (email, name, project_title, description, status)
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING id, email, name, project_title, description, status, created_at
      `,
      [
        email,
        normalizeText(req.body?.name, 200),
        normalizeText(req.body?.project_title, 300),
        normalizeText(req.body?.description, 5000),
      ]
    );

    const inquiry = result.rows[0];
    const storedFiles: Array<{ file_name: string; file_path: string }> = [];

    for (const file of getInquiryFiles(req)) {
      const extension = (file.originalname.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "") || "bin";
      const objectPath = normalizeObjectPath(
        `inquiries/${inquiry.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
        extension
      );
      const saved = await storeUploadedFile({
        bucket: env.storageBucket,
        objectPath,
        buffer: new Uint8Array(file.buffer),
      });

      const fileResult = await query<{
        id: number;
        inquiry_id: number;
        file_name: string;
        file_path: string;
        file_size: number;
        mime_type: string | null;
        created_at: string;
      }>(
        `
          INSERT INTO project_inquiry_files (inquiry_id, file_name, file_path, file_size, mime_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, inquiry_id, file_name, file_path, file_size, mime_type, created_at
        `,
        [
          inquiry.id,
          file.originalname,
          buildFileUrlPath(saved.path),
          file.size,
          file.mimetype || "application/octet-stream",
        ]
      );
      storedFiles.push(fileResult.rows[0]);
    }

    try {
      await sendInquiryEmails({
        id: inquiry.id,
        email: inquiry.email,
        name: inquiry.name ?? "",
        projectTitle: inquiry.project_title ?? "",
        description: inquiry.description ?? "",
        createdAt: inquiry.created_at,
        files: storedFiles,
      });
    } catch (mailError) {
      console.error("Failed to send inquiry notification emails", mailError);
    }

    return res.status(201).json({ ...inquiry, files: storedFiles });
  } catch {
    return res.status(500).json({ message: "Failed to save inquiry" });
  }
};

const listInquiries = async (req: Request, res: Response) => {
  try {
    const status = normalizeStatus(req.query.status);
    const result = await query(
      `
        SELECT
          i.id,
          i.email,
          i.name,
          i.project_title,
          i.description,
          i.status,
          i.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', f.id,
                'file_name', f.file_name,
                'file_path', f.file_path,
                'file_size', f.file_size,
                'mime_type', f.mime_type,
                'created_at', f.created_at
              )
              ORDER BY f.created_at ASC
            ) FILTER (WHERE f.id IS NOT NULL),
            '[]'::json
          ) AS files
        FROM project_inquiries i
        LEFT JOIN project_inquiry_files f ON f.inquiry_id = i.id
        WHERE i.status = $1
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `,
      [status]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch inquiries" });
  }
};

const updateInquiryStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid inquiry id" });
    }

    const status = normalizeStatus(req.body?.status);
    const result = await query(
      `
        UPDATE project_inquiries
        SET status = $1
        WHERE id = $2
        RETURNING id, email, name, project_title, description, status, created_at
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: "Failed to update inquiry" });
  }
};

const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid inquiry id" });
    }

    const result = await query("DELETE FROM project_inquiries WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Failed to delete inquiry" });
  }
};

router.post("/api/inquiries", upload.array("files", 10), createInquiry);
router.post("/inquiries", upload.array("files", 10), createInquiry);
router.get("/api/inquiries", listInquiries);
router.get("/inquiries", listInquiries);
router.patch("/api/inquiries/:id/status", updateInquiryStatus);
router.patch("/inquiries/:id/status", updateInquiryStatus);
router.delete("/api/inquiries/:id", deleteInquiry);
router.delete("/inquiries/:id", deleteInquiry);

export default router;
