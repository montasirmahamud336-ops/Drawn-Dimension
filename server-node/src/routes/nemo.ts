import { Router, Request, Response } from "express";
import { executeSql } from "../lib/database.js";
import { getUserFromAccessToken } from "../middleware/userAuth.js";
import {
  buildNemoSystemPrompt,
  callGeminiForRoast,
  extractTimelineData,
  generateOfflineNemoRoast,
  updateMemoryProfile,
  type ChatMessage,
  type UserMemoryProfile,
} from "../lib/nemoRoastEngine.js";

const router = Router();

// Fallback in-memory stores per user_id (guarantees strict per-user isolation even if DB offline)
const fallbackProfiles = new Map<string, UserMemoryProfile>();
const fallbackSessions = new Map<string, any[]>();

const defaultProfile: UserMemoryProfile = {
  weaknesses: [],
  insultsReceived: 0,
};

let schemaReady: Promise<void> | null = null;
const ensureNemoSchema = async () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      try {
        await executeSql(`
          CREATE TABLE IF NOT EXISTS public.nemo_user_profiles (
            user_id UUID PRIMARY KEY,
            name TEXT,
            age INTEGER,
            profession TEXT,
            relationship_status TEXT,
            weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
            insults_received INTEGER NOT NULL DEFAULT 0,
            custom_memory JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS public.nemo_chat_sessions (
            id TEXT PRIMARY KEY,
            user_id UUID NOT NULL,
            title TEXT NOT NULL DEFAULT 'New Roast Chat',
            messages JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE INDEX IF NOT EXISTS idx_nemo_chat_sessions_user_id ON public.nemo_chat_sessions(user_id);
        `);
      } catch (err) {
        console.warn("Could not ensure nemo tables in PostgreSQL (fallback in-memory store active):", err);
      }
    })();
  }
  return schemaReady;
};

