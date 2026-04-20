import { randomUUID } from "crypto";
import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireUserAuth, UserAuthRequest } from "../middleware/userAuth.js";
import { executeSql, selectRows } from "../lib/supabaseRest.js";

const router = Router();

type EmployeeRow = {
  id: string;
  name: string | null;
  profession: string | null;
  email: string | null;
  mobile: string | null;
  profile_image_url: string | null;
  linked_user_id: string | null;
  linked_user_email: string | null;
  status?: string | null;
  created_at?: string | null;
};

type GroupSummaryRow = {
  id: string;
  name: string;
  description: string | null;
  created_by_admin_id: string | null;
  created_by_admin_username: string | null;
  created_at: string;
  updated_at: string;
  member_ids: string[] | null;
  member_count: number;
  last_activity: string;
  last_message: Record<string, unknown> | null;
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

const parseLimit = (value: unknown, fallback = 100) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(400, Math.trunc(numeric)));
};

const normalizeIdList = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];

  return [
    ...new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0)
    ),
  ];
};

const buildPeerConversationKey = (leftEmployeeId: string, rightEmployeeId: string) =>
  [leftEmployeeId, rightEmployeeId].sort((a, b) => a.localeCompare(b)).join("__");

let schemaReady: Promise<void> | null = null;

const ensureCollaborationTables = async () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await executeSql(`
        create table if not exists public.employee_groups (
          id text primary key,
          name text not null,
          description text null,
          created_by_admin_id text null,
          created_by_admin_username text null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await executeSql(`
        create table if not exists public.employee_group_members (
          group_id text not null,
          employee_id text not null,
          joined_at timestamptz not null default now(),
          primary key (group_id, employee_id)
        )
      `);
      await executeSql(`
        create table if not exists public.employee_group_messages (
          id text primary key,
          group_id text not null,
          sender_type text not null,
          sender_admin_id text null,
          sender_admin_username text null,
          sender_employee_id text null,
          sender_label text null,
          message_text text null,
          attachment_url text null,
          attachment_name text null,
          attachment_mime text null,
          created_at timestamptz not null default now()
        )
      `);
      await executeSql(`
        create table if not exists public.employee_peer_messages (
          id text primary key,
          pair_key text not null,
          sender_employee_id text not null,
          recipient_employee_id text not null,
          sender_label text null,
          message_text text null,
          attachment_url text null,
          attachment_name text null,
          attachment_mime text null,
          created_at timestamptz not null default now(),
          read_at timestamptz null
        )
      `);
      await executeSql(`
        create index if not exists employee_group_members_group_idx
        on public.employee_group_members (group_id)
      `);
      await executeSql(`
        create index if not exists employee_group_members_employee_idx
        on public.employee_group_members (employee_id)
      `);
      await executeSql(`
        create index if not exists employee_group_messages_group_created_idx
        on public.employee_group_messages (group_id, created_at desc)
      `);
      await executeSql(`
        create index if not exists employee_peer_messages_pair_created_idx
        on public.employee_peer_messages (pair_key, created_at desc)
      `);
      await executeSql(`
        create index if not exists employee_peer_messages_recipient_unread_idx
        on public.employee_peer_messages (recipient_employee_id, read_at, created_at desc)
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  return schemaReady;
};

const getLinkedEmployees = async (user: { id: string; email?: string | null }) => {
  const userEmail = normalizeEmail(user.email);

  const employeesById = await selectRows(
    `/employees?linked_user_id=eq.${encodeURIComponent(user.id)}&status=eq.live&order=created_at.desc`
  );

  let employees = Array.isArray(employeesById) ? (employeesById as EmployeeRow[]) : [];

  if (employees.length === 0 && userEmail) {
    const employeesByEmail = await selectRows(
      `/employees?linked_user_email=ilike.${encodeURIComponent(userEmail)}&status=eq.live&order=created_at.desc`
    );
    employees = Array.isArray(employeesByEmail) ? (employeesByEmail as EmployeeRow[]) : [];
  }

  if (employees.length === 0 && userEmail) {
    const directEmailMatch = await selectRows(
      `/employees?email=ilike.${encodeURIComponent(userEmail)}&status=eq.live&order=created_at.desc`
    );
    employees = Array.isArray(directEmailMatch) ? (directEmailMatch as EmployeeRow[]) : [];
  }

  return employees;
};

