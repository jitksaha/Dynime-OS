import { useState, useEffect } from "react";
import { Plus, Copy, Eye, MoreHorizontal, Mail, FileText } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

interface Template {
  id: string;
  name: string;
  category: string;
  preview_text: string | null;
  used_in_campaigns: number;
  created_at: string;
}

const categoryColor: Record<string, string> = {
  Onboarding: "bg-success/10 text-success",
  Newsletter: "bg-primary/10 text-primary",
  Promotional: "bg-warning/10 text-warning",
  Automation: "bg-info/10 text-info",
  Transactional: "bg-secondary text-muted-foreground",
  Events: "bg-accent/10 text-accent",
};

export default function EmailTemplates() {
  const { tenantId, buildInsert, supabase } = useTenant();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTemplates = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase.from("email_templates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setTemplates(data as Template[]);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [tenantId]);

  const fields = [
    { name: "name", label: "Template Name", placeholder: "e.g. Welcome Email", required: true },
    { name: "category", label: "Category", type: "select" as const, options: ["Onboarding", "Newsletter", "Promotional", "Automation", "Transactional", "Events"], required: true },
    { name: "subject", label: "Subject Line", placeholder: "e.g. Welcome to {{company_name}}!" },
    { name: "content", label: "Preview Text", type: "textarea" as const, placeholder: "Email preview content..." },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Design and manage reusable email templates</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No templates yet. Create your first email template.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="module-card">
              <div className="h-28 rounded-lg bg-secondary/50 border border-border mb-4 flex items-center justify-center p-4">
                <div className="text-center">
                  <Mail className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.preview_text || `${tpl.name} template content...`}</p>
                </div>
              </div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{tpl.name}</h3>
                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColor[tpl.category] || "bg-secondary text-muted-foreground"}`}>{tpl.category}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>Used in {tpl.used_in_campaigns} campaigns</span>
                <span>{new Date(tpl.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Email Template"
        fields={fields}
        onSubmit={async (data) => {
          if (!tenantId) return;
          const { error } = await supabase.from("email_templates").insert(buildInsert({
            name: data.name,
            category: data.category,
            subject_line: data.subject || null,
            preview_text: data.content || null,
          }));
          if (error) { toast.error(error.message); return; }
          toast.success("Template created");
          setDialogOpen(false);
          fetchTemplates();
        }}
      />
    </div>
  );
}
