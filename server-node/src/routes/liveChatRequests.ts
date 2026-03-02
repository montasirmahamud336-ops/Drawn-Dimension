import { Router } from "express";
import nodemailer from "nodemailer";
import multer from "multer";
import { env } from "../config/env.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest.js";
import { isNonEmptyString } from "../utils/validation.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;

type LiveChatStatus = "open" | "contacted" | "closed" | "all";

type LiveChatRequestRow = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string;
  first_message: string;
  page_path: string | null;
  status: "open" | "contacted" | "closed";
  created_at: string;
  updated_at?: string;
};

type LiveChatMessageRow = {
  id: string;
  request_id: string;
  sender_type: "user" | "admin";
  sender_label: string | null;
  message_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  created_at: string;
  updated_at?: string;
  read_by_admin_at?: string | null;
  read_by_user_at?: string | null;
};

const LIVE_CHAT_UPLOAD_LIMIT = 15 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIVE_CHAT_UPLOAD_LIMIT },
});

const authHeaders = {
  apikey: env.supabaseServiceKey,
  Authorization: `Bearer ${env.supabaseServiceKey}`,
};

const allowedAttachmentMimes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const allowedAttachmentExtensions = new Set([
  "pdf",
  "xlsx",
  "xls",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
]);

const AI_ASSISTANT_LABEL = "NEMO AI Assistant";
const AI_ASSISTANT_INTRO =
  "I am NEMO AI assistant of DrawnDimension. Our team will reach you soon. Please tell us what service you are interested in.";

const normalizeText = (value: unknown, maxLength: number) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, maxLength);
};

const normalizeEmail = (value: unknown) => normalizeText(value, 254).toLowerCase();

const normalizeStatus = (value: unknown): LiveChatStatus => {
  const status = String(value ?? "open").trim().toLowerCase();
  if (status === "contacted" || status === "done") return "contacted";
  if (status === "closed") return "closed";
  if (status === "all") return "all";
  return "open";
};

const normalizeOptionalText = (value: unknown, maxLength = 8000) => {
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

const normalizeAttachmentSize = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.trunc(numeric);
};

const parseLimit = (value: unknown, fallback = 400) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(1000, Math.trunc(numeric)));
};

const extractFileExtension = (fileName: string) => {
  const ext = fileName.split(".").pop() || "";
  return ext.trim().toLowerCase();
};

const buildSafeFileName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120) || "file";

