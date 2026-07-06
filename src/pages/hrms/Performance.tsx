import { useState, useEffect } from "react";
import { Plus, Star, TrendingUp, Target, Award } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useEmployeeOptions } from "@/hooks/useEmployeeOptions";
import { useDepartments } from "@/hooks/useDepartments";

interface PerformanceReview {
  id: string;
  employee_name: string;
  employee_department: string | null;
  review_period: string;
  rating: number;
  total_goals: number;
  completed_goals: number;
  status: string;
  feedback: string | null;
}

const statusColor: Record<string, string> = {
  Completed: "bg-success/10 text-success",
  "In Progress": "bg-info/10 text-info",
  Pending: "bg-warning/10 text-warning",
};

export default function Performance() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const { autocompleteOptions } = useEmployeeOptions();
  const { departments } = useDepartments(tenantId);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchReviews = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("performance_reviews")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (!error && data) setReviews(data as PerformanceReview[]);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [tenantId]);

  const updateReview = async (id: string, updates: Partial<PerformanceReview>) => {
    const { error } = await supabase.from("performance_reviews").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Review updated");
    fetchReviews();
  };

  const fields = [
    {
      name: "employee_name", label: "Employee", type: "autocomplete" as const, placeholder: "Search employees...", required: true,
      autocompleteOptions,
      onAutocompleteSelect: (opt: { value: string; label: string; sublabel?: string }, setFormData: (updater: (prev: Record<string, string>) => Record<string, string>) => void) => {
        if (opt.sublabel) setFormData((prev) => ({ ...prev, department: opt.sublabel! }));
      },
    },
    { name: "department", label: "Department", type: "select" as const, options: departments.slice(0, 50), required: true },
    { name: "period", label: "Review Period", type: "select" as const, options: ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"], required: true },
    { name: "goals", label: "Number of Goals", type: "number" as const, placeholder: "e.g. 5", required: true },
  ];

  const getAvatar = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(rating) ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
    ));
  };

  const completedCount = reviews.filter(r => r.status === "Completed").length;
  const inProgressCount = reviews.filter(r => r.status === "In Progress").length;
  const avgRating = reviews.filter(r => Number(r.rating) > 0).length > 0
    ? (reviews.filter(r => Number(r.rating) > 0).reduce((a, b) => a + Number(b.rating), 0) / reviews.filter(r => Number(r.rating) > 0).length).toFixed(1)
    : "0";
  const totalGoals = reviews.reduce((a, b) => a + b.total_goals, 0);
  const completedGoals = reviews.reduce((a, b) => a + b.completed_goals, 0);
  const goalPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">KPIs, evaluations, and appraisal workflows</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New Review
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Avg Rating", value: avgRating, icon: Star, color: "text-warning" },
          { label: "Reviews Done", value: completedCount.toString(), icon: Award, color: "text-success" },
          { label: "In Progress", value: inProgressCount.toString(), icon: TrendingUp, color: "text-info" },
          { label: "Goal Completion", value: `${goalPct}%`, icon: Target, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No performance reviews yet. Click "New Review" to create one.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="module-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">{getAvatar(rev.employee_name)}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{rev.employee_name}</h3>
                    <p className="text-xs text-muted-foreground">{rev.employee_department || "—"} · {rev.review_period}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor[rev.status] || statusColor.Pending}`}>{rev.status}</span>
              </div>
              {Number(rev.rating) > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-0.5">{renderStars(Number(rev.rating))}</div>
                  <span className="text-sm font-semibold text-foreground">{Number(rev.rating).toFixed(1)}</span>
                </div>
              )}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Goals Progress</span>
                  <span className="text-xs font-medium text-foreground">{rev.completed_goals}/{rev.total_goals}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${rev.total_goals > 0 ? (rev.completed_goals / rev.total_goals) * 100 : 0}%` }} />
                </div>
              </div>
              {rev.status !== "Completed" && (
                <div className="flex gap-2 mt-2">
                  {rev.completed_goals < rev.total_goals && (
                    <button onClick={() => updateReview(rev.id, { completed_goals: rev.completed_goals + 1, status: rev.completed_goals + 1 >= rev.total_goals ? "Completed" : "In Progress" })} className="flex-1 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                      +1 Goal
                    </button>
                  )}
                  {rev.status === "Pending" && (
                    <button onClick={() => updateReview(rev.id, { status: "In Progress" })} className="flex-1 py-1.5 rounded-md bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors">
                      Start Review
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Performance Review"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("performance_reviews").insert(buildInsert({
            employee_name: data.employee_name,
            employee_department: data.department,
            review_period: data.period,
            total_goals: parseInt(data.goals) || 3,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Performance review created");
          setDialogOpen(false);
          fetchReviews();
        }}
      />
    </div>
  );
}
