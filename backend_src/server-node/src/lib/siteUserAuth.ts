import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { env } from "../config/env.js";
import { insertRow, selectRows, updateRow } from "./supabaseRest.js";

export type SiteUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type SiteAuthUser = {
  id: string;
  email: string | null;
  created_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
};

type SiteUserTokenPayload = {
  scope?: string;
  email?: string;
  fullName?: string;
};

type SitePasswordResetTokenRow = {
  user_id: string;
  expires_at: string;
  used_at: string | null;
};

type ProfileRow = {
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type EmployeeRow = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  linked_user_id?: string | null;
  linked_user_email?: string | null;
  status?: string | null;
};

type EmployeeCredentialRow = {
  employee_id?: string | null;
  login_password_preview?: string | null;
};

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
const normalizeName = (value: unknown) => String(value ?? "").trim();
const normalizePassword = (value: unknown) => String(value ?? "").trim();

const hashResetToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const makeRandomPassword = () => crypto.randomBytes(24).toString("hex");

const getPool = () => {
  if (!env.databaseUrl.trim()) {
    throw new Error("Own auth requires DATABASE_URL");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
};

export const isSiteUserAuthEnabled = () => env.databaseUrl.trim().length > 0;

export const ensureSiteUserAuthSchema = async () => {
  if (!isSiteUserAuthEnabled()) {
    throw new Error("Own auth requires DATABASE_URL");
  }

  if (!schemaReady) {
    schemaReady = (async () => {
      const client = getPool();
      await client.query(`
        create table if not exists public.site_users (
          id uuid primary key,
          email text not null unique,
          full_name text,
          password_hash text not null,
          is_active boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          last_login_at timestamptz
        );
      `);
      await client.query(`
        create table if not exists public.site_password_reset_tokens (
          id uuid primary key,
          user_id uuid not null,
          token_hash text not null unique,
          expires_at timestamptz not null,
          used_at timestamptz,
          created_at timestamptz not null default now()
        );
      `);
      await client.query(
        `create index if not exists site_password_reset_tokens_user_id_idx on public.site_password_reset_tokens (user_id);`
      );
      await client.query(
        `create index if not exists site_password_reset_tokens_expires_at_idx on public.site_password_reset_tokens (expires_at);`
      );
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
};

const mapSiteUser = (row: Partial<SiteUserRow> | null | undefined): SiteUserRow | null => {
  if (!row?.id || !row?.email || !row?.password_hash) {
    return null;
  }

  return {
    id: String(row.id),
    email: normalizeEmail(row.email),
    full_name: row.full_name ? String(row.full_name) : null,
    password_hash: String(row.password_hash),
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    last_login_at: row.last_login_at ? String(row.last_login_at) : null,
  };
};

export const toSiteAuthUser = (row: SiteUserRow): SiteAuthUser => {
  const fullName = normalizeName(row.full_name || row.email);
  return {
    id: row.id,
    email: row.email,
    created_at: row.created_at,
    app_metadata: { provider: "email" },
    user_metadata: {
      full_name: fullName,
      name: fullName,
    },
    identities: [{ provider: "email" }],
  };
};

const signSiteUserToken = (row: SiteUserRow) =>
  jwt.sign(
    {
      scope: "site_user",
      email: row.email,
      fullName: normalizeName(row.full_name || row.email),
    },
    env.userAuthToken,
    {
      subject: row.id,
      expiresIn: "30d",
    }
  );

export const createSiteUserSession = (row: SiteUserRow) => {
  const accessToken = signSiteUserToken(row);
  return {
    access_token: accessToken,
    token_type: "Bearer" as const,
    user: toSiteAuthUser(row),
  };
};

export const findSiteUserById = async (id: string): Promise<SiteUserRow | null> => {
  const normalizedId = String(id ?? "").trim();
  if (!normalizedId || !isUuid(normalizedId)) return null;

  await ensureSiteUserAuthSchema();
  const result = await getPool().query<SiteUserRow>(
    `
      select id, email, full_name, password_hash, is_active, created_at, updated_at, last_login_at
      from public.site_users
      where id = $1
      limit 1
    `,
    [normalizedId]
  );

  return mapSiteUser(result.rows[0]);
};

export const findSiteUserByEmail = async (email: string): Promise<SiteUserRow | null> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  await ensureSiteUserAuthSchema();
  const result = await getPool().query<SiteUserRow>(
    `
      select id, email, full_name, password_hash, is_active, created_at, updated_at, last_login_at
      from public.site_users
      where email = $1
      limit 1
    `,
    [normalizedEmail]
  );

  return mapSiteUser(result.rows[0]);
};

export const updateSiteUserPassword = async (userId: string, password: string) => {
  const normalizedPassword = normalizePassword(password);
  if (normalizedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  await ensureSiteUserAuthSchema();
  const passwordHash = await bcrypt.hash(normalizedPassword, 10);
  await getPool().query(
    `
      update public.site_users
      set password_hash = $2, updated_at = now()
      where id = $1
    `,
    [userId, passwordHash]
  );
};

export const updateSiteUserProfile = async (
  userId: string,
  payload: { email?: string | null; fullName?: string | null; isActive?: boolean }
): Promise<SiteUserRow | null> => {
  await ensureSiteUserAuthSchema();

  const assignments: string[] = [];
  const values: unknown[] = [];
  let parameterIndex = 2;

  if (typeof payload.email === "string" && normalizeEmail(payload.email)) {
    assignments.push(`email = $${parameterIndex++}`);
    values.push(normalizeEmail(payload.email));
  }

  if ("fullName" in payload) {
    assignments.push(`full_name = $${parameterIndex++}`);
    values.push(normalizeName(payload.fullName) || null);
  }

  if (typeof payload.isActive === "boolean") {
    assignments.push(`is_active = $${parameterIndex++}`);
    values.push(payload.isActive);
  }

  if (assignments.length === 0) {
    return findSiteUserById(userId);
  }

  assignments.push(`updated_at = now()`);

  const result = await getPool().query<SiteUserRow>(
    `
      update public.site_users
      set ${assignments.join(", ")}
      where id = $1
      returning id, email, full_name, password_hash, is_active, created_at, updated_at, last_login_at
    `,
    [userId, ...values]
  );

  return mapSiteUser(result.rows[0]);
};

const insertSiteUser = async (params: {
  id?: string;
  email: string;
  fullName?: string | null;
  passwordHash: string;
}) => {
  await ensureSiteUserAuthSchema();

  const normalizedEmail = normalizeEmail(params.email);
  const normalizedFullName = normalizeName(params.fullName);
  const explicitId = String(params.id ?? "").trim();
  const id = explicitId && isUuid(explicitId) ? explicitId : crypto.randomUUID();

  const result = await getPool().query<SiteUserRow>(
    `
      insert into public.site_users (id, email, full_name, password_hash)
      values ($1, $2, $3, $4)
      returning id, email, full_name, password_hash, is_active, created_at, updated_at, last_login_at
    `,
    [id, normalizedEmail, normalizedFullName || null, params.passwordHash]
  );

  return mapSiteUser(result.rows[0]);
};

export const createSiteUser = async (params: {
  id?: string;
  email: string;
  fullName?: string | null;
  password: string;
}) => {
  const normalizedPassword = normalizePassword(params.password);
  if (normalizedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, 10);
  return insertSiteUser({
    id: params.id,
    email: params.email,
    fullName: params.fullName,
    passwordHash,
  });
};

export const verifySiteUserPassword = async (row: SiteUserRow, password: string) =>
  bcrypt.compare(normalizePassword(password), row.password_hash);

export const recordSiteUserLogin = async (userId: string) => {
  await ensureSiteUserAuthSchema();
  await getPool().query(
    `
      update public.site_users
      set last_login_at = now(), updated_at = now()
      where id = $1
    `,
    [userId]
  );
};

export const getSiteUserFromToken = async (accessToken: string): Promise<SiteAuthUser | null> => {
  const token = String(accessToken ?? "").trim();
  if (!token) return null;

  try {
    const payload = jwt.verify(token, env.userAuthToken) as SiteUserTokenPayload;
    if (payload?.scope !== "site_user") {
      return null;
    }

    const userId = String((payload as { sub?: string }).sub ?? "").trim();
    if (!userId) {
      return null;
    }
    const user = await findSiteUserById(userId);
    if (!user || !user.is_active) {
      return null;
    }

    return toSiteAuthUser(user);
  } catch {
    return null;
  }
};

export const findProfileByEmail = async (email: string): Promise<ProfileRow | null> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const rows = await selectRows(
    `/profiles?email=ilike.${encodeURIComponent(normalizedEmail)}&order=created_at.desc&limit=1`
  );

  return Array.isArray(rows) && rows[0] ? (rows[0] as ProfileRow) : null;
};

export const ensureProfileRecord = async (userId: string, email: string, fullName?: string | null) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedFullName = normalizeName(fullName);

  const rows = await selectRows(
    `/profiles?user_id=eq.${encodeURIComponent(userId)}&limit=1`
  );
  const existing = Array.isArray(rows) ? (rows[0] as ProfileRow | undefined) : undefined;

  if (existing?.user_id) {
    const patch: Record<string, unknown> = {};

    if (normalizedEmail && normalizeEmail(existing.email) !== normalizedEmail) {
      patch.email = normalizedEmail;
    }

    if (normalizedFullName && normalizeName(existing.full_name) !== normalizedFullName) {
      patch.full_name = normalizedFullName;
    }

    if (Object.keys(patch).length > 0) {
      await updateRow(`/profiles?user_id=eq.${encodeURIComponent(userId)}`, patch);
    }
    return;
  }

  await insertRow("/profiles", {
    user_id: userId,
    email: normalizedEmail || null,
    full_name: normalizedFullName || null,
  });
};

const findEmployeeByEmail = async (email: string): Promise<EmployeeRow | null> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const rows = await selectRows(
    `/employees?email=ilike.${encodeURIComponent(normalizedEmail)}&status=eq.live&order=created_at.desc&limit=1`
  );

  return Array.isArray(rows) && rows[0] ? (rows[0] as EmployeeRow) : null;
};

const findEmployeeCredentialByEmployeeId = async (employeeId: string): Promise<EmployeeCredentialRow | null> => {
  const normalizedEmployeeId = String(employeeId ?? "").trim();
  if (!normalizedEmployeeId) return null;

  const rows = await selectRows(
    `/employee_login_credentials?employee_id=eq.${encodeURIComponent(normalizedEmployeeId)}&limit=1`
  );

  return Array.isArray(rows) && rows[0] ? (rows[0] as EmployeeCredentialRow) : null;
};

export const syncEmployeeSiteUser = async (params: {
  email: string;
  fullName: string;
  loginPassword?: string | null;
  existingLinkedUserId?: string | null;
  requirePasswordForCreate?: boolean;
}) => {
  const email = normalizeEmail(params.email);
  const fullName = normalizeName(params.fullName);
  const loginPassword = normalizePassword(params.loginPassword);
  const existingLinkedUserId = String(params.existingLinkedUserId ?? "").trim();
  const requirePasswordForCreate = Boolean(params.requirePasswordForCreate);

  if (!email) {
    throw new Error("Employee email is required for login account");
  }

  let user = existingLinkedUserId ? await findSiteUserById(existingLinkedUserId) : null;
  if (!user) {
    user = await findSiteUserByEmail(email);
  }

  if (!user) {
    if (!loginPassword) {
      if (requirePasswordForCreate) {
        throw new Error("Login password is required to create employee login");
      }

      return {
        linkedUserId: existingLinkedUserId && isUuid(existingLinkedUserId) ? existingLinkedUserId : null,
        linkedUserEmail: email,
      };
    }

    const created = await createSiteUser({
      id: existingLinkedUserId && isUuid(existingLinkedUserId) ? existingLinkedUserId : undefined,
      email,
      fullName,
      password: loginPassword,
    });

    return {
      linkedUserId: created?.id ?? null,
      linkedUserEmail: created?.email ?? email,
    };
  }

  const updates: { email?: string | null; fullName?: string | null } = {};
  if (user.email !== email) {
    updates.email = email;
  }

  if (normalizeName(user.full_name) !== fullName) {
    updates.fullName = fullName;
  }

  if (updates.email || updates.fullName) {
    user = await updateSiteUserProfile(user.id, updates);
  }

  if (loginPassword) {
    await updateSiteUserPassword(user!.id, loginPassword);
  }

  return {
    linkedUserId: user?.id ?? null,
    linkedUserEmail: user?.email ?? email,
  };
};

export const bootstrapEmployeeSiteUserFromPreview = async (email: string, password: string) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  if (!normalizedEmail || !normalizedPassword) return null;

  const existingUser = await findSiteUserByEmail(normalizedEmail);
  if (existingUser) {
    return existingUser;
  }

  const employee = await findEmployeeByEmail(normalizedEmail);
  const employeeId = String(employee?.id ?? "").trim();
  if (!employeeId) {
    return null;
  }

  const credential = await findEmployeeCredentialByEmployeeId(employeeId);
  const previewPassword = normalizePassword(credential?.login_password_preview);
  if (!previewPassword || previewPassword !== normalizedPassword) {
    return null;
  }

  const explicitId = String(employee?.linked_user_id ?? "").trim();
  const user = await createSiteUser({
    id: explicitId && isUuid(explicitId) ? explicitId : undefined,
    email: normalizedEmail,
    fullName: normalizeName(employee?.name || normalizedEmail),
    password: normalizedPassword,
  });

  await updateRow(`/employees?id=eq.${encodeURIComponent(employeeId)}`, {
    linked_user_id: user?.id ?? null,
    linked_user_email: normalizedEmail,
  });

  return user;
};

