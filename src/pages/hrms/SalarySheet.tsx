import { useState, useEffect, useMemo } from "react";
import { Download, RefreshCw, FileText, Pencil, Check, X, Calendar, ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { toast } from "sonner";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parse } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
  salary: number | null;
}

interface AttendanceRecord {
  employee_name: string;
  status: string;
  working_hours: number | null;
}

interface PayrollRecord {
  id: string;
  employee_name: string;
  employee_department: string | null;
  basic_salary: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  pay_period: string;
  status: string;
}

// Currencies removed - now uses tenant currency from useTenantCurrency hook

const STATUSES = ["Draft", "Pending", "Processed", "Paid", "On Hold"];

const statusStyle: Record<string, string> = {
  Draft: "bg-secondary text-muted-foreground",
  Pending: "bg-warning/10 text-warning",
  Processed: "bg-success/10 text-success",
  Paid: "bg-primary/10 text-primary",
  "On Hold": "bg-destructive/10 text-destructive",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWorkingDays(year: number, month: number): number {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => !isWeekend(d)).length;
}

function periodToKey(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export default function SalarySheet() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { symbol: currencySymbol, currency: tenantCurrency } = useTenantCurrency();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allRecords, setAllRecords] = useState<PayrollRecord[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, { presentDays: number; totalHours: number }>>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  // currency now comes from tenant settings
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PayrollRecord>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  // Filter state
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [filterMode, setFilterMode] = useState<"month" | "range">("month");
  const [rangeFrom, setRangeFrom] = useState<Date | undefined>();
  const [rangeTo, setRangeTo] = useState<Date | undefined>();

  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // Current selected period key
  const selectedPeriod = periodToKey(filterDate);

  const fetchAll = async () => {
    if (!tenantId) return;
    setLoading(true);

    // Fetch all payroll records and employees
    const [empRes, payRes] = await Promise.all([
      supabase.from("employees").select("id, full_name, department, salary").eq("tenant_id", tenantId).eq("status", "Active"),
      supabase.from("payroll_records").select("*").eq("tenant_id", tenantId).order("pay_period", { ascending: false }),
    ]);

    if (empRes.data) setEmployees(empRes.data as Employee[]);
    if (payRes.data) setAllRecords(payRes.data as PayrollRecord[]);

    // Fetch attendance for broader range (last 12 months)
    const now = new Date();
    const startRange = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const attRes = await supabase
      .from("attendance_records")
      .select("employee_name, status, working_hours, attendance_date")
      .eq("tenant_id", tenantId)
      .gte("attendance_date", startRange.toISOString().split("T")[0]);

    if (attRes.data) {
      const map: Record<string, Record<string, { presentDays: number; totalHours: number }>> = {};
      (attRes.data as any[]).forEach(a => {
        const d = new Date(a.attendance_date);
        const pk = periodToKey(d);
        if (!map[pk]) map[pk] = {};
        if (!map[pk][a.employee_name]) map[pk][a.employee_name] = { presentDays: 0, totalHours: 0 };
        if (a.status === "present" || a.status === "late") map[pk][a.employee_name].presentDays++;
        map[pk][a.employee_name].totalHours += Number(a.working_hours || 0);
      });
      setAttendanceMap(map);
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [tenantId]);

  // Group records by period
  const groupedRecords = useMemo(() => {
    const groups: Record<string, PayrollRecord[]> = {};
    let filtered = allRecords;

    if (filterMode === "range" && rangeFrom && rangeTo) {
      filtered = allRecords.filter(r => {
        try {
          const parts = r.pay_period.split(" ");
          const mi = MONTH_NAMES.indexOf(parts[0]);
          const yr = parseInt(parts[1]);
          const rd = new Date(yr, mi, 15);
          return rd >= rangeFrom && rd <= rangeTo;
        } catch { return true; }
      });
    }

    filtered.forEach(r => {
      if (!groups[r.pay_period]) groups[r.pay_period] = [];
      groups[r.pay_period].push(r);
    });

    // Sort periods descending
    const sorted = Object.keys(groups).sort((a, b) => {
      const pa = a.split(" "), pb = b.split(" ");
      const ya = parseInt(pa[1]), yb = parseInt(pb[1]);
      if (ya !== yb) return yb - ya;
      return MONTH_NAMES.indexOf(pb[0]) - MONTH_NAMES.indexOf(pa[0]);
    });

    return sorted.map(p => ({ period: p, records: groups[p] }));
  }, [allRecords, filterMode, rangeFrom, rangeTo]);

  // Auto-expand current period
  useEffect(() => {
    if (groupedRecords.length > 0) {
      setExpandedPeriods(prev => {
        const next = new Set(prev);
        next.add(selectedPeriod);
        if (groupedRecords[0]) next.add(groupedRecords[0].period);
        return next;
      });
    }
  }, [groupedRecords, selectedPeriod]);

  const generateSheet = async () => {
    if (!tenantId || employees.length === 0) { toast.error("No active employees"); return; }
    setGenerating(true);

    const period = selectedPeriod;
    const monthIndex = filterDate.getMonth();
    const year = filterDate.getFullYear();
    const workingDays = getWorkingDays(year, monthIndex);
    const existing = allRecords.filter(r => r.pay_period === period).map(r => r.employee_name);
    const periodAttendance = attendanceMap[period] || {};

    const newRecords = employees.filter(e => !existing.includes(e.full_name)).map(e => {
      const basic = e.salary || 0;
      const att = periodAttendance[e.full_name];
      const presentDays = att?.presentDays || workingDays;
      const attendanceRatio = workingDays > 0 ? presentDays / workingDays : 1;
      const adjustedBasic = Math.round(basic * attendanceRatio);
      const hra = Math.round(adjustedBasic * 0.3);
      const allowances = Math.round(adjustedBasic * 0.1);
      const absentDeduction = basic > 0 ? Math.round(basic * (1 - attendanceRatio)) : 0;
      const otherDeductions = Math.round(adjustedBasic * 0.05);
      const totalDeductions = absentDeduction + otherDeductions;
      const net = adjustedBasic + hra + allowances - totalDeductions;

      return buildInsert({
        employee_name: e.full_name,
        employee_department: e.department,
        pay_period: period,
        basic_salary: adjustedBasic,
        hra,
        allowances,
        deductions: totalDeductions,
        net_pay: Math.max(0, net),
        status: "Draft",
      });
    });

    if (newRecords.length === 0) { toast.info("All employees already have records for this period"); setGenerating(false); return; }

    const { error } = await supabase.from("payroll_records").insert(newRecords);
    if (error) { toast.error(error.message); setGenerating(false); return; }
    toast.success(`Generated ${newRecords.length} salary records for ${period}`);
    setGenerating(false);
    setExpandedPeriods(prev => new Set(prev).add(period));
    fetchAll();
  };

  const startEdit = (r: PayrollRecord) => {
    setEditingId(r.id);
    setEditValues({ basic_salary: r.basic_salary, hra: r.hra, allowances: r.allowances, deductions: r.deductions, status: r.status });
  };
  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    const basic = Number(editValues.basic_salary || 0);
    const hra = Number(editValues.hra || 0);
    const allowances = Number(editValues.allowances || 0);
    const deductions = Number(editValues.deductions || 0);
    const net_pay = Math.max(0, basic + hra + allowances - deductions);
    const { error } = await supabase.from("payroll_records").update({
      basic_salary: basic, hra, allowances, deductions, net_pay, status: editValues.status || "Draft",
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Record updated"); setEditingId(null); setEditValues({}); fetchAll(); }
    setSavingId(null);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("payroll_records").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Status → ${status}`); fetchAll(); }
  };

  const downloadPeriodCSV = (period: string, records: PayrollRecord[]) => {
    exportToCSV(records.map(r => ({
      Employee: r.employee_name, Department: r.employee_department || "", Basic: r.basic_salary,
      HRA: r.hra, Allowances: r.allowances, Deductions: r.deductions, "Net Pay": r.net_pay, Status: r.status, Period: r.pay_period,
    })), `salary-sheet-${period.replace(" ", "-")}`);
    toast.success(`Downloaded CSV for ${period}`);
  };

  const downloadPeriodPDF = (period: string, records: PayrollRecord[]) => {
    const total = records.reduce((s, r) => s + Number(r.net_pay), 0);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Salary Sheet - ${period}</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1a1a2e; max-width: 1100px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .company { font-size: 22px; font-weight: 700; color: #2563eb; }
        .period { font-size: 18px; font-weight: 600; color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { font-weight: 700; font-size: 14px; background: #f9fafb; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
        .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header">
        <div><div class="company">Boostio</div><p style="color:#6b7280;font-size:12px;margin:4px 0 0;">Salary Sheet Report</p></div>
        <div class="period">${period}</div>
      </div>
      <table>
        <thead><tr>
          <th>Employee</th><th>Department</th><th class="text-right">Basic</th><th class="text-right">HRA</th>
          <th class="text-right">Allowances</th><th class="text-right">Deductions</th><th class="text-right">Net Pay</th><th class="text-center">Status</th>
        </tr></thead>
        <tbody>
          ${records.map(r => `<tr>
            <td>${r.employee_name}</td><td>${r.employee_department || "—"}</td>
            <td class="text-right">${currencySymbol}${Number(r.basic_salary).toLocaleString()}</td>
            <td class="text-right">${currencySymbol}${Number(r.hra).toLocaleString()}</td>
            <td class="text-right">${currencySymbol}${Number(r.allowances).toLocaleString()}</td>
            <td class="text-right">${currencySymbol}${Number(r.deductions).toLocaleString()}</td>
            <td class="text-right" style="font-weight:600">${currencySymbol}${Number(r.net_pay).toLocaleString()}</td>
            <td class="text-center"><span class="badge">${r.status}</span></td>
          </tr>`).join("")}
          <tr class="total-row"><td colspan="6" class="text-right">Total Net Payroll:</td><td class="text-right">${currencySymbol}${total.toLocaleString()}</td><td></td></tr>
        </tbody>
      </table>
      <div class="footer"><p>Generated on ${new Date().toLocaleDateString()} · Dynime · dynime.com</p></div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
    toast.success(`PDF generated for ${period}`);
  };

  const togglePeriod = (p: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const totalPayroll = allRecords.reduce((s, r) => s + Number(r.net_pay), 0);
  const draftCount = allRecords.filter(r => r.status === "Draft").length;
  const processedCount = allRecords.filter(r => r.status === "Processed" || r.status === "Paid").length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Salary Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate & manage monthly salary sheets with attendance-based calculations</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <span className="h-9 px-3 rounded-md border border-input bg-card text-sm flex items-center gap-1 text-muted-foreground">
            {currencySymbol} {tenantCurrency}
          </span>
          <button onClick={generateSheet} disabled={generating}
            className="flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            Generate {format(filterDate, "MMM yyyy")}
          </button>
        </div>
      </div>

      {/* Advanced Filter */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filter:</span>

          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button onClick={() => setFilterMode("month")}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", filterMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              Month
            </button>
            <button onClick={() => setFilterMode("range")}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", filterMode === "range" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              Date Range
            </button>
          </div>

          {filterMode === "month" ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(filterDate, "MMMM yyyy")}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={filterDate}
                  onSelect={(d) => d && setFilterDate(d)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {rangeFrom ? format(rangeFrom, "MMM yyyy") : "From"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={rangeFrom} onSelect={(d) => d && setRangeFrom(d)} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {rangeTo ? format(rangeTo, "MMM yyyy") : "To"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={rangeTo} onSelect={(d) => d && setRangeTo(d)} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Employees", value: employees.length, color: "text-foreground" },
          { label: "Total Sheets", value: groupedRecords.length, color: "text-primary" },
          { label: "Total Payroll", value: fmt(totalPayroll), color: "text-success" },
          { label: "Drafts", value: draftCount, color: "text-warning" },
          { label: "Processed / Paid", value: processedCount, color: "text-info" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Grouped Records */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : groupedRecords.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No salary sheets found. Select a month and click <strong>"Generate"</strong> to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedRecords.map(({ period, records }) => {
            const isExpanded = expandedPeriods.has(period);
            const periodTotal = records.reduce((s, r) => s + Number(r.net_pay), 0);
            const periodDrafts = records.filter(r => r.status === "Draft").length;
            const periodPaid = records.filter(r => r.status === "Paid").length;
            const parts = period.split(" ");
            const mi = MONTH_NAMES.indexOf(parts[0]);
            const yr = parseInt(parts[1]);
            const workingDays = getWorkingDays(yr, mi);
            const periodAtt = attendanceMap[period] || {};

            return (
              <div key={period} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Period Header Row */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => togglePeriod(period)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{period}</h3>
                      <p className="text-xs text-muted-foreground">{records.length} employees · {fmt(periodTotal)} total · {periodDrafts} drafts · {periodPaid} paid</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => downloadPeriodCSV(period, records)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-medium hover:bg-primary/10 transition-colors">
                      <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                    <button onClick={() => downloadPeriodPDF(period, records)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-medium hover:bg-primary/10 transition-colors">
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </button>
                  </div>
                </div>

                {/* Expanded Table */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Bulk Actions */}
                    <div className="flex flex-wrap gap-2 items-center px-4 py-2 bg-secondary/20">
                      <span className="text-xs text-muted-foreground font-medium">Bulk:</span>
                      {["Draft", "Pending", "Processed", "Paid"].map(st => (
                        <button key={st} onClick={async () => {
                          const ids = records.filter(r => r.status !== st).map(r => r.id);
                          if (ids.length === 0) return;
                          const { error } = await supabase.from("payroll_records").update({ status: st }).in("id", ids);
                          if (error) toast.error(error.message);
                          else { toast.success(`${period}: All → ${st}`); fetchAll(); }
                        }}
                          className={`text-[11px] px-2.5 py-0.5 rounded-full border border-input hover:bg-primary/10 transition-colors ${statusStyle[st] || ""}`}>
                          All {st}
                        </button>
                      ))}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-secondary/30">
                            <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Employee</th>
                            <th className="text-left px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Department</th>
                            <th className="text-center px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Attendance</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Basic</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">HRA</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Allowances</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Deductions</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Net Pay</th>
                            <th className="text-center px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Status</th>
                            <th className="text-center px-3 py-2.5 text-[11px] font-medium text-muted-foreground uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {records.map(r => {
                            const isEditing = editingId === r.id;
                            const att = periodAtt[r.employee_name];
                            return (
                              <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                                <td className="px-4 py-2.5 text-sm font-medium text-foreground">{r.employee_name}</td>
                                <td className="px-3 py-2.5 text-sm text-muted-foreground">{r.employee_department || "—"}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="text-xs text-muted-foreground">
                                    {att ? `${att.presentDays}/${workingDays}d` : `${workingDays}/${workingDays}d`}
                                  </span>
                                  {att && <span className="block text-[10px] text-muted-foreground">{att.totalHours.toFixed(0)}h</span>}
                                </td>
                                {isEditing ? (
                                  <>
                                    {(["basic_salary", "hra", "allowances", "deductions"] as const).map(field => (
                                      <td key={field} className="px-2 py-2">
                                        <input type="number" value={editValues[field] ?? ""} onChange={e => setEditValues({ ...editValues, [field]: Number(e.target.value) })}
                                          className="w-20 h-8 text-right rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                                      </td>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-2.5 text-sm text-right text-foreground">{fmt(Number(r.basic_salary))}</td>
                                    <td className="px-3 py-2.5 text-sm text-right text-muted-foreground">{fmt(Number(r.hra))}</td>
                                    <td className="px-3 py-2.5 text-sm text-right text-muted-foreground">{fmt(Number(r.allowances))}</td>
                                    <td className="px-3 py-2.5 text-sm text-right text-destructive">{fmt(Number(r.deductions))}</td>
                                  </>
                                )}
                                <td className="px-3 py-2.5 text-sm text-right font-bold text-foreground">
                                  {isEditing
                                    ? fmt(Math.max(0, Number(editValues.basic_salary || 0) + Number(editValues.hra || 0) + Number(editValues.allowances || 0) - Number(editValues.deductions || 0)))
                                    : fmt(Number(r.net_pay))}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {isEditing ? (
                                    <select value={editValues.status || r.status} onChange={e => setEditValues({ ...editValues, status: e.target.value })}
                                      className="h-7 text-xs rounded border border-input bg-background px-1 focus:outline-none focus:ring-1 focus:ring-ring">
                                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  ) : (
                                    <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                                      className={`appearance-none cursor-pointer px-2 py-0.5 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-ring ${statusStyle[r.status] || "bg-secondary text-muted-foreground"}`}>
                                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => saveEdit(r.id)} disabled={savingId === r.id}
                                        className="p-1 rounded text-success hover:bg-success/10 transition-colors disabled:opacity-50"><Check className="h-4 w-4" /></button>
                                      <button onClick={cancelEdit} className="p-1 rounded text-muted-foreground hover:bg-destructive/10 transition-colors"><X className="h-4 w-4" /></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => startEdit(r)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border bg-secondary/20">
                            <td colSpan={7} className="px-4 py-2.5 text-sm font-bold text-foreground text-right">Total:</td>
                            <td className="px-3 py-2.5 text-sm font-bold text-right text-success">{fmt(periodTotal)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
