import { useState, useEffect } from "react";
import { User, Mail, Phone, Building2, Briefcase, Calendar, Save, Loader2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function EmployeeProfile() {
  const { tenantId, supabase } = useTenant();
  const { profile, user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!tenantId || !profile?.full_name) return;
    supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("full_name", profile.full_name)
      .maybeSingle()
      .then(({ data }) => {
        setEmployee(data);
        setPhone(data?.phone || "");
        setLoading(false);
      });
  }, [tenantId, profile?.full_name]);

  const handleSave = async () => {
    if (!employee) return;
    setSaving(true);
    const { error } = await supabase
      .from("employees")
      .update({ phone })
      .eq("id", employee.id);
    setSaving(false);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Profile updated!");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const info = [
    { icon: Mail, label: "Email", value: employee?.email || user?.email || "—" },
    { icon: Phone, label: "Phone", value: employee?.phone || "Not set", editable: true },
    { icon: Building2, label: "Department", value: employee?.department || profile?.department || "—" },
    { icon: Briefcase, label: "Job Title", value: employee?.job_title || "—" },
    { icon: Calendar, label: "Hire Date", value: employee?.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "—" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{profile?.full_name || "Employee"}</h1>
            <p className="text-sm text-muted-foreground">{employee?.job_title || "Team Member"} · {employee?.department || profile?.department || "General"}</p>
            <span className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
              employee?.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
              {employee?.status || "Active"}
            </span>
          </div>
        </div>
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Info Cards */}
      <div className="grid gap-3">
        {info.map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {item.editable ? (
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full mt-0.5 text-sm font-medium text-foreground bg-transparent border-b border-border focus:border-primary focus:outline-none transition-colors"
                />
              ) : (
                <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !employee}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Changes
      </button>
    </div>
  );
}
