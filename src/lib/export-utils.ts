/** CSV export utility */
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/** PDF export - generates a styled PDF-like printable document */
export function exportToPDF(elementId?: string, title?: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  let bodyContent = "";
  if (elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    bodyContent = el.innerHTML;
  } else {
    bodyContent = document.body.innerHTML;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title || "Report Export"}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1a1a2e; background: white; }
          .report-header { margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
          .report-header h1 { font-size: 22px; font-weight: 700; color: #111; }
          .report-header p { font-size: 12px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; font-size: 13px; }
          th { background: #f9fafb; font-weight: 600; color: #374151; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          tr:nth-child(even) td { background: #fafbfc; }
          h1, h2 { margin: 0 0 8px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>${title || "Report"}</h1>
          <p>Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${new Date().toLocaleTimeString()}</p>
        </div>
        ${bodyContent}
        <div class="footer">
          This report was auto-generated. Data accurate as of export time.
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
}

/** Export data array as styled PDF table */
export function exportDataToPDF(data: Record<string, any>[], title: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const tableHtml = `
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1a1a2e; }
          .report-header { margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
          .report-header h1 { font-size: 22px; font-weight: 700; }
          .report-header p { font-size: 12px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; font-size: 13px; }
          th { background: #f9fafb; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          tr:nth-child(even) td { background: #fafbfc; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>${title}</h1>
          <p>Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <p>${data.length} record(s)</p>
        </div>
        ${tableHtml}
        <div class="footer">Auto-generated report · ${data.length} records</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
}

/** Print invoice – delegates to Stripe-style template */
export function printInvoice(invoice: Record<string, any>) {
  // Lazy import to avoid circular deps
  import("@/lib/print-templates").then(({ printStyledInvoice }) => {
    printStyledInvoice(invoice);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