const normalizeObjectPath = (rawPath: unknown, fallbackExt: string) => {
  const value = String(rawPath ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const safeParts = value
    .split("/")
    .filter((part) => part.length > 0 && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-"));

  if (safeParts.length === 0) {
    const randomName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fallbackExt}`;
    return `live-chat/misc/${randomName}`;
  }

  return safeParts.join("/");
};

const isAllowedAttachmentFile = (file: Express.Multer.File) => {
  const mime = String(file.mimetype ?? "").trim().toLowerCase();
  const ext = extractFileExtension(file.originalname);
  if (allowedAttachmentMimes.has(mime)) return true;
  return allowedAttachmentExtensions.has(ext);
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const readNameFromMetadata = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata) return "";
  const fullName = normalizeText(metadata?.full_name, 160);
  if (fullName) return fullName;
  return normalizeText(metadata?.name, 160);
};

const buildUserDisplayName = (user: UserAuthRequest["user"], fallbackEmail: string) => {
  const metadataName = readNameFromMetadata(user?.user_metadata ?? null);
  if (metadataName) return metadataName;
  const emailName = normalizeText(fallbackEmail.split("@")[0] || "", 160);
  if (emailName) return emailName;
  return "Client";
};

const normalizeSenderLabel = (value: unknown) => String(value ?? "").trim().toLowerCase();

const isAiSenderLabel = (value: unknown) => {
  const label = normalizeSenderLabel(value);
  return label.length > 0 && (label.includes("nemo ai") || label.includes("ai assistant"));
};

const hasHumanAdminReply = (messages: LiveChatMessageRow[]) =>
  messages.some((message) => message.sender_type === "admin" && !isAiSenderLabel(message.sender_label));

const hasAiAdminReply = (messages: LiveChatMessageRow[]) =>
  messages.some((message) => message.sender_type === "admin" && isAiSenderLabel(message.sender_label));

const buildAiAutoReply = (params: {
  userMessage: string;
  hasAttachment: boolean;
  hasPriorAiMessage: boolean;
}) => {
  const normalized = params.userMessage.toLowerCase();

  if (!params.hasPriorAiMessage) {
    return AI_ASSISTANT_INTRO;
  }

  if (params.hasAttachment) {
    return "Thank you for sharing the file. Please tell us your project deadline and the exact deliverable you need.";
  }

  if (/(price|pricing|cost|budget|quotation|quote)/.test(normalized)) {
    return "For pricing, please share scope details, quantity, and delivery timeline. Our team will send a proper quotation soon.";
  }

  if (/(website|web|ui|ux|design)/.test(normalized)) {
    return "Great choice. Are you interested in website design, full development, or both? Please share your preferred style and timeline.";
  }

  if (/(autocad|solidworks|3d|p&id|pfd|engineering|drawing)/.test(normalized)) {
    return "Understood. Please share the technical requirements, file format, and expected completion date so our engineering team can prepare.";
  }

  return "Thanks for your message. Please share your required service, project timeline, and any reference files. Our team will join shortly.";
};

const mergeRequests = (primary: LiveChatRequestRow[], secondary: LiveChatRequestRow[]) => {
  const map = new Map<string, LiveChatRequestRow>();
  [...primary, ...secondary].forEach((row) => {
    const id = String(row?.id ?? "").trim();
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, row);
    }
  });

  return [...map.values()].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
};

const isMailConfigured = () =>
  Boolean(
    env.smtpHost &&
      env.smtpPort &&
      env.smtpUser &&
      env.smtpPass &&
      env.smtpFrom &&
      env.liveChatNotificationEmail
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

const getBrandLogoUrl = () => {
  const fromEnv = String(env.brandLogoUrl ?? "").trim();
  if (fromEnv) return fromEnv;
  return `${env.siteBaseUrl.replace(/\/+$/, "")}/images/logo.png`;
};

const buildLiveChatNotificationHtml = (payload: {
  userName: string;
  userEmail: string;
  firstMessage: string;
  pagePath: string;
  createdAt: string;
}) => {
  const logoUrl = getBrandLogoUrl();
  const safeName = escapeHtml(payload.userName || "Unknown");
  const safeEmail = escapeHtml(payload.userEmail);
  const safeMessage = escapeHtml(payload.firstMessage);
  const safePage = escapeHtml(payload.pagePath || "/");
  const safeCreatedAt = escapeHtml(new Date(payload.createdAt).toLocaleString());

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 18px 20px; background: #111827; color: #fff; display: flex; align-items: center; gap: 12px;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="40" height="40" style="display:block;border-radius:8px;object-fit:cover;" />
        <div>
          <div style="font-size: 16px; font-weight: 700;">DrawnDimension</div>
          <div style="font-size: 12px; opacity: 0.85;">New Live Chat Request</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Page:</strong> ${safePage}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Time:</strong> ${safeCreatedAt}</p>
        <p style="margin: 10px 0 0; font-size: 15px;"><strong>First Message:</strong></p>
        <div style="margin-top: 8px; padding: 12px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; white-space: pre-wrap;">${safeMessage}</div>
      </div>
    </div>
  `;
};

const sendLiveChatNotification = async (payload: {
  userName: string;
  userEmail: string;
  firstMessage: string;
  pagePath: string;
  createdAt: string;
}) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: env.liveChatNotificationEmail,
    subject: `New Client LiveChat Request: ${payload.userEmail}`,
    html: buildLiveChatNotificationHtml(payload),
  });
};

const getRequestById = async (id: string) => {
  const rows = await selectRows(`/live_chat_requests?id=eq.${encodeURIComponent(id)}&limit=1`);
  return Array.isArray(rows) ? (rows[0] as LiveChatRequestRow | undefined) ?? null : null;
};

const getMessagesByRequestId = async (requestId: string, limit = 400) => {
  const rows = await selectRows(
    `/live_chat_messages?request_id=eq.${encodeURIComponent(requestId)}&order=created_at.asc&limit=${limit}`
  );
  return Array.isArray(rows) ? (rows as LiveChatMessageRow[]) : [];
};

const getAiModeActive = (messages: LiveChatMessageRow[]) => !hasHumanAdminReply(messages);

