// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, FileText, FolderOpen, Image, File, Download, Search, Grid, List, Trash2, Upload, CloudUpload, Eye, Share2, History, ChevronRight, FolderPlus, ArrowLeft, X, Users, Lock, Globe } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/db";

interface Doc {
  id: string;
  name: string;
  doc_type: string;
  description: string | null;
  file_size: string;
  modified_by: string | null;
  shared_count: number;
  created_at: string;
  updated_at: string;
}

interface Folder {
  name: string;
  count: number;
}

const typeIcon: Record<string, React.ElementType> = {
  PDF: FileText, Doc: FileText, Spreadsheet: FileText, Image: Image, Folder: FolderOpen,
};

const typeColor: Record<string, string> = {
  PDF: "bg-destructive/10 text-destructive",
  Doc: "bg-primary/10 text-primary",
  Spreadsheet: "bg-success/10 text-success",
  Image: "bg-warning/10 text-warning",
  Folder: "bg-info/10 text-info",
};

function getDocType(mimeType: string, ext: string): string {
  if (mimeType.includes("pdf") || ext === "pdf") return "PDF";
  if (mimeType.includes("image") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "Image";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || ["xlsx", "xls", "csv"].includes(ext)) return "Spreadsheet";
  return "Doc";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const { tenantId, buildInsert, supabase: tenantSupabase } = useTenant();
  const { profile, user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearchVal] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [historyDoc, setHistoryDoc] = useState<Doc | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const fetchDocs = async () => {
    if (!tenantId) return;
    const { data, error } = await tenantSupabase.from("documents").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (!error && data) setDocs(data as Doc[]);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [tenantId]);

  // Folder logic
  const folders: Folder[] = useMemo(() => {
    const types = ["PDF", "Doc", "Spreadsheet", "Image"];
    return types.map(t => ({ name: t, count: docs.filter(d => d.doc_type === t).length })).filter(f => f.count > 0);
  }, [docs]);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0 || !tenantId || !user) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const docType = getDocType(file.type, ext);
      const filePath = `${tenantId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) { toast.error(`Failed to upload ${file.name}: ${uploadError.message}`); continue; }
      const { error: dbError } = await tenantSupabase.from("documents").insert(buildInsert({
        name: file.name, doc_type: docType, file_size: formatFileSize(file.size), modified_by: profile?.full_name || "Unknown", description: null,
      }));
      if (dbError) toast.error(`Failed to save ${file.name}: ${dbError.message}`);
      else toast.success(`${file.name} uploaded`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchDocs();
  }, [tenantId, user, buildInsert, profile, tenantSupabase]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) uploadFiles(e.target.files); };

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.items?.length) setDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current === 0) setDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); dragCounterRef.current = 0; if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); }, [uploadFiles]);

  const deleteDoc = async (doc: Doc) => {
    const { data: storageFiles } = await supabase.storage.from("documents").list(tenantId || "", { search: doc.name });
    if (storageFiles?.length) await supabase.storage.from("documents").remove(storageFiles.map(f => `${tenantId}/${f.name}`));
    const { error } = await tenantSupabase.from("documents").delete().eq("id", doc.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Document deleted");
    fetchDocs();
  };

  const downloadDoc = async (doc: Doc) => {
    const { data: storageFiles } = await supabase.storage.from("documents").list(tenantId || "", { search: doc.name });
    if (!storageFiles?.length) { toast.error("File not found"); return; }
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(`${tenantId}/${storageFiles[0].name}`, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not generate download link");
  };

  const filtered = useMemo(() => docs.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "All" && d.doc_type !== typeFilter) return false;
    if (currentFolder && d.doc_type !== currentFolder) return false;
    return true;
  }), [docs, search, typeFilter, currentFolder]);

  const fields = [
    { name: "name", label: "Document Name", placeholder: "e.g. Q1 Report", required: true },
    { name: "type", label: "Type", type: "select" as const, options: ["PDF", "Doc", "Spreadsheet", "Image"], required: true },
    { name: "description", label: "Description", type: "textarea" as const, placeholder: "Brief description..." },
  ];

  // Mock version history
  const mockVersions = [
    { version: "v3 (Current)", date: new Date().toLocaleDateString(), by: profile?.full_name || "You" },
    { version: "v2", date: new Date(Date.now() - 86400000 * 3).toLocaleDateString(), by: "System" },
    { version: "v1 (Original)", date: new Date(Date.now() - 86400000 * 10).toLocaleDateString(), by: profile?.full_name || "You" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in relative" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-12 rounded-2xl border-2 border-dashed border-primary bg-primary/5 animate-fade-in">
            <div className="p-4 rounded-full bg-primary/10"><CloudUpload className="h-12 w-12 text-primary" /></div>
            <p className="text-lg font-semibold text-foreground">Drop files here</p>
            <p className="text-sm text-muted-foreground">Release to upload</p>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{previewDoc.name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1 rounded-md hover:bg-primary/10"><X className="h-4 w-4" /></button>
            </div>
            <div className={`h-48 rounded-lg flex items-center justify-center mb-4 ${typeColor[previewDoc.doc_type] || "bg-muted"}`}>
              {(() => { const Icon = typeIcon[previewDoc.doc_type] || File; return <Icon className="h-16 w-16 opacity-40" />; })()}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground">{previewDoc.doc_type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="text-foreground">{previewDoc.file_size}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Modified by</span><span className="text-foreground">{previewDoc.modified_by || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last updated</span><span className="text-foreground">{new Date(previewDoc.updated_at).toLocaleDateString()}</span></div>
              {previewDoc.description && <p className="text-xs text-muted-foreground pt-2 border-t border-border">{previewDoc.description}</p>}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { downloadDoc(previewDoc); setPreviewDoc(null); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"><Download className="h-4 w-4" /> Download</button>
              <button onClick={() => { setShareDoc(previewDoc); setPreviewDoc(null); }} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-border text-sm text-foreground hover:bg-primary/10"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShareDoc(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Share "{shareDoc.name}"</h3>
              <button onClick={() => setShareDoc(null)} className="p-1 rounded-md hover:bg-primary/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {[
                { icon: Globe, label: "Anyone with link", desc: "Public access", active: false },
                { icon: Users, label: "Team members", desc: "Your company only", active: true },
                { icon: Lock, label: "Only me", desc: "Private", active: false },
              ].map(opt => (
                <button key={opt.label} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${opt.active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <opt.icon className={`h-4 w-4 ${opt.active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {opt.active && <CheckIcon className="h-4 w-4 text-primary ml-auto" />}
                </button>
              ))}
            </div>
            <button onClick={() => { toast.success("Sharing updated"); setShareDoc(null); }} className="w-full mt-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save Changes</button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setHistoryDoc(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Version History</h3>
              <button onClick={() => setHistoryDoc(null)} className="p-1 rounded-md hover:bg-primary/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              {mockVersions.map((v, i) => (
                <div key={v.version} className={`flex items-center justify-between p-3 rounded-lg border ${i === 0 ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.version}</p>
                    <p className="text-xs text-muted-foreground">{v.date} · {v.by}</p>
                  </div>
                  {i > 0 && <button className="text-xs text-primary hover:underline" onClick={() => { toast.success("Version restored"); setHistoryDoc(null); }}>Restore</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">Organized file storage with versioning & sharing</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Files"}
          </button>
          <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-sm font-medium text-foreground hover:bg-primary/10">
            <Plus className="h-4 w-4" /> Manual
          </button>
        </div>
      </div>

      {/* Folder Navigation */}
      {!currentFolder ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {folders.map(f => {
            const Icon = typeIcon[f.name] || FolderOpen;
            return (
              <button key={f.name} onClick={() => setCurrentFolder(f.name)} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
                <div className={`p-2.5 rounded-xl ${typeColor[f.name]}`}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary">{f.name}s</p>
                  <p className="text-xs text-muted-foreground">{f.count} files</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentFolder(null)} className="flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All Documents</button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{currentFolder}s</span>
          <span className="text-xs text-muted-foreground">({filtered.length} files)</span>
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearchVal(e.target.value)} placeholder="Search documents..." className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        {!currentFolder && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground">
            <option value="All">All Types</option>
            <option value="PDF">PDF</option>
            <option value="Doc">Documents</option>
            <option value="Spreadsheet">Spreadsheets</option>
            <option value="Image">Images</option>
          </select>
        )}
        <div className="flex gap-1 p-0.5 rounded-lg bg-primary/10">
          <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-primary"}`}><Grid className="h-4 w-4" /></button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-primary"}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><p className="text-sm">{search ? "No documents match." : "No documents yet."}</p></div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => {
            const Icon = typeIcon[doc.doc_type] || File;
            return (
              <div key={doc.id} className="module-card group">
                <button onClick={() => setPreviewDoc(doc)} className={`w-full h-24 rounded-lg flex items-center justify-center mb-3 cursor-pointer hover:opacity-80 transition-opacity ${typeColor[doc.doc_type] || "bg-primary/5 text-muted-foreground"}`}>
                  <Icon className="h-10 w-10 opacity-60" />
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="h-6 w-6 text-foreground" /></div>
                </button>
                <h3 className="text-sm font-semibold text-foreground truncate">{doc.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{doc.file_size} · {new Date(doc.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{doc.modified_by || "—"}</span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setPreviewDoc(doc)} className="p-1 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Preview"><Eye className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setHistoryDoc(doc)} className="p-1 rounded text-muted-foreground hover:bg-info/10 hover:text-info" title="Versions"><History className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setShareDoc(doc)} className="p-1 rounded text-muted-foreground hover:bg-warning/10 hover:text-warning" title="Share"><Share2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => downloadDoc(doc)} className="p-1 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Download"><Download className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteDoc(doc)} className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-primary/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Size</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Modified</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(doc => {
                const Icon = typeIcon[doc.doc_type] || File;
                return (
                  <tr key={doc.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><div className={`p-1.5 rounded-lg ${typeColor[doc.doc_type] || "bg-primary/5"}`}><Icon className="h-4 w-4" /></div><span className="text-sm font-medium text-foreground">{doc.name}</span></div></td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{doc.doc_type}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{doc.file_size}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(doc.updated_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Preview"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => setHistoryDoc(doc)} className="p-1.5 rounded-md text-muted-foreground hover:bg-info/10 hover:text-info" title="Versions"><History className="h-4 w-4" /></button>
                        <button onClick={() => setShareDoc(doc)} className="p-1.5 rounded-md text-muted-foreground hover:bg-warning/10 hover:text-warning" title="Share"><Share2 className="h-4 w-4" /></button>
                        <button onClick={() => downloadDoc(doc)} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Download"><Download className="h-4 w-4" /></button>
                        <button onClick={() => deleteDoc(doc)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add Document Entry" fields={fields} onSubmit={async (data) => {
        if (!tenantId) return;
        const { error } = await tenantSupabase.from("documents").insert(buildInsert({ name: data.name, doc_type: data.type, description: data.description || null, modified_by: profile?.full_name || "Unknown" }));
        if (error) { toast.error(error.message); return; }
        toast.success("Document added"); setDialogOpen(false); fetchDocs();
      }} />
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>;
}
