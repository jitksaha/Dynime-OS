import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import {
  Save, Loader2, RotateCcw, Plus, Trash2, Building2, DollarSign, Clock,
  Timer, CalendarDays, Gift, Receipt, Shield, Wallet, MinusCircle,
  CheckCircle, FileText, CreditCard, Lock, UserX, Users, Bell, AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SalaryComponent {
  name: string;
  type: "percentage" | "fixed";
  value: number;
  enabled: boolean;
  taxable: boolean;
}

interface LeaveType {
  name: string;
  code: string;
  paid: boolean;
  days_per_year: number;
  carry_forward: boolean;
  max_carry_days: number;
  encashable: boolean;
  pro_rata: boolean;
}

interface BonusType {
  name: string;
  calculation: string;
  value: number;
  eligibility_months: number;
  active_only: boolean;
  enabled: boolean;
  frequency: string;
}

interface TaxSlab {
  min: number;
  max: number;
  rate: number;
}

interface TaxExemption {
  name: string;
  max_amount: number;
  enabled: boolean;
}

interface CustomDeduction {
  name: string;
  type: "fixed" | "percentage";
  value: number;
  mandatory: boolean;
  enabled: boolean;
}

interface GratuityRules {
  min_service_years: number;
  calculation_basis: string;
  days_per_year: number;
  max_amount: number;
}

interface PayrollConfig {
  payroll_cycle: string;
  payroll_start_date: number;
  payroll_cutoff_date: number;
  salary_processing_date: number;
  payment_disbursement_date: number;
  fiscal_year_start: string;
  currency: string;
  timezone: string;
  decimal_precision: number;
  rounding_method: string;
  salary_type: string;
  salary_components: SalaryComponent[];
  working_days_per_month: number;
  working_days_calculation: string;
  office_start_time: string;
  office_end_time: string;
  shift_policy_enabled: boolean;
  late_penalty_enabled: boolean;
  late_penalty_type: string;
  late_penalty_count: number;
  late_penalty_amount: number;
  early_leave_deduction: boolean;
  absent_deduction_basis: string;
  half_day_enabled: boolean;
  half_day_hours: number;
  grace_time_minutes: number;
  weekend_days: string[];
  ot_enabled: boolean;
  ot_calculation_method: string;
  ot_hourly_rate: number;
  ot_fixed_rate: number;
  ot_rounding_minutes: number;
  ot_max_per_day: number;
  ot_max_per_month: number;
  ot_approval_required: boolean;
  ot_holiday_multiplier: number;
  ot_weekend_multiplier: number;
  leave_types: LeaveType[];
  unpaid_leave_deduction_basis: string;
  leave_proration_on_join: boolean;
  bonus_types: BonusType[];
  incentive_enabled: boolean;
  tax_deduction_enabled: boolean;
  tax_slabs: TaxSlab[];
  tax_calculation_basis: string;
  monthly_tds_enabled: boolean;
  tax_exemption_settings: TaxExemption[];
  tax_certificate_enabled: boolean;
  tax_year_type: string;
  pf_enabled: boolean;
  pf_employee_contribution: number;
  pf_employer_contribution: number;
  pf_eligibility_months: number;
  pf_ceiling_amount: number;
  gratuity_enabled: boolean;
  gratuity_rules: GratuityRules;
  loan_enabled: boolean;
  loan_deduction_mode: string;
  loan_approval_required: boolean;
  advance_repayment_rule: string;
  loan_max_amount_multiplier: number;
  loan_interest_rate: number;
  loan_max_tenure_months: number;
  custom_deduction_types: CustomDeduction[];
  auto_attendance_deduction: boolean;
  manual_deduction_approval: boolean;
  max_deduction_percentage: number;
  payroll_approval_required: boolean;
  approval_levels: string[];
  audit_log_mandatory: boolean;
  approval_timeout_days: number;
  auto_escalation: boolean;
  payslip_template: string;
  payslip_show_company_logo: boolean;
  payslip_show_bank_info: boolean;
  payslip_numbering_prefix: string;
  payslip_language: string;
  payslip_show_ytd: boolean;
  payslip_digital_signature: boolean;
  payment_mode: string;
  bulk_export_format: string;
  salary_payment_tracking: boolean;
  auto_payment_confirmation: boolean;
  bank_file_format: string;
  split_payment_enabled: boolean;
  payroll_lock_after_approval: boolean;
  lock_days_after_approval: number;
  arrear_enabled: boolean;
  retro_deduction_enabled: boolean;
  backdated_correction_enabled: boolean;
  correction_max_months: number;
  notice_period_deduction: boolean;
  notice_period_days: number;
  leave_encashment_on_exit: boolean;
  loan_settlement_priority: boolean;
  final_settlement_approval: boolean;
  auto_final_payslip: boolean;
  fnf_processing_days: number;
  role_permissions: any;
  notification_settings: any;
}

const DEFAULT_CONFIG: PayrollConfig = {
  payroll_cycle: "monthly", payroll_start_date: 1, payroll_cutoff_date: 25,
  salary_processing_date: 28, payment_disbursement_date: 30,
  fiscal_year_start: "January", currency: "BDT", timezone: "Asia/Dhaka",
  decimal_precision: 2, rounding_method: "round",
  salary_type: "gross",
  salary_components: [
    { name: "Basic", type: "percentage", value: 50, enabled: true, taxable: true },
    { name: "House Rent", type: "percentage", value: 30, enabled: true, taxable: false },
    { name: "Medical", type: "percentage", value: 5, enabled: true, taxable: false },
    { name: "Conveyance", type: "percentage", value: 5, enabled: true, taxable: false },
    { name: "Food Allowance", type: "fixed", value: 0, enabled: false, taxable: false },
    { name: "Mobile Allowance", type: "fixed", value: 0, enabled: false, taxable: false },
    { name: "Special Allowance", type: "fixed", value: 0, enabled: false, taxable: true },
    { name: "Dearness Allowance", type: "percentage", value: 0, enabled: false, taxable: true },
  ],
  working_days_per_month: 26, working_days_calculation: "fixed",
  office_start_time: "09:00", office_end_time: "18:00",
  shift_policy_enabled: false, late_penalty_enabled: false, late_penalty_type: "per_late",
  late_penalty_count: 3, late_penalty_amount: 0, early_leave_deduction: false,
  absent_deduction_basis: "gross", half_day_enabled: true, half_day_hours: 4,
  grace_time_minutes: 10, weekend_days: ["Friday", "Saturday"],
  ot_enabled: false, ot_calculation_method: "hourly", ot_hourly_rate: 0,
  ot_fixed_rate: 0, ot_rounding_minutes: 30, ot_max_per_day: 4, ot_max_per_month: 60,
  ot_approval_required: true, ot_holiday_multiplier: 2, ot_weekend_multiplier: 1.5,
  leave_types: [
    { name: "Casual Leave", code: "CL", paid: true, days_per_year: 10, carry_forward: false, max_carry_days: 0, encashable: false, pro_rata: true },
    { name: "Sick Leave", code: "SL", paid: true, days_per_year: 14, carry_forward: false, max_carry_days: 0, encashable: false, pro_rata: false },
    { name: "Annual Leave", code: "AL", paid: true, days_per_year: 15, carry_forward: true, max_carry_days: 10, encashable: true, pro_rata: true },
    { name: "Maternity Leave", code: "ML", paid: true, days_per_year: 120, carry_forward: false, max_carry_days: 0, encashable: false, pro_rata: false },
    { name: "Paternity Leave", code: "PL", paid: true, days_per_year: 7, carry_forward: false, max_carry_days: 0, encashable: false, pro_rata: false },
    { name: "Unpaid Leave", code: "UL", paid: false, days_per_year: 0, carry_forward: false, max_carry_days: 0, encashable: false, pro_rata: false },
  ],
  unpaid_leave_deduction_basis: "gross", leave_proration_on_join: true,
  bonus_types: [
    { name: "Festival Bonus", calculation: "percentage_basic", value: 100, eligibility_months: 6, active_only: true, enabled: true, frequency: "biannual" },
    { name: "Performance Bonus", calculation: "fixed", value: 0, eligibility_months: 12, active_only: true, enabled: false, frequency: "annual" },
    { name: "Attendance Bonus", calculation: "fixed", value: 0, eligibility_months: 3, active_only: true, enabled: false, frequency: "monthly" },
    { name: "Year-End Bonus", calculation: "percentage_gross", value: 0, eligibility_months: 12, active_only: true, enabled: false, frequency: "annual" },
  ],
  incentive_enabled: false,
  tax_deduction_enabled: false,
  tax_slabs: [
    { min: 0, max: 350000, rate: 0 },
    { min: 350001, max: 450000, rate: 5 },
    { min: 450001, max: 750000, rate: 10 },
    { min: 750001, max: 1150000, rate: 15 },
    { min: 1150001, max: 1650000, rate: 20 },
    { min: 1650001, max: 99999999, rate: 25 },
  ],
  tax_calculation_basis: "gross",
  monthly_tds_enabled: false,
  tax_exemption_settings: [
    { name: "Investment Rebate", max_amount: 0, enabled: false },
    { name: "House Rent Exemption", max_amount: 0, enabled: false },
    { name: "Medical Exemption", max_amount: 0, enabled: false },
  ],
  tax_certificate_enabled: false, tax_year_type: "fiscal",
  pf_enabled: false, pf_employee_contribution: 0, pf_employer_contribution: 0,
  pf_eligibility_months: 0, pf_ceiling_amount: 0,
  gratuity_enabled: false,
  gratuity_rules: { min_service_years: 5, calculation_basis: "basic", days_per_year: 30, max_amount: 0 },
  loan_enabled: false, loan_deduction_mode: "fixed", loan_approval_required: true,
  advance_repayment_rule: "next_month", loan_max_amount_multiplier: 3,
  loan_interest_rate: 0, loan_max_tenure_months: 24,
  custom_deduction_types: [
    { name: "Professional Tax", type: "fixed", value: 0, mandatory: false, enabled: false },
    { name: "Union Fee", type: "fixed", value: 0, mandatory: false, enabled: false },
    { name: "Insurance Premium", type: "fixed", value: 0, mandatory: false, enabled: false },
  ],
  auto_attendance_deduction: false, manual_deduction_approval: true, max_deduction_percentage: 50,
  payroll_approval_required: true, approval_levels: ["HR", "Accounts", "Admin"],
  audit_log_mandatory: true, approval_timeout_days: 3, auto_escalation: true,
  payslip_template: "standard", payslip_show_company_logo: true,
  payslip_show_bank_info: false, payslip_numbering_prefix: "PS",
  payslip_language: "en", payslip_show_ytd: true, payslip_digital_signature: false,
  payment_mode: "bank_transfer", bulk_export_format: "csv",
  salary_payment_tracking: true, auto_payment_confirmation: false,
  bank_file_format: "generic", split_payment_enabled: false,
  payroll_lock_after_approval: true, lock_days_after_approval: 3,
  arrear_enabled: true, retro_deduction_enabled: true, backdated_correction_enabled: false,
  correction_max_months: 3,
  notice_period_deduction: true, notice_period_days: 30,
  leave_encashment_on_exit: true, loan_settlement_priority: true,
  final_settlement_approval: true, auto_final_payslip: true, fnf_processing_days: 15,
  role_permissions: {
    view_salary: ["company_admin", "hr_manager"],
    edit_salary_components: ["company_admin"],
    approve_payroll: ["company_admin", "hr_manager"],
    export_payroll: ["company_admin", "hr_manager"],
    process_payroll: ["company_admin", "hr_manager"],
    manage_loans: ["company_admin", "hr_manager"],
    view_reports: ["company_admin", "hr_manager", "manager"],
    employee_self_service: true,
  },
  notification_settings: {
    salary_processed: { enabled: true, channels: ["email"] },
    salary_paid: { enabled: true, channels: ["email"] },
    approval_pending: { enabled: true, channels: ["email"] },
    failed_payment: { enabled: true, channels: ["email"] },
    payslip_generated: { enabled: true, channels: ["email"] },
    loan_approved: { enabled: false, channels: [] },
    settlement_initiated: { enabled: false, channels: [] },
  },
};

const CURRENCIES = [
  { value: "BDT", label: "BDT (৳)" }, { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" }, { value: "GBP", label: "GBP (£)" },
  { value: "INR", label: "INR (₹)" }, { value: "AED", label: "AED (د.إ)" },
  { value: "SAR", label: "SAR (﷼)" }, { value: "MYR", label: "MYR (RM)" },
  { value: "SGD", label: "SGD (S$)" }, { value: "AUD", label: "AUD (A$)" },
  { value: "CAD", label: "CAD (C$)" }, { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (¥)" }, { value: "PKR", label: "PKR (₨)" },
  { value: "NGN", label: "NGN (₦)" }, { value: "KES", label: "KES (KSh)" },
  { value: "ZAR", label: "ZAR (R)" }, { value: "EGP", label: "EGP (E£)" },
  { value: "PHP", label: "PHP (₱)" }, { value: "THB", label: "THB (฿)" },
];

const TIMEZONES = [
  { value: "Asia/Dhaka", label: "Asia/Dhaka (GMT+6)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (GMT+5:30)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GMT+4)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (GMT+3)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (GMT+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+9)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (GMT+8)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (GMT+5)" },
  { value: "Asia/Manila", label: "Asia/Manila (GMT+8)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (GMT+7)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (GMT+1)" },
  { value: "Europe/Paris", label: "Europe/Paris (GMT+1)" },
  { value: "America/New_York", label: "America/New York (EST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST)" },
  { value: "America/Toronto", label: "America/Toronto (EST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
  { value: "Africa/Cairo", label: "Africa/Cairo (EET)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inputCls = "w-full h-9 px-3 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = inputCls;
const cardCls = "bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4";
const sectionTitle = "text-sm font-semibold text-foreground flex items-center gap-2";
const fieldLabel = "text-xs font-medium text-muted-foreground mb-1";

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className={fieldLabel}>{label}</p>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const TAB_ITEMS = [
  { v: "company", l: "Company Config", icon: Building2 },
  { v: "salary", l: "Salary Structure", icon: DollarSign },
  { v: "attendance", l: "Attendance & Working", icon: Clock },
  { v: "overtime", l: "Overtime", icon: Timer },
  { v: "leave", l: "Leave Policy", icon: CalendarDays },
  { v: "bonus", l: "Bonus & Incentive", icon: Gift },
  { v: "tax", l: "Tax & Compliance", icon: Receipt },
  { v: "pf", l: "PF / Gratuity", icon: Shield },
  { v: "loan", l: "Loan / Advance", icon: Wallet },
  { v: "deductions", l: "Deductions", icon: MinusCircle },
  { v: "approval", l: "Approval Workflow", icon: CheckCircle },
  { v: "payslip", l: "Payslip", icon: FileText },
  { v: "payment", l: "Disbursement", icon: CreditCard },
  { v: "lock", l: "Lock & Adjust", icon: Lock },
  { v: "settlement", l: "Final Settlement", icon: UserX },
  { v: "roles", l: "Permissions", icon: Users },
  { v: "notifications", l: "Notifications", icon: Bell },
];

export default function PayrollSettings() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const [config, setConfig] = useState<PayrollConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("payroll_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        const merged = { ...DEFAULT_CONFIG } as any;
        for (const key of Object.keys(merged)) {
          if ((data as any)[key] !== undefined && (data as any)[key] !== null) {
            merged[key] = (data as any)[key];
          }
        }
        setConfig(merged);
      }
      setLoading(false);
    })();
  }, [tenantId]);

  const update = <K extends keyof PayrollConfig>(key: K, val: PayrollConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    setHasChanges(true);
  };

  const save = async () => {
    if (!tenantId) return;
    setSaving(true);
    const payload: any = { ...config, tenant_id: tenantId };
    delete payload.id;

    let error;
    if (existingId) {
      ({ error } = await supabase.from("payroll_settings").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("payroll_settings").insert(payload));
      if (!error) {
        const { data } = await supabase.from("payroll_settings").select("id").eq("tenant_id", tenantId).maybeSingle();
        if (data) setExistingId(data.id);
      }
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setHasChanges(false);
    toast.success("Payroll settings saved successfully");
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
    toast.info("Settings reset to defaults — click Save to apply");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payroll Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your company's payroll rules, policies, and automation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary/50 p-1.5 rounded-lg">
          {TAB_ITEMS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="text-xs px-2.5 py-1.5 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <t.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{t.l}</span>
              <span className="sm:hidden">{t.l.split(" ")[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Module 1: Company Config */}
        <TabsContent value="company" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Building2 className="h-4 w-4 text-primary" /> Company Payroll Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldRow label="Payroll Cycle">
                <select value={config.payroll_cycle} onChange={(e) => update("payroll_cycle", e.target.value)} className={selectCls}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="semi-monthly">Semi-monthly</option>
                </select>
              </FieldRow>
              <FieldRow label="Payroll Start Date (Day)" hint="Day of month payroll period begins">
                <input type="number" min={1} max={31} value={config.payroll_start_date} onChange={(e) => update("payroll_start_date", +e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Cutoff Date (Day)" hint="Last day for attendance/leave input">
                <input type="number" min={1} max={31} value={config.payroll_cutoff_date} onChange={(e) => update("payroll_cutoff_date", +e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Salary Processing Date (Day)">
                <input type="number" min={1} max={31} value={config.salary_processing_date} onChange={(e) => update("salary_processing_date", +e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Payment Disbursement Date (Day)">
                <input type="number" min={1} max={31} value={config.payment_disbursement_date} onChange={(e) => update("payment_disbursement_date", +e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Fiscal Year Start">
                <select value={config.fiscal_year_start} onChange={(e) => update("fiscal_year_start", e.target.value)} className={selectCls}>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Currency">
                <select value={config.currency} onChange={(e) => update("currency", e.target.value)} className={selectCls}>
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Timezone">
                <select value={config.timezone} onChange={(e) => update("timezone", e.target.value)} className={selectCls}>
                  {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Decimal Precision" hint="Number of decimal places in calculations">
                <select value={config.decimal_precision} onChange={(e) => update("decimal_precision", +e.target.value)} className={selectCls}>
                  <option value={0}>0 (Round to whole)</option>
                  <option value={2}>2 (Standard)</option>
                  <option value={4}>4 (High precision)</option>
                </select>
              </FieldRow>
              <FieldRow label="Rounding Method">
                <select value={config.rounding_method} onChange={(e) => update("rounding_method", e.target.value)} className={selectCls}>
                  <option value="round">Standard Rounding</option>
                  <option value="floor">Always Round Down</option>
                  <option value="ceil">Always Round Up</option>
                </select>
              </FieldRow>
            </div>
          </div>
        </TabsContent>

        {/* Module 2: Salary Structure */}
        <TabsContent value="salary" className="mt-4 space-y-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><DollarSign className="h-4 w-4 text-primary" /> Salary Structure Settings</h3>
            <FieldRow label="Salary Type">
              <select value={config.salary_type} onChange={(e) => update("salary_type", e.target.value)} className={selectCls}>
                <option value="gross">Gross-based</option>
                <option value="basic">Basic-based</option>
                <option value="ctc">CTC-based (Cost to Company)</option>
                <option value="net">Net-based</option>
              </select>
            </FieldRow>
          </div>
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <h3 className={sectionTitle}>Salary Components</h3>
              <button
                onClick={() => {
                  const name = prompt("Enter component name:");
                  if (name) {
                    update("salary_components", [...config.salary_components, { name, type: "fixed", value: 0, enabled: true, taxable: false }]);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Component
              </button>
            </div>
            <div className="space-y-3">
              {config.salary_components.map((comp, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Switch
                      checked={comp.enabled}
                      onCheckedChange={(v) => {
                        const updated = [...config.salary_components];
                        updated[i] = { ...comp, enabled: v };
                        update("salary_components", updated);
                      }}
                    />
                    <span className="text-sm font-medium text-foreground truncate">{comp.name}</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <select
                      value={comp.type}
                      onChange={(e) => {
                        const updated = [...config.salary_components];
                        updated[i] = { ...comp, type: e.target.value as any };
                        update("salary_components", updated);
                      }}
                      className="h-8 px-2 rounded border border-input bg-card text-xs"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                    <input
                      type="number"
                      value={comp.value}
                      onChange={(e) => {
                        const updated = [...config.salary_components];
                        updated[i] = { ...comp, value: +e.target.value };
                        update("salary_components", updated);
                      }}
                      className="h-8 w-20 px-2 rounded border border-input bg-card text-xs text-right"
                    />
                    <span className="text-xs text-muted-foreground">{comp.type === "percentage" ? "%" : config.currency}</span>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={comp.taxable}
                        onCheckedChange={(v) => {
                          const updated = [...config.salary_components];
                          updated[i] = { ...comp, taxable: v };
                          update("salary_components", updated);
                        }}
                      />
                      <Label className="text-[10px] text-muted-foreground">Taxable</Label>
                    </div>
                    {i >= 4 && (
                      <button
                        onClick={() => {
                          const updated = config.salary_components.filter((_, j) => j !== i);
                          update("salary_components", updated);
                        }}
                        className="p-1 text-destructive/50 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Module 3: Attendance & Working Rules */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Clock className="h-4 w-4 text-primary" /> Attendance & Working Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldRow label="Working Days Calculation">
                <select value={config.working_days_calculation} onChange={(e) => update("working_days_calculation", e.target.value)} className={selectCls}>
                  <option value="fixed">Fixed Days Per Month</option>
                  <option value="calendar">Calendar Based (Exclude Weekends)</option>
                  <option value="actual">Actual Attendance Based</option>
                </select>
              </FieldRow>
              <FieldRow label="Working Days Per Month">
                <input type="number" value={config.working_days_per_month} onChange={(e) => update("working_days_per_month", +e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Office Start Time">
                <input type="time" value={config.office_start_time} onChange={(e) => update("office_start_time", e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Office End Time">
                <input type="time" value={config.office_end_time} onChange={(e) => update("office_end_time", e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Grace Time (minutes)">
                <input type="number" value={config.grace_time_minutes} onChange={(e) => update("grace_time_minutes", +e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Absent Deduction Basis">
                <select value={config.absent_deduction_basis} onChange={(e) => update("absent_deduction_basis", e.target.value)} className={selectCls}>
                  <option value="gross">Gross Salary</option>
                  <option value="basic">Basic Salary</option>
                  <option value="ctc">CTC</option>
                </select>
              </FieldRow>
            </div>
            <div>
              <p className={fieldLabel}>Weekend Days</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const active = config.weekend_days.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const updated = active
                          ? config.weekend_days.filter((d) => d !== day)
                          : [...config.weekend_days, day];
                        update("weekend_days", updated);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-primary/10"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1 pt-2 border-t border-border">
              <ToggleRow label="Shift Policy" desc="Enable multi-shift support" checked={config.shift_policy_enabled} onChange={(v) => update("shift_policy_enabled", v)} />
              <ToggleRow label="Half Day Policy" desc="Allow marking half-day attendance" checked={config.half_day_enabled} onChange={(v) => update("half_day_enabled", v)} />
              {config.half_day_enabled && (
                <div className="pl-4">
                  <FieldRow label="Half Day = hours worked less than">
                    <input type="number" value={config.half_day_hours} onChange={(e) => update("half_day_hours", +e.target.value)} className={inputCls + " max-w-[120px]"} />
                  </FieldRow>
                </div>
              )}
              <ToggleRow label="Early Leave Deduction" checked={config.early_leave_deduction} onChange={(v) => update("early_leave_deduction", v)} />
              <ToggleRow label="Late Penalty" desc="Deduct salary for late arrivals" checked={config.late_penalty_enabled} onChange={(v) => update("late_penalty_enabled", v)} />
              {config.late_penalty_enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-4 py-2">
                  <FieldRow label="Penalty Type">
                    <select value={config.late_penalty_type} onChange={(e) => update("late_penalty_type", e.target.value)} className={selectCls}>
                      <option value="per_late">Per Late Instance</option>
                      <option value="after_count">After X Late Count</option>
                      <option value="progressive">Progressive (Increasing)</option>
                    </select>
                  </FieldRow>
                  {config.late_penalty_type !== "per_late" && (
                    <FieldRow label="Late Count Threshold">
                      <input type="number" value={config.late_penalty_count} onChange={(e) => update("late_penalty_count", +e.target.value)} className={inputCls} />
                    </FieldRow>
                  )}
                  <FieldRow label="Penalty Amount">
                    <input type="number" value={config.late_penalty_amount} onChange={(e) => update("late_penalty_amount", +e.target.value)} className={inputCls} />
                  </FieldRow>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Module 4: Overtime */}
        <TabsContent value="overtime" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Timer className="h-4 w-4 text-primary" /> Overtime (OT) Settings</h3>
            <ToggleRow label="Enable Overtime" desc="Allow overtime calculation in payroll" checked={config.ot_enabled} onChange={(v) => update("ot_enabled", v)} />
            {config.ot_enabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  <FieldRow label="OT Calculation Method">
                    <select value={config.ot_calculation_method} onChange={(e) => update("ot_calculation_method", e.target.value)} className={selectCls}>
                      <option value="hourly">Hourly Rate Based</option>
                      <option value="fixed">Fixed OT Rate</option>
                      <option value="basic_based">Basic-based Formula</option>
                      <option value="gross_based">Gross-based Formula</option>
                    </select>
                  </FieldRow>
                  {config.ot_calculation_method === "hourly" && (
                    <FieldRow label="Hourly Rate">
                      <input type="number" value={config.ot_hourly_rate} onChange={(e) => update("ot_hourly_rate", +e.target.value)} className={inputCls} />
                    </FieldRow>
                  )}
                  {config.ot_calculation_method === "fixed" && (
                    <FieldRow label="Fixed OT Rate">
                      <input type="number" value={config.ot_fixed_rate} onChange={(e) => update("ot_fixed_rate", +e.target.value)} className={inputCls} />
                    </FieldRow>
                  )}
                  <FieldRow label="OT Rounding (minutes)">
                    <input type="number" value={config.ot_rounding_minutes} onChange={(e) => update("ot_rounding_minutes", +e.target.value)} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Max OT Per Day (hours)">
                    <input type="number" value={config.ot_max_per_day} onChange={(e) => update("ot_max_per_day", +e.target.value)} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Max OT Per Month (hours)">
                    <input type="number" value={config.ot_max_per_month} onChange={(e) => update("ot_max_per_month", +e.target.value)} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Holiday OT Multiplier" hint="e.g. 2x = double pay on holidays">
                    <input type="number" step={0.1} value={config.ot_holiday_multiplier} onChange={(e) => update("ot_holiday_multiplier", +e.target.value)} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Weekend OT Multiplier">
                    <input type="number" step={0.1} value={config.ot_weekend_multiplier} onChange={(e) => update("ot_weekend_multiplier", +e.target.value)} className={inputCls} />
                  </FieldRow>
                </div>
                <ToggleRow label="OT Approval Required" desc="Require manager approval for OT claims" checked={config.ot_approval_required} onChange={(v) => update("ot_approval_required", v)} />
              </>
            )}
          </div>
        </TabsContent>

        {/* Module 5: Leave Policy */}
        <TabsContent value="leave" className="mt-4 space-y-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><CalendarDays className="h-4 w-4 text-primary" /> Leave Deduction & Policy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Unpaid Leave Deduction Basis">
                <select value={config.unpaid_leave_deduction_basis} onChange={(e) => update("unpaid_leave_deduction_basis", e.target.value)} className={selectCls}>
                  <option value="gross">Per Day Based on Gross</option>
                  <option value="basic">Per Day Based on Basic</option>
                  <option value="ctc">Per Day Based on CTC</option>
                </select>
              </FieldRow>
            </div>
            <ToggleRow label="Leave Pro-ration on Joining" desc="Pro-rate leave allocation for mid-year joiners" checked={config.leave_proration_on_join} onChange={(v) => update("leave_proration_on_join", v)} />
          </div>
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <h3 className={sectionTitle}>Leave Types</h3>
              <button
                onClick={() => {
                  const name = prompt("Enter leave type name:");
                  const code = prompt("Enter short code (e.g. CL, SL):");
                  if (name && code) {
                    update("leave_types", [...config.leave_types, { name, code, paid: true, days_per_year: 0, carry_forward: false, max_carry_days: 0, encashable: false, pro_rata: false }]);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Leave Type
              </button>
            </div>
            <div className="space-y-3">
              {config.leave_types.map((lt, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{lt.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{lt.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${lt.paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {lt.paid ? "Paid" : "Unpaid"}
                      </span>
                      {i >= 4 && (
                        <button onClick={() => update("leave_types", config.leave_types.filter((_, j) => j !== i))} className="p-1 text-destructive/50 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <FieldRow label="Days/Year">
                      <input type="number" value={lt.days_per_year} onChange={(e) => {
                        const updated = [...config.leave_types]; updated[i] = { ...lt, days_per_year: +e.target.value }; update("leave_types", updated);
                      }} className="h-8 w-full px-2 rounded border border-input bg-card text-xs" />
                    </FieldRow>
                    <div className="flex items-center gap-2 pt-4">
                      <Switch checked={lt.paid} onCheckedChange={(v) => { const u = [...config.leave_types]; u[i] = { ...lt, paid: v }; update("leave_types", u); }} />
                      <Label className="text-xs">Paid</Label>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <Switch checked={lt.carry_forward} onCheckedChange={(v) => { const u = [...config.leave_types]; u[i] = { ...lt, carry_forward: v }; update("leave_types", u); }} />
                      <Label className="text-xs">Carry Forward</Label>
                    </div>
                    {lt.carry_forward && (
                      <FieldRow label="Max Carry Days">
                        <input type="number" value={lt.max_carry_days} onChange={(e) => { const u = [...config.leave_types]; u[i] = { ...lt, max_carry_days: +e.target.value }; update("leave_types", u); }} className="h-8 w-full px-2 rounded border border-input bg-card text-xs" />
                      </FieldRow>
                    )}
                    <div className="flex items-center gap-2 pt-4">
                      <Switch checked={lt.encashable} onCheckedChange={(v) => { const u = [...config.leave_types]; u[i] = { ...lt, encashable: v }; update("leave_types", u); }} />
                      <Label className="text-xs">Encashable</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Module 6: Bonus & Incentive */}
        <TabsContent value="bonus" className="mt-4 space-y-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Gift className="h-4 w-4 text-primary" /> Bonus & Incentive Settings</h3>
            <ToggleRow label="Incentive/Commission" desc="Enable incentive module for sales/performance based pay" checked={config.incentive_enabled} onChange={(v) => update("incentive_enabled", v)} />
          </div>
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <h3 className={sectionTitle}>Bonus Types</h3>
              <button
                onClick={() => {
                  const name = prompt("Enter bonus type name:");
                  if (name) update("bonus_types", [...config.bonus_types, { name, calculation: "fixed", value: 0, eligibility_months: 6, active_only: true, enabled: true, frequency: "annual" }]);
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Bonus
              </button>
            </div>
            <div className="space-y-3">
              {config.bonus_types.map((bt, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Switch checked={bt.enabled} onCheckedChange={(v) => { const u = [...config.bonus_types]; u[i] = { ...bt, enabled: v }; update("bonus_types", u); }} />
                      <span className="text-sm font-medium text-foreground">{bt.name}</span>
                    </div>
                    {i >= 3 && (
                      <button onClick={() => update("bonus_types", config.bonus_types.filter((_, j) => j !== i))} className="p-1 text-destructive/50 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {bt.enabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <FieldRow label="Calculation Method">
                        <select value={bt.calculation} onChange={(e) => { const u = [...config.bonus_types]; u[i] = { ...bt, calculation: e.target.value }; update("bonus_types", u); }} className="h-8 w-full px-2 rounded border border-input bg-card text-xs">
                          <option value="fixed">Fixed Amount</option>
                          <option value="percentage_basic">% of Basic</option>
                          <option value="percentage_gross">% of Gross</option>
                        </select>
                      </FieldRow>
                      <FieldRow label="Value">
                        <input type="number" value={bt.value} onChange={(e) => { const u = [...config.bonus_types]; u[i] = { ...bt, value: +e.target.value }; update("bonus_types", u); }} className="h-8 w-full px-2 rounded border border-input bg-card text-xs" />
                      </FieldRow>
                      <FieldRow label="Eligibility (months)">
                        <input type="number" value={bt.eligibility_months} onChange={(e) => { const u = [...config.bonus_types]; u[i] = { ...bt, eligibility_months: +e.target.value }; update("bonus_types", u); }} className="h-8 w-full px-2 rounded border border-input bg-card text-xs" />
                      </FieldRow>
                      <FieldRow label="Frequency">
                        <select value={bt.frequency} onChange={(e) => { const u = [...config.bonus_types]; u[i] = { ...bt, frequency: e.target.value }; update("bonus_types", u); }} className="h-8 w-full px-2 rounded border border-input bg-card text-xs">
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="biannual">Bi-annual</option>
                          <option value="annual">Annual</option>
                          <option value="one_time">One-time</option>
                        </select>
                      </FieldRow>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Module 7: Tax & Compliance */}
        <TabsContent value="tax" className="mt-4 space-y-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Receipt className="h-4 w-4 text-primary" /> Tax & Compliance Settings</h3>
            <ToggleRow label="Tax Deduction" desc="Enable automatic tax deduction from payroll" checked={config.tax_deduction_enabled} onChange={(v) => update("tax_deduction_enabled", v)} />
            {config.tax_deduction_enabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="Tax Calculation Basis">
                    <select value={config.tax_calculation_basis} onChange={(e) => update("tax_calculation_basis", e.target.value)} className={selectCls}>
                      <option value="gross">Gross Salary</option>
                      <option value="basic">Basic Salary</option>
                      <option value="taxable_income">Taxable Income Only</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Tax Year Type">
                    <select value={config.tax_year_type} onChange={(e) => update("tax_year_type", e.target.value)} className={selectCls}>
                      <option value="fiscal">Fiscal Year</option>
                      <option value="calendar">Calendar Year</option>
                    </select>
                  </FieldRow>
                </div>
                <ToggleRow label="Monthly TDS Auto Deduction" desc="Auto-deduct TDS from monthly salary" checked={config.monthly_tds_enabled} onChange={(v) => update("monthly_tds_enabled", v)} />
                <ToggleRow label="Tax Certificate Generation" desc="Auto-generate annual tax certificates" checked={config.tax_certificate_enabled} onChange={(v) => update("tax_certificate_enabled", v)} />
              </>
            )}
          </div>
          {config.tax_deduction_enabled && (
            <>
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <h3 className={sectionTitle}>Tax Slabs</h3>
                  <button
                    onClick={() => update("tax_slabs", [...config.tax_slabs, { min: 0, max: 0, rate: 0 }])}
                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Slab
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-[10px] font-medium text-muted-foreground uppercase px-1">
                    <span>Min Amount</span><span>Max Amount</span><span>Rate (%)</span><span></span>
                  </div>
                  {config.tax_slabs.map((slab, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center">
                      <input type="number" value={slab.min} onChange={(e) => { const u = [...config.tax_slabs]; u[i] = { ...slab, min: +e.target.value }; update("tax_slabs", u); }} className="h-8 px-2 rounded border border-input bg-card text-xs" />
                      <input type="number" value={slab.max} onChange={(e) => { const u = [...config.tax_slabs]; u[i] = { ...slab, max: +e.target.value }; update("tax_slabs", u); }} className="h-8 px-2 rounded border border-input bg-card text-xs" />
                      <input type="number" value={slab.rate} onChange={(e) => { const u = [...config.tax_slabs]; u[i] = { ...slab, rate: +e.target.value }; update("tax_slabs", u); }} className="h-8 px-2 rounded border border-input bg-card text-xs" />
                      <button onClick={() => update("tax_slabs", config.tax_slabs.filter((_, j) => j !== i))} className="p-1 text-destructive/50 hover:text-destructive justify-self-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <h3 className={sectionTitle}>Tax Exemptions</h3>
                  <button
                    onClick={() => {
                      const name = prompt("Exemption name:");
                      if (name) update("tax_exemption_settings", [...config.tax_exemption_settings, { name, max_amount: 0, enabled: true }]);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Exemption
                  </button>
                </div>
                <div className="space-y-2">
                  {config.tax_exemption_settings.map((ex: TaxExemption, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                      <Switch checked={ex.enabled} onCheckedChange={(v) => { const u = [...config.tax_exemption_settings]; u[i] = { ...ex, enabled: v }; update("tax_exemption_settings", u); }} />
                      <span className="text-sm font-medium text-foreground flex-1">{ex.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Max:</span>
                        <input type="number" value={ex.max_amount} onChange={(e) => { const u = [...config.tax_exemption_settings]; u[i] = { ...ex, max_amount: +e.target.value }; update("tax_exemption_settings", u); }} className="h-8 w-24 px-2 rounded border border-input bg-card text-xs text-right" />
                      </div>
                      <button onClick={() => update("tax_exemption_settings", config.tax_exemption_settings.filter((_: any, j: number) => j !== i))} className="p-1 text-destructive/50 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Module 8: PF / Gratuity */}
        <TabsContent value="pf" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Shield className="h-4 w-4 text-primary" /> Provident Fund & Gratuity</h3>
            <ToggleRow label="Provident Fund (PF)" desc="Enable PF deduction" checked={config.pf_enabled} onChange={(v) => update("pf_enabled", v)} />
            {config.pf_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FieldRow label="Employee PF Contribution (%)">
                  <input type="number" value={config.pf_employee_contribution} onChange={(e) => update("pf_employee_contribution", +e.target.value)} className={inputCls} />
                </FieldRow>
                <FieldRow label="Employer PF Contribution (%)">
                  <input type="number" value={config.pf_employer_contribution} onChange={(e) => update("pf_employer_contribution", +e.target.value)} className={inputCls} />
                </FieldRow>
                <FieldRow label="Eligibility (months)">
                  <input type="number" value={config.pf_eligibility_months} onChange={(e) => update("pf_eligibility_months", +e.target.value)} className={inputCls} />
                </FieldRow>
                <FieldRow label="PF Ceiling Amount" hint="Max salary for PF calculation (0 = no limit)">
                  <input type="number" value={config.pf_ceiling_amount} onChange={(e) => update("pf_ceiling_amount", +e.target.value)} className={inputCls} />
                </FieldRow>
              </div>
            )}
            <div className="pt-3 border-t border-border">
              <ToggleRow label="Gratuity" desc="Enable gratuity calculation for eligible employees" checked={config.gratuity_enabled} onChange={(v) => update("gratuity_enabled", v)} />
              {config.gratuity_enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <FieldRow label="Min Service Years">
                    <input type="number" value={config.gratuity_rules.min_service_years} onChange={(e) => update("gratuity_rules", { ...config.gratuity_rules, min_service_years: +e.target.value })} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Calculation Basis">
                    <select value={config.gratuity_rules.calculation_basis} onChange={(e) => update("gratuity_rules", { ...config.gratuity_rules, calculation_basis: e.target.value })} className={selectCls}>
                      <option value="basic">Basic Salary</option>
                      <option value="gross">Gross Salary</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Days Per Year of Service">
                    <input type="number" value={config.gratuity_rules.days_per_year} onChange={(e) => update("gratuity_rules", { ...config.gratuity_rules, days_per_year: +e.target.value })} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Max Gratuity Amount" hint="0 = unlimited">
                    <input type="number" value={config.gratuity_rules.max_amount} onChange={(e) => update("gratuity_rules", { ...config.gratuity_rules, max_amount: +e.target.value })} className={inputCls} />
                  </FieldRow>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Module 9: Loan / Advance */}
        <TabsContent value="loan" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Wallet className="h-4 w-4 text-primary" /> Loan / Advance Salary Settings</h3>
            <ToggleRow label="Loan Module" desc="Enable salary loans and advances" checked={config.loan_enabled} onChange={(v) => update("loan_enabled", v)} />
            {config.loan_enabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FieldRow label="Deduction Mode">
                    <select value={config.loan_deduction_mode} onChange={(e) => update("loan_deduction_mode", e.target.value)} className={selectCls}>
                      <option value="fixed">Fixed Installment</option>
                      <option value="percentage">Percentage-based</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Advance Repayment Rule">
                    <select value={config.advance_repayment_rule} onChange={(e) => update("advance_repayment_rule", e.target.value)} className={selectCls}>
                      <option value="next_month">Deduct Next Month</option>
                      <option value="installments">Split into Installments</option>
                      <option value="flexible">Flexible (Employee Choice)</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Max Loan (X times salary)" hint="e.g. 3 = max 3x monthly salary">
                    <input type="number" value={config.loan_max_amount_multiplier} onChange={(e) => update("loan_max_amount_multiplier", +e.target.value)} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Interest Rate (% p.a.)" hint="0 = interest-free loans">
                    <input type="number" step={0.1} value={config.loan_interest_rate} onChange={(e) => update("loan_interest_rate", +e.target.value)} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Max Tenure (months)">
                    <input type="number" value={config.loan_max_tenure_months} onChange={(e) => update("loan_max_tenure_months", +e.target.value)} className={inputCls} />
                  </FieldRow>
                </div>
                <ToggleRow label="Loan Approval Required" checked={config.loan_approval_required} onChange={(v) => update("loan_approval_required", v)} />
              </>
            )}
          </div>
        </TabsContent>

        {/* Module 10: Deductions & Penalty */}
        <TabsContent value="deductions" className="mt-4 space-y-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><MinusCircle className="h-4 w-4 text-primary" /> Deductions & Penalty Rules</h3>
            <ToggleRow label="Auto Attendance Deduction" desc="Automatically deduct based on attendance rules" checked={config.auto_attendance_deduction} onChange={(v) => update("auto_attendance_deduction", v)} />
            <ToggleRow label="Manual Deduction Requires Approval" checked={config.manual_deduction_approval} onChange={(v) => update("manual_deduction_approval", v)} />
            <FieldRow label="Max Deduction (% of Salary)" hint="Maximum total deductions as percentage of salary">
              <input type="number" min={0} max={100} value={config.max_deduction_percentage} onChange={(e) => update("max_deduction_percentage", +e.target.value)} className={inputCls + " max-w-xs"} />
            </FieldRow>
          </div>
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <h3 className={sectionTitle}>Custom Deduction Types</h3>
              <button
                onClick={() => {
                  const name = prompt("Deduction name:");
                  if (name) update("custom_deduction_types", [...config.custom_deduction_types, { name, type: "fixed", value: 0, mandatory: false, enabled: true }]);
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Deduction
              </button>
            </div>
            <div className="space-y-2">
              {config.custom_deduction_types.map((d: CustomDeduction, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3 flex-1">
                    <Switch checked={d.enabled} onCheckedChange={(v) => { const u = [...config.custom_deduction_types]; u[i] = { ...d, enabled: v }; update("custom_deduction_types", u); }} />
                    <span className="text-sm font-medium text-foreground">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={d.type} onChange={(e) => { const u = [...config.custom_deduction_types]; u[i] = { ...d, type: e.target.value as any }; update("custom_deduction_types", u); }} className="h-8 px-2 rounded border border-input bg-card text-xs">
                      <option value="fixed">Fixed</option>
                      <option value="percentage">Percentage</option>
                    </select>
                    <input type="number" value={d.value} onChange={(e) => { const u = [...config.custom_deduction_types]; u[i] = { ...d, value: +e.target.value }; update("custom_deduction_types", u); }} className="h-8 w-20 px-2 rounded border border-input bg-card text-xs text-right" />
                    <div className="flex items-center gap-1.5">
                      <Switch checked={d.mandatory} onCheckedChange={(v) => { const u = [...config.custom_deduction_types]; u[i] = { ...d, mandatory: v }; update("custom_deduction_types", u); }} />
                      <Label className="text-[10px]">Mandatory</Label>
                    </div>
                    <button onClick={() => update("custom_deduction_types", config.custom_deduction_types.filter((_: any, j: number) => j !== i))} className="p-1 text-destructive/50 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Module 11: Approval Workflow */}
        <TabsContent value="approval" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><CheckCircle className="h-4 w-4 text-primary" /> Payroll Approval Workflow</h3>
            <ToggleRow label="Payroll Approval Required" desc="Require multi-level approval before disbursement" checked={config.payroll_approval_required} onChange={(v) => update("payroll_approval_required", v)} />
            {config.payroll_approval_required && (
              <>
                <FieldRow label="Approval Levels">
                  <div className="flex flex-wrap gap-2">
                    {config.approval_levels.map((level, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {i + 1}. {level}
                        <button onClick={() => update("approval_levels", config.approval_levels.filter((_, j) => j !== i))} className="ml-1 text-primary/50 hover:text-primary">×</button>
                      </span>
                    ))}
                    <button
                      onClick={() => { const l = prompt("Enter approval level name:"); if (l) update("approval_levels", [...config.approval_levels, l]); }}
                      className="px-3 py-1 rounded-full border border-dashed border-input text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >+ Add Level</button>
                  </div>
                </FieldRow>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="Approval Timeout (days)" hint="Auto-escalate after this many days">
                    <input type="number" value={config.approval_timeout_days} onChange={(e) => update("approval_timeout_days", +e.target.value)} className={inputCls} />
                  </FieldRow>
                </div>
                <ToggleRow label="Auto Escalation" desc="Automatically escalate to next level on timeout" checked={config.auto_escalation} onChange={(v) => update("auto_escalation", v)} />
              </>
            )}
            <ToggleRow label="Audit Log Mandatory" desc="Require logging of all payroll changes" checked={config.audit_log_mandatory} onChange={(v) => update("audit_log_mandatory", v)} />
          </div>
        </TabsContent>

        {/* Module 12: Payslip */}
        <TabsContent value="payslip" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><FileText className="h-4 w-4 text-primary" /> Payslip Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldRow label="Payslip Template">
                <select value={config.payslip_template} onChange={(e) => update("payslip_template", e.target.value)} className={selectCls}>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed (All Components)</option>
                  <option value="minimal">Minimal</option>
                  <option value="compact">Compact (Single Page)</option>
                </select>
              </FieldRow>
              <FieldRow label="Payslip Numbering Prefix">
                <input type="text" value={config.payslip_numbering_prefix} onChange={(e) => update("payslip_numbering_prefix", e.target.value)} className={inputCls} />
              </FieldRow>
              <FieldRow label="Payslip Language">
                <select value={config.payslip_language} onChange={(e) => update("payslip_language", e.target.value)} className={selectCls}>
                  <option value="en">English</option>
                  <option value="bn">Bangla</option>
                  <option value="hi">Hindi</option>
                  <option value="ar">Arabic</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </FieldRow>
            </div>
            <ToggleRow label="Show Company Logo & Address" checked={config.payslip_show_company_logo} onChange={(v) => update("payslip_show_company_logo", v)} />
            <ToggleRow label="Show Bank Account Info" checked={config.payslip_show_bank_info} onChange={(v) => update("payslip_show_bank_info", v)} />
            <ToggleRow label="Show Year-to-Date (YTD)" desc="Display cumulative earnings on payslip" checked={config.payslip_show_ytd} onChange={(v) => update("payslip_show_ytd", v)} />
            <ToggleRow label="Digital Signature" desc="Add authorized signatory to payslips" checked={config.payslip_digital_signature} onChange={(v) => update("payslip_digital_signature", v)} />
          </div>
        </TabsContent>

        {/* Module 13: Payment / Disbursement */}
        <TabsContent value="payment" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><CreditCard className="h-4 w-4 text-primary" /> Payment / Disbursement Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldRow label="Payment Mode">
                <select value={config.payment_mode} onChange={(e) => update("payment_mode", e.target.value)} className={selectCls}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_banking">Mobile Banking</option>
                  <option value="check">Check/Cheque</option>
                  <option value="digital_wallet">Digital Wallet</option>
                </select>
              </FieldRow>
              <FieldRow label="Bulk Export Format">
                <select value={config.bulk_export_format} onChange={(e) => update("bulk_export_format", e.target.value)} className={selectCls}>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (XLSX)</option>
                  <option value="pdf">PDF</option>
                </select>
              </FieldRow>
              <FieldRow label="Bank File Format" hint="For bulk bank transfers">
                <select value={config.bank_file_format} onChange={(e) => update("bank_file_format", e.target.value)} className={selectCls}>
                  <option value="generic">Generic CSV</option>
                  <option value="beftn">BEFTN (Bangladesh)</option>
                  <option value="neft">NEFT (India)</option>
                  <option value="ach">ACH (US)</option>
                  <option value="bacs">BACS (UK)</option>
                  <option value="sepa">SEPA (EU)</option>
                </select>
              </FieldRow>
            </div>
            <ToggleRow label="Salary Payment Tracking" desc="Track pending/paid/failed status" checked={config.salary_payment_tracking} onChange={(v) => update("salary_payment_tracking", v)} />
            <ToggleRow label="Auto Payment Confirmation" desc="Auto-mark as paid after bank file generation" checked={config.auto_payment_confirmation} onChange={(v) => update("auto_payment_confirmation", v)} />
            <ToggleRow label="Split Payment" desc="Allow salary split across multiple bank accounts" checked={config.split_payment_enabled} onChange={(v) => update("split_payment_enabled", v)} />
          </div>
        </TabsContent>

        {/* Module 14: Lock & Adjustment */}
        <TabsContent value="lock" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Lock className="h-4 w-4 text-primary" /> Payroll Lock & Adjustment Rules</h3>
            <ToggleRow label="Lock After Approval" desc="Prevent edits after payroll approval" checked={config.payroll_lock_after_approval} onChange={(v) => update("payroll_lock_after_approval", v)} />
            {config.payroll_lock_after_approval && (
              <FieldRow label="Lock Days After Approval">
                <input type="number" value={config.lock_days_after_approval} onChange={(e) => update("lock_days_after_approval", +e.target.value)} className={inputCls + " max-w-xs"} />
              </FieldRow>
            )}
            <ToggleRow label="Arrear Adjustments" desc="Allow previous month additions" checked={config.arrear_enabled} onChange={(v) => update("arrear_enabled", v)} />
            <ToggleRow label="Retro Deductions" desc="Allow retroactive deductions" checked={config.retro_deduction_enabled} onChange={(v) => update("retro_deduction_enabled", v)} />
            <ToggleRow label="Backdated Corrections" desc="Allow corrections to past payrolls" checked={config.backdated_correction_enabled} onChange={(v) => update("backdated_correction_enabled", v)} />
            {config.backdated_correction_enabled && (
              <FieldRow label="Max Correction Months" hint="How far back corrections are allowed">
                <input type="number" value={config.correction_max_months} onChange={(e) => update("correction_max_months", +e.target.value)} className={inputCls + " max-w-xs"} />
              </FieldRow>
            )}
          </div>
        </TabsContent>

        {/* Module 15: Final Settlement */}
        <TabsContent value="settlement" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><UserX className="h-4 w-4 text-primary" /> Final Settlement (F&F) Settings</h3>
            <ToggleRow label="Notice Period Deduction" desc="Deduct for incomplete notice period" checked={config.notice_period_deduction} onChange={(v) => update("notice_period_deduction", v)} />
            {config.notice_period_deduction && (
              <FieldRow label="Notice Period (days)">
                <input type="number" value={config.notice_period_days} onChange={(e) => update("notice_period_days", +e.target.value)} className={inputCls + " max-w-xs"} />
              </FieldRow>
            )}
            <ToggleRow label="Leave Encashment on Exit" desc="Pay out remaining leave balance" checked={config.leave_encashment_on_exit} onChange={(v) => update("leave_encashment_on_exit", v)} />
            <ToggleRow label="Loan Settlement Priority" desc="Clear outstanding loans from final pay" checked={config.loan_settlement_priority} onChange={(v) => update("loan_settlement_priority", v)} />
            <ToggleRow label="Final Settlement Approval Required" checked={config.final_settlement_approval} onChange={(v) => update("final_settlement_approval", v)} />
            <ToggleRow label="Auto Generate Final Payslip" checked={config.auto_final_payslip} onChange={(v) => update("auto_final_payslip", v)} />
            <FieldRow label="F&F Processing Days" hint="Maximum days to process final settlement">
              <input type="number" value={config.fnf_processing_days} onChange={(e) => update("fnf_processing_days", +e.target.value)} className={inputCls + " max-w-xs"} />
            </FieldRow>
          </div>
        </TabsContent>

        {/* Module 16: Role Permissions */}
        <TabsContent value="roles" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Users className="h-4 w-4 text-primary" /> Role Permission Settings</h3>
            <p className="text-xs text-muted-foreground">Control who can access payroll functions</p>
            <div className="space-y-3 pt-2">
              {[
                { key: "view_salary", label: "View Salary Details" },
                { key: "edit_salary_components", label: "Edit Salary Components" },
                { key: "approve_payroll", label: "Approve Payroll" },
                { key: "export_payroll", label: "Export Payroll Sheet" },
                { key: "process_payroll", label: "Process & Run Payroll" },
                { key: "manage_loans", label: "Manage Loans & Advances" },
                { key: "view_reports", label: "View Payroll Reports" },
              ].map((perm) => (
                <div key={perm.key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                  <span className="text-sm font-medium text-foreground">{perm.label}</span>
                  <div className="flex flex-wrap gap-2">
                    {["company_admin", "hr_manager", "manager", "employee"].map((role) => {
                      const roles: string[] = config.role_permissions[perm.key] || [];
                      const active = roles.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            const updated = { ...config.role_permissions };
                            updated[perm.key] = active ? roles.filter((r: string) => r !== role) : [...roles, role];
                            update("role_permissions", updated);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-primary/10"}`}
                        >
                          {role.replace("_", " ")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <ToggleRow
              label="Employee Self-Service"
              desc="Allow employees to view their payslips, tax info, and request loans"
              checked={config.role_permissions.employee_self_service ?? true}
              onChange={(v) => update("role_permissions", { ...config.role_permissions, employee_self_service: v })}
            />
          </div>
        </TabsContent>

        {/* Module 17: Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <div className={cardCls}>
            <h3 className={sectionTitle}><Bell className="h-4 w-4 text-primary" /> Notification Settings</h3>
            <div className="space-y-3">
              {[
                { key: "salary_processed", label: "Salary Processed", desc: "Notify when salary is processed" },
                { key: "salary_paid", label: "Salary Paid", desc: "Notify when salary is disbursed" },
                { key: "approval_pending", label: "Approval Pending", desc: "Remind approvers of pending payroll" },
                { key: "failed_payment", label: "Failed Payment", desc: "Alert on payment failures" },
                { key: "payslip_generated", label: "Payslip Generated", desc: "Notify employees of new payslip" },
                { key: "loan_approved", label: "Loan Approved/Rejected", desc: "Notify loan application status" },
                { key: "settlement_initiated", label: "Settlement Initiated", desc: "Notify on F&F settlement start" },
              ].map((notif) => {
                const setting = config.notification_settings[notif.key] || { enabled: false, channels: [] };
                return (
                  <div key={notif.key} className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <ToggleRow
                      label={notif.label}
                      desc={notif.desc}
                      checked={setting.enabled}
                      onChange={(v) => {
                        const updated = { ...config.notification_settings };
                        updated[notif.key] = { ...setting, enabled: v };
                        update("notification_settings", updated);
                      }}
                    />
                    {setting.enabled && (
                      <div className="flex gap-2 pl-4 pt-2">
                        {["email", "sms", "whatsapp", "in_app"].map((ch) => {
                          const active = (setting.channels || []).includes(ch);
                          return (
                            <button
                              key={ch}
                              onClick={() => {
                                const updated = { ...config.notification_settings };
                                const channels = active ? setting.channels.filter((c: string) => c !== ch) : [...(setting.channels || []), ch];
                                updated[notif.key] = { ...setting, channels };
                                update("notification_settings", updated);
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-primary/10"}`}
                            >
                              {ch === "in_app" ? "In-App" : ch.charAt(0).toUpperCase() + ch.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sticky Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>You have unsaved changes</span>
            </div>
            <div className="flex gap-2">
              <button onClick={resetToDefaults} className="px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-destructive/10 transition-colors">
                Reset
              </button>
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
