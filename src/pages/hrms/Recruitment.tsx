// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import {
  Plus, Briefcase, Users, Clock, CheckCircle2, MapPin, Calendar, Trash2, Share2,
  ExternalLink, Eye, ChevronDown, ChevronUp, FileText, Link as LinkIcon,
  Phone, Mail, XCircle, UserCheck, Printer, Award, Loader2, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useDepartments";
import { supabase } from "@/integrations/supabase/db";
import { format } from "date-fns";
import DepartmentSelect from "@/components/DepartmentSelect";

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string | null;
  applicants: number;
  shortlisted: number;
  status: string;
  posted_date: string;
  salary_range: string | null;
  requirements: string | null;
  benefits: string | null;
  experience_level: string | null;
}

interface JobApplication {
  id: string;
  job_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  cover_letter: string | null;
  resume_url: string | null;
  status: string;
  created_at: string;
}

const statusColor: Record<string, string> = {
  Open: "bg-success/10 text-success",
  Closed: "bg-primary/10 text-primary",
  "On Hold": "bg-warning/10 text-warning",
};

const appStatusColor: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-500",
  Reviewed: "bg-warning/10 text-warning",
  Shortlisted: "bg-primary/10 text-primary",
  Interview: "bg-violet-500/10 text-violet-500",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
  Hired: "bg-emerald-500/10 text-emerald-600",
};

const DEFAULT_LOCATIONS = ["Dhaka", "Remote", "Hybrid", "Chittagong", "Sylhet", "Rajshahi", "Khulna"];
const DEFAULT_EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Freelance", "Temporary"];
const DEFAULT_EXPERIENCE_LEVELS = ["Entry-level", "Mid-level", "Senior", "Lead", "Manager", "Director"];

const generateDefaultOfferBody = (name: string, title: string, dept: string, salary: string, startDate: string, probation: string, manager: string, benefits: string) => {
  const fmtDate = startDate ? format(new Date(startDate), "MMMM dd, yyyy") : "TBD";
  return `Dear ${name},

We are delighted to extend this offer of employment for the position of ${title} in the ${dept} department at our organization.

After a thorough evaluation of your qualifications, experience, and interview performance, we are confident that you will make a significant contribution to our team. We were particularly impressed by your skills and enthusiasm, and we believe you are an excellent fit for this role.

Terms of Employment:

• Position: ${title}
• Department: ${dept}
• Compensation: ${salary}
• Start Date: ${fmtDate}
• Probation Period: ${probation}
• Reporting To: ${manager}
• Benefits: ${benefits}

During your probation period, your performance will be reviewed to ensure mutual satisfaction. Upon successful completion, you will be confirmed as a permanent member of our team.

This offer is contingent upon successful completion of all required onboarding procedures, including background verification and document submission. Please confirm your acceptance by signing and returning this letter by ${fmtDate}.

We are excited about the prospect of you joining our team and look forward to a successful and rewarding journey together!

Warm regards,
${manager}
Authorized Signatory`;
};

