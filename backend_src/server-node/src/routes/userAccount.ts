import crypto from "crypto";
import { Router } from "express";
import nodemailer from "nodemailer";
import {
  bootstrapEmployeeSiteUserFromPreview,
  consumePasswordResetToken,
  createSiteUser,
  createSiteUserSession,
  ensureProfileRecord,
  findProfileByEmail,
  findSiteUserByEmail,
  isSiteUserAuthEnabled,
  issuePasswordResetTokenForEmail,
  recordSiteUserLogin,
  toSiteAuthUser,
  updateSiteUserProfile,
  verifySiteUserPassword,
} from "../lib/siteUserAuth.js";
import { isGoogleAuthConfigured, verifyGoogleIdToken } from "../lib/googleAuth.js";
import { insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";
import { env } from "../config/env.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;

const normalizeText = (value: unknown, maxLength = 4000) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, maxLength);
};

const normalizeEmail = (value: unknown) => normalizeText(value, 320).toLowerCase();
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );

const normalizeOptionalUrl = (value: unknown) => {
  const text = normalizeText(value);
  if (!text) return null;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

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

const buildPasswordResetHtml = (payload: { fullName: string; email: string; resetUrl: string }) => {
  const safeName = escapeHtml(payload.fullName || payload.email || "there");
  const safeEmail = escapeHtml(payload.email);
  const safeUrl = escapeHtml(payload.resetUrl);
  const logoUrl = getBrandLogoUrl();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #ececec; border-radius: 12px; overflow: hidden;">
      <div style="padding: 20px; background: linear-gradient(120deg,#0f172a,#1e293b); color: #fff; text-align: center;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="56" height="56" style="display:block;margin:0 auto 10px;border-radius:10px;object-fit:cover;" />
        <h2 style="margin: 0; font-size: 22px;">Reset Your Password</h2>
      </div>
      <div style="padding: 22px;">
        <p style="margin: 0 0 12px; font-size: 15px;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px; font-size: 15px;">We received a request to reset the password for <strong>${safeEmail}</strong>.</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">Use the button below to set a new password. This link expires in 2 hours.</p>
        <a href="${safeUrl}" style="display:inline-block;padding:10px 16px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
      </div>
    </div>
  `;
};

const sendPasswordResetEmail = async (payload: { fullName: string; email: string; resetUrl: string }) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: payload.email,
    subject: "Reset your DrawnDimension password",
    html: buildPasswordResetHtml(payload),
  });
};

const assertOwnAuthEnabled = (res: any) => {
  if (!isSiteUserAuthEnabled()) {
    res.status(503).json({ message: "Own auth requires DATABASE_URL" });
    return false;
  }
  return true;
};

router.post("/auth/user-signup", async (req, res) => {
  if (!assertOwnAuthEnabled(res)) return;

  try {
    const email = normalizeEmail(req.body?.email);
    const password = normalizeText(req.body?.password, 200);
    const fullName = normalizeText(req.body?.fullName ?? req.body?.full_name ?? "", 160);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await findSiteUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "An account already exists for this email" });
    }

    const existingProfile = await findProfileByEmail(email);
    const existingProfileUserId = String(existingProfile?.user_id ?? "").trim();
    const displayName = fullName || normalizeText(existingProfile?.full_name, 160) || email;

    const user = await createSiteUser({
      id: existingProfileUserId || undefined,
      email,
      fullName: displayName,
      password,
    });

    if (!user) {
      throw new Error("Failed to create account");
    }

    await ensureProfileRecord(user.id, email, displayName);

    return res.status(201).json({
      user: toSiteAuthUser(user),
      createdAt: user.created_at,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create account",
    });
  }
});

router.post("/auth/user-login", async (req, res) => {
  if (!assertOwnAuthEnabled(res)) return;

  try {
    const email = normalizeEmail(req.body?.email);
    const password = normalizeText(req.body?.password, 200);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let user = await findSiteUserByEmail(email);
    if (!user) {
      user = await bootstrapEmployeeSiteUserFromPreview(email, password);
    }

    if (!user) {
      const existingProfile = await findProfileByEmail(email);
      if (existingProfile?.user_id) {
        return res.status(401).json({
          message: "Your old account needs a new local password. Please use Forgot password once to activate it.",
        });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "This account is inactive" });
    }

    const isPasswordValid = await verifySiteUserPassword(user, password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await recordSiteUserLogin(user.id);
    const session = createSiteUserSession(user);

    return res.json({
      token: session.access_token,
      tokenType: session.token_type,
      session,
      user: session.user,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to sign in",
    });
  }
});

router.post("/auth/user-google", async (req, res) => {
  if (!assertOwnAuthEnabled(res)) return;

  if (!isGoogleAuthConfigured()) {
    return res.status(503).json({ message: "Google sign-in is not configured" });
  }

  try {
    const idToken = normalizeText(req.body?.idToken, 5000);
    if (!idToken) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const googleIdentity = await verifyGoogleIdToken(idToken);
    if (!googleIdentity?.email) {
      return res.status(401).json({ message: "Invalid Google credential" });
    }

    const email = normalizeEmail(googleIdentity.email);
    const existingProfile = await findProfileByEmail(email);
    const existingProfileUserId = String(existingProfile?.user_id ?? "").trim();
    const displayName =
      normalizeText(googleIdentity.name, 160) ||
      normalizeText(existingProfile?.full_name, 160) ||
      email;

    let user = await findSiteUserByEmail(email);
    let created = false;

    if (!user) {
      user = await createSiteUser({
        id: existingProfileUserId && isUuid(existingProfileUserId) ? existingProfileUserId : undefined,
        email,
        fullName: displayName,
        password: crypto.randomBytes(24).toString("hex"),
      });
      created = true;
    }

    if (!user) {
      throw new Error("Failed to create Google account");
    }

    const currentFullName = normalizeText(user.full_name, 160);
    if (displayName && (!currentFullName || currentFullName === user.email)) {
      user =
        (await updateSiteUserProfile(user.id, {
          fullName: displayName,
        })) ?? user;
    }

    await ensureProfileRecord(user.id, email, displayName);

    if (googleIdentity.picture) {
      const profileRows = await selectRows(
        `/profiles?user_id=eq.${encodeURIComponent(user.id)}&limit=1`
      );
      const profile = Array.isArray(profileRows) ? profileRows[0] ?? null : null;
      const avatarUrl = normalizeOptionalUrl(googleIdentity.picture);

      if (avatarUrl && (!profile?.avatar_url || !String(profile.avatar_url).trim())) {
        await updateRow(`/profiles?user_id=eq.${encodeURIComponent(user.id)}`, {
          avatar_url: avatarUrl,
        });
      }
    }

    await recordSiteUserLogin(user.id);
    const session = createSiteUserSession(user);

    return res.json({
      token: session.access_token,
      tokenType: session.token_type,
      session,
      user: session.user,
      created,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to sign in with Google",
    });
  }
});

router.get("/auth/user-me", requireUserAuth, async (req: UserAuthRequest, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json(req.user);
});

router.post("/auth/user-password-request", async (req, res) => {
  if (!assertOwnAuthEnabled(res)) return;

  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const issued = await issuePasswordResetTokenForEmail(email);
    if (issued && isMailConfigured()) {
      const resetUrl = `${env.siteBaseUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(issued.token)}`;
      const fullName =
        normalizeText(issued.user.full_name, 160) ||
        normalizeText(issued.user.email, 160) ||
        "there";

      await sendPasswordResetEmail({
        fullName,
        email: issued.user.email,
        resetUrl,
      });
    }

    return res.json({ status: "ok" });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send reset email",
    });
  }
});

router.post("/auth/user-password-reset", async (req, res) => {
  if (!assertOwnAuthEnabled(res)) return;

  try {
    const token = normalizeText(req.body?.token, 500);
    const password = normalizeText(req.body?.password, 200);

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await consumePasswordResetToken(token, password);
    if (!user) {
      throw new Error("Failed to update password");
    }

    return res.json({
      status: "ok",
      user: toSiteAuthUser(user),
    });
  } catch (error: unknown) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update password",
    });
  }
});

router.get("/me/profile", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rows = await selectRows(
      `/profiles?user_id=eq.${encodeURIComponent(user.id)}&limit=1`
    );
    const profile = Array.isArray(rows) ? rows[0] ?? null : null;

    if (!profile) {
      return res.json({
        full_name: normalizeText(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "", 160) || null,
        email: user.email ?? null,
        company: null,
        avatar_url: null,
        bio: null,
        job_role: null,
      });
    }

    return res.json(profile);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load profile",
    });
  }
});

router.patch("/me/profile", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fullName = normalizeText(req.body?.full_name, 160);
    const email = normalizeEmail(req.body?.email || user.email);
    const patch: Record<string, unknown> = {
      full_name: fullName || null,
      email: email || null,
      company: normalizeText(req.body?.company, 160) || null,
      avatar_url:
        req.body?.avatar_url === null || String(req.body?.avatar_url ?? "").trim() === ""
          ? null
          : normalizeOptionalUrl(req.body?.avatar_url),
      bio: normalizeText(req.body?.bio, 2000) || null,
      job_role: normalizeText(req.body?.job_role, 160) || null,
    };

    if (patch.avatar_url === null && req.body?.avatar_url && String(req.body?.avatar_url).trim()) {
      return res.status(400).json({ message: "Avatar URL must be a valid http/https URL" });
    }

    const existingRows = await selectRows(
      `/profiles?user_id=eq.${encodeURIComponent(user.id)}&limit=1`
    );
    const existing = Array.isArray(existingRows) ? existingRows[0] ?? null : null;

    if (existing) {
      await updateRow(`/profiles?user_id=eq.${encodeURIComponent(user.id)}`, patch);
    } else {
      await insertRow("/profiles", {
        user_id: user.id,
        ...patch,
      });
    }

    if (isSiteUserAuthEnabled()) {
      await updateSiteUserProfile(user.id, {
        email,
        fullName: fullName || null,
      });
    }

    const refreshedRows = await selectRows(
      `/profiles?user_id=eq.${encodeURIComponent(user.id)}&limit=1`
    );
    const refreshed = Array.isArray(refreshedRows) ? refreshedRows[0] ?? null : null;

    return res.json(refreshed ?? patch);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update profile",
    });
  }
});

router.get("/me/quotes", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rows = await selectRows(
      `/quotes?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`
    );

    return res.json(Array.isArray(rows) ? rows : []);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load quotes",
    });
  }
});

export default router;
