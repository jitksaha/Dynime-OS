/**
 * Premium print templates — Stripe-exact with creative enhancements
 */

const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const MONO = `'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace`;
const POS_FONT = `'Share Tech Mono', 'Receipt', 'Courier Prime', 'Courier New', Courier, monospace`;
const POS_MONO = `'Share Tech Mono', 'Courier Prime', monospace`;

/* ═══════════════════════════════════════════════════════
   POS RECEIPT — Premium compact receipt
   ═══════════════════════════════════════════════════════ */
export function printPosReceipt(order: any, formatPrice: (n: number) => string) {
  const w = window.open("", "_blank");
  if (!w) return;

  const itemRows = order.items.map((item: any) => {
    const lineTotal = item.product.price * item.quantity;
    return `<tr>
      <td class="td-item">
        <div class="item-name">${item.product.name}</div>
        <div class="item-qty">${item.quantity} × ${formatPrice(item.product.price)}</div>
      </td>
      <td class="td-amount">${formatPrice(lineTotal)}</td>
    </tr>`;
  }).join("");

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${order.orderNumber}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Courier+Prime:wght@400;700&family=Comfortaa:wght@700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 80mm auto; margin: 0; }
  html { background: #f6f6f9; }
  body {
    font-family: ${POS_FONT};
    color: #0f172a;
    width: 340px;
    margin: 24px auto;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    color: #0f172a;
    width: 340px;
    margin: 24px auto;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    font-size: 13px;
    line-height: 1.5;
  }

  .receipt-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05);
    overflow: hidden;
  }

  /* ── Gradient Header ── */
  .r-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 28px 24px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .r-header::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 120px; height: 120px;
    border-radius: 50%;
    background: rgba(99, 91, 255, 0.15);
  }
  .r-header::after {
    content: '';
    position: absolute;
    bottom: -30px; left: -20px;
    width: 80px; height: 80px;
    border-radius: 50%;
    background: rgba(16, 185, 129, 0.12);
  }
  .check-ring {
    width: 48px; height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.2);
    position: relative; z-index: 1;
  }
  .check-ring svg { width: 22px; height: 22px; stroke: #fff; stroke-width: 2.8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .r-status { font-size: 12px; color: #94a3b8; font-weight: 500; letter-spacing: 0.03em; position: relative; z-index: 1; }
  .r-amount { font-size: 30px; font-weight: 800; color: #fff; letter-spacing: -0.03em; margin: 6px 0 2px; position: relative; z-index: 1; font-variant-numeric: tabular-nums; }
  .r-date { font-size: 11px; color: #64748b; position: relative; z-index: 1; }

  /* ── Body ── */
  .r-body { padding: 20px 24px 24px; }

  /* ── Meta ── */
  .r-meta { margin-bottom: 18px; }
  .meta-item { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; }
  .meta-item:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
  .meta-lbl { font-size: 12px; color: #94a3b8; font-weight: 500; }
  .meta-val { font-size: 12.5px; font-weight: 600; color: #1e293b; }
  .meta-val.mono { font-family: ${POS_MONO}; font-size: 11.5px; letter-spacing: 0.02em; color: #475569; }

  /* ── Items ── */
  .items-wrap { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 18px; }
  .items-head { background: #f8fafc; padding: 8px 14px; display: flex; justify-content: space-between; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
  .items-tbl { width: 100%; border-collapse: collapse; }
  .td-item { padding: 10px 14px; vertical-align: top; }
  .td-amount { padding: 10px 14px; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 13px; vertical-align: top; }
  .items-tbl tr:not(:last-child) .td-item,
  .items-tbl tr:not(:last-child) .td-amount { border-bottom: 1px solid #f1f5f9; }
  .item-name { font-size: 13px; font-weight: 600; color: #1e293b; }
  .item-qty { font-size: 11px; color: #94a3b8; margin-top: 1px; }

  /* ── Totals ── */
  .totals { margin-bottom: 16px; }
  .t-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12.5px; color: #64748b; }
  .t-row .t-val { font-variant-numeric: tabular-nums; font-weight: 500; }
  .t-row.discount { color: #ef4444; }
  .t-grand { display: flex; justify-content: space-between; align-items: center; padding: 12px 0 0; margin-top: 8px; border-top: 2px solid #0f172a; }
  .t-grand-lbl { font-size: 14px; font-weight: 700; color: #0f172a; }
  .t-grand-val { font-size: 18px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }

  /* ── Cash box ── */
  .cash-box { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 14px; margin-top: 12px; }
  .cash-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #166534; }
  .cash-row .c-val { font-weight: 600; font-variant-numeric: tabular-nums; }
  .cash-row.change .c-val { font-weight: 800; color: #059669; }

  /* ── Footer ── */
  .r-footer { text-align: center; padding: 16px 24px 20px; border-top: 1px dashed #e2e8f0; margin-top: 4px; }
  .r-footer p { font-size: 11px; color: #94a3b8; }
  .r-footer .code { font-family: ${POS_MONO}; font-size: 10px; letter-spacing: 0.14em; color: #cbd5e1; margin-top: 6px; }
  .powered-by { margin-top: 12px; font-size: 10px; color: #b0b8c8; letter-spacing: 0.02em; }
  .powered-by .brand { font-family: 'Comfortaa', cursive; font-weight: 800; font-size: 12px; color: #635bff; letter-spacing: -0.01em; }

  @media print {
    html { background: #fff; }
    body { margin: 0; width: 100%; }
    .receipt-card { border-radius: 0; box-shadow: none; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>

<div class="receipt-card">
  <div class="r-header">
    <div class="check-ring"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
    <div class="r-status">Payment received</div>
    <div class="r-amount">${formatPrice(order.total)}</div>
    <div class="r-date">${order.date}</div>
  </div>

  <div class="r-body">
    <div class="r-meta">
      <div class="meta-item"><span class="meta-lbl">Receipt no.</span><span class="meta-val mono">${order.orderNumber}</span></div>
      <div class="meta-item"><span class="meta-lbl">Payment</span><span class="meta-val" style="text-transform:capitalize">${order.paymentMethod}</span></div>
      <div class="meta-item"><span class="meta-lbl">Customer</span><span class="meta-val">${order.customerName}</span></div>
    </div>

    <div class="items-wrap">
      <div class="items-head"><span>Item</span><span>Amount</span></div>
      <table class="items-tbl"><tbody>${itemRows}</tbody></table>
    </div>

    <div class="totals">
      <div class="t-row"><span>Subtotal</span><span class="t-val">${formatPrice(order.subtotal)}</span></div>
      ${order.discount > 0 ? `<div class="t-row discount"><span>Discount</span><span class="t-val">−${formatPrice(order.discount)}</span></div>` : ""}
    </div>
    <div class="t-grand">
      <span class="t-grand-lbl">Total</span>
      <span class="t-grand-val">${formatPrice(order.total)}</span>
    </div>

    ${order.paymentMethod === "cash" ? `
      <div class="cash-box">
        <div class="cash-row"><span>Cash received</span><span class="c-val">${formatPrice(order.cashReceived)}</span></div>
        <div class="cash-row change"><span>Change due</span><span class="c-val">${formatPrice(order.change)}</span></div>
      </div>
    ` : ""}
  </div>

  <div class="r-footer">
    <p>Thank you for your purchase</p>
    <div class="code">${order.orderNumber}</div>
    <div class="powered-by">Powered by <span class="brand">Dynime</span></div>
  </div>
</div>

</body></html>`);
  w.document.close();
  w.onload = () => w.print();
}


/* ═══════════════════════════════════════════════════════
   INVOICE — Pixel-perfect Stripe invoice replica
   ═══════════════════════════════════════════════════════ */
export function printStyledInvoice(invoice: any, companyName = "Boostio") {
  const w = window.open("", "_blank");
  if (!w) return;

  const cur = invoice.currency || "USD";
  const fmt = (n: number) => {
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(n); }
    catch { return `${cur} ${n.toLocaleString()}`; }
  };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dueDateStr = invoice.due_date ? fmtDate(invoice.due_date) : "On receipt";
  const amountDue = fmt(invoice.amount || 0);

  const hasLineItems = invoice.line_items && invoice.line_items.length > 0;
  const lineItemsHTML = hasLineItems
    ? invoice.line_items.map((li: any) => {
        const qty = li.quantity || 1;
        const up = li.unit_price || 0;
        const taxLabel = li.tax_rate ? `${li.tax_rate}%` : "—";
        return `<tr>
          <td class="td-desc">${li.description || "Item"}</td>
          <td class="td-r">${qty}</td>
          <td class="td-r">${fmt(up)}</td>
          <td class="td-r">${taxLabel}</td>
          <td class="td-r td-bold">${fmt(qty * up)}</td>
        </tr>`;
      }).join("")
    : `<tr>
        <td class="td-desc">Services rendered</td>
        <td class="td-r">${invoice.items_count || 1}</td>
        <td class="td-r">${fmt(invoice.amount || 0)}</td>
        <td class="td-r">—</td>
        <td class="td-r td-bold">${fmt(invoice.amount || 0)}</td>
      </tr>`;

  const subtotal = invoice.subtotal || invoice.amount || 0;
  const discountAmt = invoice.discount_amount || 0;
  const taxAmt = invoice.tax_amount || 0;
  const totalAmt = invoice.amount || 0;

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  @page { margin: 0; size: A4; }
  html { background: #f0f0f3; }
  body {
    font-family: ${FONT};
    color: #0f172a;
    max-width: 860px;
    margin: 0 auto;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    font-size: 14px;
    line-height: 1.55;
    background: #fff;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Page wrapper ── */
  .page {
    flex: 1;
    padding: 56px 56px 40px;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .inv-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
  }
  .inv-title {
    font-size: 38px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .company-badge {
    font-size: 24px;
    font-weight: 700;
    color: #635bff;
    letter-spacing: -0.02em;
    text-align: right;
  }

  /* ── Invoice meta ── */
  .inv-meta {
    margin-bottom: 32px;
  }
  .inv-meta-table { border-collapse: collapse; }
  .inv-meta-table td { padding: 3px 0; font-size: 13.5px; vertical-align: baseline; }
  .inv-meta-table .m-lbl {
    color: #64748b;
    font-weight: 500;
    padding-right: 28px;
    white-space: nowrap;
  }
  .inv-meta-table .m-val {
    font-weight: 600;
    color: #1e293b;
  }
  .inv-meta-table .m-mono {
    font-family: ${MONO};
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.01em;
    color: #334155;
  }

  /* ── Parties ── */
  .parties-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-bottom: 40px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
  }
  .p-label {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .p-text {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
  }

  /* ── Amount hero ── */
  .amt-hero {
    margin-bottom: 6px;
  }
  .amt-hero h2 {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.025em;
    line-height: 1.2;
  }
  .pay-online {
    display: inline-block;
    color: #635bff;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    margin-top: 4px;
    cursor: pointer;
  }
  .pay-online:hover { text-decoration: underline; }
  .inv-memo {
    font-size: 13.5px;
    color: #64748b;
    margin: 8px 0 32px;
    line-height: 1.5;
  }

  /* ── Line items ── */
  .li-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
  }
  .li-table thead th {
    font-size: 11px;
    color: #64748b;
    font-weight: 600;
    padding: 12px 0;
    border-bottom: 1.5px solid #cbd5e1;
    text-align: left;
    letter-spacing: 0.01em;
  }
  .li-table thead th:not(:first-child) { text-align: right; }
  .td-desc {
    padding: 14px 12px 14px 0;
    font-weight: 500;
    font-size: 13.5px;
    color: #1e293b;
    border-bottom: 1px solid #f1f5f9;
  }
  .td-r {
    padding: 14px 0;
    text-align: right;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: #475569;
    border-bottom: 1px solid #f1f5f9;
  }
  .td-bold { font-weight: 600; color: #1e293b; }

  /* ── Summary ── */
  .summary-wrap {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
    margin-bottom: 40px;
  }
  .summary-tbl { border-collapse: collapse; min-width: 320px; }
  .summary-tbl td { padding: 7px 0; font-size: 13.5px; }
  .summary-tbl .sl { color: #64748b; font-weight: 400; }
  .summary-tbl .sv {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: #1e293b;
    padding-left: 48px;
  }
  .summary-tbl tr.s-discount .sv { color: #ef4444; }
  .summary-tbl tr.s-line-total td {
    padding-top: 10px;
    font-weight: 600;
    font-size: 13.5px;
  }
  .summary-tbl tr.s-due td {
    padding-top: 10px;
    border-top: 1.5px solid #cbd5e1;
    font-weight: 800;
    font-size: 15px;
    color: #0f172a;
  }
  .summary-tbl tr.s-due .sv {
    font-weight: 800;
    font-size: 15px;
    color: #0f172a;
  }

  /* ── Thanks ── */
  .thanks-msg {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 0;
    flex: 1;
    display: flex;
    align-items: flex-end;
    padding-bottom: 24px;
  }

  /* ── Footer ── */
  .inv-footer {
    padding: 16px 56px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .inv-footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #94a3b8;
    font-family: ${MONO};
    font-weight: 500;
  }
  .page-num { font-size: 11px; color: #cbd5e1; }

  @media print {
    html, body { background: #fff; }
    body { margin: 0; max-width: none; }
    .page { padding: 40px 48px 32px; }
    .inv-footer { padding: 12px 48px; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>

<div class="page">

  <!-- Header -->
  <div class="inv-header">
    <div class="inv-title">Invoice</div>
    <div class="company-badge">${companyName}</div>
  </div>

  <!-- Meta -->
  <div class="inv-meta">
    <table class="inv-meta-table">
      <tr><td class="m-lbl">Invoice number</td><td class="m-mono">${invoice.invoice_number}</td></tr>
      <tr><td class="m-lbl">Date of issue</td><td class="m-val">${fmtDate(invoice.issue_date)}</td></tr>
      <tr><td class="m-lbl">Date due</td><td class="m-val">${dueDateStr}</td></tr>
    </table>
  </div>

  <!-- Parties -->
  <div class="parties-grid">
    <div>
      <div class="p-label">${companyName}</div>
      <div class="p-text">${invoice.company_address || ""}</div>
    </div>
    <div>
      <div class="p-label">Bill to</div>
      <div class="p-text">
        ${invoice.client || "—"}
        ${invoice.client_email ? `<br>${invoice.client_email}` : ""}
        ${invoice.client_phone ? `<br>${invoice.client_phone}` : ""}
        ${invoice.client_address ? `<br>${invoice.client_address}` : ""}
      </div>
    </div>
  </div>

  <!-- Amount Due Hero -->
  <div class="amt-hero">
    <h2>${amountDue} ${cur} due ${dueDateStr}</h2>
  </div>
  ${invoice.share_token ? `<a class="pay-online">Pay online</a>` : ""}
  ${invoice.notes ? `<div class="inv-memo">${invoice.notes}</div>` : `<div style="margin-bottom: 28px;"></div>`}

  <!-- Line Items -->
  <table class="li-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit price</th>
        <th>Tax</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>${lineItemsHTML}</tbody>
  </table>

  <!-- Summary -->
  <div class="summary-wrap">
    <table class="summary-tbl">
      <tr><td class="sl">Subtotal</td><td class="sv">${fmt(subtotal)}</td></tr>
      ${discountAmt > 0 ? `<tr class="s-discount"><td class="sl">Discount</td><td class="sv">−${fmt(discountAmt)}</td></tr>` : ""}
      ${taxAmt > 0 ? `
        <tr><td class="sl">Total excluding tax</td><td class="sv">${fmt(subtotal - discountAmt)}</td></tr>
        <tr><td class="sl">Sales tax${invoice.tax_name ? ` (${invoice.tax_name})` : ""}</td><td class="sv">${fmt(taxAmt)}</td></tr>
      ` : ""}
      <tr class="s-line-total"><td class="sl">Total</td><td class="sv">${fmt(totalAmt)}</td></tr>
      <tr class="s-due"><td class="sl">Amount due</td><td class="sv">${amountDue} ${cur}</td></tr>
    </table>
  </div>

  <!-- Thanks -->
  <div class="thanks-msg">Thanks for using ${companyName}</div>

</div>

<!-- Footer -->
<div class="inv-footer">
  <div class="inv-footer-inner">
    <span>${invoice.invoice_number} · ${amountDue} ${cur} due ${dueDateStr}</span>
    <span class="page-num">1/1</span>
  </div>
</div>

</body></html>`);
  w.document.close();
  w.onload = () => w.print();
}
