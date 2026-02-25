import { Router } from "express";
import nodemailer from "nodemailer";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest.js";
import { env } from "../config/env.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;

const normalizeStatus = (value: unknown) => {
  const status = String(value ?? "live").toLowerCase();
  if (status === "draft") return "draft";
  if (status === "all") return "all";
  return "live";
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeEmail = (value: unknown) => normalizeText(value).toLowerCase();

const normalizePassword = (value: unknown) => normalizeText(value);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

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

const buildEmployeeWelcomeHtml = (payload: {
  name: string;
  profession: string;
  email: string;
  temporaryPassword: string;
}) => {
  const safeName = escapeHtml(payload.name || "Employee");
  const safeProfession = escapeHtml(payload.profession || "Team Member");
  const safeEmail = escapeHtml(payload.email);
  const safePassword = escapeHtml(payload.temporaryPassword || "");
  const loginLink = buildEmployeeLoginLink(payload.email);
  const logoUrl = getBrandLogoUrl();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 20px; background: linear-gradient(120deg,#0f172a,#1e293b); color: #fff; text-align: center;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="56" height="56" style="display:block;margin:0 auto 10px;border-radius:10px;object-fit:cover;" />
        <h2 style="margin: 0; font-size: 22px;">Welcome to DrawnDimension</h2>
      </div>
      <div style="padding: 22px;">
        <p style="margin: 0 0 12px; font-size: 15px;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px; font-size: 15px;">You have been added as an employee in DrawnDimension.</p>
        <p style="margin: 0 0 8px; font-size: 15px;"><strong>Profession:</strong> ${safeProfession}</p>
        <p style="margin: 0 0 12px; font-size: 15px;"><strong>Login email:</strong> ${safeEmail}</p>
        <p style="margin: 0 0 8px; font-size: 15px;"><strong>Temporary password:</strong> ${safePassword}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">Sign in from the button below, then change your password immediately.</p>
        <a href="${loginLink}" style="display:inline-block;padding:10px 16px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open Employee Login</a>
      </div>
    </div>
  `;
};

const sendEmployeeWelcomeEmail = async (payload: {
  name: string;
  profession: string;
  email: string;
  temporaryPassword: string;
}) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: payload.email,
    subject: "Welcome to DrawnDimension Employee Dashboard",
    html: buildEmployeeWelcomeHtml(payload),
  });
};

const authHeaders = {
  apikey: env.supabaseServiceKey,
  Authorization: `Bearer ${env.supabaseServiceKey}`,
  "Content-Type": "application/json",
};

const parseAuthError = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    const message = body?.msg || body?.message || body?.error_description || body?.error;
    if (message) return String(message);
  }
  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

type AuthUser = {
  id: string;
  email?: string | null;
};

const listAuthUsers = async (): Promise<AuthUser[]> => {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    const message = await parseAuthError(response, "Failed to load auth users");
    throw new Error(message);
  }

  const body = await response.json();
  const users = Array.isArray(body?.users) ? body.users : [];
  return users;
};

const findAuthUserByEmail = async (email: string): Promise<AuthUser | null> => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const users = await listAuthUsers();
  const user = users.find((item: any) => normalizeEmail(item?.email) === normalized);
  return user ?? null;
};

const createAuthUser = async (email: string, password: string, fullName?: string): Promise<AuthUser> => {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName ?? "",
      },
    }),
  });

  if (!response.ok) {
    const message = await parseAuthError(response, "Failed to create login user");
    throw new Error(message);
  }

  const body = await response.json();
  return body?.user ?? body;
};

const updateAuthUser = async (
  userId: string,
  payload: { email?: string; password?: string; fullName?: string }
): Promise<AuthUser> => {
  const bodyPayload: Record<string, unknown> = {};
  if (payload.email) {
    bodyPayload.email = payload.email;
    bodyPayload.email_confirm = true;
  }
  if (payload.password) {
    bodyPayload.password = payload.password;
  }
  if (payload.fullName) {
    bodyPayload.user_metadata = { full_name: payload.fullName };
  }

  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const message = await parseAuthError(response, "Failed to update login user");
    throw new Error(message);
  }

  const body = await response.json();
  return body?.user ?? body;
};

const syncEmployeeAuthAccount = async (params: {
  email: string;
  fullName: string;
  loginPassword: string;
  existingLinkedUserId?: string | null;
  requirePasswordForCreate?: boolean;
}) => {
  const email = normalizeEmail(params.email);
  const fullName = normalizeText(params.fullName);
  const loginPassword = normalizePassword(params.loginPassword);
  const existingLinkedUserId = normalizeText(params.existingLinkedUserId);
  const requirePasswordForCreate = Boolean(params.requirePasswordForCreate);

  if (!email) {
    throw new Error("Employee email is required for login account");
  }

  let authUser: AuthUser | null = null;

  if (existingLinkedUserId) {
    authUser = { id: existingLinkedUserId, email };
  } else {
    authUser = await findAuthUserByEmail(email);
  }

  if (!authUser) {
    if (!loginPassword) {
      if (requirePasswordForCreate) {
        throw new Error("Login password is required to create employee login");
      }
      return { linkedUserId: null, linkedUserEmail: null };
    }

    if (loginPassword.length < 6) {
      throw new Error("Login password must be at least 6 characters");
    }

    const createdUser = await createAuthUser(email, loginPassword, fullName);
    return {
      linkedUserId: String(createdUser?.id ?? ""),
      linkedUserEmail: email,
    };
  }

  if (loginPassword.length > 0 && loginPassword.length < 6) {
    throw new Error("Login password must be at least 6 characters");
  }

  const needsUpdate =
    Boolean(loginPassword) ||
    normalizeEmail(authUser.email ?? "") !== email ||
    Boolean(fullName);

  if (needsUpdate) {
    await updateAuthUser(String(authUser.id), {
      email,
      password: loginPassword || undefined,
      fullName: fullName || undefined,
    });
  }

  return {
    linkedUserId: String(authUser.id),
    linkedUserEmail: email,
  };
};

router.get("/employees", requireAuth, async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status);
    const filters: string[] = [];
    if (status !== "all") {
      filters.push(`status=eq.${encodeURIComponent(status)}`);
    }

    const query = filters.length
      ? `?${filters.join("&")}&order=created_at.desc`
      : "?order=created_at.desc";

    const data = await selectRows(`/employees${query}`);
    return res.json(data ?? []);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch employees"
    });
  }
});

router.post("/employees", requireAuth, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const name = normalizeText(req.body?.name);
    const profession = normalizeText(req.body?.profession);
    const loginPassword = normalizePassword(req.body?.login_password);

    const authSync = await syncEmployeeAuthAccount({
      email,
      fullName: name,
      loginPassword,
      requirePasswordForCreate: true,
    });

    const payload = {
      name,
      profession,
      email,
      mobile: req.body?.mobile ?? null,
      linked_user_id: authSync.linkedUserId,
      linked_user_email: authSync.linkedUserEmail,
      status: normalizeStatus(req.body?.status)
    };

    const data = await insertRow("/employees", payload);
    const createdEmployee = data?.[0] ?? payload;

    let emailNotificationSent = false;
    let emailNotificationError: string | null = null;

    try {
      if (!isMailConfigured()) {
        throw new Error("SMTP is not configured");
      }

      await sendEmployeeWelcomeEmail({
        name,
        profession,
        email,
        temporaryPassword: loginPassword,
      });
      emailNotificationSent = true;
    } catch (mailError: unknown) {
      emailNotificationError = mailError instanceof Error ? mailError.message : "Failed to send employee welcome email";
    }

    return res.status(201).json({
      ...createdEmployee,
      email_notification_sent: emailNotificationSent,
      email_notification_error: emailNotificationError,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create employee"
    });
  }
});

router.patch("/employees/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const patch: Record<string, unknown> = { ...(req.body ?? {}) };
    const loginPassword = normalizePassword(req.body?.login_password);

    const currentRows = await selectRows(
      `/employees?id=eq.${encodeURIComponent(id)}&select=id,name,email,linked_user_id&limit=1`
    );
    const currentEmployee = Array.isArray(currentRows) ? currentRows[0] : null;
    if (!currentEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if ("status" in patch) {
      patch.status = normalizeStatus(patch.status);
    }

    const emailToUse = normalizeEmail(
      "email" in patch ? patch.email : currentEmployee.email
    );
    const nameToUse = normalizeText(
      "name" in patch ? patch.name : currentEmployee.name
    );

    const authSync = await syncEmployeeAuthAccount({
      email: emailToUse,
      fullName: nameToUse,
      loginPassword,
      existingLinkedUserId: currentEmployee.linked_user_id,
      requirePasswordForCreate: false,
    });

    if (authSync.linkedUserId) {
      patch.linked_user_id = authSync.linkedUserId;
      patch.linked_user_email = authSync.linkedUserEmail;
    }

    delete patch.login_password;

    const data = await updateRow(`/employees?id=eq.${encodeURIComponent(id)}`, patch);
    return res.json(data?.[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update employee"
    });
  }
});

router.delete("/employees/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteRow(`/employees?id=eq.${encodeURIComponent(id)}`);
    return res.status(204).end();
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete employee"
    });
  }
});

export default router;