const getLiveEmployeeById = async (employeeId: string) => {
  const rows = await selectRows(
    `/employees?id=eq.${encodeURIComponent(employeeId)}&status=eq.live&limit=1`
  );
  return Array.isArray(rows) ? ((rows[0] ?? null) as EmployeeRow | null) : null;
};

const getEmployeesByIds = async (employeeIds: string[]) => {
  if (employeeIds.length === 0) return [] as EmployeeRow[];

  const rows = await selectRows(
    `/employees?id=in.(${employeeIds.join(",")})&status=eq.live&order=created_at.asc`
  );
  return Array.isArray(rows) ? (rows as EmployeeRow[]) : [];
};

const touchGroup = async (groupId: string) => {
  await ensureCollaborationTables();
  await executeSql(
    `
      update public.employee_groups
      set updated_at = now()
      where id = $1
    `,
    [groupId]
  );
};

const loadAdminGroupSummaries = async () => {
  await ensureCollaborationTables();

  const result = await executeSql<GroupSummaryRow>(`
    select
      g.id,
      g.name,
      g.description,
      g.created_by_admin_id,
      g.created_by_admin_username,
      g.created_at,
      g.updated_at,
      coalesce(member_stats.member_ids, '{}'::text[]) as member_ids,
      coalesce(member_stats.member_count, 0)::int as member_count,
      coalesce(last_message.created_at, g.updated_at, g.created_at) as last_activity,
      row_to_json(last_message) as last_message
    from public.employee_groups g
    left join (
      select
        gm.group_id,
        array_agg(gm.employee_id order by gm.joined_at asc) as member_ids,
        count(*)::int as member_count
      from public.employee_group_members gm
      group by gm.group_id
    ) member_stats
      on member_stats.group_id = g.id
    left join lateral (
      select
        m.id,
        m.group_id,
        m.sender_type,
        m.sender_admin_id,
        m.sender_admin_username,
        m.sender_employee_id,
        m.sender_label,
        m.message_text,
        m.attachment_url,
        m.attachment_name,
        m.attachment_mime,
        m.created_at
      from public.employee_group_messages m
      where m.group_id = g.id
      order by m.created_at desc
      limit 1
    ) last_message on true
    order by coalesce(last_message.created_at, g.updated_at, g.created_at) desc, g.created_at desc
  `);

  return result.rows;
};

const loadEmployeeGroupSummaries = async (employeeId: string) => {
  await ensureCollaborationTables();

  const result = await executeSql<GroupSummaryRow>(
    `
      select
        g.id,
        g.name,
        g.description,
        g.created_by_admin_id,
        g.created_by_admin_username,
        g.created_at,
        g.updated_at,
        coalesce(member_stats.member_ids, '{}'::text[]) as member_ids,
        coalesce(member_stats.member_count, 0)::int as member_count,
        coalesce(last_message.created_at, g.updated_at, g.created_at) as last_activity,
        row_to_json(last_message) as last_message
      from public.employee_groups g
      inner join public.employee_group_members membership
        on membership.group_id = g.id
       and membership.employee_id = $1
      left join (
        select
          gm.group_id,
          array_agg(gm.employee_id order by gm.joined_at asc) as member_ids,
          count(*)::int as member_count
        from public.employee_group_members gm
        group by gm.group_id
      ) member_stats
        on member_stats.group_id = g.id
      left join lateral (
        select
          m.id,
          m.group_id,
          m.sender_type,
          m.sender_admin_id,
          m.sender_admin_username,
          m.sender_employee_id,
          m.sender_label,
          m.message_text,
          m.attachment_url,
          m.attachment_name,
          m.attachment_mime,
          m.created_at
        from public.employee_group_messages m
        where m.group_id = g.id
        order by m.created_at desc
        limit 1
      ) last_message on true
      order by coalesce(last_message.created_at, g.updated_at, g.created_at) desc, g.created_at desc
    `,
    [employeeId]
  );

  return result.rows;
};

