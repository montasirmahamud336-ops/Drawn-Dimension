import { Router } from "express";
import nodemailer from "nodemailer";
import { requireAuth } from "../middleware/auth.js";
import { insertRow, selectRows, updateRow, deleteRow } from "../lib/supabaseRest.js";
import { env } from "../config/env.js";
import { syncEmployeeSiteUser } from "../lib/siteUserAuth.js";

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
    mode: "signin",
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

type EmployeeLoginCredential = {
  employee_id?: string | null;
  login_password_preview?: string | null;
  updated_at?: string | null;
};

const syncEmployeeAuthAccount = async (params: {
  email: string;
  fullName: string;
  loginPassword: string;
  existingLinkedUserId?: string | null;
  requirePasswordForCreate?: boolean;
}) => {
  return syncEmployeeSiteUser({
    email: normalizeEmail(params.email),
    fullName: normalizeText(params.fullName),
    loginPassword: normalizePassword(params.loginPassword),
    existingLinkedUserId: normalizeText(params.existingLinkedUserId),
    requirePasswordForCreate: Boolean(params.requirePasswordForCreate),
  });
};

const listEmployeeLoginCredentials = async () => {
  const rows = await selectRows(
    "/employee_login_credentials?select=employee_id,login_password_preview,updated_at"
  );
  return Array.isArray(rows) ? (rows as EmployeeLoginCredential[]) : [];
};

const syncEmployeeLoginCredentialPreview = async (employeeId: string, loginPassword: string) => {
  const normalizedEmployeeId = normalizeText(employeeId);
  const normalizedPassword = normalizePassword(loginPassword);

  if (!normalizedEmployeeId || !normalizedPassword) return;

  const existingRows = await selectRows(
    `/employee_login_credentials?employee_id=eq.${encodeURIComponent(normalizedEmployeeId)}&limit=1`
  );
  const payload = {
    employee_id: normalizedEmployeeId,
    login_password_preview: normalizedPassword,
  };

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    await updateRow(
      `/employee_login_credentials?employee_id=eq.${encodeURIComponent(normalizedEmployeeId)}`,
      payload
    );
    return;
  }

  await insertRow("/employee_login_credentials", payload);
};

const loadEmployeeDashboardPreview = async (employeeId: string) => {
  const normalizedEmployeeId = normalizeText(employeeId);
  if (!normalizedEmployeeId) return null;

  const employeeRows = await selectRows(
    `/employees?id=eq.${encodeURIComponent(normalizedEmployeeId)}&limit=1`
  );
  const employee = Array.isArray(employeeRows) ? employeeRows[0] ?? null : null;

  if (!employee) {
    return null;
  }

  const assignments = await selectRows(
    `/work_assignments?employee_id=eq.${encodeURIComponent(normalizedEmployeeId)}&status=neq.draft&order=created_at.desc`
  );

  return {
    employee,
    assignments: Array.isArray(assignments) ? assignments : [],
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

    const [employees, credentials] = await Promise.all([
      selectRows(`/employees${query}`),
      listEmployeeLoginCredentials(),
    ]);

    const credentialMap = new Map(
      credentials.map((item) => [
        normalizeText(item.employee_id),
        {
          login_password_preview: item.login_password_preview ?? null,
          login_password_updated_at: item.updated_at ?? null,
        },
      ])
    );

    const data = Array.isArray(employees) ? employees : [];
    return res.json(
      data.map((employee: any) => {
        const credential = credentialMap.get(normalizeText(employee?.id));
        return {
          ...employee,
          login_password_preview: credential?.login_password_preview ?? null,
          login_password_updated_at: credential?.login_password_updated_at ?? null,
        };
      })
    );
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
    const createdEmployeeId = normalizeText((createdEmployee as { id?: unknown })?.id);

    if (createdEmployeeId && loginPassword) {
      await syncEmployeeLoginCredentialPreview(createdEmployeeId, loginPassword);
    }

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
    if (loginPassword) {
      await syncEmployeeLoginCredentialPreview(id, loginPassword);
    }

    const updatedEmployee = data?.[0] ?? {};
    const credentialRows = await selectRows(
      `/employee_login_credentials?employee_id=eq.${encodeURIComponent(id)}&select=login_password_preview,updated_at&limit=1`
    );
    const credential = Array.isArray(credentialRows) ? credentialRows[0] : null;

    return res.json({
      ...updatedEmployee,
      login_password_preview: credential?.login_password_preview ?? null,
      login_password_updated_at: credential?.updated_at ?? null,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update employee"
    });
  }
});

router.get("/employees/:id/dashboard-preview", requireAuth, async (req, res) => {
  try {
    const preview = await loadEmployeeDashboardPreview(req.params.id);

    if (!preview) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.json(preview);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load employee dashboard preview"
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
