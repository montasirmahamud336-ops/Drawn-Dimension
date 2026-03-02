import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getSupabaseUserFromToken } from "../middleware/userAuth.js";
import { insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";
import { isNonEmptyString } from "../utils/validation.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;

const isMailConfigured = () =>
  Boolean(
    env.smtpHost &&
      env.smtpPort &&
      env.smtpUser &&
      env.smtpPass &&
      env.smtpFrom &&
      env.officialNotificationEmail
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

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );

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

type SignupMethod = "email" | "google";

type SignupEventPayload = {
  email: string;
  fullName?: string;
  method: SignupMethod;
};

const buildOfficialNotificationHtml = (payload: SignupEventPayload) => {
  const logoUrl = getBrandLogoUrl();
  const safeEmail = escapeHtml(payload.email);
  const safeName = escapeHtml(payload.fullName || "New user");
  const methodLabel = payload.method === "google" ? "Google Signup" : "Email Signup";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 18px 20px; background: #111827; color: #fff; display: flex; align-items: center; gap: 12px;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="40" height="40" style="display:block;border-radius:8px;object-fit:cover;" />
        <div>
          <div style="font-size: 16px; font-weight: 700;">DrawnDimension</div>
          <div style="font-size: 12px; opacity: 0.85;">New account notification</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Method:</strong> ${methodLabel}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin: 0 0 10px; font-size: 15px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin: 14px 0 0; color: #4b5563; font-size: 13px;">This email was generated automatically from the website signup flow.</p>
      </div>
    </div>
  `;
};

const buildGoogleWelcomeHtml = (fullName: string, userEmail: string) => {
  const logoUrl = getBrandLogoUrl();
  const safeName = escapeHtml(fullName || "there");
  const safeEmail = escapeHtml(userEmail);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 20px; background: linear-gradient(120deg,#0f172a,#1e293b); color: #fff; text-align: center;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="56" height="56" style="display:block;margin:0 auto 10px;border-radius:10px;object-fit:cover;" />
        <h2 style="margin: 0; font-size: 22px;">Welcome to DrawnDimension</h2>
      </div>
      <div style="padding: 22px;">
        <p style="margin: 0 0 12px; font-size: 15px;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px; font-size: 15px;">Your account has been created successfully using Google.</p>
        <p style="margin: 0 0 12px; font-size: 15px;"><strong>Account email:</strong> ${safeEmail}</p>
        <p style="margin: 0; color: #4b5563; font-size: 13px;">You can now sign in and access your dashboard anytime.</p>
      </div>
    </div>
  `;
};

const buildEmailWelcomeHtml = (fullName: string, userEmail: string) => {
  const logoUrl = getBrandLogoUrl();
  const safeName = escapeHtml(fullName || "there");
  const safeEmail = escapeHtml(userEmail);
  const loginLink = `${env.siteBaseUrl.replace(/\/+$/, "")}/auth`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 20px; background: linear-gradient(120deg,#0f172a,#1e293b); color: #fff; text-align: center;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="56" height="56" style="display:block;margin:0 auto 10px;border-radius:10px;object-fit:cover;" />
        <h2 style="margin: 0; font-size: 22px;">Welcome to DrawnDimension</h2>
      </div>
      <div style="padding: 22px;">
        <p style="margin: 0 0 12px; font-size: 15px;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px; font-size: 15px;">Your account has been created successfully.</p>
        <p style="margin: 0 0 12px; font-size: 15px;"><strong>Account email:</strong> ${safeEmail}</p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 13px;">If your account needs email verification, please verify first, then sign in.</p>
        <a href="${loginLink}" style="display:inline-block;padding:10px 16px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open Login</a>
      </div>
    </div>
  `;
};

const sendOfficialNotification = async (payload: SignupEventPayload) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: env.officialNotificationEmail,
    subject: `New ${payload.method === "google" ? "Google" : "Email"} signup: ${payload.email}`,
    html: buildOfficialNotificationHtml(payload)
  });
};

const sendGoogleWelcomeEmail = async (email: string, fullName?: string) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: "Welcome to DrawnDimension",
    html: buildGoogleWelcomeHtml(fullName || "there", email)
  });
};

const sendEmailWelcomeEmail = async (email: string, fullName?: string) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: "Welcome to DrawnDimension",
    html: buildEmailWelcomeHtml(fullName || "there", email)
  });
};

const isDuplicateNotificationError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("duplicate") || message.includes("unique");
};

type CmsAdminRole = "owner" | "manager";

type CmsAdminUserRow = {
  id: string;
  full_name: string;
  email: string;
  username: string;
  password_hash: string;
  role: CmsAdminRole;
  is_active: boolean;
  created_at: string;
};

type AdminSessionPayload = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: CmsAdminRole;
  isMain: boolean;
};

const normalizeIdentifier = (value: unknown) => String(value ?? "").trim().toLowerCase();

const normalizeCmsRole = (value: unknown): CmsAdminRole =>
  String(value ?? "").toLowerCase() === "owner" ? "owner" : "manager";

const sanitizeAdminUser = (row: CmsAdminUserRow): AdminSessionPayload => {
  const role = normalizeCmsRole(row.role);
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    fullName: String(row.full_name || row.username),
    role,
    isMain: role === "owner"
  };
};

const signAdminToken = (admin: AdminSessionPayload) =>
  jwt.sign(
    {
      username: admin.username,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      isMain: admin.isMain
    },
    env.adminToken,
    {
      subject: admin.id,
      expiresIn: "30d"
    }
  );

const fetchCmsAdminByIdentifier = async (identifier: string): Promise<CmsAdminUserRow | null> => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  const byUsername = await selectRows(
    `/cms_admin_users?is_active=eq.true&username=ilike.${encodeURIComponent(normalized)}&limit=1`
  );
  if (Array.isArray(byUsername) && byUsername[0]) {
    return byUsername[0] as CmsAdminUserRow;
  }

  const byEmail = await selectRows(
    `/cms_admin_users?is_active=eq.true&email=ilike.${encodeURIComponent(normalized)}&limit=1`
  );
  if (Array.isArray(byEmail) && byEmail[0]) {
    return byEmail[0] as CmsAdminUserRow;
  }

  return null;
};

const fetchAllCmsAdmins = async (): Promise<CmsAdminUserRow[]> => {
  const rows = await selectRows("/cms_admin_users?order=created_at.asc&limit=500");
  return Array.isArray(rows) ? (rows as CmsAdminUserRow[]) : [];
};

const fetchCmsAdminById = async (id: string): Promise<CmsAdminUserRow | null> => {
  if (!isValidUuid(id)) return null;
  const rows = await selectRows(`/cms_admin_users?id=eq.${encodeURIComponent(id)}&is_active=eq.true&limit=1`);
  if (Array.isArray(rows) && rows[0]) {
    return rows[0] as CmsAdminUserRow;
  }
  return null;
};

const fetchCmsAdminByFullName = async (fullName: string): Promise<CmsAdminUserRow | null> => {
  const normalized = String(fullName ?? "").trim();
  if (!normalized) return null;
  const rows = await selectRows(
    `/cms_admin_users?is_active=eq.true&full_name=ilike.${encodeURIComponent(normalized)}&limit=1`
  );
  if (Array.isArray(rows) && rows[0]) {
    return rows[0] as CmsAdminUserRow;
  }
  return null;
};

const fetchCurrentCmsAdmin = async (
  admin: NonNullable<AuthRequest["admin"]>,
  emailHint?: string
): Promise<CmsAdminUserRow | null> => {
  const byId = await fetchCmsAdminById(admin.id);
  if (byId) return byId;

  const identifierCandidates = [
    String(admin.username ?? "").trim(),
    String(admin.email ?? "").trim(),
    String(emailHint ?? "").trim(),
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);

  for (const candidate of identifierCandidates) {
    const match = await fetchCmsAdminByIdentifier(candidate);
    if (match) return match;
  }

  const byFullName = await fetchCmsAdminByFullName(admin.fullName);
  if (byFullName) return byFullName;

  return null;
};

const assertMainAdmin = (req: AuthRequest, res: any): req is AuthRequest & { admin: NonNullable<AuthRequest["admin"]> } => {
  if (!req.admin?.isMain) {
    res.status(403).json({ message: "Only main account can manage CMS access" });
    return false;
  }
  return true;
};

router.post("/auth/login", async (req, res) => {
  const identifier = String(req.body?.username ?? req.body?.identifier ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!isNonEmptyString(identifier) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "Username/email and password required" });
  }

  try {
    const cmsAdmin = await fetchCmsAdminByIdentifier(identifier);
    if (cmsAdmin) {
      const isValid = await bcrypt.compare(password, String(cmsAdmin.password_hash ?? ""));
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const admin = sanitizeAdminUser(cmsAdmin);
      return res.json({
        token: signAdminToken(admin),
        tokenType: "Bearer",
        admin
      });
    }
  } catch (error: unknown) {
    if (!(error instanceof Error) || !error.message.includes("Could not find the table")) {
      console.error("CMS admin table login lookup failed", error);
    }
  }

  const normalizedIdentifier = normalizeIdentifier(identifier);
  const normalizedLegacyUsername = normalizeIdentifier(env.adminUsername);

  if (normalizedIdentifier !== normalizedLegacyUsername && normalizedIdentifier !== normalizeEmail(env.adminUsername)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (password !== env.adminPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const admin: AdminSessionPayload = {
    id: "legacy-owner",
    username: env.adminUsername,
    email: normalizeEmail(env.adminUsername),
    fullName: env.adminUsername,
    role: "owner",
    isMain: true
  };

  return res.json({
    token: signAdminToken(admin),
    tokenType: "Bearer",
    admin
  });
});

router.get("/auth/admin-me", requireAuth, (req: AuthRequest, res) => {
  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({
    id: req.admin.id,
    username: req.admin.username,
    email: req.admin.email,
    fullName: req.admin.fullName,
    role: req.admin.role,
    isMain: req.admin.isMain
  });
});

router.patch("/auth/admin-me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const requestedEmail = normalizeEmail(req.body?.email);
    const current = await fetchCurrentCmsAdmin(req.admin, requestedEmail);
    if (!current) {
      return res.status(404).json({ message: "CMS profile not found for this account" });
    }

    const fullName = String(req.body?.fullName ?? "").trim();
    const email = normalizeEmail(req.body?.email);
    const username = normalizeIdentifier(req.body?.username);
    const currentPassword = String(req.body?.currentPassword ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "").trim();

    if (!fullName || !email || !username) {
      return res.status(400).json({ message: "fullName, email and username are required" });
    }

    const updatePayload: Record<string, unknown> = {};
    if (fullName !== String(current.full_name)) {
      updatePayload.full_name = fullName;
    }
    if (email !== normalizeEmail(current.email)) {
      updatePayload.email = email;
    }
    if (username !== normalizeIdentifier(current.username)) {
      updatePayload.username = username;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
      }

      const passwordValid = await bcrypt.compare(currentPassword, String(current.password_hash ?? ""));
      if (!passwordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      updatePayload.password_hash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: "No changes detected" });
    }

    const rows = await updateRow(
      `/cms_admin_users?id=eq.${encodeURIComponent(current.id)}&limit=1`,
      updatePayload
    );
    const updated = Array.isArray(rows) && rows[0] ? (rows[0] as CmsAdminUserRow) : null;

    if (!updated) {
      return res.status(500).json({ message: "Failed to update profile" });
    }

    const admin = sanitizeAdminUser(updated);
    return res.json({
      message: "Profile updated successfully",
      admin,
      token: signAdminToken(admin),
      tokenType: "Bearer"
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    if (message.toLowerCase().includes("duplicate key value")) {
      return res.status(409).json({ message: "Email or username already exists" });
    }

    return res.status(500).json({ message });
  }
});

router.get("/auth/admin-users", requireAuth, async (req: AuthRequest, res) => {
  if (!assertMainAdmin(req, res)) return;

  try {
    const admins = await fetchAllCmsAdmins();
    const result = admins.map((item) => ({
      id: item.id,
      fullName: item.full_name,
      email: item.email,
      username: item.username,
      role: normalizeCmsRole(item.role),
      isActive: Boolean(item.is_active),
      createdAt: item.created_at
    }));

    return res.json(result);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch admin users"
    });
  }
});

router.post("/auth/admin-users", requireAuth, async (req: AuthRequest, res) => {
  if (!assertMainAdmin(req, res)) return;

  const fullName = String(req.body?.fullName ?? "").trim();
  const email = normalizeEmail(req.body?.email);
  const username = normalizeIdentifier(req.body?.username);
  const password = String(req.body?.password ?? "").trim();
  const role = normalizeCmsRole(req.body?.role);

  if (!fullName || !email || !username || !password) {
    return res.status(400).json({ message: "fullName, email, username, and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const data = await insertRow("/cms_admin_users", {
      full_name: fullName,
      email,
      username,
      password_hash: passwordHash,
      role,
      is_active: true
    });

    const created = Array.isArray(data) ? (data[0] as CmsAdminUserRow | undefined) : undefined;
    if (!created) {
      return res.status(500).json({ message: "Failed to create admin user" });
    }

    return res.status(201).json({
      id: created.id,
      fullName: created.full_name,
      email: created.email,
      username: created.username,
      role: normalizeCmsRole(created.role),
      isActive: Boolean(created.is_active),
      createdAt: created.created_at
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create admin user"
    });
  }
});

router.get("/auth/users", requireAuth, async (req, res) => {
  try {
    const query = String(req.query.q ?? "").trim().toLowerCase();
    const rows = await selectRows("/profiles?select=user_id,full_name,email,created_at&order=created_at.desc&limit=500");

    const users = (Array.isArray(rows) ? rows : [])
      .filter((row: any) => isNonEmptyString(row?.email) && isNonEmptyString(row?.user_id))
      .map((row: any) => ({
        user_id: String(row.user_id),
        full_name: isNonEmptyString(row.full_name) ? row.full_name : "",
        email: String(row.email)
      }))
      .filter((row: { user_id: string; full_name: string; email: string }) => {
        if (!query) return true;
        const email = row.email.toLowerCase();
        const fullName = row.full_name.toLowerCase();
        return email.includes(query) || fullName.includes(query);
      });

    return res.json(users);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to fetch users"
    });
  }
});

router.post("/auth/notify-signup", async (req, res) => {
  try {
    if (!isMailConfigured()) {
      return res.status(500).json({ message: "Email notification is not configured" });
    }

    const rawMethod = String(req.body?.method ?? "").toLowerCase();
    if (rawMethod !== "email" && rawMethod !== "google") {
      return res.status(400).json({ message: "method must be either 'email' or 'google'" });
    }

    const method = rawMethod as SignupMethod;
    const bodyEmail = normalizeEmail(req.body?.email);
    const bodyFullName = String(req.body?.fullName ?? "").trim();

    if (method === "email") {
      if (!bodyEmail) {
        return res.status(400).json({ message: "email is required" });
      }

      const bodyUserId = String(req.body?.userId ?? "").trim();
      const bodyUserCreatedAt = String(
        req.body?.userCreatedAt ?? req.body?.createdAt ?? ""
      ).trim();

      if (bodyUserId && isValidUuid(bodyUserId)) {
        const createdAtMs = Date.parse(bodyUserCreatedAt);
        const isRecentEmailSignup =
          Number.isFinite(createdAtMs) && Date.now() - createdAtMs <= 15 * 60 * 1000;

        if (!isRecentEmailSignup) {
          return res.json({
            status: "ok",
            sentOfficial: false,
            sentUser: false,
            skipped: true
          });
        }

        try {
          await insertRow("/auth_event_notifications", {
            user_id: bodyUserId,
            event_type: "email_first_signup"
          });
        } catch (error: unknown) {
          if (isDuplicateNotificationError(error)) {
            return res.json({
              status: "ok",
              sentOfficial: false,
              sentUser: false,
              skipped: true
            });
          }
          throw error;
        }
      }

      await Promise.all([
        sendOfficialNotification({
          method: "email",
          email: bodyEmail,
          fullName: bodyFullName
        }),
        sendEmailWelcomeEmail(bodyEmail, bodyFullName),
      ]);

      return res.json({
        status: "ok",
        sentOfficial: true,
        sentUser: true,
        skipped: false
      });
    }

    const accessToken = String(req.body?.accessToken ?? "").trim();
    if (!accessToken) {
      return res.status(400).json({ message: "accessToken is required for google notifications" });
    }

    const user = await getSupabaseUserFromToken(accessToken);
    if (!user?.id) {
      return res.status(401).json({ message: "Invalid Google access token" });
    }

    const provider = String(user.app_metadata?.provider ?? "").toLowerCase();
    const identityProviders = Array.isArray(user.identities)
      ? user.identities.map((identity) => String(identity?.provider ?? "").toLowerCase())
      : [];
    const isGoogleAccount = provider === "google" || identityProviders.includes("google");

    if (!isGoogleAccount) {
      return res.status(400).json({ message: "Provided token is not a Google user" });
    }

    const userEmail = normalizeEmail(user.email || bodyEmail);
    if (!userEmail) {
      return res.status(400).json({ message: "Google account email is missing" });
    }

    const createdAtMs = Date.parse(String(user.created_at ?? ""));
    const isRecentGoogleSignup =
      Number.isFinite(createdAtMs) && Date.now() - createdAtMs <= 15 * 60 * 1000;

    if (!isRecentGoogleSignup) {
      return res.json({
        status: "ok",
        sentOfficial: false,
        sentUser: false,
        skipped: true
      });
    }

    const userFullName = String(
      user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        bodyFullName ??
        ""
    ).trim();

    try {
      await insertRow("/auth_event_notifications", {
        user_id: user.id,
        event_type: "google_first_signup"
      });
    } catch (error: unknown) {
      if (isDuplicateNotificationError(error)) {
        return res.json({
          status: "ok",
          sentOfficial: false,
          sentUser: false,
          skipped: true
        });
      }
      throw error;
    }

    await Promise.all([
      sendOfficialNotification({
        method: "google",
        email: userEmail,
        fullName: userFullName
      }),
      sendGoogleWelcomeEmail(userEmail, userFullName)
    ]);

    return res.json({
      status: "ok",
      sentOfficial: true,
      sentUser: true,
      skipped: false
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send signup notification"
    });
  }
});

export default router;
