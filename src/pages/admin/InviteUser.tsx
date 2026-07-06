import { useState, useEffect } from "react";
import { UserPlus, Mail, Building2, Shield, Copy, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "support_agent", label: "Support Agent" },
  { value: "company_admin", label: "Company Admin" },
  { value: "super_admin", label: "Super Admin" },
];

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  tenant_name: string;
}

export default function InviteUser() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("employee");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [inviting, setInviting] = useState(false);
  const [result, setResult] = useState<{ email: string; temp_password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [tenantsRes, invRes] = await Promise.all([
        supabase.from("tenants").select("id, name"),
        supabase.from("user_invitations").select("id, email, role, status, created_at, tenant_id"),
      ]);
      if (tenantsRes.data) setTenants(tenantsRes.data);

      const tenantMap: Record<string, string> = {};
      (tenantsRes.data || []).forEach((t: any) => { tenantMap[t.id] = t.name; });

      if (invRes.data) {
        setInvitations(
          invRes.data.map((i: any) => ({
            ...i,
            tenant_name: tenantMap[i.tenant_id] || "Unknown",
          }))
        );
      }
    };
    fetchData();
  }, []);

  const handleInvite = async () => {
    if (!email || !tenantId) {
      toast.error("Email and tenant are required");
      return;
    }
    setInviting(true);
    setResult(null);

    const { data: { session } } = await supabase.auth.getSession();

    const res = await supabase.functions.invoke("invite-user", {
      body: { email, role, tenant_id: tenantId, full_name: fullName },
    });

    setInviting(false);

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || "Failed to invite user");
      return;
    }

    toast.success("User invited successfully!");
    setResult({ email: res.data.email, temp_password: res.data.temp_password });
    setEmail("");
    setFullName("");

    // Refresh invitations
    const invRes = await supabase.from("user_invitations").select("id, email, role, status, created_at, tenant_id");
    const tenantMap: Record<string, string> = {};
    tenants.forEach((t) => { tenantMap[t.id] = t.name; });
    if (invRes.data) {
      setInvitations(invRes.data.map((i: any) => ({ ...i, tenant_name: tenantMap[i.tenant_id] || "Unknown" })));
    }
  };

  const copyCredentials = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Email: ${result.email}\nTemporary Password: ${result.temp_password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Invite Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Create new user accounts and assign them to tenants</p>
      </div>

      {/* Invite form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> New Invitation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tenant *</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleInvite}
          disabled={inviting || !email || !tenantId}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {inviting ? "Creating..." : "Create & Invite"}
        </button>
      </div>

      {/* Result with credentials */}
      {result && (
        <div className="bg-chart-2/10 border border-chart-2/30 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">✅ User Created Successfully</h3>
          <p className="text-xs text-muted-foreground">Share these credentials securely with the user. They should change their password on first login.</p>
          <div className="bg-background rounded-lg p-4 font-mono text-sm space-y-1">
            <p><span className="text-muted-foreground">Email:</span> {result.email}</p>
            <p><span className="text-muted-foreground">Temp Password:</span> {result.temp_password}</p>
          </div>
          <button
            onClick={copyCredentials}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Credentials"}
          </button>
        </div>
      )}

      {/* Recent invitations */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Invitations ({invitations.length})</h3>
        {invitations.length === 0 && (
          <p className="text-center py-8 text-sm text-muted-foreground">No invitations yet</p>
        )}
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{inv.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {inv.tenant_name} · <span className="capitalize">{inv.role.replace(/_/g, " ")}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                inv.status === "completed" ? "bg-chart-2/10 text-chart-2" : "bg-warning/10 text-warning"
              }`}>
                {inv.status}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(inv.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