export default function Recruitment() {
  const { tenantId, buildInsert, supabase: tenantSupa } = useTenant();
  const { user, profile } = useAuth();
  const { departments } = useDepartments(tenantId);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [applications, setApplications] = useState<Record<string, JobApplication[]>>({});
  const [tenantSlug, setTenantSlug] = useState<string>("");

  // Offer letter state
  const [offerDialog, setOfferDialog] = useState<{ app: JobApplication; job: JobPosting } | null>(null);
  const [offerForm, setOfferForm] = useState({
    salary: "", start_date: "", job_title: "", department: "", manager_name: "",
    probation_period: "3 months", benefits: "Health Insurance, Paid Leave, Annual Bonus",
  });
  const [offerBody, setOfferBody] = useState("");
  const [hiring, setHiring] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; temporary_password: string } | null>(null);
  const offerPrintRef = useRef<HTMLDivElement>(null);

  // Job form state
  const [form, setForm] = useState({
    title: "", department: "", location: "", employment_type: "", description: "",
    salary_range: "", requirements: "", benefits: "", experience_level: "",
  });

  const fetchJobs = async () => {
    if (!tenantId) return;
    const { data, error } = await tenantSupa
      .from("job_postings").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setJobs(data as JobPosting[]);
    setLoading(false);
  };

  const fetchTenantSlug = async () => {
    if (!tenantId) return;
    const { data } = await tenantSupa.from("tenants").select("slug").eq("id", tenantId).single();
    if (data) setTenantSlug((data as any).slug);
  };

  const fetchApplications = async (jobId: string) => {
    const { data } = await tenantSupa
      .from("job_applications").select("*").eq("job_id", jobId).order("created_at", { ascending: false });
    if (data) setApplications((prev) => ({ ...prev, [jobId]: data as JobApplication[] }));
  };

  useEffect(() => { fetchJobs(); fetchTenantSlug(); }, [tenantId]);

  const toggleExpand = (jobId: string) => {
    if (expandedJob === jobId) { setExpandedJob(null); } else {
      setExpandedJob(jobId);
      if (!applications[jobId]) fetchApplications(jobId);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await tenantSupa.from("job_postings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Job ${status.toLowerCase()}`);
    fetchJobs();
  };

  const updateAppStatus = async (appId: string, jobId: string, status: string) => {
    const { error } = await tenantSupa.from("job_applications").update({ status }).eq("id", appId);
    if (error) { toast.error(error.message); return; }
    if (status === "Shortlisted") {
      const job = jobs.find(j => j.id === jobId);
      if (job) await tenantSupa.from("job_postings").update({ shortlisted: job.shortlisted + 1 }).eq("id", jobId);
    }
    toast.success(`Application marked as ${status}`);
    fetchApplications(jobId);
    fetchJobs();
  };

  const deleteJob = async (id: string) => {
    const { error } = await tenantSupa.from("job_postings").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Job deleted");
    fetchJobs();
  };

  const publishedDomain = window.location.origin;
  const getShareUrl = (jobId: string) => `${publishedDomain}/hrm/recruitment/${jobId}`;
  const getCareersUrl = () => `${publishedDomain}/careers/${tenantSlug}`;
  const copyShareLink = (text: string, label = "Link") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Load saved offer template
  const loadSavedTemplate = async () => {
    if (!tenantId) return null;
    const { data } = await supabase
      .from("offer_letter_templates")
      .select("template_body")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    return data?.template_body || null;
  };

  const saveOfferTemplate = async (body: string) => {
    if (!tenantId || !user) return;
    await supabase.from("offer_letter_templates").upsert({
      tenant_id: tenantId,
      template_body: body,
      last_updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });
  };

  const openOfferDialog = async (app: JobApplication, job: JobPosting) => {
    setOfferDialog({ app, job });
    const formData = {
      salary: job.salary_range || "",
      start_date: format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"),
      job_title: job.title,
      department: job.department,
      manager_name: profile?.full_name || "",
      probation_period: "3 months",
      benefits: "Health Insurance, Paid Leave, Annual Bonus",
    };
    setOfferForm(formData);
    setCredentials(null);

    // Try loading saved template, otherwise use default
    const saved = await loadSavedTemplate();
    if (saved) {
      // Replace placeholders in saved template
      let body = saved;
      body = body.replace(/\{candidate_name\}/g, app.applicant_name);
      body = body.replace(/\{job_title\}/g, formData.job_title);
      body = body.replace(/\{department\}/g, formData.department);
      body = body.replace(/\{salary\}/g, formData.salary);
      body = body.replace(/\{start_date\}/g, formData.start_date ? format(new Date(formData.start_date), "MMMM dd, yyyy") : "TBD");
      body = body.replace(/\{probation\}/g, formData.probation_period);
      body = body.replace(/\{manager\}/g, formData.manager_name);
      body = body.replace(/\{benefits\}/g, formData.benefits);
      setOfferBody(body);
    } else {
      setOfferBody(generateDefaultOfferBody(
        app.applicant_name, formData.job_title, formData.department,
        formData.salary, formData.start_date, formData.probation_period,
        formData.manager_name, formData.benefits
      ));
    }
  };

  const handleHire = async () => {
    if (!offerDialog || !tenantId || !user) return;
    setHiring(true);
    try {
      // Save current offer letter as template for future use (with placeholders)
      let templateBody = offerBody;
      templateBody = templateBody.replace(new RegExp(offerDialog.app.applicant_name, "g"), "{candidate_name}");
      templateBody = templateBody.replace(new RegExp(offerForm.job_title, "g"), "{job_title}");
      templateBody = templateBody.replace(new RegExp(offerForm.department, "g"), "{department}");
      if (offerForm.salary) templateBody = templateBody.replace(new RegExp(offerForm.salary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "{salary}");
      if (offerForm.start_date) {
        const fmtDate = format(new Date(offerForm.start_date), "MMMM dd, yyyy");
        templateBody = templateBody.replace(new RegExp(fmtDate, "g"), "{start_date}");
      }
      templateBody = templateBody.replace(new RegExp(offerForm.probation_period, "g"), "{probation}");
      if (offerForm.manager_name) templateBody = templateBody.replace(new RegExp(offerForm.manager_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "{manager}");
      if (offerForm.benefits) templateBody = templateBody.replace(new RegExp(offerForm.benefits.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "{benefits}");
      await saveOfferTemplate(templateBody);

      const { data, error } = await supabase.functions.invoke("hire-employee", {
        body: {
          application_id: offerDialog.app.id,
          job_title: offerForm.job_title,
          department: offerForm.department,
          salary: offerForm.salary.replace(/[^\d.]/g, ""),
          tenant_id: tenantId,
          created_by: user.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.credentials) {
        setCredentials(data.credentials);
        toast.success("🎉 Employee hired and credentials generated!");
      } else {
        toast.success("Employee record created successfully!");
        // Auto-close since no credentials to show
        setTimeout(() => { setOfferDialog(null); setCredentials(null); }, 1500);
      }
      fetchApplications(offerDialog.job.id);
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to hire employee");
    }
    setHiring(false);
  };

  const printOfferLetter = () => {
    const content = offerPrintRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Offer Letter - ${offerDialog?.app.applicant_name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; color: #1a1a1a; line-height: 1.8; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px double #2563eb; }
        .header h1 { font-family: 'Playfair Display', serif; font-size: 32px; color: #1e3a5f; margin: 0; letter-spacing: 4px; }
        .header .sub { font-size: 12px; color: #94a3b8; letter-spacing: 6px; margin-top: 8px; text-transform: uppercase; }
        .content { white-space: pre-wrap; font-size: 14px; line-height: 1.9; }
        .footer { margin-top: 60px; display: flex; justify-content: space-between; }
        .sig-block { width: 220px; }
        .sig-line { border-top: 2px solid #334155; padding-top: 10px; margin-top: 60px; }
        .sig-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .sig-name { font-weight: 600; font-size: 14px; margin-top: 4px; }
        @media print { body { margin: 0; padding: 30px; } }
      </style></head><body>
        <div class="header">
          <h1>OFFER LETTER</h1>
          <div class="sub">Confidential</div>
        </div>
        <p style="text-align:right; color:#64748b; font-size:13px;">Date: ${format(new Date(), "MMMM dd, yyyy")}</p>
        <div class="content">${offerBody.replace(/\n/g, "<br/>")}</div>
        <div class="footer">
          <div class="sig-block">
            <div class="sig-line">
              <p class="sig-label">Authorized Signature</p>
              <p class="sig-name">${offerForm.manager_name}</p>
            </div>
          </div>
          <div class="sig-block">
            <div class="sig-line">
              <p class="sig-label">Candidate Signature</p>
              <p class="sig-name">${offerDialog?.app.applicant_name}</p>
            </div>
          </div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !form.title || !form.department || !form.location || !form.employment_type) return;
    const { error } = await tenantSupa.from("job_postings").insert(buildInsert({
      title: form.title, department: form.department, location: form.location,
      employment_type: form.employment_type, description: form.description || null,
      salary_range: form.salary_range || null, requirements: form.requirements || null,
      benefits: form.benefits || null, experience_level: form.experience_level || "Mid-level",
    }));
    if (error) { toast.error(error.message); return; }
    toast.success("Job posted successfully");
    setDialogOpen(false);
    setForm({ title: "", department: "", location: "", employment_type: "", description: "", salary_range: "", requirements: "", benefits: "", experience_level: "" });
    fetchJobs();
  };

  const openCount = jobs.filter(j => j.status === "Open").length;
  const totalApplicants = jobs.reduce((a, b) => a + b.applicants, 0);
  const totalShortlisted = jobs.reduce((a, b) => a + b.shortlisted, 0);

  const renderAppActions = (app: JobApplication, job: JobPosting) => {
    const btnBase = "text-[10px] px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1";
    switch (app.status) {
      case "New":
        return (
          <>
            <button onClick={() => updateAppStatus(app.id, job.id, "Shortlisted")} className={`${btnBase} bg-primary/10 text-primary hover:bg-primary/20`}>
              <UserCheck className="h-3 w-3" /> Shortlist
            </button>
            <button onClick={() => updateAppStatus(app.id, job.id, "Rejected")} className={`${btnBase} bg-destructive/10 text-destructive hover:bg-destructive/20`}>
              <XCircle className="h-3 w-3" /> Reject
            </button>
          </>
        );
      case "Reviewed":
      case "Shortlisted":
        return (
          <>
            <button onClick={() => updateAppStatus(app.id, job.id, "Interview")} className={`${btnBase} bg-violet-500/10 text-violet-600 hover:bg-violet-500/20`}>
              <Phone className="h-3 w-3" /> Interview
            </button>
            <button onClick={() => updateAppStatus(app.id, job.id, "Rejected")} className={`${btnBase} bg-destructive/10 text-destructive hover:bg-destructive/20`}>
              <XCircle className="h-3 w-3" /> Reject
            </button>
          </>
        );
      case "Interview":
        return (
          <>
            <button onClick={() => updateAppStatus(app.id, job.id, "Approved")} className={`${btnBase} bg-success/10 text-success hover:bg-success/20`}>
              <CheckCircle2 className="h-3 w-3" /> Approve
            </button>
            <button onClick={() => updateAppStatus(app.id, job.id, "Rejected")} className={`${btnBase} bg-destructive/10 text-destructive hover:bg-destructive/20`}>
              <XCircle className="h-3 w-3" /> Reject
            </button>
          </>
        );
      case "Approved":
        return (
          <button onClick={() => openOfferDialog(app, job)} className={`${btnBase} bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20`}>
            <Award className="h-3 w-3" /> Offer Letter
          </button>
        );
      case "Hired":
        return (
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Hired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Recruitment</h1>
          <p className="text-sm text-muted-foreground mt-1">Job postings, candidates, and hiring pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          {tenantSlug && (
            <button onClick={() => copyShareLink(getCareersUrl(), "Careers page link")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
              <LinkIcon className="h-3.5 w-3.5" /> Careers Page
            </button>
          )}
          <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Post Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Open Positions", value: openCount.toString(), icon: Briefcase, color: "text-primary" },
          { label: "Total Applicants", value: totalApplicants.toString(), icon: Users, color: "text-primary" },
          { label: "Shortlisted", value: totalShortlisted.toString(), icon: CheckCircle2, color: "text-success" },
          { label: "Total Jobs", value: jobs.length.toString(), icon: Clock, color: "text-warning" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Job Listings */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No job postings yet. Click "Post Job" to create one.</p></div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/20 hover:shadow-md">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.department} · {job.employment_type} {job.experience_level ? `· ${job.experience_level}` : ""}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor[job.status] || statusColor.Open}`}>{job.status}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</div>
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(job.posted_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  {job.salary_range && <span>💰 {job.salary_range}</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-foreground font-medium">{job.applicants}</span><span className="text-muted-foreground">applicants</span></div>
                    <div className="flex items-center gap-1 text-xs"><CheckCircle2 className="h-3 w-3 text-success" /><span className="text-foreground font-medium">{job.shortlisted}</span><span className="text-muted-foreground">shortlisted</span></div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => copyShareLink(getShareUrl(job.id), "Job link")} className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                    <Share2 className="h-3 w-3" /> Share
                  </button>
                  <a href={getShareUrl(job.id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                    <ExternalLink className="h-3 w-3" /> Preview
                  </a>
                  <button onClick={() => toggleExpand(job.id)} className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                    <Eye className="h-3 w-3" /> Applications
                    {expandedJob === job.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {job.status === "Open" && <button onClick={() => updateStatus(job.id, "Closed")} className="py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">Close</button>}
                  {job.status === "Closed" && <button onClick={() => updateStatus(job.id, "Open")} className="py-1.5 px-3 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">Reopen</button>}
                  {job.status === "On Hold" && <button onClick={() => updateStatus(job.id, "Open")} className="py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">Resume</button>}
                  <button onClick={() => deleteJob(job.id)} className="py-1.5 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Applications Panel */}
              {expandedJob === job.id && (
                <div className="border-t border-border bg-background/50 p-4">
                  <h4 className="text-xs font-semibold text-foreground mb-3">Applications ({applications[job.id]?.length || 0})</h4>
                  {!applications[job.id] ? (
                    <div className="flex justify-center py-4"><div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  ) : applications[job.id].length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No applications yet. Share the job link to receive applications.</p>
                  ) : (
                    <div className="space-y-2">
                      {applications[job.id].map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{app.applicant_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{app.applicant_email}</span>
                              {app.applicant_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.applicant_phone}</span>}
                            </div>
                            {app.cover_letter && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{app.cover_letter}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</p>
                              {app.resume_url && (
                                <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                  <FileText className="h-3 w-3" /> Resume
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${appStatusColor[app.status] || appStatusColor.New}`}>{app.status}</span>
                            {renderAppActions(app, job)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post Job Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Post New Job</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the details to create a new job posting</p>
              </div>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmitJob} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Job Title <span className="text-destructive">*</span></label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Senior Software Engineer"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Department <span className="text-destructive">*</span></label>
                  <DepartmentSelect value={form.department} onChange={(v) => setForm({ ...form, department: v })} departments={departments} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Location <span className="text-destructive">*</span></label>
                  <input list="loc-list" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required placeholder="Select or type..."
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <datalist id="loc-list">{DEFAULT_LOCATIONS.map(l => <option key={l} value={l} />)}</datalist>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Employment Type <span className="text-destructive">*</span></label>
                  <input list="type-list" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} required placeholder="Select or type..."
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <datalist id="type-list">{DEFAULT_EMPLOYMENT_TYPES.map(t => <option key={t} value={t} />)}</datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Experience Level</label>
                  <input list="exp-list" value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })} placeholder="Select or type..."
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <datalist id="exp-list">{DEFAULT_EXPERIENCE_LEVELS.map(e => <option key={e} value={e} />)}</datalist>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Salary Range</label>
                <input value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="e.g. ৳50,000 - ৳80,000 / month"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Job Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe the role..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Requirements</label>
                <textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={3} placeholder="List qualifications..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Benefits & Perks</label>
                <textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={3} placeholder="Health insurance, flexible hours..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDialogOpen(false)} className="flex-1 h-10 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Post Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Letter Dialog */}
      {offerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => { setOfferDialog(null); setCredentials(null); }} />
          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Offer Letter & Hire</h2>
                  <p className="text-xs text-muted-foreground">Generate offer letter for {offerDialog.app.applicant_name}</p>
                </div>
              </div>
              <button onClick={() => { setOfferDialog(null); setCredentials(null); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 transition-colors">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Offer Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Job Title</label>
                  <input value={offerForm.job_title} onChange={(e) => setOfferForm({ ...offerForm, job_title: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Department</label>
                  <DepartmentSelect value={offerForm.department} onChange={(v) => setOfferForm({ ...offerForm, department: v })} departments={departments} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Salary</label>
                  <input value={offerForm.salary} onChange={(e) => setOfferForm({ ...offerForm, salary: e.target.value })}
                    placeholder="e.g. ৳50,000/month"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Start Date</label>
                  <input type="date" value={offerForm.start_date} onChange={(e) => setOfferForm({ ...offerForm, start_date: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Probation Period</label>
                  <input value={offerForm.probation_period} onChange={(e) => setOfferForm({ ...offerForm, probation_period: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Reporting Manager</label>
                  <input value={offerForm.manager_name} onChange={(e) => setOfferForm({ ...offerForm, manager_name: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-foreground mb-1">Benefits</label>
                  <input value={offerForm.benefits} onChange={(e) => setOfferForm({ ...offerForm, benefits: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              {/* Editable Offer Letter Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground">Offer Letter Content (editable)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOfferBody(generateDefaultOfferBody(
                        offerDialog.app.applicant_name, offerForm.job_title, offerForm.department,
                        offerForm.salary, offerForm.start_date, offerForm.probation_period,
                        offerForm.manager_name, offerForm.benefits
                      ));
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset to default
                  </button>
                </div>
                <textarea
                  value={offerBody}
                  onChange={(e) => setOfferBody(e.target.value)}
                  rows={16}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground mt-1">✏️ Edit freely. Your last version will be saved as template for future offers.</p>
              </div>

              {/* Print Preview (hidden, used for print) */}
              <div className="sr-only">
                <div ref={offerPrintRef}>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(offerBody.replace(/\n/g, "<br/>")) }} />
                </div>
              </div>

              {/* Credentials Display */}
              {credentials && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-sm font-bold text-foreground">Employee Hired Successfully!</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Share these login credentials with the new employee:</p>
                  <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Email</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{credentials.email}</p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success("Email copied"); }}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Temporary Password</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{credentials.temporary_password}</p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(credentials.temporary_password); toast.success("Password copied"); }}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setOfferDialog(null); setCredentials(null); }}
                    className="w-full h-9 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors mt-2"
                  >
                    Done — Close
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={printOfferLetter}
                  className="flex-1 h-10 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                  <Printer className="h-4 w-4" /> Print Offer Letter
                </button>
                {!credentials && (
                  <button onClick={handleHire} disabled={hiring}
                    className="flex-1 h-10 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {hiring ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    {hiring ? "Hiring..." : "Confirm Hire & Create Employee"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