const getRequestsByUser = async (user: { id: string; email?: string | null }) => {
  const userId = normalizeText(user.id, 80);
  const userEmail = normalizeEmail(user.email);

  const byUserIdRows = userId
    ? await selectRows(`/live_chat_requests?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=80`)
    : [];
  const byEmailRows = userEmail
    ? await selectRows(
        `/live_chat_requests?user_email=ilike.${encodeURIComponent(userEmail)}&order=created_at.desc&limit=80`
      )
    : [];

  const byUserId = Array.isArray(byUserIdRows) ? (byUserIdRows as LiveChatRequestRow[]) : [];
  const byEmail = Array.isArray(byEmailRows) ? (byEmailRows as LiveChatRequestRow[]) : [];
  return mergeRequests(byUserId, byEmail);
};

const isRequestOwnedByUser = (request: LiveChatRequestRow, user: { id: string; email?: string | null }) => {
  const userId = normalizeText(user.id, 80);
  const userEmail = normalizeEmail(user.email);

  if (userId && normalizeText(request.user_id, 80) === userId) return true;
  if (userEmail && normalizeEmail(request.user_email) === userEmail) return true;
  return false;
};

const createLiveChatRequest = async (payload: {
  user_id: string | null;
  user_name: string | null;
  user_email: string;
  first_message: string;
  page_path: string;
  status: "open";
}) => {
  const data = await insertRow("/live_chat_requests", payload);
  const created = Array.isArray(data) ? (data[0] as LiveChatRequestRow | undefined) : undefined;
  return created ?? (payload as unknown as LiveChatRequestRow);
};

const insertLiveChatMessage = async (payload: {
  requestId: string;
  senderType: "user" | "admin";
  senderLabel: string | null;
  messageText: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
}) => {
  const nowIso = new Date().toISOString();
  const data = await insertRow("/live_chat_messages", {
    request_id: payload.requestId,
    sender_type: payload.senderType,
    sender_label: payload.senderLabel,
    message_text: payload.messageText,
    attachment_url: payload.attachmentUrl,
    attachment_name: payload.attachmentName,
    attachment_mime: payload.attachmentMime,
    attachment_size: payload.attachmentSize,
    read_by_admin_at: payload.senderType === "admin" ? nowIso : null,
    read_by_user_at: payload.senderType === "user" ? nowIso : null,
  });
  return Array.isArray(data) ? (data[0] as LiveChatMessageRow | undefined) ?? null : null;
};

const sendAiResponseIfNeeded = async (params: {
  requestId: string;
  userMessageText: string | null;
  hasAttachment: boolean;
}) => {
  const conversation = await getMessagesByRequestId(params.requestId, 600);
  if (hasHumanAdminReply(conversation)) {
    return { aiMessage: null, aiModeActive: false };
  }

  const aiReplyText = buildAiAutoReply({
    userMessage: params.userMessageText || "",
    hasAttachment: params.hasAttachment,
    hasPriorAiMessage: hasAiAdminReply(conversation),
  });

  const aiMessage = await insertLiveChatMessage({
    requestId: params.requestId,
    senderType: "admin",
    senderLabel: AI_ASSISTANT_LABEL,
    messageText: aiReplyText,
    attachmentUrl: null,
    attachmentName: null,
    attachmentMime: null,
    attachmentSize: null,
  });

  return { aiMessage, aiModeActive: true };
};

const markMessagesRead = async (
  messages: LiveChatMessageRow[],
  senderType: "user" | "admin",
  field: "read_by_admin_at" | "read_by_user_at"
) => {
  const unreadIds = messages
    .filter((message) => message.sender_type === senderType && !message[field])
    .map((message) => String(message.id ?? "").trim())
    .filter((id) => id.length > 0);

  if (unreadIds.length === 0) return;

  const inClause = unreadIds.join(",");
  await updateRow(
    `/live_chat_messages?id=in.(${inClause})&sender_type=eq.${encodeURIComponent(senderType)}&${field}=is.null`,
    {
      [field]: new Date().toISOString(),
    }
  );
};

