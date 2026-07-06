// @ts-nocheck
import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  requests_count: number;
  rate_limit_per_minute: number;
}

const SCOPE_OPTIONS = [
  { value: "read", label: "Read All" },
  { value: "write", label: "Write All" },
  { value: "read:deals", label: "Read Deals" },
  { value: "write:deals", label: "Write Deals" },
  { value: "read:employees", label: "Read Employees" },
  { value: "write:employees", label: "Write Employees" },
  { value: "read:invoices", label: "Read Invoices" },
  { value: "write:invoices", label: "Write Invoices" },
  { value: "read:expenses", label: "Read Expenses" },
  { value: "write:expenses", label: "Write Expenses" },
  { value: "read:documents", label: "Read Documents" },
  { value: "write:documents", label: "Write Documents" },
];

export default function CompanyApiKeys() {
  // Auth is handled by ProtectedRoute wrapper
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read"]);
  const [expiryDays, setExpiryDays] = useState<string>("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load API keys");
    } else {
      setKeys((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) { toast.error("Please enter a key name"); return; }
    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("api-key-generate", {
        body: {
          name: newKeyName.trim(),
          scopes: selectedScopes,
          expires_in_days: expiryDays ? parseInt(expiryDays) : null,
        },
      });

      if (error) throw error;

      setRevealedKey(data.raw_key);
      toast.success("API key created! Copy it now — it won't be shown again.");
      setShowCreate(false);
      setNewKeyName("");
      setSelectedScopes(["read"]);
      setExpiryDays("");
      fetchKeys();
    } catch (e: any) {
      toast.error(e.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const toggleKey = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: !active })
      .eq("id", id);

    if (error) toast.error("Failed to update key");
    else {
      toast.success(active ? "Key revoked" : "Key activated");
      fetchKeys();
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Permanently delete this API key?")) return;
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) toast.error("Failed to delete key");
    else { toast.success("Key deleted"); fetchKeys(); }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" /> API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for programmatic access.{" "}
            <Link to="/api/docs" className="text-primary hover:underline">View API Docs →</Link>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Generate Key
        </button>
      </div>

      {/* Revealed Key Banner */}
      {revealedKey && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">🔑 Your new API key (copy now!)</span>
            <button onClick={() => setRevealedKey(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground break-all">
              {revealedKey}
            </code>
            <button
              onClick={() => copyToClipboard(revealedKey, "new")}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              {copiedId === "new" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">⚠️ This key will not be shown again. Store it securely.</p>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Create New API Key</h2>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Key Name</label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production Integration"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() =>
                    setSelectedScopes(prev =>
                      prev.includes(s.value) ? prev.filter(x => x !== s.value) : [...prev, s.value]
                    )
                  }
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md border transition-colors",
                    selectedScopes.includes(s.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Expiry (days, leave empty for no expiry)</label>
            <input
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              placeholder="e.g. 90"
              className="w-40 h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={createKey}
              disabled={creating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Generating..." : "Generate Key"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Key className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No API keys yet. Generate one to get started.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Key</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Scopes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Requests</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Last Used</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-muted-foreground">{k.key_prefix}...</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.slice(0, 3).map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-mono">{s}</span>
                        ))}
                        {k.scopes.length > 3 && <span className="text-[10px] text-muted-foreground">+{k.scopes.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {k.requests_count.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        k.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                      )}>
                        {k.is_active ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleKey(k.id, k.is_active)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                          title={k.is_active ? "Revoke" : "Activate"}
                        >
                          {k.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteKey(k.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