const ensureSiteUserForPasswordReset = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  let user = await findSiteUserByEmail(normalizedEmail);
  if (user) return user;

  const employee = await findEmployeeByEmail(normalizedEmail);
  const employeeId = String(employee?.id ?? "").trim();
  if (employeeId) {
    const explicitId = String(employee?.linked_user_id ?? "").trim();
    user = await createSiteUser({
      id: explicitId && isUuid(explicitId) ? explicitId : undefined,
      email: normalizedEmail,
      fullName: normalizeName(employee?.name || normalizedEmail),
      password: makeRandomPassword(),
    });

    await updateRow(`/employees?id=eq.${encodeURIComponent(employeeId)}`, {
      linked_user_id: user?.id ?? null,
      linked_user_email: normalizedEmail,
    });

    return user;
  }

  const profile = await findProfileByEmail(normalizedEmail);
  if (!profile?.user_id && !normalizeName(profile?.full_name) && !normalizeEmail(profile?.email)) {
    return null;
  }

  const explicitId = String(profile?.user_id ?? "").trim();
  const fullName = normalizeName(profile?.full_name || normalizedEmail);

  user = await createSiteUser({
    id: explicitId && isUuid(explicitId) ? explicitId : undefined,
    email: normalizedEmail,
    fullName,
    password: makeRandomPassword(),
  });

  await ensureProfileRecord(user!.id, normalizedEmail, fullName);
  return user;
};