const loadGroupSummaryById = async (groupId: string) => {
  await ensureCollaborationTables();

  const result = await executeSql<GroupSummaryRow>(
    `
      select
        g.id,
        g.name,
        g.description,
        g.created_by_admin_id,
        g.created_by_admin_username,
        g.created_at,
        g.updated_at,
        coalesce(member_stats.member_ids, '{}'::text[]) as member_ids,
        coalesce(member_stats.member_count, 0)::int as member_count,
        coalesce(last_message.created_at, g.updated_at, g.created_at) as last_activity,
        row_to_json(last_message) as last_message
      from public.employee_groups g
      left join (
        select
          gm.group_id,
          array_agg(gm.employee_id order by gm.joined_at asc) as member_ids,
          count(*)::int as member_count
        from public.employee_group_members gm
        group by gm.group_id
      ) member_stats
        on member_stats.group_id = g.id
      left join lateral (
        select
          m.id,
          m.group_id,
          m.sender_type,
          m.sender_admin_id,
          m.sender_admin_username,
          m.sender_employee_id,
          m.sender_label,
          m.message_text,
          m.attachment_url,
          m.attachment_name,
          m.attachment_mime,
          m.created_at
        from public.employee_group_messages m
        where m.group_id = g.id
        order by m.created_at desc
        limit 1
      ) last_message on true
      where g.id = $1
      limit 1
    `,
    [groupId]
  );

  return result.rows[0] ?? null;
};

const isEmployeeGroupMember = async (groupId: string, employeeId: string) => {
  await ensureCollaborationTables();
  const result = await executeSql<{ exists: boolean }>(
    `
      select exists(
        select 1
        from public.employee_group_members
        where group_id = $1 and employee_id = $2
      ) as exists
    `,
    [groupId, employeeId]
  );

  return Boolean(result.rows[0]?.exists);
};

const loadGroupMembers = async (groupId: string) => {
  await ensureCollaborationTables();

  const result = await executeSql<EmployeeRow>(
    `
      select
        e.id,
        e.name,
        e.profession,
        e.email,
        e.mobile,
        e.profile_image_url,
        e.linked_user_id,
        e.linked_user_email,
        e.status,
        e.created_at
      from public.employee_group_members gm
      inner join public.employees e
        on e.id::text = gm.employee_id
      where gm.group_id = $1
        and e.status = 'live'
      order by gm.joined_at asc, e.created_at asc
    `,
    [groupId]
  );

  return result.rows;
};

const loadGroupMessages = async (groupId: string, limit: number) => {
  await ensureCollaborationTables();

  const result = await executeSql<Record<string, unknown>>(
    `
      select *
      from (
        select
          m.id,
          m.group_id,
          m.sender_type,
          m.sender_admin_id,
          m.sender_admin_username,
          m.sender_employee_id,
          m.sender_label,
          m.message_text,
          m.attachment_url,
          m.attachment_name,
          m.attachment_mime,
          m.created_at
        from public.employee_group_messages m
        where m.group_id = $1
        order by m.created_at desc
        limit $2
      ) recent_messages
      order by created_at asc
    `,
    [groupId, limit]
  );

  return result.rows;
};

router.get("/employee/directory", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    if (linkedEmployees.length === 0) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const rows = await selectRows("/employees?status=eq.live&order=created_at.asc");
    const employees = Array.isArray(rows) ? rows : [];
    return res.json(employees);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load employee directory",
    });
  }
});

router.get("/employee/chat/direct-conversations", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    const currentEmployee = linkedEmployees[0] ?? null;
    const currentEmployeeId = String(currentEmployee?.id ?? "").trim();
    if (!currentEmployeeId) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    await ensureCollaborationTables();
    const limit = parseLimit(req.query.limit, 50);

    const result = await executeSql<{
      employee_id: string;
      name: string | null;
      profession: string | null;
      email: string | null;
      mobile: string | null;
      profile_image_url: string | null;
      linked_user_id: string | null;
      linked_user_email: string | null;
      created_at: string | null;
      latest_message: Record<string, unknown> | null;
      unread_count: number;
    }>(
      `
        with conversations as (
          select
            case
              when m.sender_employee_id = $1 then m.recipient_employee_id
              else m.sender_employee_id
            end as counterpart_employee_id,
            count(*) filter (
              where m.recipient_employee_id = $1 and m.read_at is null
            )::int as unread_count,
            max(m.created_at) as last_activity
          from public.employee_peer_messages m
          where m.sender_employee_id = $1 or m.recipient_employee_id = $1
          group by counterpart_employee_id
        )
        select
          e.id as employee_id,
          e.name,
          e.profession,
          e.email,
          e.mobile,
          e.profile_image_url,
          e.linked_user_id,
          e.linked_user_email,
          e.created_at,
          row_to_json(last_message) as latest_message,
          c.unread_count
        from conversations c
        inner join public.employees e
          on e.id::text = c.counterpart_employee_id
         and e.status = 'live'
        left join lateral (
          select
            m.id,
            m.pair_key,
            m.sender_employee_id,
            m.recipient_employee_id,
            m.sender_label,
            m.message_text,
            m.attachment_url,
            m.attachment_name,
            m.attachment_mime,
            m.created_at,
            m.read_at
          from public.employee_peer_messages m
          where (m.sender_employee_id = $1 and m.recipient_employee_id = c.counterpart_employee_id)
             or (m.sender_employee_id = c.counterpart_employee_id and m.recipient_employee_id = $1)
          order by m.created_at desc
          limit 1
        ) last_message on true
        order by c.last_activity desc
        limit $2
      `,
      [currentEmployeeId, limit]
    );

    const conversations = result.rows.map((row) => ({
      employee: {
        id: row.employee_id,
        name: row.name,
        profession: row.profession,
        email: row.email,
        mobile: row.mobile,
        profile_image_url: row.profile_image_url,
        linked_user_id: row.linked_user_id,
        linked_user_email: row.linked_user_email,
        created_at: row.created_at,
      },
      latest_message: row.latest_message,
      unread_count: Number(row.unread_count ?? 0),
    }));

    return res.json(conversations);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load direct conversations",
    });
  }
});

