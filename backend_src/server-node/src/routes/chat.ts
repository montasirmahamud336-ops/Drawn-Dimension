import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";
import { insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

const router = Router();

type ChatMessage = {
  id: string;
  employee_id: string;
  sender_type: "admin" | "employee";
  sender_label: string | null;
  message_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  created_at: string;
  read_by_admin_at: string | null;
  read_by_employee_at: string | null;
};

const normalizeEmail = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const normalizeOptionalText = (value: unknown, maxLength = 4000) => {
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

const parseLimit = (value: unknown, fallback = 300) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(500, Math.trunc(numeric)));
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

const getEmployeeById = async (employeeId: string) => {
  const rows = await selectRows(
    `/employees?id=eq.${encodeURIComponent(employeeId)}&status=eq.live&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : null;
};

const getMessagesByEmployeeId = async (employeeId: string, limit = 300) => {
  const rows = await selectRows(
    `/employee_chat_messages?employee_id=eq.${encodeURIComponent(employeeId)}&order=created_at.asc&limit=${limit}`
  );
  return Array.isArray(rows) ? (rows as ChatMessage[]) : [];
};

const markMessagesRead = async (
  messages: ChatMessage[],
  senderType: "admin" | "employee",
  field: "read_by_admin_at" | "read_by_employee_at"
) => {
  const unreadIds = messages
    .filter((message) => message.sender_type === senderType && !message[field])
    .map((message) => String(message.id ?? "").trim())
    .filter((id) => id.length > 0);

  if (unreadIds.length === 0) return;

  const inClause = unreadIds.join(",");
  await updateRow(
    `/employee_chat_messages?id=in.(${inClause})&sender_type=eq.${encodeURIComponent(senderType)}&${field}=is.null`,
    {
      [field]: new Date().toISOString(),
    }
  );
};

router.get("/chat/conversations", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const employeesRows = await selectRows(`/employees?status=eq.live&order=created_at.asc`);
    const employees = Array.isArray(employeesRows) ? employeesRows : [];

    if (employees.length === 0) {
      return res.json([]);
    }

    const employeeIds = employees
      .map((employee: any) => String(employee?.id ?? "").trim())
      .filter((id: string) => id.length > 0);

    if (employeeIds.length === 0) {
      return res.json([]);
    }

    const inClause = employeeIds.join(",");
    const messageRows = await selectRows(
      `/employee_chat_messages?employee_id=in.(${inClause})&order=created_at.desc&limit=3000`
    );
    const messages = Array.isArray(messageRows) ? (messageRows as ChatMessage[]) : [];

    const latestMessageByEmployee = new Map<string, ChatMessage>();
    const unreadCountByEmployee = new Map<string, number>();

    for (const message of messages) {
      const employeeId = String(message?.employee_id ?? "").trim();
      if (!employeeId) continue;

      if (!latestMessageByEmployee.has(employeeId)) {
        latestMessageByEmployee.set(employeeId, message);
      }

      if (message.sender_type === "employee" && !message.read_by_admin_at) {
        const current = unreadCountByEmployee.get(employeeId) ?? 0;
        unreadCountByEmployee.set(employeeId, current + 1);
      }
    }

    const conversations = employees
      .map((employee: any) => {
        const employeeId = String(employee?.id ?? "").trim();
        const latestMessage = latestMessageByEmployee.get(employeeId) ?? null;
        return {
          employee,
          latest_message: latestMessage,
          unread_count: unreadCountByEmployee.get(employeeId) ?? 0,
        };
      })
      .sort((a, b) => {
        const aTime = new Date(a.latest_message?.created_at ?? a.employee?.created_at ?? 0).getTime();
        const bTime = new Date(b.latest_message?.created_at ?? b.employee?.created_at ?? 0).getTime();
        return bTime - aTime;
      });

    return res.json(conversations);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load conversations",
    });
  }
});

router.get("/chat/messages/:employeeId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const employeeId = String(req.params.employeeId ?? "").trim();
    if (!employeeId) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const limit = parseLimit(req.query.limit, 300);
    const messages = await getMessagesByEmployeeId(employeeId, limit);
    await markMessagesRead(messages, "employee", "read_by_admin_at");

    return res.json({
      employee,
      messages,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load chat messages",
    });
  }
});

router.post("/chat/messages/:employeeId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const employeeId = String(req.params.employeeId ?? "").trim();
    if (!employeeId) {
      return res.status(400).json({ message: "Employee id is required" });
    }

    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const messageText = normalizeOptionalText(req.body?.message_text, 8000);
    const attachmentUrl = normalizeOptionalUrl(req.body?.attachment_url);
    const attachmentName = normalizeOptionalText(req.body?.attachment_name, 255);
    const attachmentMime = normalizeOptionalText(req.body?.attachment_mime, 120);

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    const payload = {
      employee_id: employeeId,
      sender_type: "admin",
      sender_label: normalizeOptionalText(req.admin?.username, 120) ?? "admin",
      message_text: messageText,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_mime: attachmentMime,
      read_by_admin_at: new Date().toISOString(),
      read_by_employee_at: null,
    };

    const data = await insertRow("/employee_chat_messages", payload);
    return res.status(201).json(data?.[0] ?? payload);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send message",
    });
  }
});

router.get("/employee/chat", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const employees = await getLinkedEmployees(user);
    if (employees.length === 0) {
      return res.json({ employee: null, messages: [] });
    }

    const employee = employees[0];
    const employeeId = String(employee?.id ?? "").trim();
    if (!employeeId) {
      return res.json({ employee: null, messages: [] });
    }

    const limit = parseLimit(req.query.limit, 300);
    const messages = await getMessagesByEmployeeId(employeeId, limit);
    await markMessagesRead(messages, "admin", "read_by_employee_at");

    return res.json({
      employee,
      messages,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load employee chat",
    });
  }
});

router.post("/employee/chat/messages", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const employees = await getLinkedEmployees(user);
    if (employees.length === 0) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const employee = employees[0];
    const employeeId = String(employee?.id ?? "").trim();
    if (!employeeId) {
      return res.status(400).json({ message: "Invalid employee profile" });
    }

    const messageText = normalizeOptionalText(req.body?.message_text, 8000);
    const attachmentUrl = normalizeOptionalUrl(req.body?.attachment_url);
    const attachmentName = normalizeOptionalText(req.body?.attachment_name, 255);
    const attachmentMime = normalizeOptionalText(req.body?.attachment_mime, 120);

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    const payload = {
      employee_id: employeeId,
      sender_type: "employee",
      sender_label: normalizeOptionalText(employee?.name, 120) ?? "employee",
      message_text: messageText,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_mime: attachmentMime,
      read_by_employee_at: new Date().toISOString(),
      read_by_admin_at: null,
    };

    const data = await insertRow("/employee_chat_messages", payload);
    return res.status(201).json(data?.[0] ?? payload);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send employee message",
    });
  }
});

export default router;
