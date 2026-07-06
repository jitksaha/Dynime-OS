import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { Briefcase, MapPin, Clock, Building2, Send, CheckCircle2, AlertCircle, Upload, FileText, X, ArrowLeft, Star, Users } from "lucide-react";
import { toast } from "sonner";

interface PublicJob {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string | null;
  status: string;
  posted_date: string;
  company_name: string;
  company_slug: string;
  company_logo: string | null;
  salary_range?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  experience_level?: string | null;
}

export default function PublicJobApplication() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      const { data, error } = await supabase.rpc("get_public_job", { job_id: jobId });
      if (error || !data) {
        setError("This job posting is no longer available.");
      } else {
        setJob(data as unknown as PublicJob);
      }
      setLoading(false);
    };
    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !name.trim() || !email.trim()) return;
    setSubmitting(true);

    let resumeUrl: string | null = null;

    // Upload resume if provided
    if (resumeFile) {
      const ext = resumeFile.name.split(".").pop()?.toLowerCase() || "pdf";
      const filePath = `${jobId}/${Date.now()}_${name.replace(/\s+/g, "_")}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, resumeFile);
      if (uploadError) {
        toast.error(`Failed to upload resume: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(filePath);
      resumeUrl = urlData?.publicUrl || filePath;
    }

    const { error } = await supabase.rpc("submit_job_application", {
      _job_id: jobId,
      _name: name.trim(),
      _email: email.trim(),
      _phone: phone.trim() || null,
      _cover_letter: coverLetter.trim() || null,
      _resume_url: resumeUrl,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSubmitted(true);
      // Notify company admins (fire-and-forget)
      try {
        await supabase.functions.invoke("notify-job-application", {
          body: { job_id: jobId, applicant_name: name.trim(), applicant_email: email.trim() },
        });
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="p-4 rounded-2xl bg-destructive/10 inline-flex mx-auto">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Job Not Available</h1>
          <p className="text-muted-foreground">{error || "This job posting could not be found or is no longer accepting applications."}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="p-5 rounded-full bg-success/10 inline-flex mx-auto">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h1>
            <p className="text-muted-foreground">
              Thank you for applying to <strong className="text-foreground">{job.title}</strong> at <strong className="text-foreground">{job.company_name}</strong>.
            </p>
            <p className="text-sm text-muted-foreground mt-2">We'll review your application and get back to you soon.</p>
          </div>
          <Link
            to={`/careers/${job.company_slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" /> View More Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
          <Link to={`/careers/${job.company_slug}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> All {job.company_name} Jobs
          </Link>
          <div className="flex items-start gap-4 mb-4">
            {job.company_logo ? (
              <img src={job.company_logo} alt={job.company_name} className="h-14 w-14 rounded-xl object-cover border border-border" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-primary">{job.company_name}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{job.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-foreground">
              <Briefcase className="h-3.5 w-3.5 text-primary" /> {job.employment_type}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {job.location}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" /> {job.department}
            </span>
            {job.experience_level && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-foreground">
                <Star className="h-3.5 w-3.5 text-primary" /> {job.experience_level}
              </span>
            )}
          </div>
          {job.salary_range && (
            <p className="text-sm text-muted-foreground mt-3">💰 Salary: <span className="text-foreground font-medium">{job.salary_range}</span></p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Job Details */}
          <div className="space-y-6">
            {job.description && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-3">Job Description</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</div>
              </div>
            )}
            {job.requirements && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-3">Requirements</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.requirements}</div>
              </div>
            )}
            {job.benefits && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-3">Benefits & Perks</h2>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.benefits}</div>
              </div>
            )}
          </div>

          {/* Right: Application Form */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Apply Now</h2>
              <p className="text-xs text-muted-foreground mb-5">Fill out the form below to submit your application</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full Name <span className="text-destructive">*</span></label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Your full name"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email <span className="text-destructive">*</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                    placeholder="your@email.com"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1XXX-XXXXXX"
                    maxLength={20}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Resume Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Resume / CV</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error("File size must be under 10MB");
                          return;
                        }
                        setResumeFile(file);
                      }
                    }}
                  />
                  {resumeFile ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{resumeFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      <Upload className="h-4 w-4" /> Upload PDF, DOC, or DOCX
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Cover Letter</label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Tell us why you're a great fit for this role..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !email.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <><div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Submitting...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Submit Application</>
                  )}
                </button>
                <p className="text-[11px] text-muted-foreground text-center">By applying, you agree to have your information reviewed by {job.company_name}.</p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
