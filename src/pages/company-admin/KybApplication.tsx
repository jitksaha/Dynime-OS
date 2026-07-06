import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Building2, CheckCircle2, Clock, XCircle, Send, Shield,
  FileText, AlertTriangle, Loader2, BadgeCheck, Sparkles, Wallet, Star,
  Globe, User, Users, Upload, ChevronRight, ChevronLeft, Trash2, Plus,
  MapPin, Phone, Mail, Calendar, DollarSign, Briefcase, Scale,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ─── Country & Business Type Data ───────────────────────────────────────────
const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", taxLabel: "EIN / TIN", regLabel: "State Registration #" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", taxLabel: "UTR / Company Tax Ref", regLabel: "Companies House #" },
  { code: "CA", name: "Canada", flag: "🇨🇦", taxLabel: "BN (Business Number)", regLabel: "Corporation #" },
  { code: "AU", name: "Australia", flag: "🇦🇺", taxLabel: "ABN", regLabel: "ACN" },
  { code: "DE", name: "Germany", flag: "🇩🇪", taxLabel: "Steuernummer", regLabel: "HRB Nummer" },
  { code: "FR", name: "France", flag: "🇫🇷", taxLabel: "SIRET / SIREN", regLabel: "RCS Number" },
  { code: "IN", name: "India", flag: "🇮🇳", taxLabel: "GSTIN / PAN", regLabel: "CIN" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", taxLabel: "TIN", regLabel: "RJSC Registration #" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", taxLabel: "UEN", regLabel: "ACRA Registration #" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", taxLabel: "TRN", regLabel: "Trade License #" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", taxLabel: "VAT Registration #", regLabel: "CR Number" },
  { code: "JP", name: "Japan", flag: "🇯🇵", taxLabel: "法人番号 (Corp Number)", regLabel: "Registration #" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", taxLabel: "사업자등록번호", regLabel: "Corp Registration #" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", taxLabel: "CNPJ", regLabel: "NIRE" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", taxLabel: "RFC", regLabel: "Folio Mercantil" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", taxLabel: "TIN", regLabel: "CAC Registration #" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", taxLabel: "Tax Reference #", regLabel: "CIPC Registration #" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", taxLabel: "KRA PIN", regLabel: "Registration Certificate #" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", taxLabel: "Tax ID", regLabel: "SSM Registration #" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", taxLabel: "TIN", regLabel: "SEC Registration #" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", taxLabel: "NPWP", regLabel: "NIB" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", taxLabel: "Tax ID", regLabel: "DBD Registration #" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", taxLabel: "Tax Code", regLabel: "Enterprise Registration #" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", taxLabel: "NTN", regLabel: "SECP Registration #" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", taxLabel: "Tax Card #", regLabel: "Commercial Register #" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", taxLabel: "Vergi Numarası", regLabel: "MERSIS #" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", taxLabel: "BTW-nummer", regLabel: "KVK Number" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", taxLabel: "UID", regLabel: "ZEFIX #" },
  { code: "IT", name: "Italy", flag: "🇮🇹", taxLabel: "Codice Fiscale / P.IVA", regLabel: "REA Number" },
  { code: "ES", name: "Spain", flag: "🇪🇸", taxLabel: "NIF / CIF", regLabel: "Registro Mercantil #" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", taxLabel: "Organisationsnummer", regLabel: "Registration #" },
  { code: "NO", name: "Norway", flag: "🇳🇴", taxLabel: "Organisasjonsnummer", regLabel: "Brønnøysund #" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", taxLabel: "CVR", regLabel: "Registration #" },
  { code: "FI", name: "Finland", flag: "🇫🇮", taxLabel: "Y-tunnus", regLabel: "Registration #" },
  { code: "PL", name: "Poland", flag: "🇵🇱", taxLabel: "NIP", regLabel: "KRS Number" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", taxLabel: "Tax Reference #", regLabel: "CRO Number" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", taxLabel: "IRD Number", regLabel: "NZBN" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", taxLabel: "IRD File #", regLabel: "CR Number" },
  { code: "IL", name: "Israel", flag: "🇮🇱", taxLabel: "Tax ID", regLabel: "Registration #" },
  { code: "OTHER", name: "Other Country", flag: "🌍", taxLabel: "Tax ID", regLabel: "Registration #" },
];

const BUSINESS_TYPES_BY_REGION: Record<string, string[]> = {
  US: ["Sole Proprietorship", "General Partnership", "Limited Partnership (LP)", "Limited Liability Partnership (LLP)", "Limited Liability Company (LLC)", "S Corporation", "C Corporation", "B Corporation", "Non-Profit Organization (501(c)(3))", "Professional Corporation (PC)", "Cooperative"],
  GB: ["Sole Trader", "Ordinary Partnership", "Limited Partnership (LP)", "Limited Liability Partnership (LLP)", "Private Limited Company (Ltd)", "Public Limited Company (PLC)", "Community Interest Company (CIC)", "Charitable Incorporated Organisation (CIO)", "Unincorporated Association"],
  CA: ["Sole Proprietorship", "General Partnership", "Limited Partnership", "Limited Liability Partnership", "Corporation (Federal)", "Corporation (Provincial)", "Cooperative", "Non-Profit Organization"],
  AU: ["Sole Trader", "Partnership", "Trust", "Proprietary Limited (Pty Ltd)", "Public Company (Ltd)", "Not-for-Profit", "Cooperative"],
  DE: ["Einzelunternehmen (Sole Proprietorship)", "GbR (Civil Law Partnership)", "OHG (General Partnership)", "KG (Limited Partnership)", "GmbH (Limited Liability Company)", "UG (Entrepreneurial Company)", "AG (Stock Corporation)", "eG (Cooperative)", "Verein (Association)"],
  IN: ["Sole Proprietorship", "Hindu Undivided Family (HUF)", "Partnership Firm", "Limited Liability Partnership (LLP)", "Private Limited Company", "Public Limited Company", "One Person Company (OPC)", "Section 8 Company (Non-Profit)", "Cooperative Society"],
  BD: ["Sole Proprietorship", "Partnership Firm", "Private Limited Company", "Public Limited Company", "One Person Company (OPC)", "Society / NGO", "Cooperative"],
  SG: ["Sole Proprietorship", "Partnership", "Limited Partnership (LP)", "Limited Liability Partnership (LLP)", "Private Limited Company (Pte. Ltd.)", "Public Company", "Not-for-Profit"],
  AE: ["Sole Establishment", "Civil Company", "Limited Liability Company (LLC)", "Public Joint Stock Company (PJSC)", "Private Joint Stock Company (PrJSC)", "Free Zone Company (FZC / FZE)", "Branch Office"],
  DEFAULT: ["Sole Proprietorship", "Partnership", "Limited Partnership", "Limited Liability Partnership (LLP)", "Limited Liability Company (LLC)", "Private Limited Company", "Public Limited Company", "Corporation", "Non-Profit Organization", "Cooperative", "Branch Office", "Representative Office", "Joint Venture", "Other"],
};

const REVENUE_RANGES = [
  "Less than $50,000", "$50,000 – $250,000", "$250,000 – $1,000,000",
  "$1,000,000 – $5,000,000", "$5,000,000 – $25,000,000", "$25,000,000 – $100,000,000",
  "Over $100,000,000", "Prefer not to disclose",
];

const EMPLOYEE_RANGES = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,001–5,000", "5,001+"];

const SOURCE_OF_FUNDS = [
  "Business Revenue", "Investment Income", "Loans / Credit Facilities",
  "Government Grants", "Venture Capital / Angel Investment", "Personal Funds of Owner(s)",
  "Crowdfunding", "Other",
];

const PURPOSE_OPTIONS = [
  "General Business Operations", "Payroll & HR Management", "Invoice & Payment Processing",
  "International Transactions", "E-commerce / Online Sales", "Project Management",
  "CRM & Sales", "Other",
];

const REQUIRED_DOCUMENTS = [
  { key: "certificate_of_incorporation", label: "Certificate of Incorporation / Registration", required: true },
  { key: "memorandum_articles", label: "Memorandum & Articles of Association", required: true },
  { key: "tax_registration", label: "Tax Registration Certificate", required: true },
  { key: "proof_of_address", label: "Proof of Business Address (utility bill / lease)", required: true },
  { key: "ownership_structure", label: "Ownership Structure / Shareholding Document", required: false },
  { key: "bank_statement", label: "Bank Statement (last 3 months)", required: false },
  { key: "trade_license", label: "Trade License (if applicable)", required: false },
  { key: "authorized_signatory", label: "Board Resolution / Power of Attorney", required: false },
];

const KYB_BENEFITS = [
  { icon: BadgeCheck, label: "Verified Badge", desc: "Display a globally recognized verification badge" },
  { icon: Sparkles, label: "Verification Banner", desc: "Automatic verified banner on dashboard" },
  { icon: Wallet, label: "Wallet Features", desc: "Auto-enabled wallet module when available" },
  { icon: Star, label: "Priority Support", desc: "Dedicated priority support channel" },
  { icon: Shield, label: "Enhanced Trust", desc: "Build trust with employees & customers" },
  { icon: Globe, label: "Global Compliance", desc: "Meet international regulatory standards" },
];

const STATUS_MAP: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  not_applied: { icon: Building2, color: "text-muted-foreground", bg: "bg-muted/30", label: "Not Applied" },
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending Review" },
  under_review: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", label: "Under Review" },
  approved: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Verified" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
};

const STEPS = [
  { id: 1, label: "Country & Entity", icon: Globe },
  { id: 2, label: "Business Details", icon: Building2 },
  { id: 3, label: "Authorized Representative", icon: User },
  { id: 4, label: "Beneficial Owners (UBO)", icon: Users },
  { id: 5, label: "Documents", icon: FileText },
  { id: 6, label: "Review & Submit", icon: Scale },
];

interface BeneficialOwner {
  full_name: string;
  nationality: string;
  date_of_birth: string;
  ownership_percentage: string;
  id_document_type: string;
  id_document_number: string;
  address: string;
  is_pep: boolean; // Politically Exposed Person
}

const emptyOwner: BeneficialOwner = {
  full_name: "", nationality: "", date_of_birth: "", ownership_percentage: "",
  id_document_type: "passport", id_document_number: "", address: "", is_pep: false,
};

// ─── Extracted Field Components (outside component to prevent remount on every render) ───
const InputField = ({ label, value, onChange, placeholder, required, type = "text", icon: Icon }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="h-3 w-3" />}
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, placeholder, required, icon: Icon }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="h-3 w-3" />}
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="" disabled>{placeholder || "Select..."}</option>
      {options.map((o: any) => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  </div>
);

const DRAFT_KEY = "kyb_application_draft";

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function KybApplication() {
  const { profile, user } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const draft = loadDraft();
  const [step, setStep] = useState(draft?.step || 1);

  // Step 1: Country & Entity
  const [country, setCountry] = useState(draft?.country || "");
  const [businessType, setBusinessType] = useState(draft?.businessType || "");

  // Step 2: Business Details
  const [businessName, setBusinessName] = useState(draft?.businessName || "");
  const [registrationNumber, setRegistrationNumber] = useState(draft?.registrationNumber || "");
  const [taxId, setTaxId] = useState(draft?.taxId || "");
  const [incorporationDate, setIncorporationDate] = useState(draft?.incorporationDate || "");
  const [businessAddress, setBusinessAddress] = useState(draft?.businessAddress || "");
  const [city, setCity] = useState(draft?.city || "");
  const [state, setState] = useState(draft?.state || "");
  const [postalCode, setPostalCode] = useState(draft?.postalCode || "");
  const [phone, setPhone] = useState(draft?.phone || "");
  const [email, setEmail] = useState(draft?.email || "");
  const [website, setWebsite] = useState(draft?.website || "");
  const [annualRevenue, setAnnualRevenue] = useState(draft?.annualRevenue || "");
  const [employeeCount, setEmployeeCount] = useState(draft?.employeeCount || "");
  const [sourceOfFunds, setSourceOfFunds] = useState(draft?.sourceOfFunds || "");
  const [purposeOfAccount, setPurposeOfAccount] = useState(draft?.purposeOfAccount || "");

  // Step 3: Authorized Representative
  const [repName, setRepName] = useState(draft?.repName || "");
  const [repTitle, setRepTitle] = useState(draft?.repTitle || "");
  const [repEmail, setRepEmail] = useState(draft?.repEmail || "");
  const [repPhone, setRepPhone] = useState(draft?.repPhone || "");
  const [repDob, setRepDob] = useState(draft?.repDob || "");

  // Step 4: Beneficial Owners
  const [owners, setOwners] = useState<BeneficialOwner[]>(draft?.owners || [{ ...emptyOwner }]);

  // Step 5: Documents
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string; url: string }>>(draft?.uploadedDocs || {});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Step 6: Terms
  const [termsAccepted, setTermsAccepted] = useState(draft?.termsAccepted || false);

  // Auto-save draft to sessionStorage
  useEffect(() => {
    const draftData = {
      step, country, businessType, businessName, registrationNumber, taxId,
      incorporationDate, businessAddress, city, state, postalCode, phone, email,
      website, annualRevenue, employeeCount, sourceOfFunds, purposeOfAccount,
      repName, repTitle, repEmail, repPhone, repDob, owners, uploadedDocs, termsAccepted,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  }, [step, country, businessType, businessName, registrationNumber, taxId,
    incorporationDate, businessAddress, city, state, postalCode, phone, email,
    website, annualRevenue, employeeCount, sourceOfFunds, purposeOfAccount,
    repName, repTitle, repEmail, repPhone, repDob, owners, uploadedDocs, termsAccepted]);

  const selectedCountry = useMemo(() => COUNTRIES.find(c => c.code === country), [country]);
  const businessTypes = useMemo(() => BUSINESS_TYPES_BY_REGION[country] || BUSINESS_TYPES_BY_REGION.DEFAULT, [country]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    supabase.from("tenants").select("*").eq("id", profile.tenant_id).single().then(({ data }) => {
      if (data) {
        setTenant(data);
        const d = data as any;
        // Pre-fill from existing data
        if (d.kyb_country) setCountry(d.kyb_country);
        if (d.kyb_business_type) setBusinessType(d.kyb_business_type);
        if (d.kyb_business_name) setBusinessName(d.kyb_business_name); else if (d.name) setBusinessName(d.name);
        if (d.kyb_registration_number) setRegistrationNumber(d.kyb_registration_number);
        if (d.kyb_tax_id) setTaxId(d.kyb_tax_id);
        if (d.kyb_incorporation_date) setIncorporationDate(d.kyb_incorporation_date);
        if (d.kyb_business_address) setBusinessAddress(d.kyb_business_address);
        if (d.kyb_city) setCity(d.kyb_city);
        if (d.kyb_state) setState(d.kyb_state);
        if (d.kyb_postal_code) setPostalCode(d.kyb_postal_code);
        if (d.kyb_phone) setPhone(d.kyb_phone);
        if (d.kyb_email) setEmail(d.kyb_email);
        if (d.kyb_website) setWebsite(d.kyb_website);
        if (d.kyb_annual_revenue) setAnnualRevenue(d.kyb_annual_revenue);
        if (d.kyb_employee_count) setEmployeeCount(d.kyb_employee_count);
        if (d.kyb_source_of_funds) setSourceOfFunds(d.kyb_source_of_funds);
        if (d.kyb_purpose_of_account) setPurposeOfAccount(d.kyb_purpose_of_account);
        if (d.kyb_authorized_rep_name) setRepName(d.kyb_authorized_rep_name);
        if (d.kyb_authorized_rep_title) setRepTitle(d.kyb_authorized_rep_title);
        if (d.kyb_authorized_rep_email) setRepEmail(d.kyb_authorized_rep_email);
        if (d.kyb_authorized_rep_phone) setRepPhone(d.kyb_authorized_rep_phone);
        if (d.kyb_authorized_rep_dob) setRepDob(d.kyb_authorized_rep_dob);
        if (d.kyb_beneficial_owners && Array.isArray(d.kyb_beneficial_owners) && d.kyb_beneficial_owners.length > 0) {
          setOwners(d.kyb_beneficial_owners as BeneficialOwner[]);
        }
        if (d.kyb_documents && typeof d.kyb_documents === "object") {
          setUploadedDocs(d.kyb_documents as any);
        }
      }
      setLoading(false);
    });
  }, [profile?.tenant_id]);

  const handleFileUpload = async (docKey: string, file: File) => {
    if (!tenant?.id || !user?.id) return;
    setUploadingKey(docKey);
    const safeName = file.name.replace(/\s+/g, "_");
    const filePath = `${user.id}/kyb/${tenant.id}/${docKey}_${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(filePath, file);
    if (error) { toast.error("Upload failed: " + error.message); setUploadingKey(null); return; }
    const { data: urlData } = supabase.storage.from("kyc-documents").getPublicUrl(filePath);
    setUploadedDocs(prev => ({ ...prev, [docKey]: { name: file.name, url: urlData.publicUrl } }));
    setUploadingKey(null);
    toast.success("Document uploaded");
  };

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 1:
        if (!country) return "Please select your country of incorporation";
        if (!businessType) return "Please select your business entity type";
        return null;
      case 2:
        if (!businessName.trim()) return "Legal business name is required";
        if (!registrationNumber.trim()) return "Registration number is required";
        if (!taxId.trim()) return "Tax ID is required";
        if (!businessAddress.trim()) return "Business address is required";
        if (!city.trim()) return "City is required";
        if (!postalCode.trim()) return "Postal / ZIP code is required";
        if (!phone.trim()) return "Business phone is required";
        if (!email.trim()) return "Business email is required";
        if (!annualRevenue) return "Annual revenue range is required";
        if (!sourceOfFunds) return "Source of funds is required";
        if (!purposeOfAccount) return "Purpose of account is required";
        return null;
      case 3:
        if (!repName.trim()) return "Representative name is required";
        if (!repTitle.trim()) return "Representative title is required";
        if (!repEmail.trim()) return "Representative email is required";
        if (!repDob.trim()) return "Representative date of birth is required";
        return null;
      case 4: {
        const totalOwnership = owners.reduce((sum, o) => sum + (parseFloat(o.ownership_percentage) || 0), 0);
        for (const o of owners) {
          if (!o.full_name.trim()) return "All beneficial owners must have a name";
          if (!o.ownership_percentage) return "Ownership percentage is required for all owners";
        }
        if (totalOwnership > 100) return "Total ownership cannot exceed 100%";
        return null;
      }
      case 5: {
        const missing = REQUIRED_DOCUMENTS.filter(d => d.required && !uploadedDocs[d.key]);
        if (missing.length > 0) return `Please upload: ${missing[0].label}`;
        return null;
      }
      case 6:
        if (!termsAccepted) return "You must accept the terms and conditions";
        return null;
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep(s => Math.min(s + 1, 6));
  };

  const goBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    for (let s = 1; s <= 6; s++) {
      const err = validateStep(s);
      if (err) { toast.error(err); setStep(s); return; }
    }

    setSubmitting(true);
    const { error } = await supabase.from("tenants").update({
      kyb_status: "pending",
      kyb_applied_at: new Date().toISOString(),
      kyb_country: country,
      kyb_business_name: businessName,
      kyb_registration_number: registrationNumber,
      kyb_business_type: businessType,
      kyb_business_address: businessAddress,
      kyb_tax_id: taxId,
      kyb_incorporation_date: incorporationDate,
      kyb_city: city,
      kyb_state: state,
      kyb_postal_code: postalCode,
      kyb_phone: phone,
      kyb_email: email,
      kyb_website: website,
      kyb_annual_revenue: annualRevenue,
      kyb_employee_count: employeeCount,
      kyb_source_of_funds: sourceOfFunds,
      kyb_purpose_of_account: purposeOfAccount,
      kyb_authorized_rep_name: repName,
      kyb_authorized_rep_title: repTitle,
      kyb_authorized_rep_email: repEmail,
      kyb_authorized_rep_phone: repPhone,
      kyb_authorized_rep_dob: repDob,
      kyb_beneficial_owners: owners,
      kyb_documents: uploadedDocs,
      kyb_terms_accepted: true,
      kyb_terms_accepted_at: new Date().toISOString(),
      kyb_rejection_reason: null,
    } as any).eq("id", tenant.id);
    setSubmitting(false);

    if (error) toast.error(error.message);
    else {
      sessionStorage.removeItem(DRAFT_KEY);
      toast.success("KYB application submitted successfully!");
      const { data } = await supabase.from("tenants").select("*").eq("id", tenant.id).single();
      if (data) setTenant(data);
    }
  };

  const handleReapply = async () => {
    const { error } = await supabase.from("tenants").update({
      kyb_status: "not_applied",
      kyb_rejection_reason: null,
    } as any).eq("id", tenant.id);
    if (error) toast.error(error.message);
    else {
      toast.success("You can now re-apply");
      setStep(1);
      const { data } = await supabase.from("tenants").select("*").eq("id", tenant.id).single();
      if (data) setTenant(data);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const kybStatus = (tenant as any)?.kyb_status || "not_applied";
  const statusCfg = STATUS_MAP[kybStatus] || STATUS_MAP.not_applied;
  const StatusIcon = statusCfg.icon;
  const canApply = kybStatus === "not_applied" || kybStatus === "rejected";


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Business Verification (KYB)</h1>
          <p className="text-sm text-muted-foreground">Global compliance verification for your business</p>
        </div>
      </div>

      {/* Status Card */}
      <div className={`rounded-xl border p-5 ${kybStatus === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"}`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${statusCfg.bg} flex items-center justify-center`}>
            <StatusIcon className={`h-5 w-5 ${statusCfg.color}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Verification Status</p>
            <Badge className={`${statusCfg.bg} ${statusCfg.color} border-0 mt-0.5`}>{statusCfg.label}</Badge>
          </div>
          {kybStatus === "approved" && (tenant as any).kyb_verified_at && (
            <p className="text-xs text-muted-foreground ml-auto">
              Verified on {format(new Date((tenant as any).kyb_verified_at), "MMM dd, yyyy")}
            </p>
          )}
        </div>
        {kybStatus === "rejected" && (tenant as any).kyb_rejection_reason && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-destructive">Rejection Reason</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(tenant as any).kyb_rejection_reason}</p>
              </div>
            </div>
            <button onClick={handleReapply} className="mt-3 flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
              <Send className="h-3.5 w-3.5" /> Re-apply for Verification
            </button>
          </div>
        )}
      </div>

      {/* Benefits */}
      {canApply && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Benefits of Verification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {KYB_BENEFITS.map((b) => (
              <div key={b.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/20">
                <div className="p-1.5 rounded-md bg-primary/10"><b.icon className="h-3.5 w-3.5 text-primary" /></div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{b.label}</p>
                  <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Step Application Form */}
      {canApply && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Stepper */}
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Application Form</h2>
              <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
            </div>
            <Progress value={(step / STEPS.length) * 100} className="h-1.5 mb-3" />
            <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
              {STEPS.map((s) => {
                const SIcon = s.icon;
                const isActive = step === s.id;
                const isDone = step > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { if (isDone) setStep(s.id); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isActive ? "bg-primary/10 text-primary" : isDone ? "text-emerald-600 cursor-pointer hover:bg-muted/30" : "text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <SIcon className="h-3.5 w-3.5" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* ─── Step 1: Country & Entity ─── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Country of Incorporation & Entity Type</h3>
                </div>
                <p className="text-xs text-muted-foreground">Select the country where your business is legally registered. This determines the required documents and entity types.</p>

                <SelectField
                  label="Country of Incorporation"
                  value={country}
                  onChange={(v: string) => { setCountry(v); setBusinessType(""); }}
                  options={COUNTRIES.map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
                  placeholder="Select country..."
                  required
                  icon={Globe}
                />

                {country && (
                  <SelectField
                    label="Business Entity Type"
                    value={businessType}
                    onChange={setBusinessType}
                    options={businessTypes}
                    placeholder="Select entity type..."
                    required
                    icon={Building2}
                  />
                )}

                {country && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">📋 Required for {selectedCountry?.name}:</p>
                    <p>• {selectedCountry?.taxLabel} (Tax Identification)</p>
                    <p>• {selectedCountry?.regLabel} (Business Registration)</p>
                    <p>• Certificate of Incorporation / Registration</p>
                    <p>• Proof of Business Address</p>
                    <p>• Beneficial Ownership Declaration (UBO &gt; 25%)</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Step 2: Business Details ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Business Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Legal Business Name" value={businessName} onChange={setBusinessName} required icon={Building2} />
                  <InputField label={selectedCountry?.regLabel || "Registration Number"} value={registrationNumber} onChange={setRegistrationNumber} required icon={FileText} />
                  <InputField label={selectedCountry?.taxLabel || "Tax ID"} value={taxId} onChange={setTaxId} required icon={FileText} />
                  <InputField label="Incorporation Date" value={incorporationDate} onChange={setIncorporationDate} type="date" icon={Calendar} />
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Registered Business Address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <InputField label="Street Address" value={businessAddress} onChange={setBusinessAddress} required icon={MapPin} />
                    </div>
                    <InputField label="City" value={city} onChange={setCity} required />
                    <InputField label="State / Province / Region" value={state} onChange={setState} />
                    <InputField label="Postal / ZIP Code" value={postalCode} onChange={setPostalCode} required />
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Phone className="h-3 w-3" /> Contact Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField label="Business Phone" value={phone} onChange={setPhone} required icon={Phone} placeholder="+1 (555) 123-4567" />
                    <InputField label="Business Email" value={email} onChange={setEmail} required icon={Mail} type="email" />
                    <InputField label="Website" value={website} onChange={setWebsite} icon={Globe} placeholder="https://" />
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Financial Profile</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectField label="Annual Revenue" value={annualRevenue} onChange={setAnnualRevenue} options={REVENUE_RANGES} required icon={DollarSign} />
                    <SelectField label="Number of Employees" value={employeeCount} onChange={setEmployeeCount} options={EMPLOYEE_RANGES} icon={Users} />
                    <SelectField label="Primary Source of Funds" value={sourceOfFunds} onChange={setSourceOfFunds} options={SOURCE_OF_FUNDS} required icon={Wallet} />
                    <SelectField label="Purpose of Account" value={purposeOfAccount} onChange={setPurposeOfAccount} options={PURPOSE_OPTIONS} required icon={Briefcase} />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 3: Authorized Representative ─── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Authorized Representative</h3>
                </div>
                <p className="text-xs text-muted-foreground">The person authorized to act on behalf of this company for verification purposes. Must be a director, officer, or legal representative.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Full Legal Name" value={repName} onChange={setRepName} required icon={User} />
                  <InputField label="Title / Position" value={repTitle} onChange={setRepTitle} required icon={Briefcase} placeholder="e.g. CEO, Managing Director" />
                  <InputField label="Email Address" value={repEmail} onChange={setRepEmail} required icon={Mail} type="email" />
                  <InputField label="Phone Number" value={repPhone} onChange={setRepPhone} icon={Phone} />
                  <InputField label="Date of Birth" value={repDob} onChange={setRepDob} required type="date" icon={Calendar} />
                </div>
              </div>
            )}

            {/* ─── Step 4: Beneficial Owners (UBO) ─── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Beneficial Owners (UBO)</h3>
                  </div>
                  <button
                    onClick={() => setOwners([...owners, { ...emptyOwner }])}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
                  >
                    <Plus className="h-3 w-3" /> Add Owner
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">List all individuals who directly or indirectly own 25% or more of the company. This is required by international AML/CFT regulations.</p>

                {owners.map((owner, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">Owner #{idx + 1}</p>
                      {owners.length > 1 && (
                        <button onClick={() => setOwners(owners.filter((_, i) => i !== idx))} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InputField label="Full Legal Name" value={owner.full_name} onChange={(v: string) => { const u = [...owners]; u[idx] = { ...u[idx], full_name: v }; setOwners(u); }} required />
                      <SelectField
                        label="Nationality"
                        value={owner.nationality}
                        onChange={(v: string) => { const u = [...owners]; u[idx] = { ...u[idx], nationality: v }; setOwners(u); }}
                        options={COUNTRIES.filter(c => c.code !== "OTHER").map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
                      />
                      <InputField label="Date of Birth" value={owner.date_of_birth} onChange={(v: string) => { const u = [...owners]; u[idx] = { ...u[idx], date_of_birth: v }; setOwners(u); }} type="date" />
                      <InputField label="Ownership %" value={owner.ownership_percentage} onChange={(v: string) => { const u = [...owners]; u[idx] = { ...u[idx], ownership_percentage: v }; setOwners(u); }} required type="number" placeholder="e.g. 51" />
                      <SelectField
                        label="ID Document Type"
                        value={owner.id_document_type}
                        onChange={(v: string) => { const u = [...owners]; u[idx] = { ...u[idx], id_document_type: v }; setOwners(u); }}
                        options={[{ value: "passport", label: "Passport" }, { value: "national_id", label: "National ID" }, { value: "drivers_license", label: "Driver's License" }]}
                      />
                      <InputField label="ID Document Number" value={owner.id_document_number} onChange={(v: string) => { const u = [...owners]; u[idx] = { ...u[idx], id_document_number: v }; setOwners(u); }} />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={owner.is_pep}
                        onChange={(e) => { const u = [...owners]; u[idx] = { ...u[idx], is_pep: e.target.checked }; setOwners(u); }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <label className="text-xs text-muted-foreground">This person is a Politically Exposed Person (PEP)</label>
                    </div>
                  </div>
                ))}

                {owners.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                    Total ownership declared: <span className="font-semibold text-foreground">{owners.reduce((s, o) => s + (parseFloat(o.ownership_percentage) || 0), 0)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* ─── Step 5: Documents ─── */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Supporting Documents</h3>
                </div>
                <p className="text-xs text-muted-foreground">Upload clear, legible copies of the following documents. Accepted formats: PDF, JPG, PNG. Max size: 10MB per file.</p>

                <div className="space-y-2">
                  {REQUIRED_DOCUMENTS.map((doc) => (
                    <div key={doc.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {uploadedDocs[doc.key] ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {doc.label} {doc.required && <span className="text-destructive">*</span>}
                          </p>
                          {uploadedDocs[doc.key] && (
                            <p className="text-[10px] text-emerald-600 truncate">{uploadedDocs[doc.key].name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {uploadedDocs[doc.key] && (
                          <button onClick={() => { const u = { ...uploadedDocs }; delete u[doc.key]; setUploadedDocs(u); }} className="p-1 rounded text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <label className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20">
                          {uploadingKey === doc.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {uploadedDocs[doc.key] ? "Replace" : "Upload"}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.key, e.target.files[0])}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Step 6: Review & Submit ─── */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Review & Submit</h3>
                </div>

                {/* Summary */}
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground">Business Information</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Country:</span> <span className="font-medium text-foreground">{selectedCountry?.flag} {selectedCountry?.name}</span></div>
                      <div><span className="text-muted-foreground">Entity:</span> <span className="font-medium text-foreground">{businessType}</span></div>
                      <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{businessName}</span></div>
                      <div><span className="text-muted-foreground">Reg #:</span> <span className="font-medium text-foreground">{registrationNumber}</span></div>
                      <div><span className="text-muted-foreground">Tax ID:</span> <span className="font-medium text-foreground">{taxId}</span></div>
                      <div><span className="text-muted-foreground">Revenue:</span> <span className="font-medium text-foreground">{annualRevenue}</span></div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground">Authorized Representative</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{repName}</span></div>
                      <div><span className="text-muted-foreground">Title:</span> <span className="font-medium text-foreground">{repTitle}</span></div>
                      <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{repEmail}</span></div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground">Beneficial Owners ({owners.length})</p>
                    <div className="space-y-1 text-xs">
                      {owners.map((o, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-foreground">{o.full_name || "—"}</span>
                          <span className="text-muted-foreground">{o.ownership_percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground">Documents ({Object.keys(uploadedDocs).length} uploaded)</p>
                    <div className="space-y-1 text-xs">
                      {Object.entries(uploadedDocs).map(([key, doc]) => (
                        <div key={key} className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{(doc as any).name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="p-4 rounded-lg border border-border bg-muted/10 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Declaration & Consent</p>
                  <div className="text-[11px] text-muted-foreground space-y-1.5">
                    <p>By submitting this application, I hereby declare and confirm that:</p>
                    <p>• All information provided is true, accurate, and complete to the best of my knowledge.</p>
                    <p>• I am authorized to act on behalf of the company and submit this verification application.</p>
                    <p>• I consent to the verification of the information and documents provided, including checks against sanctions lists, PEP databases, and adverse media.</p>
                    <p>• I understand that providing false or misleading information may result in rejection, account suspension, or legal action.</p>
                    <p>• I agree to promptly notify of any material changes to the information provided.</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <label className="text-xs font-medium text-foreground">
                      I accept the terms and conditions and authorize verification <span className="text-destructive">*</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={goBack}
                disabled={step === 1}
                className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              {step < 6 ? (
                <button onClick={goNext} className="flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Application
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Submitted Details for pending/under_review/approved */}
      {(kybStatus === "pending" || kybStatus === "under_review" || kybStatus === "approved") && (() => {
        const t = tenant as any;
        const docs = t.kyb_documents || {};
        const countryInfo = COUNTRIES.find(c => c.code === t.kyb_country);
        const ubos: any[] = Array.isArray(t.kyb_beneficial_owners) ? t.kyb_beneficial_owners : [];

        const InfoItem = ({ label, value }: { label: string; value: any }) => (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{value || <span className="text-muted-foreground/50 italic">—</span>}</p>
          </div>
        );

        return (
          <div className="space-y-5">
            {/* Verified banner */}
            {kybStatus === "approved" && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <BadgeCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">Your company is verified!</h3>
              </div>
            )}

            {/* Edit Button */}
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  const confirmed = window.confirm("Editing your KYB details will reset your verification status to pending. You will need to go through the verification process again. Continue?");
                  if (!confirmed) return;
                  // Reset status to not_applied so they can re-fill the form
                  const { error } = await supabase.from("tenants").update({
                    kyb_status: "not_applied",
                    kyb_verified_at: null,
                    kyb_rejection_reason: null,
                  } as any).eq("id", t.id);
                  if (error) { toast.error(error.message); return; }
                  toast.success("You can now edit your KYB application. Please re-submit when done.");
                  // Re-fetch tenant
                  const { data: updated } = await supabase.from("tenants").select("*" as any).eq("id", t.id).single();
                  if (updated) setTenant(updated);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
              >
                <FileText className="h-4 w-4" /> Edit & Re-verify
              </button>
            </div>

            {/* Section: Business Information */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Business Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Legal Business Name" value={t.kyb_business_name} />
                <InfoItem label="Business Type" value={t.kyb_business_type} />
                <InfoItem label="Country" value={countryInfo ? `${countryInfo.flag} ${countryInfo.name}` : t.kyb_country} />
                <InfoItem label="Registration #" value={t.kyb_registration_number} />
                <InfoItem label="Tax ID" value={t.kyb_tax_id} />
                <InfoItem label="Industry" value={t.industry} />
                <InfoItem label="Incorporation Date" value={t.kyb_incorporation_date} />
                <InfoItem label="Employee Count" value={t.kyb_employee_count} />
                <InfoItem label="Website" value={t.kyb_website} />
              </div>
            </div>

            {/* Section: Contact Details */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Contact Details
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Business Email" value={t.kyb_email} />
                <InfoItem label="Business Phone" value={t.kyb_phone} />
              </div>
            </div>

            {/* Section: Business Address */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Business Address
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Street Address" value={t.kyb_business_address} />
                <InfoItem label="City" value={t.kyb_city} />
                <InfoItem label="State / Province" value={t.kyb_state} />
                <InfoItem label="Postal Code" value={t.kyb_postal_code} />
              </div>
            </div>

            {/* Section: Authorized Representative */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Authorized Representative
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Full Name" value={t.kyb_authorized_rep_name} />
                <InfoItem label="Title / Position" value={t.kyb_authorized_rep_title} />
                <InfoItem label="Email" value={t.kyb_authorized_rep_email} />
                <InfoItem label="Phone" value={t.kyb_authorized_rep_phone} />
                <InfoItem label="Date of Birth" value={t.kyb_authorized_rep_dob} />
              </div>
            </div>

            {/* Section: Financial Information */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Financial Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Annual Revenue" value={t.kyb_annual_revenue} />
                <InfoItem label="Source of Funds" value={t.kyb_source_of_funds} />
                <InfoItem label="Purpose of Account" value={t.kyb_purpose_of_account} />
              </div>
            </div>

            {/* Section: Beneficial Owners (UBO) */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Beneficial Owners (UBO)
              </h4>
              {ubos.length > 0 ? (
                <div className="space-y-2">
                  {ubos.map((o: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{o.full_name || "—"}</span>
                        <span className="text-xs text-muted-foreground font-semibold">{o.ownership_percentage}%</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><p className="text-muted-foreground">Nationality</p><p className="font-medium text-foreground">{o.nationality || "—"}</p></div>
                        <div><p className="text-muted-foreground">Date of Birth</p><p className="font-medium text-foreground">{o.date_of_birth || "—"}</p></div>
                        <div><p className="text-muted-foreground">ID Type</p><p className="font-medium text-foreground">{o.id_document_type || "—"}</p></div>
                        <div><p className="text-muted-foreground">ID Number</p><p className="font-medium text-foreground">{o.id_document_number || "—"}</p></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-muted-foreground">Address</p><p className="font-medium text-foreground">{o.address || "—"}</p></div>
                        <div><p className="text-muted-foreground">PEP Status</p><p className={`font-medium ${o.is_pep ? "text-amber-500" : "text-foreground"}`}>{o.is_pep ? "⚠️ Yes" : "No"}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">No beneficial owners provided</p>
              )}
            </div>

            {/* Section: Submitted Documents */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Submitted Documents
              </h4>
              <div className="space-y-2">
                {REQUIRED_DOCUMENTS.map((doc) => {
                  const uploaded = docs[doc.key];
                  return (
                    <div key={doc.key} className={`flex items-center justify-between p-3 rounded-lg border text-xs ${uploaded ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-muted/10"}`}>
                      <div className="flex items-center gap-2">
                        <FileText className={`h-3.5 w-3.5 ${uploaded ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                        <div>
                          <p className={`font-medium ${uploaded ? "text-foreground" : "text-muted-foreground/50"}`}>{doc.label}</p>
                          {uploaded && <p className="text-muted-foreground text-[10px] mt-0.5">{uploaded.name}</p>}
                        </div>
                      </div>
                      {uploaded ? (
                        <a href={uploaded.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors">
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 italic">Not uploaded</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: Terms & Submission */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Terms & Submission
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Terms Accepted" value={t.kyb_terms_accepted ? "Yes ✓" : "No"} />
                <InfoItem label="Applied On" value={t.kyb_applied_at ? format(new Date(t.kyb_applied_at), "MMM dd, yyyy 'at' h:mm a") : null} />
                {t.kyb_terms_accepted_at && (
                  <InfoItem label="Terms Accepted On" value={format(new Date(t.kyb_terms_accepted_at), "MMM dd, yyyy 'at' h:mm a")} />
                )}
                {t.kyb_verified_at && (
                  <InfoItem label="Verified On" value={format(new Date(t.kyb_verified_at), "MMM dd, yyyy")} />
                )}
              </div>
            </div>

            {/* Status info */}
            {kybStatus === "pending" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Your application is pending review.
              </p>
            )}
            {kybStatus === "under_review" && (
              <p className="text-xs text-blue-500 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Your application is currently under review.
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
