interface ReceiptData {
  planName: string;
  amount: number;
  billingCycle: string;
  transactionId: string | null;
  paymentMethod: string | null;
  date: string;
  status: string;
  periodStart: string;
  periodEnd: string | null;
}

export function generateReceiptHTML(data: ReceiptData, currencySymbol: string = "$"): string {
  const statusStyles: Record<string, string> = {
    active: "background: #dcfce7; color: #166534;",
    pending: "background: #fef3c7; color: #92400e;",
    failed: "background: #fee2e2; color: #991b1b;",
  };
  const sStyle = statusStyles[data.status] || statusStyles.pending;

  return `<!DOCTYPE html><html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; -webkit-font-smoothing: antialiased; max-width: 640px; margin: 0 auto; padding: 48px 40px; }
  .top-bar { height: 4px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7); border-radius: 2px; margin-bottom: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .brand { font-size: 22px; font-weight: 700; color: #6366f1; }
  .brand-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .receipt-title { font-size: 32px; font-weight: 200; color: #374151; letter-spacing: -0.02em; }
  .receipt-id { font-size: 12px; font-family: 'SF Mono', 'Consolas', monospace; color: #9ca3af; margin-top: 4px; }
  .amount-hero { text-align: center; padding: 32px 0; margin-bottom: 32px; }
  .amount-hero .checkmark { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); margin-bottom: 12px; }
  .amount-hero .checkmark svg { width: 24px; height: 24px; fill: none; stroke: white; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .amount-hero .amount { font-size: 36px; font-weight: 700; letter-spacing: -0.02em; color: #1a1a2e; margin: 8px 0 4px; font-variant-numeric: tabular-nums; }
  .amount-hero .subtitle { font-size: 13px; color: #9ca3af; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; font-weight: 600; }
  .detail-card { background: #f9fafb; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; }
  .detail-row:not(:last-child) { border-bottom: 1px solid #e5e7eb; }
  .detail-row .val { font-size: 14px; font-weight: 600; }
  .detail-row .val.mono { font-family: 'SF Mono', 'Consolas', monospace; font-size: 12px; }
  .status-pill { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .footer { margin-top: 48px; text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .footer p { font-size: 11px; color: #9ca3af; line-height: 1.8; }
  @media print { body { padding: 24px; } .top-bar { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style></head><body>
  <div class="top-bar"></div>
  <div class="header">
    <div>
      <div class="brand">Boostio</div>
      <div class="brand-sub">Simplify Growth Execution</div>
    </div>
    <div style="text-align: right;">
      <div class="receipt-title">RECEIPT</div>
      <div class="receipt-id">${data.transactionId || "N/A"}</div>
    </div>
  </div>

  <div class="amount-hero">
    <div class="checkmark"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
    <div class="amount">${currencySymbol}${Number(data.amount).toLocaleString()}</div>
    <div class="subtitle">${data.planName} · ${data.billingCycle}</div>
  </div>

  <div class="detail-card">
    <div class="detail-row">
      <span class="label">Plan</span>
      <span class="val">${data.planName}</span>
    </div>
    <div class="detail-row">
      <span class="label">Billing Cycle</span>
      <span class="val" style="text-transform: capitalize;">${data.billingCycle}</span>
    </div>
    <div class="detail-row">
      <span class="label">Payment Date</span>
      <span class="val">${new Date(data.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
    </div>
    <div class="detail-row">
      <span class="label">Payment Method</span>
      <span class="val" style="text-transform: capitalize;">${data.paymentMethod || "Card"}</span>
    </div>
    <div class="detail-row">
      <span class="label">Transaction ID</span>
      <span class="val mono">${data.transactionId || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="label">Period</span>
      <span class="val">${new Date(data.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} — ${data.periodEnd ? new Date(data.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Ongoing"}</span>
    </div>
    <div class="detail-row">
      <span class="label">Status</span>
      <span class="status-pill" style="${sStyle}">${data.status}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing Boostio.</p>
    <p>This is a computer-generated receipt and does not require a signature.</p>
    <p style="margin-top: 8px;">© ${new Date().getFullYear()} Boostio. All rights reserved.</p>
  </div>
</body></html>`;
}

export function downloadReceipt(data: ReceiptData, currencySymbol: string = "$") {
  const html = generateReceiptHTML(data, currencySymbol);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