const uploadAttachmentToStorage = async (
  file: Express.Multer.File,
  pathPrefix: string
) => {
  const ext = extractFileExtension(file.originalname) || "bin";
  const safeName = buildSafeFileName(file.originalname);
  const objectPath = normalizeObjectPath(`${pathPrefix}/${Date.now()}-${safeName}`, ext);
  const encodedPath = objectPath.split("/").map((part) => encodeURIComponent(part)).join("/");

  const uploadRes = await fetch(
    `${env.supabaseUrl}/storage/v1/object/${encodeURIComponent(env.storageBucket)}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": file.mimetype || "application/octet-stream",
        "x-upsert": "true",
      },
      body: new Uint8Array(file.buffer),
    }
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(text || "Failed to upload file");
  }

  const publicUrl = `${env.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(
    env.storageBucket
  )}/${encodedPath}`;
  return { publicUrl, path: objectPath };
};

router.post("/live-chat/requests", async (req, res) => {
  try {
    const userId = normalizeText(req.body?.userId, 80);
    const userName = normalizeText(req.body?.userName ?? req.body?.fullName, 160);
    const userEmail = normalizeEmail(req.body?.userEmail ?? req.body?.email);
    const firstMessage = normalizeText(req.body?.firstMessage, 8000);
    const pagePath = normalizeText(req.body?.pagePath, 240) || "/";
    const notifyAdmin = req.body?.notify_admin !== false && req.body?.notifyAdmin !== false;

    if (!isNonEmptyString(userEmail) || !isNonEmptyString(firstMessage)) {
      return res.status(400).json({
        message: "userEmail and firstMessage are required",
      });
    }

    const payload = {
      user_id: userId || null,
      user_name: userName || null,
      user_email: userEmail,
      first_message: firstMessage,
      page_path: pagePath,
      status: "open" as const,
    };

    const created = await createLiveChatRequest(payload);

    let messageStoreError: string | null = null;
    let aiResponseError: string | null = null;
    let aiResponseSent = false;
    let aiResponse: LiveChatMessageRow | null = null;
    try {
      await insertLiveChatMessage({
        requestId: String(created.id),
        senderType: "user",
        senderLabel: userName || null,
        messageText: firstMessage,
        attachmentUrl: null,
        attachmentName: null,
        attachmentMime: null,
        attachmentSize: null,
      });
    } catch (messageError: unknown) {
      messageStoreError =
        messageError instanceof Error ? messageError.message : "Failed to save first live chat message";
    }

    if (!messageStoreError) {
      try {
      const aiResult = await sendAiResponseIfNeeded({
        requestId: String(created.id),
        userMessageText: firstMessage,
        hasAttachment: false,
      });
      aiResponse = aiResult.aiMessage;
      aiResponseSent = Boolean(aiResult.aiMessage);
      } catch (aiError: unknown) {
      aiResponseError =
          aiError instanceof Error ? aiError.message : "Failed to generate AI assistant response";
      }
    }

    let emailNotificationSent = false;
    let emailNotificationError: string | null = null;

    if (notifyAdmin) {
      try {
        await sendLiveChatNotification({
          userName,
          userEmail,
          firstMessage,
          pagePath,
          createdAt: String(created?.created_at ?? new Date().toISOString()),
        });
        emailNotificationSent = true;
      } catch (mailError: unknown) {
        emailNotificationError =
          mailError instanceof Error ? mailError.message : "Failed to send live chat notification";
      }
    }

    return res.status(201).json({
      ...created,
      ai_mode_active: true,
      ai_response_sent: aiResponseSent,
      ai_response: aiResponse,
      ai_response_error: aiResponseError,
      email_notification_sent: emailNotificationSent,
      email_notification_error: emailNotificationError,
      message_store_error: messageStoreError,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create live chat request",
    });
  }
});

router.get("/live-chat/requests", requireAuth, async (req, res) => {
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

    const rows = await selectRows(`/live_chat_requests${queryString}`);
    const requests = Array.isArray(rows) ? (rows as LiveChatRequestRow[]) : [];

    const filtered = query
      ? requests.filter((item) => {
          const haystack = [
            item?.user_name,
            item?.user_email,
            item?.first_message,
            item?.page_path,
            item?.status,
          ]
            .map((value) => String(value ?? "").toLowerCase())
            .join(" ");
          return haystack.includes(query);
        })
      : requests;

    return res.json(filtered);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch live chat requests",
    });
  }
});

router.get("/live-chat/requests/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestId = String(req.params.id ?? "").trim();
    if (!requestId) {
      return res.status(400).json({ message: "Request id is required" });
    }

    const request = await getRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Live chat request not found" });
    }

    const limit = parseLimit(req.query.limit, 600);
    const messages = await getMessagesByRequestId(requestId, limit);
    await markMessagesRead(messages, "user", "read_by_admin_at");

    return res.json({ request, messages, ai_mode_active: getAiModeActive(messages) });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch live chat messages",
    });
  }
});

router.post("/live-chat/requests/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestId = String(req.params.id ?? "").trim();
    if (!requestId) {
      return res.status(400).json({ message: "Request id is required" });
    }

    const request = await getRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Live chat request not found" });
    }
    if (request.status === "closed") {
      return res.status(409).json({ message: "This live chat is closed. Re-open it before sending messages." });
    }

    const messageText = normalizeOptionalText(req.body?.message_text, 8000);
    const attachmentUrl = normalizeOptionalUrl(req.body?.attachment_url);
    const attachmentName = normalizeOptionalText(req.body?.attachment_name, 255);
    const attachmentMime = normalizeOptionalText(req.body?.attachment_mime, 160);
    const attachmentSize = normalizeAttachmentSize(req.body?.attachment_size);

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    const message = await insertLiveChatMessage({
      requestId,
      senderType: "admin",
      senderLabel: normalizeOptionalText(req.admin?.username, 120) ?? "admin",
      messageText,
      attachmentUrl,
      attachmentName,
      attachmentMime,
      attachmentSize,
    });

    return res.status(201).json({
      request,
      message,
      ai_mode_active: false,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send admin live chat message",
    });
  }
});

router.post("/live-chat/admin/upload", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "file is required" });
    }
    if (!isAllowedAttachmentFile(file)) {
      return res.status(400).json({
        message: "Unsupported file type. Only PDF, image, XLSX/XLS, and DOCX files are allowed.",
      });
    }

    const requestId = normalizeText(req.body?.request_id, 80) || "general";
    const uploaded = await uploadAttachmentToStorage(file, `live-chat/admin/${requestId}`);
    return res.status(201).json({
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      fileName: file.originalname,
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to upload admin live chat attachment",
    });
  }
});

router.get("/live-chat/me/request", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requests = await getRequestsByUser(user);
    const activeRequest =
      requests.find((item) => item.status === "open") ??
      requests.find((item) => item.status === "contacted") ??
      requests[0] ??
      null;

    if (!activeRequest) {
      return res.json({ request: null, messages: [], ai_mode_active: true });
    }

    const limit = parseLimit(req.query.limit, 600);
    const messages = await getMessagesByRequestId(String(activeRequest.id), limit);
    await markMessagesRead(messages, "admin", "read_by_user_at");

    return res.json({ request: activeRequest, messages, ai_mode_active: getAiModeActive(messages) });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load live chat conversation",
    });
  }
});

router.get("/live-chat/me/messages", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requestId = normalizeText(req.query.request_id, 80);
    let targetRequest: LiveChatRequestRow | null = null;

    if (requestId) {
      const request = await getRequestById(requestId);
      if (!request || !isRequestOwnedByUser(request, user)) {
        return res.status(404).json({ message: "Live chat request not found" });
      }
      targetRequest = request;
    } else {
      const requests = await getRequestsByUser(user);
      targetRequest =
        requests.find((item) => item.status === "open") ??
        requests.find((item) => item.status === "contacted") ??
        requests[0] ??
        null;
    }

    if (!targetRequest) {
      return res.json({ request: null, messages: [], ai_mode_active: true });
    }

    const limit = parseLimit(req.query.limit, 600);
    const messages = await getMessagesByRequestId(String(targetRequest.id), limit);
    await markMessagesRead(messages, "admin", "read_by_user_at");

    return res.json({ request: targetRequest, messages, ai_mode_active: getAiModeActive(messages) });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load live chat messages",
    });
  }
});

router.post("/live-chat/me/messages", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const messageText = normalizeOptionalText(req.body?.message_text, 8000);
    const attachmentUrl = normalizeOptionalUrl(req.body?.attachment_url);
    const attachmentName = normalizeOptionalText(req.body?.attachment_name, 255);
    const attachmentMime = normalizeOptionalText(req.body?.attachment_mime, 160);
    const attachmentSize = normalizeAttachmentSize(req.body?.attachment_size);

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    const requestedId = normalizeText(req.body?.request_id, 80);
    const userEmail = normalizeEmail(user.email);
    const pagePath = normalizeText(req.body?.page_path, 240) || "/";
    const providedName = normalizeText(req.body?.user_name, 160);
    const fallbackName = buildUserDisplayName(user, userEmail);
    const userDisplayName = providedName || fallbackName;

    let targetRequest: LiveChatRequestRow | null = null;
    if (requestedId) {
      const requested = await getRequestById(requestedId);
      if (requested && isRequestOwnedByUser(requested, user) && requested.status === "open") {
        targetRequest = requested;
      }
    }

    if (!targetRequest) {
      const requests = await getRequestsByUser(user);
      targetRequest = requests.find((item) => item.status === "open") ?? null;
    }

    let createdRequest = false;
    let emailNotificationSent = false;
    let emailNotificationError: string | null = null;

    if (!targetRequest) {
      const firstMessage = messageText || `Attachment: ${attachmentName || "file"}`;
      targetRequest = await createLiveChatRequest({
        user_id: normalizeText(user.id, 80) || null,
        user_name: userDisplayName || null,
        user_email: userEmail,
        first_message: firstMessage,
        page_path: pagePath,
        status: "open",
      });
      createdRequest = true;

      try {
        await sendLiveChatNotification({
          userName: userDisplayName,
          userEmail,
          firstMessage,
          pagePath,
          createdAt: String(targetRequest.created_at ?? new Date().toISOString()),
        });
        emailNotificationSent = true;
      } catch (mailError: unknown) {
        emailNotificationError =
          mailError instanceof Error ? mailError.message : "Failed to send live chat notification";
      }
    }

    const message = await insertLiveChatMessage({
      requestId: String(targetRequest.id),
      senderType: "user",
      senderLabel: userDisplayName || null,
      messageText,
      attachmentUrl,
      attachmentName,
      attachmentMime,
      attachmentSize,
    });

    let aiResponse: LiveChatMessageRow | null = null;
    let aiResponseError: string | null = null;
    let aiModeActive = true;

    try {
      const aiResult = await sendAiResponseIfNeeded({
        requestId: String(targetRequest.id),
        userMessageText: messageText,
        hasAttachment: Boolean(attachmentUrl),
      });
      aiResponse = aiResult.aiMessage;
      aiModeActive = aiResult.aiModeActive;
    } catch (aiError: unknown) {
      aiResponseError =
        aiError instanceof Error ? aiError.message : "Failed to generate AI assistant response";
      try {
        const fallbackConversation = await getMessagesByRequestId(String(targetRequest.id), 600);
        aiModeActive = getAiModeActive(fallbackConversation);
      } catch {
        aiModeActive = true;
      }
    }

    return res.status(201).json({
      request: targetRequest,
      message,
      ai_mode_active: aiModeActive,
      ai_response_sent: Boolean(aiResponse),
      ai_response: aiResponse,
      ai_response_error: aiResponseError,
      created_request: createdRequest,
      email_notification_sent: emailNotificationSent,
      email_notification_error: emailNotificationError,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send live chat message",
    });
  }
});

router.post("/live-chat/me/upload", requireUserAuth, upload.single("file"), async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "file is required" });
    }
    if (!isAllowedAttachmentFile(file)) {
      return res.status(400).json({
        message: "Unsupported file type. Only PDF, image, XLSX/XLS, and DOCX files are allowed.",
      });
    }

    const requestId = normalizeText(req.body?.request_id, 80);
    if (requestId) {
      const request = await getRequestById(requestId);
      if (!request || !isRequestOwnedByUser(request, user)) {
        return res.status(404).json({ message: "Live chat request not found" });
      }
    }

    const userId = normalizeText(user.id, 80);
    const pathRequestId = requestId || "draft";
    const uploaded = await uploadAttachmentToStorage(file, `live-chat/user/${userId}/${pathRequestId}`);

    return res.status(201).json({
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      fileName: file.originalname,
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to upload live chat attachment",
    });
  }
});

router.patch("/live-chat/requests/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      return res.status(400).json({ message: "Request id is required" });
    }

    const patch: Record<string, unknown> = {};
    if ("status" in (req.body ?? {})) {
      const status = normalizeStatus(req.body?.status);
      patch.status = status === "all" ? "open" : status;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No patch data provided" });
    }

    const data = await updateRow(`/live_chat_requests?id=eq.${encodeURIComponent(id)}`, patch);
    return res.json(Array.isArray(data) ? data[0] ?? {} : {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update live chat request",
    });
  }
});

router.delete("/live-chat/requests/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) {
      return res.status(400).json({ message: "Request id is required" });
    }

    await deleteRow(`/live_chat_requests?id=eq.${encodeURIComponent(id)}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete live chat request",
    });
  }
});

export default router;
