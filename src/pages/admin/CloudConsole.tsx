import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";
import {
  Database, Users, HardDrive, Terminal, RefreshCw, Search, Download,
  Table2, Trash2, FileText, FolderOpen, Image,
  ChevronRight, Copy, CheckCircle2,
  Loader2, Lock, Unlock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ─── Database Tab ───────────────────────────────────────────────
function DatabaseTab() {
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_table_info");
    if (data) setTables(data);
    setLoading(false);
  };

  const selectTable = async (name: string) => {
    setSelectedTable(name);
    setPage(0);
    setSearch("");
    setLoading(true);
    const { data: cols } = await supabase.rpc("get_table_columns", { p_table_name: name });
    if (cols) setColumns(cols);
    await loadRows(name, 0);
    setLoading(false);
  };

  const loadRows = async (table: string, p: number) => {
    const from = p * PAGE_SIZE;
    const { data, count } = await supabase
      .from(table as any)
      .select("*", { count: "exact" })
      .range(from, from + PAGE_SIZE - 1)
      .order("created_at", { ascending: false });
    if (data) setRows(data);
    if (count !== null) setRowCount(count);
  };

  const exportCSV = () => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selectedTable}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  const copyCell = (val: any) => {
    navigator.clipboard.writeText(typeof val === "object" ? JSON.stringify(val) : String(val ?? ""));
    toast.success("Copied");
  };

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-220px)] border border-border rounded-2xl overflow-hidden bg-card">
      {/* Sidebar: Table list */}
      <div className="w-64 border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter tables..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-input bg-background"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredTables.map(t => (
            <button
              key={t.name}
              onClick={() => selectTable(t.name)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors",
                selectedTable === t.name && "bg-primary/10 text-primary font-medium"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <Table2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.name}</span>
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{t.row_count}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
          {tables.length} tables
        </div>
      </div>

      {/* Main: Table data */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedTable ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">{selectedTable}</h3>
                <Badge variant="secondary" className="text-[10px]">{rowCount} rows</Badge>
                <Badge variant="outline" className="text-[10px]">{columns.length} cols</Badge>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/50">
                  <Download className="h-3 w-3" /> Export CSV
                </button>
                <button onClick={() => { setLoading(true); loadRows(selectedTable, page).then(() => setLoading(false)); }} className="p-1.5 rounded-lg border border-border hover:bg-muted/50">
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Column schema */}
            <details className="px-4 py-2 border-b border-border">
              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">Schema ({columns.length} columns)</summary>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                {columns.map((c: any) => (
                  <div key={c.column_name} className="text-[10px] px-2 py-1 rounded bg-muted/30 flex items-center gap-1.5">
                    <span className="font-medium text-foreground truncate">{c.column_name}</span>
                    <span className="text-muted-foreground">{c.udt_name}</span>
                    {c.is_nullable === "NO" && <span className="text-destructive">*</span>}
                  </div>
                ))}
              </div>
            </details>

            {/* Data grid */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50 z-10">
                  <tr>
                    {columns.slice(0, 8).map((c: any) => (
                      <th key={c.column_name} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
                        {c.column_name}
                      </th>
                    ))}
                    {columns.length > 8 && <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border">+{columns.length - 8} more</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30 transition-colors">
                      {columns.slice(0, 8).map((c: any) => (
                        <td
                          key={c.column_name}
                          className="px-3 py-2 border-b border-border/50 max-w-[200px] truncate cursor-pointer"
                          onClick={() => copyCell(row[c.column_name])}
                          title={String(row[c.column_name] ?? "")}
                        >
                          {row[c.column_name] === null
                            ? <span className="text-muted-foreground/50 italic">null</span>
                            : typeof row[c.column_name] === "object"
                              ? <span className="text-primary/80">JSON</span>
                              : typeof row[c.column_name] === "boolean"
                                ? <Badge variant={row[c.column_name] ? "default" : "secondary"} className="text-[9px]">{String(row[c.column_name])}</Badge>
                                : String(row[c.column_name]).substring(0, 50)}
                        </td>
                      ))}
                      {columns.length > 8 && <td className="px-3 py-2 border-b border-border/50 text-muted-foreground">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && !loading && (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No data</div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
              <span>Page {page + 1} of {Math.max(1, Math.ceil(rowCount / PAGE_SIZE))}</span>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); loadRows(selectedTable, p); }} className="px-3 py-1 rounded-lg border border-border hover:bg-muted/50 disabled:opacity-30">Prev</button>
                <button disabled={(page + 1) * PAGE_SIZE >= rowCount} onClick={() => { const p = page + 1; setPage(p); loadRows(selectedTable, p); }} className="px-3 py-1 rounded-lg border border-border hover:bg-muted/50 disabled:opacity-30">Next</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Database className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a table to view its data</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*, user_roles(role, tenant_id)");
    if (data) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name or ID..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background"
          />
        </div>
        <button onClick={loadUsers} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-border hover:bg-muted/50">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>
        <Badge variant="secondary">{users.length} users</Badge>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">User ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Roles</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}>
                <td className="px-4 py-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {u.avatar_url ? <img src={u.avatar_url} className="h-7 w-7 rounded-full object-cover" /> : <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(u.full_name || "?")[0]}</div>}
                    <span className="font-medium text-foreground">{u.full_name || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 border-t border-border/50 font-mono text-[10px] text-muted-foreground">{u.user_id?.slice(0, 8)}…</td>
                <td className="px-4 py-3 border-t border-border/50 font-mono text-[10px] text-muted-foreground">{u.tenant_id?.slice(0, 8) || "—"}…</td>
                <td className="px-4 py-3 border-t border-border/50">
                  <div className="flex gap-1 flex-wrap">
                    {u.user_roles?.map((r: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-[9px]">{r.role}</Badge>
                    ))}
                    {(!u.user_roles || u.user_roles.length === 0) && <span className="text-muted-foreground text-[10px]">No roles</span>}
                  </div>
                </td>
                <td className="px-4 py-3 border-t border-border/50">
                  {u.is_owner ? <Badge className="text-[9px] bg-primary/10 text-primary">Owner</Badge> : <span className="text-muted-foreground text-[10px]">—</span>}
                </td>
                <td className="px-4 py-3 border-t border-border/50 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        {!loading && !filteredUsers.length && <div className="text-center py-8 text-sm text-muted-foreground">No users found</div>}
      </div>

      {selectedUser && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">User Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {Object.entries(selectedUser).filter(([k]) => k !== "user_roles").map(([k, v]) => (
              <div key={k} className="bg-muted/30 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{k}</p>
                <p className="font-medium text-foreground mt-0.5 break-all">
                  {v === null ? <span className="italic text-muted-foreground/50">null</span> : typeof v === "boolean" ? String(v) : typeof v === "object" ? JSON.stringify(v) : String(v).substring(0, 80)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Storage Tab ────────────────────────────────────────────────
function StorageTab() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState("");

  useEffect(() => { loadBuckets(); }, []);

  const loadBuckets = async () => {
    setLoading(true);
    const { data } = await supabase.storage.listBuckets();
    if (data) setBuckets(data);
    setLoading(false);
  };

  const openBucket = async (id: string, folder = "") => {
    setSelectedBucket(id);
    setPath(folder);
    setLoading(true);
    const { data } = await supabase.storage.from(id).list(folder || undefined, { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (data) setFiles(data);
    setLoading(false);
  };

  const navigateFolder = (folderName: string) => {
    const newPath = path ? `${path}/${folderName}` : folderName;
    openBucket(selectedBucket!, newPath);
  };

  const goUp = () => {
    if (!path) { setSelectedBucket(null); setFiles([]); return; }
    const parts = path.split("/");
    parts.pop();
    openBucket(selectedBucket!, parts.join("/"));
  };

  const deleteFile = async (name: string) => {
    if (!selectedBucket) return;
    const fullPath = path ? `${path}/${name}` : name;
    const { error } = await supabase.storage.from(selectedBucket).remove([fullPath]);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); openBucket(selectedBucket, path); }
  };

  const getPublicUrl = (name: string) => {
    if (!selectedBucket) return;
    const fullPath = path ? `${path}/${name}` : name;
    const { data } = supabase.storage.from(selectedBucket).getPublicUrl(fullPath);
    navigator.clipboard.writeText(data.publicUrl);
    toast.success("URL copied");
  };

  const isFolder = (item: any) => item.id === null;
  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <div className="space-y-4">
      {!selectedBucket ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buckets.map(b => (
            <button key={b.id} onClick={() => openBucket(b.id)} className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <FolderOpen className="h-8 w-8 text-primary/60 group-hover:text-primary transition-colors" />
                {b.public ? <Badge variant="outline" className="text-[9px] gap-1"><Unlock className="h-2.5 w-2.5" /> Public</Badge> : <Badge variant="secondary" className="text-[9px] gap-1"><Lock className="h-2.5 w-2.5" /> Private</Badge>}
              </div>
              <h3 className="font-bold text-sm text-foreground">{b.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Created {new Date(b.created_at).toLocaleDateString()}</p>
            </button>
          ))}
          {loading && <div className="col-span-full flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button onClick={goUp} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/50">← Back</button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{selectedBucket}</span>
              {path && <><ChevronRight className="h-3 w-3" /><span>{path}</span></>}
            </div>
            <button onClick={() => openBucket(selectedBucket, path)} className="ml-auto p-1.5 rounded-lg border border-border hover:bg-muted/50">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
          <div className="border border-border rounded-2xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Size</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Updated</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.filter(f => f.name !== ".emptyFolderPlaceholder").map(f => (
                  <tr key={f.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 border-t border-border/50">
                      {isFolder(f) ? (
                        <button onClick={() => navigateFolder(f.name)} className="flex items-center gap-2 text-primary hover:underline">
                          <FolderOpen className="h-4 w-4" /> {f.name}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isImage(f.name) ? <Image className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                          <span className="truncate max-w-[200px]">{f.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 border-t border-border/50 text-xs text-muted-foreground">{f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(1)} KB` : "—"}</td>
                    <td className="px-4 py-2.5 border-t border-border/50 text-xs text-muted-foreground">{f.metadata?.mimetype || (isFolder(f) ? "folder" : "—")}</td>
                    <td className="px-4 py-2.5 border-t border-border/50 text-xs text-muted-foreground">{f.updated_at ? new Date(f.updated_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2.5 border-t border-border/50 text-right">
                      {!isFolder(f) && (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => getPublicUrl(f.name)} className="p-1 rounded hover:bg-muted/50" title="Copy URL"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
                          <button onClick={() => deleteFile(f.name)} className="p-1 rounded hover:bg-destructive/10" title="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!files.filter(f => f.name !== ".emptyFolderPlaceholder").length && !loading && (
              <div className="text-center py-8 text-sm text-muted-foreground">Empty</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Edge Functions Tab ─────────────────────────────────────────
function EdgeFunctionsTab() {
  const [functions, setFunctions] = useState<string[]>([]);
  const [selectedFn, setSelectedFn] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLogs, setSearchLogs] = useState("");

  const knownFunctions = [
    "ai-assistant", "ai-business-insights", "ai-deal-scoring", "ai-expense-categorize",
    "ai-invoice-summary", "addon-payment-callback", "addon-payment-initiate", "admin-delete",
    "api-key-generate", "api-v1", "bkash-tokenize", "company-self-delete", "contact-submit",
    "gateway-config", "google-calendar-sync", "hire-employee", "integration-send",
    "integration-test", "invite-user", "invoice-reminders", "kyb-verify", "kyc-ai-verify",
    "live-chat", "notify-job-application", "payment-initiate", "payment-verify", "phone-verify",
    "pos-courier-test", "pos-send-courier", "pos-store-sync", "recurring-charge",
    "send-auth-email", "send-custom-email", "sms-balance-check", "sms-send",
    "sslcommerz-callback", "sslcommerz-initiate", "stripe-checkout", "stripe-create-intent",
    "sumsub-access-token", "usage-reset", "wallet-topup-callback", "wallet-topup-initiate",
    "webauthn-challenge", "webhook-dispatch",
  ];

  useEffect(() => { setFunctions(knownFunctions); }, []);

  const viewLogs = async (fn: string) => {
    setSelectedFn(fn);
    setLogs([]);
    setLoading(true);
    // We'll use the Supabase management API approach - fetch from audit_logs as proxy
    // In production, this would use the management API
    setLogs([
      { timestamp: new Date().toISOString(), level: "info", message: `Logs for ${fn} — use the backend logs viewer for real-time monitoring` },
    ]);
    setLoading(false);
  };

  const testFunction = async (fn: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: {} });
      if (error) {
        toast.error(`${fn}: ${error.message}`);
        setLogs(prev => [{ timestamp: new Date().toISOString(), level: "error", message: error.message }, ...prev]);
      } else {
        toast.success(`${fn} responded successfully`);
        setLogs(prev => [{ timestamp: new Date().toISOString(), level: "info", message: `Response: ${JSON.stringify(data).substring(0, 200)}` }, ...prev]);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const filteredFns = functions.filter(f => f.includes(searchLogs.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-220px)] border border-border rounded-2xl overflow-hidden bg-card">
      {/* Function list */}
      <div className="w-72 border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchLogs} onChange={e => setSearchLogs(e.target.value)}
              placeholder="Filter functions..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-input bg-background"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredFns.map(fn => (
            <button
              key={fn}
              onClick={() => viewLogs(fn)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                selectedFn === fn && "bg-primary/10 text-primary font-medium"
              )}
            >
              <Terminal className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{fn}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
          {functions.length} functions deployed
        </div>
      </div>

      {/* Logs panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFn ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">{selectedFn}</h3>
                <Badge variant="outline" className="text-[9px] gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> Deployed</Badge>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => testFunction(selectedFn)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/50">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Terminal className="h-3 w-3" />} Test Invoke
                </button>
                <button onClick={() => viewLogs(selectedFn)} className="p-1.5 rounded-lg border border-border hover:bg-muted/50">
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground font-mono">
                Endpoint: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/{selectedFn}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto bg-[hsl(var(--background))] font-mono text-xs p-4 space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={cn(
                    "px-1.5 rounded text-[10px] font-medium",
                    log.level === "error" ? "bg-destructive/10 text-destructive" : log.level === "warn" ? "bg-yellow-500/10 text-yellow-600" : "bg-primary/10 text-primary"
                  )}>{log.level}</span>
                  <span className="text-foreground break-all">{log.message}</span>
                </div>
              ))}
              {!logs.length && <div className="text-muted-foreground">No logs yet. Click "Test Invoke" to trigger the function.</div>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Terminal className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a function to view logs & test</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Console ───────────────────────────────────────────────
export default function CloudConsole() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Cloud Console</h1>
          <p className="text-xs text-muted-foreground">Database, Users, Storage & Edge Functions</p>
        </div>
      </div>

      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="database" className="gap-1.5 text-xs"><Database className="h-3.5 w-3.5" /> Database</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="storage" className="gap-1.5 text-xs"><HardDrive className="h-3.5 w-3.5" /> Storage</TabsTrigger>
          <TabsTrigger value="functions" className="gap-1.5 text-xs"><Terminal className="h-3.5 w-3.5" /> Functions</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="mt-4"><DatabaseTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="storage" className="mt-4"><StorageTab /></TabsContent>
        <TabsContent value="functions" className="mt-4"><EdgeFunctionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
