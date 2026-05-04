export type PrintableInvoiceItem = {
  orderCode: string | null;
  title: string;
  description: string | null;
  amount: number;
};

export type PrintableInvoice = {
  invoiceNumber: string;
  monthLabel: string;
  employeeName: string;
  employeeEmail: string;
  sentAt: string;
  totalAmount: number;
  notes: string | null;
  items: PrintableInvoiceItem[];
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const formatCurrency = (amount: number) =>
  `BDT ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const normalizeItemDescription = (value: string | null) => {
  const normalized = value?.trim() || "";
  if (!normalized) return null;
  if (normalized.toLowerCase() === "no additional details") return null;
  return normalized;
};

const buildInvoiceHtml = (invoice: PrintableInvoice) => {
  const rows = invoice.items
    .map((item, index) => {
      const safeOrderCode = escapeHtml(item.orderCode?.trim() || "Custom");
      const safeTitle = escapeHtml(item.title);
      const safeAmount = escapeHtml(formatCurrency(item.amount));
      const normalizedDescription = normalizeItemDescription(item.description);
      const descriptionHtml = normalizedDescription
        ? `<span>${escapeHtml(normalizedDescription)}</span>`
        : "";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${safeOrderCode}</td>
          <td>
            <strong>${safeTitle}</strong>
            ${descriptionHtml}
          </td>
          <td class="amount">${safeAmount}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(invoice.invoiceNumber)}</title>
        <style>
          :root {
            color-scheme: light;
            --ink: #0f172a;
            --muted: #64748b;
            --line: #dbe5f1;
            --soft: #f8fafc;
            --accent: #ef4444;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: var(--ink);
            background: #eef2f7;
          }
          .page {
            max-width: 920px;
            margin: 32px auto;
            background: #ffffff;
            border: 1px solid var(--line);
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
          }
          .toolbar {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 16px 24px;
            background: rgba(15, 23, 42, 0.95);
            color: #ffffff;
          }
          .toolbar button {
            border: 0;
            border-radius: 999px;
            padding: 10px 16px;
            background: #ffffff;
            color: var(--ink);
            font-weight: 600;
            cursor: pointer;
          }
          .hero {
            padding: 30px 32px 26px;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: #ffffff;
          }
          .hero p {
            margin: 0 0 8px;
            font-size: 12px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.72);
          }
          .hero h1 {
            margin: 0;
            font-size: 32px;
            line-height: 1.1;
          }
          .content {
            padding: 28px 32px 32px;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            margin-bottom: 24px;
          }
          .meta-card {
            padding: 18px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: var(--soft);
          }
          .meta-card p {
            margin: 0 0 6px;
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .meta-card h2 {
            margin: 0;
            font-size: 18px;
          }
          .meta-card .sub {
            margin-top: 8px;
            font-size: 14px;
            color: #475569;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border: 1px solid var(--line);
            border-radius: 16px;
          }
          th, td {
            padding: 14px 12px;
            text-align: left;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
          }
          th {
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--muted);
            background: var(--soft);
          }
          td strong {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
          }
          td span {
            display: block;
            font-size: 13px;
            line-height: 1.55;
            color: #475569;
          }
          td.amount {
            text-align: right;
            font-weight: 700;
            white-space: nowrap;
          }
          .notes {
            margin-top: 18px;
            padding: 18px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: var(--soft);
          }
          .notes p {
            margin: 0 0 8px;
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .notes div {
            font-size: 14px;
            line-height: 1.7;
            color: #334155;
            white-space: pre-wrap;
          }
          .total {
            margin-top: 20px;
            padding: 20px 24px;
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(15, 23, 42, 0.05));
            border: 1px solid rgba(239, 68, 68, 0.2);
            text-align: right;
          }
          .total p {
            margin: 0 0 8px;
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .total h3 {
            margin: 0;
            font-size: 30px;
          }
          @media (max-width: 720px) {
            .page { margin: 0; border-radius: 0; }
            .toolbar, .hero, .content { padding-left: 18px; padding-right: 18px; }
            .meta { grid-template-columns: 1fr; }
            th, td { padding-left: 10px; padding-right: 10px; }
          }
          @media print {
            body { background: #ffffff; }
            .page {
              margin: 0;
              max-width: none;
              border: 0;
              border-radius: 0;
              box-shadow: none;
            }
            .toolbar { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="toolbar">
            <div>Use your browser print dialog to save this invoice as PDF.</div>
            <button type="button" onclick="window.print()">Print / Save PDF</button>
          </div>

          <section class="hero">
            <p>Employee Invoice</p>
            <h1>${escapeHtml(invoice.monthLabel)}</h1>
          </section>

          <section class="content">
            <div class="meta">
              <div class="meta-card">
                <p>Invoice To</p>
                <h2>${escapeHtml(invoice.employeeName)}</h2>
                <div class="sub">${escapeHtml(invoice.employeeEmail)}</div>
              </div>
              <div class="meta-card">
                <p>Invoice Info</p>
                <h2>${escapeHtml(invoice.invoiceNumber)}</h2>
                <div class="sub">Sent: ${escapeHtml(formatDate(invoice.sentAt))}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Order</th>
                  <th>Work</th>
                  <th style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            ${
              invoice.notes?.trim()
                ? `
                  <div class="notes">
                    <p>Notes</p>
                    <div>${escapeHtml(invoice.notes.trim())}</div>
                  </div>
                `
                : ""
            }

            <div class="total">
              <p>Total</p>
              <h3>${escapeHtml(formatCurrency(invoice.totalAmount))}</h3>
            </div>
          </section>
        </div>
        <script>
          window.addEventListener("load", function () {
            window.setTimeout(function () {
              try {
                window.print();
              } catch (error) {
                console.error(error);
              }
            }, 300);
          });
        </script>
      </body>
    </html>
  `;
};

export const openInvoicePrintWindow = (invoice: PrintableInvoice) => {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!popup) {
    throw new Error("Popup blocked. Please allow popups to print or save the invoice.");
  }

  popup.document.open();
  popup.document.write(buildInvoiceHtml(invoice));
  popup.document.close();
};