// Helper to authenticate user from Bearer token or request payload
async function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const user = await getUserFromAccessToken(token);
        if (user) return user;
      } catch (err) {
        console.warn("Token verification failed in getAuthUser:", err);
      }
    }
  }

  // Fallback to explicit userId provided in body or query if token is absent
  const bodyUserId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  const queryUserId = typeof req.query?.userId === "string" ? req.query.userId.trim() : "";
  const effectiveUserId = bodyUserId || queryUserId;

  if (effectiveUserId) {
    return {
      id: effectiveUserId,
      email: null,
      user_metadata: {},
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// 1. NEMO STATUS
// ─────────────────────────────────────────────────────────────
router.get("/api/nemo/status", (_req: Request, res: Response) => {
  const hasServerKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  return res.json({
    status: "online",
    hasServerKey,
    model: "gemini-1.5-flash",
    persona: "Nemo (Savage Bangladeshi Roast AI)",
  });
});

// ─────────────────────────────────────────────────────────────
// 2. GET USER PROFILE (ISOLATED PER USER)
// ─────────────────────────────────────────────────────────────
router.get("/api/nemo/profile", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await ensureNemoSchema();

  try {
    const result = await executeSql<{
      user_id: string;
      name: string | null;
      age: number | null;
      profession: string | null;
      relationship_status: string | null;
      weaknesses: any;
      insults_received: number;
    }>(
      `SELECT name, age, profession, relationship_status, weaknesses, insults_received FROM public.nemo_user_profiles WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const userMeta = user.user_metadata as Record<string, unknown> | undefined;
      const userMetaName = typeof userMeta?.full_name === "string" ? userMeta.full_name : undefined;
      const profile: UserMemoryProfile = {
        name: row.name || userMetaName || undefined,
        age: row.age || undefined,
        profession: row.profession || undefined,
        relationshipStatus: row.relationship_status || undefined,
        weaknesses: Array.isArray(row.weaknesses) ? row.weaknesses : [],
        insultsReceived: Number(row.insults_received) || 0,
      };

      return res.json({
        profile,
        isComplete: Boolean(profile.name && profile.age && profile.profession),
      });
    }
  } catch (err) {
    console.warn("DB error fetching nemo profile, checking fallback store:", err);
  }

  // Fallback in-memory
  const cached = fallbackProfiles.get(user.id);
  const fallbackUserMeta = user.user_metadata as Record<string, unknown> | undefined;
  const profile: UserMemoryProfile = cached || {
    name: (typeof fallbackUserMeta?.full_name === "string" ? fallbackUserMeta.full_name : undefined) || (user.email ? user.email.split("@")[0] : undefined),
    weaknesses: [],
    insultsReceived: 0,
  };

  return res.json({
    profile,
    isComplete: Boolean(profile.name && profile.age && profile.profession),
  });
});

// ─────────────────────────────────────────────────────────────
// 3. UPDATE / SAVE USER PROFILE (FIRST-TIME ONBOARDING & UPDATES)
// ─────────────────────────────────────────────────────────────
router.post("/api/nemo/profile", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, age, profession, relationshipStatus } = req.body;
  const parsedAge = age ? parseInt(String(age), 10) : undefined;
  const cleanName = typeof name === "string" ? name.trim() : undefined;
  const cleanProfession = typeof profession === "string" ? profession.trim() : undefined;
  const cleanRelationship = typeof relationshipStatus === "string" ? relationshipStatus.trim() : undefined;

  await ensureNemoSchema();

  try {
    await executeSql(
      `INSERT INTO public.nemo_user_profiles (user_id, name, age, profession, relationship_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, nemo_user_profiles.name),
         age = COALESCE(EXCLUDED.age, nemo_user_profiles.age),
         profession = COALESCE(EXCLUDED.profession, nemo_user_profiles.profession),
         relationship_status = COALESCE(EXCLUDED.relationship_status, nemo_user_profiles.relationship_status),
         updated_at = now();`,
      [user.id, cleanName || null, parsedAge || null, cleanProfession || null, cleanRelationship || null]
    );
  } catch (err) {
    console.warn("DB error saving nemo profile, using fallback store:", err);
  }

  // Update fallback store as well
  const existing = fallbackProfiles.get(user.id) || { weaknesses: [], insultsReceived: 0 };
  const updated: UserMemoryProfile = {
    ...existing,
    name: cleanName || existing.name,
    age: parsedAge || existing.age,
    profession: cleanProfession || existing.profession,
    relationshipStatus: cleanRelationship || existing.relationshipStatus,
  };
  fallbackProfiles.set(user.id, updated);

  return res.json({
    success: true,
    profile: updated,
    isComplete: Boolean(updated.name && updated.age && updated.profession),
  });
});

// ─────────────────────────────────────────────────────────────
// 4. GET CHAT SESSIONS FOR AUTHENTICATED USER
// ─────────────────────────────────────────────────────────────
router.get("/api/nemo/sessions", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await ensureNemoSchema();

  try {
    const result = await executeSql<{
      id: string;
      title: string;
      messages: any;
      updated_at: string;
    }>(
      `SELECT id, title, messages, updated_at FROM public.nemo_chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC`,
      [user.id]
    );

    const sessions = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      messages: Array.isArray(row.messages) ? row.messages : [],
      updatedAt: new Date(row.updated_at).getTime(),
    }));

    return res.json({ sessions });
  } catch (err) {
    console.warn("DB error fetching nemo sessions, checking fallback store:", err);
  }

  const cached = fallbackSessions.get(user.id) || [];
  return res.json({ sessions: cached });
});

// ─────────────────────────────────────────────────────────────
// 5. SAVE / UPDATE CHAT SESSION FOR AUTHENTICATED USER
// ─────────────────────────────────────────────────────────────
router.post("/api/nemo/sessions", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, title = "New Roast Chat", messages = [] } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Session id required" });
  }

  await ensureNemoSchema();

  try {
    await executeSql(
      `INSERT INTO public.nemo_chat_sessions (id, user_id, title, messages, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         messages = EXCLUDED.messages,
         updated_at = now()
       WHERE nemo_chat_sessions.user_id = $2;`,
      [id, user.id, title, JSON.stringify(messages)]
    );
  } catch (err) {
    console.warn("DB error saving nemo session, saving to fallback store:", err);
  }

  const current = fallbackSessions.get(user.id) || [];
  const existingIdx = current.findIndex((s) => s.id === id);
  const sessionItem = { id, title, messages, updatedAt: Date.now() };

  if (existingIdx >= 0) {
    current[existingIdx] = sessionItem;
  } else {
    current.unshift(sessionItem);
  }
  fallbackSessions.set(user.id, current);

  return res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────
// 6. DELETE CHAT SESSION FOR AUTHENTICATED USER
// ─────────────────────────────────────────────────────────────
router.delete("/api/nemo/sessions/:id", async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;

  await ensureNemoSchema();

  try {
    await executeSql(
      `DELETE FROM public.nemo_chat_sessions WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );
  } catch (err) {
    console.warn("DB error deleting session:", err);
  }

  const current = fallbackSessions.get(user.id) || [];
  fallbackSessions.set(user.id, current.filter((s) => s.id !== id));

  return res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────
// 7. MAIN ROAST CHAT (ISOLATED CONTEXT & PERSONAL WEAPONIZATION)
// ─────────────────────────────────────────────────────────────
router.post("/api/nemo/chat", async (req: Request, res: Response) => {
  try {
    const { message, history = [], profile: requestProfile, apiKey, mode = "standard" } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const trimmedMessage = message.trim();
    const roastMode = (["standard", "unhinged", "passive_aggressive"].includes(mode) ? mode : "standard") as
      | "standard"
      | "unhinged"
      | "passive_aggressive";

    const user = await getAuthUser(req);

    // Fetch user profile from DB or fallback if authenticated
    let userProfile: UserMemoryProfile = requestProfile || defaultProfile;

    if (user?.id) {
      await ensureNemoSchema();
      try {
        const result = await executeSql<{
          name: string | null;
          age: number | null;
          profession: string | null;
          relationship_status: string | null;
          weaknesses: any;
          insults_received: number;
        }>(
          `SELECT name, age, profession, relationship_status, weaknesses, insults_received FROM public.nemo_user_profiles WHERE user_id = $1 LIMIT 1`,
          [user.id]
        );

        if (result.rows.length > 0) {
          const row = result.rows[0];
          userProfile = {
            ...userProfile,
            name: row.name || userProfile.name,
            age: row.age || userProfile.age,
            profession: row.profession || userProfile.profession,
            relationshipStatus: row.relationship_status || userProfile.relationshipStatus,
            weaknesses: Array.isArray(row.weaknesses) && row.weaknesses.length > 0 ? row.weaknesses : userProfile.weaknesses,
            insultsReceived: Number(row.insults_received) || userProfile.insultsReceived,
          };
        }
      } catch (err) {
        console.warn("DB profile lookup failed, using request/fallback profile:", err);
        const cached = fallbackProfiles.get(user.id);
        if (cached) {
          userProfile = { ...userProfile, ...cached };
        }
      }
    }

    // 1. Update memory profile with extracted facts
    const updatedProfile = updateMemoryProfile(userProfile, trimmedMessage);

    // 2. Extract timeline/math data if present
    const timelineData = extractTimelineData(trimmedMessage);

    // 3. Persist memory profile update to DB for this user if authenticated
    if (user?.id) {
      try {
        await executeSql(
          `INSERT INTO public.nemo_user_profiles (user_id, name, age, profession, relationship_status, weaknesses, insults_received, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
           ON CONFLICT (user_id) DO UPDATE SET
             name = COALESCE(EXCLUDED.name, nemo_user_profiles.name),
             age = COALESCE(EXCLUDED.age, nemo_user_profiles.age),
             profession = COALESCE(EXCLUDED.profession, nemo_user_profiles.profession),
             relationship_status = COALESCE(EXCLUDED.relationship_status, nemo_user_profiles.relationship_status),
             weaknesses = EXCLUDED.weaknesses,
             insults_received = nemo_user_profiles.insults_received + 1,
             updated_at = now();`,
          [
            user.id,
            updatedProfile.name || null,
            updatedProfile.age || null,
            updatedProfile.profession || null,
            updatedProfile.relationshipStatus || null,
            JSON.stringify(updatedProfile.weaknesses || []),
            updatedProfile.insultsReceived,
          ]
        );
      } catch (err) {
        console.warn("DB error updating memory profile:", err);
      }
      fallbackProfiles.set(user.id, updatedProfile);
    }

    // 4. Check for API key (provided in request or in server environment)
    const effectiveApiKey = (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0)
      ? apiKey.trim()
      : process.env.GEMINI_API_KEY?.trim();

    let reply = "";
    let poweredBy: "Gemini AI" | "Nemo Offline Savage Engine" = "Nemo Offline Savage Engine";

    if (effectiveApiKey) {
      try {
        const systemPrompt = buildNemoSystemPrompt(updatedProfile, trimmedMessage, roastMode);
        reply = await callGeminiForRoast(
          effectiveApiKey,
          systemPrompt,
          history as ChatMessage[],
          trimmedMessage
        );
        poweredBy = "Gemini AI";
      } catch (err: unknown) {
        console.warn("Gemini API call failed, falling back to local roast engine:", err);
        reply = generateOfflineNemoRoast(updatedProfile, trimmedMessage, roastMode);
        poweredBy = "Nemo Offline Savage Engine";
      }
    } else {
      reply = generateOfflineNemoRoast(updatedProfile, trimmedMessage, roastMode);
      poweredBy = "Nemo Offline Savage Engine";
    }

    return res.json({
      reply,
      profile: updatedProfile,
      timelineData,
      poweredBy,
    });
  } catch (error: unknown) {
    console.error("Nemo API error:", error);
    return res.status(500).json({
      error: "Something went wrong in Nemo's savage brain",
      message: error instanceof Error ? error.message : "Internal Error",
    });
  }
});

export default router;