router.get("/employee/chat/direct/:peerEmployeeId", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    const currentEmployee = linkedEmployees[0] ?? null;
    const currentEmployeeId = String(currentEmployee?.id ?? "").trim();
    if (!currentEmployeeId) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const peerEmployeeId = String(req.params.peerEmployeeId ?? "").trim();
    if (!peerEmployeeId) {
      return res.status(400).json({ message: "Peer employee id is required" });
    }
    if (peerEmployeeId === currentEmployeeId) {
      return res.status(400).json({ message: "You cannot open a direct chat with yourself" });
    }

    const peerEmployee = await getLiveEmployeeById(peerEmployeeId);
    if (!peerEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await ensureCollaborationTables();
    const pairKey = buildPeerConversationKey(currentEmployeeId, peerEmployeeId);
    const limit = parseLimit(req.query.limit, 200);

    await executeSql(
      `
        update public.employee_peer_messages
        set read_at = coalesce(read_at, now())
        where pair_key = $1
          and recipient_employee_id = $2
          and sender_employee_id = $3
          and read_at is null
      `,
      [pairKey, currentEmployeeId, peerEmployeeId]
    );

    const result = await executeSql<Record<string, unknown>>(
      `
        select *
        from (
          select
            m.id,
            m.pair_key,
            m.sender_employee_id,
            m.recipient_employee_id,
            m.sender_label,
            m.message_text,
            m.attachment_url,
            m.attachment_name,
            m.attachment_mime,
            m.created_at,
            m.read_at
          from public.employee_peer_messages m
          where m.pair_key = $1
          order by m.created_at desc
          limit $2
        ) recent_messages
        order by created_at asc
      `,
      [pairKey, limit]
    );

    return res.json({
      employee: peerEmployee,
      messages: result.rows,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load direct chat",
    });
  }
});

router.post("/employee/chat/direct/:peerEmployeeId/messages", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    const currentEmployee = linkedEmployees[0] ?? null;
    const currentEmployeeId = String(currentEmployee?.id ?? "").trim();
    if (!currentEmployeeId) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const peerEmployeeId = String(req.params.peerEmployeeId ?? "").trim();
    if (!peerEmployeeId) {
      return res.status(400).json({ message: "Peer employee id is required" });
    }
    if (peerEmployeeId === currentEmployeeId) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    const peerEmployee = await getLiveEmployeeById(peerEmployeeId);
    if (!peerEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const messageText = normalizeOptionalText(req.body?.message_text, 8000);
    const attachmentUrl = normalizeOptionalUrl(req.body?.attachment_url);
    const attachmentName = normalizeOptionalText(req.body?.attachment_name, 255);
    const attachmentMime = normalizeOptionalText(req.body?.attachment_mime, 120);

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    await ensureCollaborationTables();
    const payload = {
      id: randomUUID(),
      pair_key: buildPeerConversationKey(currentEmployeeId, peerEmployeeId),
      sender_employee_id: currentEmployeeId,
      recipient_employee_id: peerEmployeeId,
      sender_label: normalizeOptionalText(currentEmployee?.name, 120) ?? "employee",
      message_text: messageText,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_mime: attachmentMime,
    };

    const result = await executeSql<Record<string, unknown>>(
      `
        insert into public.employee_peer_messages (
          id,
          pair_key,
          sender_employee_id,
          recipient_employee_id,
          sender_label,
          message_text,
          attachment_url,
          attachment_name,
          attachment_mime
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning *
      `,
      [
        payload.id,
        payload.pair_key,
        payload.sender_employee_id,
        payload.recipient_employee_id,
        payload.sender_label,
        payload.message_text,
        payload.attachment_url,
        payload.attachment_name,
        payload.attachment_mime,
      ]
    );

    return res.status(201).json(result.rows[0] ?? payload);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send direct message",
    });
  }
});