export const issuePasswordResetTokenForEmail = async (email: string) => {
  const user = await ensureSiteUserForPasswordReset(email);
  if (!user) return null;

  await ensureSiteUserAuthSchema();
  const rawToken = `${crypto.randomUUID()}${crypto.randomBytes(16).toString("hex")}`;
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();

  await getPool().query(
    `
      insert into public.site_password_reset_tokens (id, user_id, token_hash, expires_at)
      values ($1, $2, $3, $4)
    `,
    [crypto.randomUUID(), user.id, tokenHash, expiresAt]
  );

  return {
    user,
    token: rawToken,
    expiresAt,
  };
};

export const consumePasswordResetToken = async (token: string, nextPassword: string) => {
  const normalizedToken = String(token ?? "").trim();
  if (!normalizedToken) {
    throw new Error("Reset token is required");
  }

  const normalizedPassword = normalizePassword(nextPassword);
  if (normalizedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  await ensureSiteUserAuthSchema();
  const tokenHash = hashResetToken(normalizedToken);
  const result = await getPool().query<SitePasswordResetTokenRow>(
    `
      select user_id, expires_at, used_at
      from public.site_password_reset_tokens
      where token_hash = $1
      limit 1
    `,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("This reset link is invalid or has already been used");
  }

  if (row.used_at) {
    throw new Error("This reset link has already been used");
  }

  const expiresAtMs = Date.parse(String(row.expires_at ?? ""));
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    throw new Error("This reset link has expired");
  }

  await updateSiteUserPassword(String(row.user_id), normalizedPassword);
  await getPool().query(
    `
      update public.site_password_reset_tokens
      set used_at = now()
      where token_hash = $1
    `,
    [tokenHash]
  );

  return findSiteUserById(String(row.user_id));
};
