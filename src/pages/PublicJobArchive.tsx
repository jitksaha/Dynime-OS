import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { Briefcase, MapPin, Clock, Building2, AlertCircle, Search, ArrowRight, Users } from "lucide-react";

interface PublicJob {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string | null;
  posted_date: string;
  applicants: number;
  company_name: string;
  company_slug: string;
  company_logo: string | null;
}

export default function PublicJobArchive() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!companySlug) return;
    const fetchJobs = async () => {
      const { data, error } = await supabase.rpc("get_public_jobs_by_slug", { company_slug: companySlug });
      if (error || !data) {
        setError(true);
      } else {
        setJobs(data as unknown as PublicJob[]);
      }
      setLoading(false);
    };
    fetchJobs();
  }, [companySlug]);

  const companyName = jobs[0]?.company_name || companySlug;
  const companyLogo = jobs[0]?.company_logo;

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.department.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase())
  );

  const departments = [...new Set(jobs.map(j => j.department))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="p-4 rounded-2xl bg-destructive/10 inline-flex mx-auto">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Company Not Found</h1>
          <p className="text-muted-foreground">This company careers page could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="flex justify-center mb-4">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-16 w-16 rounded-2xl object-cover border border-border" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Careers at {companyName}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {jobs.length > 0
              ? `We have ${jobs.length} open position${jobs.length === 1 ? "" : "s"}. Find the right role for you.`
              : "No open positions at the moment. Check back soon!"}
          </p>

          {jobs.length > 0 && (
            <div className="mt-6 max-w-md mx-auto relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, department, or location..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {departments.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {departments.map(d => (
                <button
                  key={d}
                  onClick={() => setSearch(d)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{search ? "No jobs match your search." : "No open positions right now."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => (
              <Link
                key={job.id}
                to={`/hrm/recruitment/${job.id}`}
                className="group block bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.employment_type}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.department}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.applicants} applicant{job.applicants !== 1 ? "s" : ""}</span>
                    </div>
                    {job.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Apply <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">Powered by Buzz360</p>
      </div>
    </div>
  );
}
