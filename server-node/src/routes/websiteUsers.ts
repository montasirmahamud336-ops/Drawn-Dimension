import { Router } from "express";
import { requireAuth, requireOwner } from "../middleware/auth.js";
import { executeSql } from "../lib/database.js";

const router = Router();

let indexInitialized = false;
const ensureIndexes = async () => {
  if (indexInitialized) return;
  try {
    await executeSql(`
      CREATE INDEX IF NOT EXISTS site_users_created_at_idx ON public.site_users (created_at DESC);
      CREATE INDEX IF NOT EXISTS site_users_email_idx ON public.site_users (email);
    `);
    indexInitialized = true;
  } catch (error) {
    console.warn("Failed to ensure website_users indexes:", error);
  }
};

type SafeWebsiteUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  avatar_url: string | null;
  company: string | null;
  phone: string | null;
  job_role: string | null;
  bio: string | null;
};

const SAFE_USER_SELECT_FIELDS = `
  u.id,
  u.email,
  COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(u.full_name), ''), u.email) as full_name,
  u.is_active,
  u.created_at,
  u.last_login_at,
  p.avatar_url,
  p.company,
  p.phone,
  p.job_role,
  p.bio
`;

// GET /website-users/export - Safe list for CSV export
router.get(["/website-users/export", "/api/website-users/export"], requireAuth, requireOwner, async (req, res) => {
  await ensureIndexes();
  try {
    const rawSearch = String(req.query.search ?? "").trim();
    const rawStatus = String(req.query.status ?? "all").trim().toLowerCase();

    const whereClauses: string[] = [];
    const queryValues: unknown[] = [];
    let paramIndex = 1;

    if (rawSearch) {
      whereClauses.push(
        `(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR p.full_name ILIKE $${paramIndex} OR p.company ILIKE $${paramIndex} OR p.job_role ILIKE $${paramIndex})`
      );
      queryValues.push(`%${rawSearch}%`);
      paramIndex++;
    }

    if (rawStatus === "active") {
      whereClauses.push(`u.is_active = true`);
    } else if (rawStatus === "inactive") {
      whereClauses.push(`u.is_active = false`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
      SELECT ${SAFE_USER_SELECT_FIELDS}
      FROM public.site_users u
      LEFT JOIN public.profiles p ON u.id = p.user_id
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT 5000
    `;

    const result = await executeSql<SafeWebsiteUser>(sql, queryValues);

    return res.json({ users: result.rows });
  } catch (error: unknown) {
    console.error("Error in /website-users/export:", error);
    return res.status(500).json({ message: "Failed to export website users" });
  }
});

// GET /website-users - Paginated & searchable website user accounts list
router.get(["/website-users", "/api/website-users"], requireAuth, requireOwner, async (req, res) => {
  await ensureIndexes();
  try {
    const rawSearch = String(req.query.search ?? "").trim();
    const rawStatus = String(req.query.status ?? "all").trim().toLowerCase();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const queryValues: unknown[] = [];
    let paramIndex = 1;

    if (rawSearch) {
      whereClauses.push(
        `(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR p.full_name ILIKE $${paramIndex} OR p.company ILIKE $${paramIndex} OR p.job_role ILIKE $${paramIndex})`
      );
      queryValues.push(`%${rawSearch}%`);
      paramIndex++;
    }

    if (rawStatus === "active") {
      whereClauses.push(`u.is_active = true`);
    } else if (rawStatus === "inactive") {
      whereClauses.push(`u.is_active = false`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT u.id)::int as total
      FROM public.site_users u
      LEFT JOIN public.profiles p ON u.id = p.user_id
      ${whereSql}
    `;
    const countResult = await executeSql<{ total: number }>(countSql, queryValues);
    const totalCount = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Data query
    const dataSql = `
      SELECT ${SAFE_USER_SELECT_FIELDS}
      FROM public.site_users u
      LEFT JOIN public.profiles p ON u.id = p.user_id
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await executeSql<SafeWebsiteUser>(dataSql, [...queryValues, limit, offset]);

    return res.json({
      users: dataResult.rows,
      totalCount,
      page,
      limit,
      totalPages,
    });
  } catch (error: unknown) {
    console.error("Error in GET /website-users:", error);
    return res.status(500).json({ message: "Failed to fetch website users" });
  }
});

// GET /website-users/:id - Single website user profile detail view
router.get(["/website-users/:id", "/api/website-users/:id"], requireAuth, requireOwner, async (req, res) => {
  await ensureIndexes();
  try {
    const userId = String(req.params.id ?? "").trim();
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const sql = `
      SELECT ${SAFE_USER_SELECT_FIELDS}
      FROM public.site_users u
      LEFT JOIN public.profiles p ON u.id = p.user_id
      WHERE u.id = $1
      LIMIT 1
    `;

    const result = await executeSql<SafeWebsiteUser>(sql, [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "Website user not found" });
    }

    return res.json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch user details";
    console.error(`Error in GET /website-users/${req.params.id}:`, error);
    return res.status(500).json({ message });
  }
});

export default router;
