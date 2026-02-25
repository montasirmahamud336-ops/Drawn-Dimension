import { Router } from "express";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { getSupabaseUserFromToken } from "../middleware/userAuth.js";
import { insertRow, selectRows } from "../lib/supabaseRest.js";
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

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "Username and password required" });
  }

  if (username !== env.adminUsername) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (password !== env.adminPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({ token: env.adminToken, tokenType: "Bearer" });
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