router.get("/groups", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const groups = await loadAdminGroupSummaries();
    return res.json(groups);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load groups",
    });
  }
});

router.post("/groups", requireAuth, async (req: AuthRequest, res) => {
  try {
    const name = normalizeOptionalText(req.body?.name, 160);
    const description = normalizeOptionalText(req.body?.description, 1000);
    const memberIds = normalizeIdList(req.body?.member_ids);

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const employeeRows = await getEmployeesByIds(memberIds);
    const validMemberIds = new Set(employeeRows.map((employee) => String(employee.id)));
    const invalidMemberIds = memberIds.filter((memberId) => !validMemberIds.has(memberId));

    if (invalidMemberIds.length > 0) {
      return res.status(400).json({
        message: `Some selected employees were not found in live employee records: ${invalidMemberIds.join(", ")}`,
      });
    }

    await ensureCollaborationTables();
    const groupId = randomUUID();
    const result = await executeSql<Record<string, unknown>>(
      `
        insert into public.employee_groups (
          id,
          name,
          description,
          created_by_admin_id,
          created_by_admin_username
        )
        values ($1, $2, $3, $4, $5)
        returning *
      `,
      [
        groupId,
        name,
        description,
        String(req.admin?.id ?? "").trim() || null,
        normalizeOptionalText(req.admin?.username, 120),
      ]
    );

    for (const employeeId of memberIds) {
      await executeSql(
        `
          insert into public.employee_group_members (group_id, employee_id)
          values ($1, $2)
          on conflict (group_id, employee_id) do nothing
        `,
        [groupId, employeeId]
      );
    }

    await touchGroup(groupId);
    const group = await loadGroupSummaryById(groupId);
    return res.status(201).json(group ?? result.rows[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create group",
    });
  }
});

router.get("/groups/:groupId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const groupId = String(req.params.groupId ?? "").trim();
    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const members = await loadGroupMembers(groupId);
    return res.json({ group, members });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load group details",
    });
  }
});

router.post("/groups/:groupId/members", requireAuth, async (req: AuthRequest, res) => {
  try {
    const groupId = String(req.params.groupId ?? "").trim();
    const employeeId = String(req.body?.employee_id ?? "").trim();

    if (!groupId || !employeeId) {
      return res.status(400).json({ message: "Group id and employee id are required" });
    }

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const employee = await getLiveEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found in live employee records" });
    }

    await ensureCollaborationTables();
    await executeSql(
      `
        insert into public.employee_group_members (group_id, employee_id)
        values ($1, $2)
        on conflict (group_id, employee_id) do nothing
      `,
      [groupId, employeeId]
    );
    await touchGroup(groupId);

    const members = await loadGroupMembers(groupId);
    return res.json({ group: await loadGroupSummaryById(groupId), members });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to add group member",
    });
  }
});

router.delete("/groups/:groupId/members/:employeeId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const groupId = String(req.params.groupId ?? "").trim();
    const employeeId = String(req.params.employeeId ?? "").trim();

    if (!groupId || !employeeId) {
      return res.status(400).json({ message: "Group id and employee id are required" });
    }

    await ensureCollaborationTables();
    await executeSql(
      `
        delete from public.employee_group_members
        where group_id = $1 and employee_id = $2
      `,
      [groupId, employeeId]
    );
    await touchGroup(groupId);

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const members = await loadGroupMembers(groupId);
    return res.json({ group, members });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to remove group member",
    });
  }
});

router.get("/groups/:groupId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const groupId = String(req.params.groupId ?? "").trim();
    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const limit = parseLimit(req.query.limit, 200);
    const [members, messages] = await Promise.all([
      loadGroupMembers(groupId),
      loadGroupMessages(groupId, limit),
    ]);

    return res.json({ group, members, messages });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load group messages",
    });
  }
});

