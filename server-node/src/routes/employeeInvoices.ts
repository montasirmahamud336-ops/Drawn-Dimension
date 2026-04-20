import { Router } from "express";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { deleteRow, insertRow, selectRows, updateRow } from "../lib/supabaseRest.js";

const router = Router();
let transporter: nodemailer.Transporter | null = null;

type EmployeeRow = {
  id: string;
  name: string;
  profession: string | null;
  email: string;
};

type WorkAssignmentRow = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  order_code: string | null;
  work_title: string;
  work_details: string | null;
  payment_amount: number | string | null;
  payment_status: "unpaid" | "paid";
  status: "assigned" | "done" | "draft";
  completed_at: string | null;
  created_at: string | null;
};

type EmployeeInvoiceRow = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  invoice_number: string;
  invoice_month: string;
  currency: string;
  total_amount: number | string;
  notes: string | null;
  status: "sent";
  sent_at: string;
  emailed_at: string;
  created_at: string;
  updated_at: string;
};

type EmployeeInvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  work_assignment_id: string | null;
  item_type: "assignment" | "custom";
  order_code: string | null;
  title: string;
  description: string | null;
  amount: number | string;
  display_order: number;
  created_at: string;
};

type PreparedLineItem = {
  work_assignment_id: string | null;
  item_type: "assignment" | "custom";
  order_code: string | null;
  title: string;
  description: string | null;
  amount: number;
  display_order: number;
};

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

const normalizeText = (value: unknown, maxLength = 500) =>
  String(value ?? "")
    .trim()
    .slice(0, maxLength);

const normalizeOptionalText = (value: unknown, maxLength = 5000) => {
  const text = normalizeText(value, maxLength);
  return text || null;
};

const normalizeEmail = (value: unknown) => normalizeText(value, 320).toLowerCase();

const parseMoney = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(2));
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const parseDateMs = (value: string | null | undefined) => {
  if (!value) return null;
  const numeric = new Date(value).getTime();
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

const getBrandLogoUrl = () => {
  const fromEnv = normalizeText(env.brandLogoUrl, 2000);
  if (fromEnv) return fromEnv;
  return `${env.siteBaseUrl.replace(/\/+$/, "")}/images/logo.png`;
};

const parseInvoiceMonth = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error("Invoice month must be in YYYY-MM format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invoice month is invalid");
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return {
    monthKey: `${match[1]}-${match[2]}`,
    monthStartDate: `${match[1]}-${match[2]}-01`,
    periodStartIso: start.toISOString(),
    periodEndIso: end.toISOString(),
    label: start.toLocaleDateString("en-BD", {
      year: "numeric",
      month: "long",
      timeZone: "UTC",
    }),
  };
};

