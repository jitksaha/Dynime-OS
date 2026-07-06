
-- Payroll settings table: stores all payroll configuration per tenant as structured JSONB
CREATE TABLE public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Module 1: Company Payroll Configuration
  payroll_cycle text NOT NULL DEFAULT 'monthly', -- monthly, weekly, bi-weekly
  payroll_start_date integer NOT NULL DEFAULT 1,
  payroll_cutoff_date integer NOT NULL DEFAULT 25,
  salary_processing_date integer NOT NULL DEFAULT 28,
  payment_disbursement_date integer NOT NULL DEFAULT 30,
  fiscal_year_start text NOT NULL DEFAULT 'January',
  currency text NOT NULL DEFAULT 'BDT',
  timezone text NOT NULL DEFAULT 'Asia/Dhaka',

  -- Module 2: Salary Structure
  salary_type text NOT NULL DEFAULT 'gross', -- gross, basic, ctc
  salary_components jsonb NOT NULL DEFAULT '[
    {"name":"Basic","type":"percentage","value":50,"enabled":true},
    {"name":"House Rent","type":"percentage","value":30,"enabled":true},
    {"name":"Medical","type":"percentage","value":5,"enabled":true},
    {"name":"Conveyance","type":"percentage","value":5,"enabled":true},
    {"name":"Food Allowance","type":"fixed","value":0,"enabled":false},
    {"name":"Mobile Allowance","type":"fixed","value":0,"enabled":false},
    {"name":"Other Allowance","type":"fixed","value":0,"enabled":false}
  ]'::jsonb,

  -- Module 3: Attendance & Working Rules
  working_days_per_month integer NOT NULL DEFAULT 26,
  office_start_time text NOT NULL DEFAULT '09:00',
  office_end_time text NOT NULL DEFAULT '18:00',
  shift_policy_enabled boolean NOT NULL DEFAULT false,
  late_penalty_enabled boolean NOT NULL DEFAULT false,
  late_penalty_type text NOT NULL DEFAULT 'per_late', -- per_late, after_count
  late_penalty_count integer NOT NULL DEFAULT 3,
  late_penalty_amount numeric NOT NULL DEFAULT 0,
  early_leave_deduction boolean NOT NULL DEFAULT false,
  absent_deduction_basis text NOT NULL DEFAULT 'gross', -- gross, basic
  half_day_enabled boolean NOT NULL DEFAULT true,
  grace_time_minutes integer NOT NULL DEFAULT 10,

  -- Module 4: Overtime
  ot_enabled boolean NOT NULL DEFAULT false,
  ot_calculation_method text NOT NULL DEFAULT 'hourly', -- hourly, fixed, basic_based
  ot_hourly_rate numeric NOT NULL DEFAULT 0,
  ot_fixed_rate numeric NOT NULL DEFAULT 0,
  ot_rounding_minutes integer NOT NULL DEFAULT 30,
  ot_max_per_day numeric NOT NULL DEFAULT 4,
  ot_max_per_month numeric NOT NULL DEFAULT 60,
  ot_approval_required boolean NOT NULL DEFAULT true,

  -- Module 5: Leave Deduction & Policy
  leave_types jsonb NOT NULL DEFAULT '[
    {"name":"Casual Leave","code":"CL","paid":true,"days_per_year":10,"carry_forward":false,"encashable":false},
    {"name":"Sick Leave","code":"SL","paid":true,"days_per_year":14,"carry_forward":false,"encashable":false},
    {"name":"Annual Leave","code":"AL","paid":true,"days_per_year":15,"carry_forward":true,"encashable":true},
    {"name":"Unpaid Leave","code":"UL","paid":false,"days_per_year":0,"carry_forward":false,"encashable":false}
  ]'::jsonb,
  unpaid_leave_deduction_basis text NOT NULL DEFAULT 'gross', -- gross, basic

  -- Module 6: Bonus & Incentive
  bonus_types jsonb NOT NULL DEFAULT '[
    {"name":"Festival Bonus","calculation":"percentage_basic","value":100,"eligibility_months":6,"active_only":true,"enabled":true},
    {"name":"Performance Bonus","calculation":"fixed","value":0,"eligibility_months":12,"active_only":true,"enabled":false},
    {"name":"Attendance Bonus","calculation":"fixed","value":0,"eligibility_months":3,"active_only":true,"enabled":false}
  ]'::jsonb,
  incentive_enabled boolean NOT NULL DEFAULT false,

  -- Module 7: Tax & Compliance
  tax_deduction_enabled boolean NOT NULL DEFAULT false,
  tax_slabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_calculation_basis text NOT NULL DEFAULT 'gross', -- gross, basic
  monthly_tds_enabled boolean NOT NULL DEFAULT false,
  tax_exemption_settings jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_certificate_enabled boolean NOT NULL DEFAULT false,

  -- Module 8: Provident Fund / Gratuity
  pf_enabled boolean NOT NULL DEFAULT false,
  pf_employee_contribution numeric NOT NULL DEFAULT 0,
  pf_employer_contribution numeric NOT NULL DEFAULT 0,
  pf_eligibility_months integer NOT NULL DEFAULT 0,
  gratuity_enabled boolean NOT NULL DEFAULT false,
  gratuity_rules jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Module 9: Loan / Advance
  loan_enabled boolean NOT NULL DEFAULT false,
  loan_deduction_mode text NOT NULL DEFAULT 'fixed', -- fixed, percentage
  loan_approval_required boolean NOT NULL DEFAULT true,
  advance_repayment_rule text NOT NULL DEFAULT 'next_month',

  -- Module 10: Deductions & Penalty
  custom_deduction_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  auto_attendance_deduction boolean NOT NULL DEFAULT false,
  manual_deduction_approval boolean NOT NULL DEFAULT true,
  max_deduction_percentage numeric NOT NULL DEFAULT 50,

  -- Module 11: Payroll Approval Workflow
  payroll_approval_required boolean NOT NULL DEFAULT true,
  approval_levels jsonb NOT NULL DEFAULT '["HR","Accounts","Admin"]'::jsonb,
  audit_log_mandatory boolean NOT NULL DEFAULT true,

  -- Module 12: Payslip
  payslip_template text NOT NULL DEFAULT 'standard', -- standard, detailed, minimal
  payslip_show_company_logo boolean NOT NULL DEFAULT true,
  payslip_show_bank_info boolean NOT NULL DEFAULT false,
  payslip_numbering_prefix text NOT NULL DEFAULT 'PS',

  -- Module 13: Payment / Disbursement
  payment_mode text NOT NULL DEFAULT 'bank_transfer', -- bank_transfer, cash, mobile_banking
  bulk_export_format text NOT NULL DEFAULT 'csv', -- csv, excel
  salary_payment_tracking boolean NOT NULL DEFAULT true,
  auto_payment_confirmation boolean NOT NULL DEFAULT false,

  -- Module 14: Payroll Lock & Adjustment
  payroll_lock_after_approval boolean NOT NULL DEFAULT true,
  lock_days_after_approval integer NOT NULL DEFAULT 3,
  arrear_enabled boolean NOT NULL DEFAULT true,
  retro_deduction_enabled boolean NOT NULL DEFAULT true,
  backdated_correction_enabled boolean NOT NULL DEFAULT false,

  -- Module 15: Final Settlement
  notice_period_deduction boolean NOT NULL DEFAULT true,
  leave_encashment_on_exit boolean NOT NULL DEFAULT true,
  loan_settlement_priority boolean NOT NULL DEFAULT true,
  final_settlement_approval boolean NOT NULL DEFAULT true,
  auto_final_payslip boolean NOT NULL DEFAULT true,

  -- Module 16: Role Permissions (stored as JSONB for flexibility)
  role_permissions jsonb NOT NULL DEFAULT '{
    "view_salary":["company_admin","hr_manager"],
    "edit_salary_components":["company_admin"],
    "approve_payroll":["company_admin","hr_manager"],
    "export_payroll":["company_admin","hr_manager"],
    "employee_self_service":true
  }'::jsonb,

  -- Module 17: Notifications
  notification_settings jsonb NOT NULL DEFAULT '{
    "salary_processed":{"enabled":true,"channels":["email"]},
    "salary_paid":{"enabled":true,"channels":["email"]},
    "approval_pending":{"enabled":true,"channels":["email"]},
    "failed_payment":{"enabled":true,"channels":["email"]}
  }'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- Company admins can manage their payroll settings
CREATE POLICY "Company admins can manage payroll settings"
ON public.payroll_settings
FOR ALL
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  AND has_role(auth.uid(), 'company_admin'::app_role)
);

-- Tenant members can view payroll settings
CREATE POLICY "Tenant members can view payroll settings"
ON public.payroll_settings
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Super admins full access
CREATE POLICY "Super admins full access payroll_settings"
ON public.payroll_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_payroll_settings_updated_at
BEFORE UPDATE ON public.payroll_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
