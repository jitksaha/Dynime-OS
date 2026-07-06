import { Download, Printer, FileText } from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

interface Employee {
  full_name: string;
  email: string;
  department?: string | null;
  job_title?: string | null;
  status: string;
  phone?: string | null;
  employment_type?: string;
  salary?: number | null;
  join_date?: string | null;
  gender?: string | null;
}

interface EmployeeListActionsProps {
  employees: Employee[];
  printId?: string;
}

export default function EmployeeListActions({ employees, printId }: EmployeeListActionsProps) {
  const handleCSV = () => {
    if (!employees.length) return;
    const data = employees.map(e => ({
      Name: e.full_name,
      Email: e.email,
      Department: e.department || "",
      "Job Title": e.job_title || "",
      Status: e.status,
      Phone: e.phone || "",
      "Employment Type": e.employment_type || "",
      Salary: e.salary || "",
      "Join Date": e.join_date || "",
      Gender: e.gender || "",
    }));
    exportToCSV(data, `employees-${new Date().toISOString().slice(0, 10)}`);
  };

  const handlePrint = () => {
    const rows = employees.map(e => `
      <tr>
        <td>${e.full_name}</td>
        <td>${e.email}</td>
        <td>${e.department || "-"}</td>
        <td>${e.job_title || "-"}</td>
        <td>${e.status}</td>
        <td>${e.employment_type || "-"}</td>
        <td>${e.phone || "-"}</td>
      </tr>
    `).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Employee List</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 30px; color: #1a1a2e; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p.sub { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
            td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
            tr:hover { background: #fafafa; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #9ca3af; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>
          <h1>Employee Directory</h1>
          <p class="sub">Generated on ${new Date().toLocaleDateString()} · ${employees.length} employees</p>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Job Title</th><th>Status</th><th>Type</th><th>Phone</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Confidential — For internal use only</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <div className="flex items-center gap-1">
      <button onClick={handleCSV} title="Export CSV"
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-input text-xs font-medium text-foreground hover:bg-accent transition-colors">
        <Download className="h-3.5 w-3.5" /> CSV
      </button>
      <button onClick={handlePrint} title="Print List"
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-input text-xs font-medium text-foreground hover:bg-accent transition-colors">
        <Printer className="h-3.5 w-3.5" /> Print
      </button>
    </div>
  );
}