const generateInvoiceNumber = (monthKey: string) => {
  const compactMonth = monthKey.replace("-", "");
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${compactMonth}-${timestamp}${random}`;
};

const buildInvoiceEmailHtml = (payload: {
  invoiceNumber: string;
  employeeName: string;
  employeeEmail: string;
  monthLabel: string;
  sentAt: string;
  totalAmount: number;
  notes: string | null;
  items: PreparedLineItem[];
}) => {
  const logoUrl = getBrandLogoUrl();
  const safeInvoiceNumber = escapeHtml(payload.invoiceNumber);
  const safeEmployeeName = escapeHtml(payload.employeeName || "Employee");
  const safeEmployeeEmail = escapeHtml(payload.employeeEmail);
  const safeMonthLabel = escapeHtml(payload.monthLabel);
  const safeSentAt = escapeHtml(formatDate(payload.sentAt));
  const safeTotal = escapeHtml(`BDT ${formatCurrency(payload.totalAmount)}`);
  const safeNotes = payload.notes ? escapeHtml(payload.notes) : "";

  const rowsHtml = payload.items
    .map((item, index) => {
      const orderCode = normalizeText(item.order_code, 64);
      const safeOrderCode = orderCode ? escapeHtml(orderCode) : "Custom";
      const safeTitle = escapeHtml(item.title);
      const safeDescription = item.description ? escapeHtml(item.description) : "No additional details";
      const safeAmount = escapeHtml(`BDT ${formatCurrency(item.amount)}`);

      return `
        <tr>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;">${index + 1}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${safeOrderCode}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">
            <div style="font-size:13px;font-weight:600;color:#0f172a;">${safeTitle}</div>
            <div style="margin-top:4px;font-size:12px;color:#64748b;">${safeDescription}</div>
          </td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${safeAmount}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#ffffff;">
      <div style="padding:28px 28px 24px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;">
        <img src="${logoUrl}" alt="DrawnDimension Logo" width="56" height="56" style="display:block;margin-bottom:14px;border-radius:12px;object-fit:cover;" />
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.72);">Employee Invoice</p>
        <h2 style="margin:0;font-size:28px;line-height:1.15;">${safeMonthLabel}</h2>
      </div>
      <div style="padding:28px;">
        <div style="display:flex;flex-wrap:wrap;gap:18px;margin-bottom:22px;">
          <div style="flex:1 1 220px;min-width:220px;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;">Invoice To</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${safeEmployeeName}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#475569;">${safeEmployeeEmail}</p>
          </div>
          <div style="flex:1 1 220px;min-width:220px;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;">Invoice Info</p>
            <p style="margin:0;font-size:13px;color:#475569;"><strong style="color:#0f172a;">Number:</strong> ${safeInvoiceNumber}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#475569;"><strong style="color:#0f172a;">Sent:</strong> ${safeSentAt}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#475569;"><strong style="color:#0f172a;">Total:</strong> ${safeTotal}</p>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <thead style="background:#f8fafc;">
            <tr>
              <th style="padding:12px 10px;text-align:left;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">#</th>
              <th style="padding:12px 10px;text-align:left;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Order</th>
              <th style="padding:12px 10px;text-align:left;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Work</th>
              <th style="padding:12px 10px;text-align:right;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        ${
          safeNotes
            ? `<div style="margin-top:18px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Notes</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#334155;">${safeNotes}</p>
              </div>`
            : ""
        }

        <div style="margin-top:18px;padding:18px;border-radius:14px;background:#f8fafc;text-align:right;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Total</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#0f172a;">${safeTotal}</p>
        </div>
      </div>
    </div>
  `;
};

const sendInvoiceEmail = async (payload: Parameters<typeof buildInvoiceEmailHtml>[0]) => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtpFrom,
    to: payload.employeeEmail,
    subject: `Invoice ${payload.invoiceNumber} for ${payload.monthLabel}`,
    html: buildInvoiceEmailHtml(payload),
  });
};

const listInvoiceLineItems = async (invoiceIds: string[]) => {
  const normalizedIds = Array.from(new Set(invoiceIds.map((value) => normalizeText(value, 64)).filter(Boolean)));
  if (normalizedIds.length === 0) return [] as EmployeeInvoiceLineItemRow[];

  const rows = await selectRows(
    `/employee_invoice_line_items?invoice_id=in.(${normalizedIds.join(",")})&order=invoice_id.asc,display_order.asc,created_at.asc`
  );
  return Array.isArray(rows) ? (rows as EmployeeInvoiceLineItemRow[]) : [];
};

const listInvoicesForMonth = async (monthStartDate: string) => {
  const rows = await selectRows(
    `/employee_invoices?invoice_month=eq.${encodeURIComponent(monthStartDate)}&order=sent_at.desc,created_at.desc`
  );
  return Array.isArray(rows) ? (rows as EmployeeInvoiceRow[]) : [];
};

const serializeInvoiceHistory = (invoices: EmployeeInvoiceRow[], lineItems: EmployeeInvoiceLineItemRow[]) => {
  const itemsByInvoiceId = new Map<string, EmployeeInvoiceLineItemRow[]>();

  lineItems.forEach((item) => {
    const invoiceId = normalizeText(item.invoice_id, 64);
    if (!invoiceId) return;
    const current = itemsByInvoiceId.get(invoiceId) ?? [];
    current.push(item);
    itemsByInvoiceId.set(invoiceId, current);
  });

  return invoices.map((invoice) => {
    const items = itemsByInvoiceId.get(normalizeText(invoice.id, 64)) ?? [];
    const assignmentCount = items.filter((item) => normalizeText(item.work_assignment_id, 64)).length;
    return {
      ...invoice,
      total_amount: parseMoney(invoice.total_amount) ?? 0,
      item_count: items.length,
      assignment_count: assignmentCount,
    };
  });
};

const loadInvoiceDetails = async (invoiceId: string) => {
  const rows = await selectRows(
    `/employee_invoices?id=eq.${encodeURIComponent(invoiceId)}&limit=1`
  );
  const invoice = Array.isArray(rows) ? (rows[0] as EmployeeInvoiceRow | undefined) : undefined;
  if (!invoice) return null;

  const items = await listInvoiceLineItems([invoiceId]);
  return {
    invoice: {
      ...invoice,
      total_amount: parseMoney(invoice.total_amount) ?? 0,
    },
    items: items.map((item) => ({
      ...item,
      amount: parseMoney(item.amount) ?? 0,
    })),
  };
};

router.get("/employee-invoices/source", requireAuth, async (req, res) => {
  try {
    const month = parseInvoiceMonth(req.query.month);
    const invoices = await listInvoicesForMonth(month.monthStartDate);
    const invoiceIds = invoices.map((invoice) => normalizeText(invoice.id, 64)).filter(Boolean);
    const lineItems = await listInvoiceLineItems(invoiceIds);

    const invoiceNumbersById = new Map(
      invoices.map((invoice) => [normalizeText(invoice.id, 64), normalizeText(invoice.invoice_number, 80)])
    );

    const assignmentInvoiceNumbers = new Map<string, string[]>();
    lineItems.forEach((item) => {
      const assignmentId = normalizeText(item.work_assignment_id, 64);
      const invoiceId = normalizeText(item.invoice_id, 64);
      const invoiceNumber = invoiceNumbersById.get(invoiceId) ?? "";
      if (!assignmentId || !invoiceNumber) return;
      const current = assignmentInvoiceNumbers.get(assignmentId) ?? [];
      if (!current.includes(invoiceNumber)) {
        current.push(invoiceNumber);
      }
      assignmentInvoiceNumbers.set(assignmentId, current);
    });

    const assignmentRows = await selectRows(
      `/work_assignments?status=eq.done&completed_at=gte.${encodeURIComponent(month.periodStartIso)}&completed_at=lt.${encodeURIComponent(month.periodEndIso)}&order=employee_name.asc,completed_at.desc`
    );
    const assignments = Array.isArray(assignmentRows) ? (assignmentRows as WorkAssignmentRow[]) : [];

    const employeeIds = Array.from(
      new Set(assignments.map((assignment) => normalizeText(assignment.employee_id, 64)).filter(Boolean))
    );

    const employeeMap = new Map<string, EmployeeRow>();
    if (employeeIds.length > 0) {
      const employeeRows = await selectRows(
        `/employees?id=in.(${employeeIds.join(",")})&select=id,name,profession,email`
      );
      if (Array.isArray(employeeRows)) {
        (employeeRows as EmployeeRow[]).forEach((employee) => {
          employeeMap.set(normalizeText(employee.id, 64), employee);
        });
      }
    }

    const groupedEmployees = new Map<
      string,
      {
        employee_id: string;
        employee_name: string;
        employee_email: string;
        profession: string | null;
        assignment_count: number;
        total_amount: number;
        assignments: Array<
          WorkAssignmentRow & {
            payment_amount: number;
            already_invoiced: boolean;
            existing_invoice_numbers: string[];
          }
        >;
      }
    >();

    assignments.forEach((assignment) => {
      const employeeId = normalizeText(assignment.employee_id, 64);
      if (!employeeId) return;

      const employee = employeeMap.get(employeeId);
      const amount = parseMoney(assignment.payment_amount) ?? 0;
      const existingInvoiceNumbers = assignmentInvoiceNumbers.get(normalizeText(assignment.id, 64)) ?? [];

      const currentGroup =
        groupedEmployees.get(employeeId) ??
        {
          employee_id: employeeId,
          employee_name: normalizeText(assignment.employee_name, 200),
          employee_email: normalizeEmail(assignment.employee_email),
          profession: employee?.profession ?? null,
          assignment_count: 0,
          total_amount: 0,
          assignments: [],
        };

      currentGroup.assignment_count += 1;
      currentGroup.total_amount += amount;
      currentGroup.assignments.push({
        ...assignment,
        payment_amount: amount,
        already_invoiced: existingInvoiceNumbers.length > 0,
        existing_invoice_numbers: existingInvoiceNumbers,
      });

      if (!currentGroup.profession && employee?.profession) {
        currentGroup.profession = employee.profession;
      }

      groupedEmployees.set(employeeId, currentGroup);
    });

    const employees = Array.from(groupedEmployees.values()).sort((left, right) =>
      left.employee_name.localeCompare(right.employee_name)
    );

    return res.json({
      month: month.monthKey,
      month_label: month.label,
      period_start: month.periodStartIso,
      period_end: month.periodEndIso,
      employees,
      sent_invoices: serializeInvoiceHistory(invoices, lineItems),
    });
  } catch (error: unknown) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to load invoice source",
    });
  }
});

router.get("/employee-invoices", requireAuth, async (req, res) => {
  try {
    const monthParam = normalizeText(req.query.month, 20);
    const query = monthParam
      ? `/employee_invoices?invoice_month=eq.${encodeURIComponent(parseInvoiceMonth(monthParam).monthStartDate)}&order=sent_at.desc,created_at.desc`
      : "/employee_invoices?order=sent_at.desc,created_at.desc";

    const invoiceRows = await selectRows(query);
    const invoices = Array.isArray(invoiceRows) ? (invoiceRows as EmployeeInvoiceRow[]) : [];
    const lineItems = await listInvoiceLineItems(
      invoices.map((invoice) => normalizeText(invoice.id, 64)).filter(Boolean)
    );

    return res.json({
      invoices: serializeInvoiceHistory(invoices, lineItems),
    });
  } catch (error: unknown) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to load invoices",
    });
  }
});

router.get("/employee-invoices/:id", requireAuth, async (req, res) => {
  try {
    const invoiceId = normalizeText(req.params.id, 64);
    if (!invoiceId) {
      return res.status(400).json({ message: "Invoice id is required" });
    }

    const details = await loadInvoiceDetails(invoiceId);
    if (!details) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.json(details);
  } catch (error: unknown) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load invoice details",
    });
  }
});

router.post("/employee-invoices/send", requireAuth, async (req, res) => {
  try {
    const employeeId = normalizeText(req.body?.employee_id, 64);
    if (!employeeId) {
      return res.status(400).json({ message: "Employee is required" });
    }

    const month = parseInvoiceMonth(req.body?.invoice_month);
    const periodStartMs = parseDateMs(month.periodStartIso);
    const periodEndMs = parseDateMs(month.periodEndIso);
    const notes = normalizeOptionalText(req.body?.notes, 5000);
    const inputItems = Array.isArray(req.body?.items) ? (req.body.items as Array<Record<string, unknown>>) : [];

    if (periodStartMs === null || periodEndMs === null) {
      throw new Error("Invoice month boundaries are invalid");
    }

    if (inputItems.length === 0) {
      return res.status(400).json({ message: "Select at least one invoice item" });
    }

    const employeeRows = await selectRows(
      `/employees?id=eq.${encodeURIComponent(employeeId)}&select=id,name,profession,email&limit=1`
    );
    const employee = Array.isArray(employeeRows) ? (employeeRows[0] as EmployeeRow | undefined) : undefined;
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const assignmentIds = inputItems
      .map((item) => normalizeText(item?.work_assignment_id, 64))
      .filter(Boolean);

    if (new Set(assignmentIds).size !== assignmentIds.length) {
      return res.status(400).json({ message: "Duplicate assignment items are not allowed" });
    }

    const assignmentMap = new Map<string, WorkAssignmentRow>();
    if (assignmentIds.length > 0) {
      const assignmentRows = await selectRows(
        `/work_assignments?id=in.(${assignmentIds.join(",")})`
      );
      const assignments = Array.isArray(assignmentRows) ? (assignmentRows as WorkAssignmentRow[]) : [];
      assignments.forEach((assignment) => {
        assignmentMap.set(normalizeText(assignment.id, 64), assignment);
      });
    }

    const preparedItems: PreparedLineItem[] = [];

    inputItems.forEach((item: Record<string, unknown>, index: number) => {
      const workAssignmentId = normalizeText(item?.work_assignment_id, 64);

      if (workAssignmentId) {
        const assignment = assignmentMap.get(workAssignmentId);
        if (!assignment) {
          throw new Error(`Assignment ${workAssignmentId} was not found`);
        }
        if (normalizeText(assignment.employee_id, 64) !== employeeId) {
          throw new Error(`Assignment ${workAssignmentId} does not belong to the selected employee`);
        }
        if (assignment.status !== "done") {
          throw new Error(`Assignment ${workAssignmentId} is not marked done`);
        }
        const completedAt = normalizeText(assignment.completed_at, 64);
        if (!completedAt) {
          throw new Error(`Assignment ${workAssignmentId} is missing completed date`);
        }
        const completedAtMs = parseDateMs(completedAt);
        if (completedAtMs === null) {
          throw new Error(`Assignment ${workAssignmentId} has an invalid completed date`);
        }
        if (completedAtMs < periodStartMs || completedAtMs >= periodEndMs) {
          throw new Error(`Assignment ${workAssignmentId} is outside the selected invoice month`);
        }

        const amount = parseMoney(assignment.payment_amount);
        if (amount === null || amount <= 0) {
          throw new Error(`Assignment ${workAssignmentId} has an invalid amount`);
        }

        preparedItems.push({
          work_assignment_id: workAssignmentId,
          item_type: "assignment",
          order_code: normalizeOptionalText(assignment.order_code, 64),
          title: normalizeText(assignment.work_title, 240),
          description: normalizeOptionalText(assignment.work_details, 2000),
          amount,
          display_order: index,
        });
        return;
      }

      const title = normalizeText(item?.title, 240);
      const description = normalizeOptionalText(item?.description, 2000);
      const amount = parseMoney(item?.amount);

      if (!title) {
        throw new Error("Custom item title is required");
      }
      if (amount === null || amount <= 0) {
        throw new Error(`Custom item "${title}" must have an amount greater than 0`);
      }

      preparedItems.push({
        work_assignment_id: null,
        item_type: "custom",
        order_code: null,
        title,
        description,
        amount,
        display_order: index,
      });
    });

    if (preparedItems.length === 0) {
      return res.status(400).json({ message: "Select at least one valid invoice item" });
    }

    const totalAmount = preparedItems.reduce((sum, item) => sum + item.amount, 0);
    const invoiceNumber = generateInvoiceNumber(month.monthKey);
    const sentAt = new Date().toISOString();

    const createdInvoiceRows = await insertRow("/employee_invoices", {
      employee_id: employee.id,
      employee_name: normalizeText(employee.name, 200),
      employee_email: normalizeEmail(employee.email),
      invoice_number: invoiceNumber,
      invoice_month: month.monthStartDate,
      currency: "BDT",
      total_amount: totalAmount,
      notes,
      status: "sent",
      sent_at: sentAt,
      emailed_at: sentAt,
    });

    const createdInvoice = Array.isArray(createdInvoiceRows)
      ? (createdInvoiceRows[0] as EmployeeInvoiceRow | undefined)
      : undefined;

    if (!createdInvoice?.id) {
      throw new Error("Failed to create invoice record");
    }

    try {
      for (const item of preparedItems) {
        await insertRow("/employee_invoice_line_items", {
          invoice_id: createdInvoice.id,
          work_assignment_id: item.work_assignment_id,
          item_type: item.item_type,
          order_code: item.order_code,
          title: item.title,
          description: item.description,
          amount: item.amount,
          display_order: item.display_order,
        });
      }

      await sendInvoiceEmail({
        invoiceNumber,
        employeeName: normalizeText(employee.name, 200),
        employeeEmail: normalizeEmail(employee.email),
        monthLabel: month.label,
        sentAt,
        totalAmount,
        notes,
        items: preparedItems,
      });
    } catch (error) {
      await deleteRow(`/employee_invoices?id=eq.${encodeURIComponent(createdInvoice.id)}`);
      throw error;
    }

    return res.status(201).json({
      invoice: {
        ...createdInvoice,
        total_amount: totalAmount,
      },
      items: preparedItems,
      month_label: month.label,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to send invoice",
    });
  }
});

router.post("/employee-invoices/:id/resend", requireAuth, async (req, res) => {
  try {
    const invoiceId = normalizeText(req.params.id, 64);
    if (!invoiceId) {
      return res.status(400).json({ message: "Invoice id is required" });
    }

    const details = await loadInvoiceDetails(invoiceId);
    if (!details) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const sentAt = new Date().toISOString();
    const monthDate = normalizeText(details.invoice.invoice_month, 20).slice(0, 7);
    const parsedMonth = parseInvoiceMonth(monthDate);
    const normalizedItems: PreparedLineItem[] = details.items.map((item: EmployeeInvoiceLineItemRow) => ({
      work_assignment_id: normalizeOptionalText(item.work_assignment_id, 64),
      item_type: item.item_type,
      order_code: normalizeOptionalText(item.order_code, 64),
      title: normalizeText(item.title, 240),
      description: normalizeOptionalText(item.description, 2000),
      amount: parseMoney(item.amount) ?? 0,
      display_order: Number(item.display_order) || 0,
    }));

    await sendInvoiceEmail({
      invoiceNumber: normalizeText(details.invoice.invoice_number, 80),
      employeeName: normalizeText(details.invoice.employee_name, 200),
      employeeEmail: normalizeEmail(details.invoice.employee_email),
      monthLabel: parsedMonth.label,
      sentAt,
      totalAmount: parseMoney(details.invoice.total_amount) ?? 0,
      notes: normalizeOptionalText(details.invoice.notes, 5000),
      items: normalizedItems,
    });

    const updatedRows = await updateRow(`/employee_invoices?id=eq.${encodeURIComponent(invoiceId)}`, {
      emailed_at: sentAt,
    });
    const updatedInvoice = Array.isArray(updatedRows)
      ? (updatedRows[0] as EmployeeInvoiceRow | undefined)
      : undefined;

    return res.json({
      invoice: {
        ...(updatedInvoice ?? details.invoice),
        total_amount: parseMoney((updatedInvoice ?? details.invoice).total_amount) ?? 0,
      },
      resent_at: sentAt,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to resend invoice",
    });
  }
});

export default router;