router.post("/groups/:groupId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const groupId = String(req.params.groupId ?? "").trim();
    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const messageText = normalizeOptionalText(req.body?.message_text, 8000);
    const attachmentUrl = normalizeOptionalUrl(req.body?.attachment_url);
    const attachmentName = normalizeOptionalText(req.body?.attachment_name, 255);
    const attachmentMime = normalizeOptionalText(req.body?.attachment_mime, 120);

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    await ensureCollaborationTables();
    const result = await executeSql<Record<string, unknown>>(
      `
        insert into public.employee_group_messages (
          id,
          group_id,
          sender_type,
          sender_admin_id,
          sender_admin_username,
          sender_label,
          message_text,
          attachment_url,
          attachment_name,
          attachment_mime
        )
        values ($1, $2, 'admin', $3, $4, $5, $6, $7, $8, $9)
        returning *
      `,
      [
        randomUUID(),
        groupId,
        String(req.admin?.id ?? "").trim() || null,
        normalizeOptionalText(req.admin?.username, 120),
        normalizeOptionalText(req.admin?.fullName, 120) ?? normalizeOptionalText(req.admin?.username, 120),
        messageText,
        attachmentUrl,
        attachmentName,
        attachmentMime,
      ]
    );
    await touchGroup(groupId);

    return res.status(201).json(result.rows[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send group message",
    });
  }
});

router.get("/employee/groups", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    const currentEmployee = linkedEmployees[0] ?? null;
    const currentEmployeeId = String(currentEmployee?.id ?? "").trim();
    if (!currentEmployeeId) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const groups = await loadEmployeeGroupSummaries(currentEmployeeId);
    return res.json(groups);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load employee groups",
    });
  }
});

router.get("/employee/groups/:groupId", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    const currentEmployee = linkedEmployees[0] ?? null;
    const currentEmployeeId = String(currentEmployee?.id ?? "").trim();
    if (!currentEmployeeId) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const groupId = String(req.params.groupId ?? "").trim();
    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = await isEmployeeGroupMember(groupId, currentEmployeeId);
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const members = await loadGroupMembers(groupId);
    return res.json({ group, members });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load employee group details",
    });
  }
});

router.get("/employee/groups/:groupId/messages", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    const currentEmployee = linkedEmployees[0] ?? null;
    const currentEmployeeId = String(currentEmployee?.id ?? "").trim();
    if (!currentEmployeeId) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const groupId = String(req.params.groupId ?? "").trim();
    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = await isEmployeeGroupMember(groupId, currentEmployeeId);
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const limit = parseLimit(req.query.limit, 200);
    const [members, messages] = await Promise.all([
      loadGroupMembers(groupId),
      loadGroupMessages(groupId, limit),
    ]);

    return res.json({ group, members, messages });
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load employee group messages",
    });
  }
});

router.post("/employee/groups/:groupId/messages", requireUserAuth, async (req: UserAuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const linkedEmployees = await getLinkedEmployees(req.user);
    const currentEmployee = linkedEmployees[0] ?? null;
    const currentEmployeeId = String(currentEmployee?.id ?? "").trim();
    if (!currentEmployeeId) {
      return res.status(404).json({ message: "No employee profile linked with this account" });
    }

    const groupId = String(req.params.groupId ?? "").trim();
    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }

    const group = await loadGroupSummaryById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = await isEmployeeGroupMember(groupId, currentEmployeeId);
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messageText = normalizeOptionalText(req.body?.message_text, 8000);
    const attachmentUrl = normalizeOptionalUrl(req.body?.attachment_url);
    const attachmentName = normalizeOptionalText(req.body?.attachment_name, 255);
    const attachmentMime = normalizeOptionalText(req.body?.attachment_mime, 120);

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    await ensureCollaborationTables();
    const result = await executeSql<Record<string, unknown>>(
      `
        insert into public.employee_group_messages (
          id,
          group_id,
          sender_type,
          sender_employee_id,
          sender_label,
          message_text,
          attachment_url,
          attachment_name,
          attachment_mime
        )
        values ($1, $2, 'employee', $3, $4, $5, $6, $7, $8)
        returning *
      `,
      [
        randomUUID(),
        groupId,
        currentEmployeeId,
        normalizeOptionalText(currentEmployee?.name, 120) ?? "employee",
        messageText,
        attachmentUrl,
        attachmentName,
        attachmentMime,
      ]
    );
    await touchGroup(groupId);

    return res.status(201).json(result.rows[0] ?? {});
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send employee group message",
    });
  }
});

export default router;
