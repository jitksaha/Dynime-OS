import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

// REVIEW: PDF generation — confirm Workers-compatible / use rendering API

export async function handler(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = connect(env);
  try {
    const auth = await contextFromRequest(req, env);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return error("Unauthorized", 401);
    }

    const authUserRows = await withSession(sql, auth, async (tx) => {
      const rows = await tx`SELECT * FROM auth.users WHERE id = ${token}`;
      return rows[0] as any;
    });

    if (!authUserRows) {
      return error("Invalid auth", 401);
    }

    const { invoice_id } = (await req.json()) as Record<string, any>;
    if (!invoice_id) {
      return error("invoice_id required", 400);
    }

    const profileRow = await withSession(sql, auth, async (tx) => {
      const rows = await tx`SELECT tenant_id FROM profiles WHERE user_id = ${authUserRows.id}`;
      return rows[0];
    });
    if (!profileRow?.tenant_id) {
      return error("No tenant", 400);
    }

    // Fetch invoice + items + company info
    const [invoiceRes, itemsRes, tenantRes] = await Promise.all([
      withSession(sql, auth, async (tx) => {
        const rows = await tx`SELECT * FROM invoices WHERE id = ${invoice_id} AND tenant_id = ${profileRow.tenant_id}`;
        return rows[0];
      }),
      withSession(sql, auth, async (tx) => {
        const rows = await tx`SELECT * FROM invoice_items WHERE invoice_id = ${invoice_id} ORDER BY created_at`;
        return rows;
      }),
      withSession(sql, auth, async (tx) => {
        const rows = await tx`SELECT name, currency, currency_symbol FROM tenants WHERE id = ${profileRow.tenant_id}`;
        return rows[0];
      }),
    ]);

    const inv = invoiceRes;
    if (!inv) {
      return error("Invoice not found", 404);
    }

    const items = itemsRes || [];
    const company = tenantRes;
    const cur = inv.currency || company?.currency || "USD";

    const fmtMoney = (n: number) => {
      try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);
      } catch {
        return `${cur} ${n.toFixed(2)}`;
      }
    };

    const itemRows = items.map((item: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;text-align:right">${fmtMoney(item.unit_price)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;text-align:right">${fmtMoney(item.subtotal || item.quantity * item.unit_price)}</td>
      </tr>
    `).join("");

    const exchangeNote = inv.base_currency && inv.base_currency !== cur && inv.exchange_rate && inv.exchange_rate !== 1
      ? `<p style="font-size:11px;color:#9ca3af;margin-top:4px">Exchange rate: 1 ${inv.base_currency} = ${inv.exchange_rate} ${cur}</p>`
      : "";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 40px; background: #fff; color: #111827; }
    .container { max-width: 800px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
      <div>
        <h1 style="font-size:28px;font-weight:800;color:#111827;margin:0;letter-spacing:-0.5px">INVOICE</h1>
        <p style="font-size:14px;color:#6b7280;margin:4px 0 0">${inv.invoice_number}</p>
      </div>
      <div style="text-align:right">
        <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0">${company?.name || "Company"}</h2>
        <p style="font-size:12px;color:#9ca3af;margin:4px 0 0">Generated on ${new Date().toLocaleDateString()}</p>
      </div>
    </div>

    <!-- Bill To / Dates -->
    <div style="display:flex;justify-content:space-between;margin-bottom:32px;gap:40px">
      <div>
        <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin:0 0 6px">Bill To</p>
        <p style="font-size:15px;font-weight:600;color:#111827;margin:0">${inv.client}</p>
        ${inv.client_email ? `<p style="font-size:13px;color:#6b7280;margin:2px 0 0">${inv.client_email}</p>` : ""}
        ${inv.client_phone ? `<p style="font-size:13px;color:#6b7280;margin:2px 0 0">${inv.client_phone}</p>` : ""}
        ${inv.client_address ? `<p style="font-size:13px;color:#6b7280;margin:2px 0 0">${inv.client_address}</p>` : ""}
      </div>
      <div style="text-align:right">
        <div style="margin-bottom:12px">
          <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin:0 0 2px">Issue Date</p>
          <p style="font-size:14px;color:#111827;margin:0">${new Date(inv.issue_date).toLocaleDateString()}</p>
        </div>
        ${inv.due_date ? `
        <div style="margin-bottom:12px">
          <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin:0 0 2px">Due Date</p>
          <p style="font-size:14px;color:#111827;margin:0">${new Date(inv.due_date).toLocaleDateString()}</p>
        </div>` : ""}
        <div>
          <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin:0 0 2px">Status</p>
          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;${inv.status === 'Paid' ? 'background:#d1fae5;color:#065f46' : inv.status === 'Overdue' ? 'background:#fee2e2;color:#991b1b' : 'background:#fef3c7;color:#92400e'}">${inv.status}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:2px solid #e5e7eb">Description</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:2px solid #e5e7eb">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:2px solid #e5e7eb">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:2px solid #e5e7eb">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;font-size:13px">Line items not available</td></tr>`}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end">
      <div style="width:280px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#6b7280">
          <span>Subtotal</span>
          <span style="color:#111827">${fmtMoney(Number(inv.subtotal) || 0)}</span>
        </div>
        ${inv.discount_amount && inv.discount_amount > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#059669">
          <span>Discount</span>
          <span>-${fmtMoney(inv.discount_amount)}</span>
        </div>` : ""}
        ${Number(inv.tax_amount) > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#6b7280">
          <span>Tax</span>
          <span style="color:#111827">${fmtMoney(Number(inv.tax_amount))}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:12px 0;margin-top:8px;border-top:2px solid #111827;font-size:18px;font-weight:700;color:#111827">
          <span>Total</span>
          <span>${fmtMoney(inv.amount)}</span>
        </div>
        ${exchangeNote}
      </div>
    </div>

    ${inv.notes ? `
    <div style="margin-top:32px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin:0 0 6px">Notes</p>
      <p style="font-size:13px;color:#374151;margin:0;white-space:pre-wrap">${inv.notes}</p>
    </div>` : ""}

    ${inv.payment_terms ? `
    <div style="margin-top:16px">
      <p style="font-size:12px;color:#9ca3af">Payment Terms: <span style="color:#6b7280">${inv.payment_terms.replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase())}</span></p>
    </div>` : ""}

    <!-- Print Button -->
    <div class="no-print" style="margin-top:40px;text-align:center">
      <button onclick="window.print()" style="padding:12px 32px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
        Download as PDF
      </button>
    </div>
  </div>
</body>
</html>`;

    return json({ html });
  } catch (err: any) {
    console.error("Invoice PDF error:", err);
    return error(err.message, 500);
  }
}