import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload, Search, Trash2, Copy, Image, FileText, Film, Music,
  FolderOpen, RefreshCw, Eye, Download, X, Filter, Grid3X3, List,
  HardDrive, ChevronRight, ExternalLink, Loader2, File,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  metadata: { size?: number; mimetype?: string } | null;
  bucket_id: string;
}

const BUCKETS = [
  { id: "product-images", label: "Product Images", icon: Image, public: true },
  { id: "employee-photos", label: "Employee Photos", icon: Image, public: true },
  { id: "documents", label: "Documents", icon: FileText, public: false },
  { id: "kyc-documents", label: "KYC Documents", icon: FileText, public: false },
  { id: "resumes", label: "Resumes", icon: FileText, public: false },
  { id: "mobile-app-assets", label: "Mobile App Assets", icon: Image, public: true },
];

const FILE_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Film,
  audio: Music,
  application: FileText,
  text: FileText,
};

function getFileIcon(mimetype?: string) {
  if (!mimetype) return File;
  const type = mimetype.split("/")[0];
  return FILE_TYPE_ICONS[type] || File;
}

function formatSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function isPreviewable(mimetype?: string) {
  if (!mimetype) return false;
  return mimetype.startsWith("image/");
}

export default function MediaLibrary() {
  const [activeBucket, setActiveBucket] = useState(BUCKETS[0].id);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bucketConfig = BUCKETS.find(b => b.id === activeBucket);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from(activeBucket).list("", {
      limit: 500,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.error("List files error:", error);
      setFiles([]);
    } else {
      // Recursively list all files including subfolders
      const allFiles: StorageFile[] = [];
      const folders: string[] = [];

      for (const item of data || []) {
        if (!item.id) {
          // It's a folder
          folders.push(item.name);
        } else {
          allFiles.push({ ...item, bucket_id: activeBucket } as StorageFile);
        }
      }

      // List files from subfolders (one level deep)
      for (const folder of folders) {
        const { data: subData } = await supabase.storage.from(activeBucket).list(folder, {
          limit: 200,
          sortBy: { column: "created_at", order: "desc" },
        });
        if (subData) {
          for (const item of subData) {
            if (item.id) {
              allFiles.push({
                ...item,
                name: `${folder}/${item.name}`,
                bucket_id: activeBucket,
              } as StorageFile);
            }
          }
        }
      }

      setFiles(allFiles);
    }
    setLoading(false);
  }, [activeBucket]);

  // Fetch stats for all buckets
  useEffect(() => {
    const fetchStats = async () => {
      const s: Record<string, number> = {};
      for (const bucket of BUCKETS) {
        const { data } = await supabase.storage.from(bucket.id).list("", { limit: 1000 });
        s[bucket.id] = data?.filter(f => f.id)?.length || 0;
      }
      setStats(s);
    };
    fetchStats();
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Live polling – refresh every 8 seconds
  useEffect(() => {
    pollRef.current = setInterval(fetchFiles, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchFiles]);

  const getPublicUrl = (fileName: string) => {
    const { data } = supabase.storage.from(activeBucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const getSignedUrl = async (fileName: string) => {
    const { data } = await supabase.storage.from(activeBucket).createSignedUrl(fileName, 3600);
    return data?.signedUrl;
  };

  const handleCopyUrl = async (file: StorageFile) => {
    let url: string;
    if (bucketConfig?.public) {
      url = getPublicUrl(file.name);
    } else {
      url = (await getSignedUrl(file.name)) || "";
    }
    await navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };

  const handlePreview = async (file: StorageFile) => {
    setPreviewFile(file);
    if (bucketConfig?.public) {
      setPreviewUrl(getPublicUrl(file.name));
    } else {
      const url = await getSignedUrl(file.name);
      setPreviewUrl(url || null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(uploadFiles)) {
      const path = `uploads/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { error } = await supabase.storage.from(activeBucket).upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
      fetchFiles();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (file: StorageFile) => {
    setDeleting(file.name);
    const { error } = await supabase.storage.from(activeBucket).remove([file.name]);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("File deleted");
      setFiles(prev => prev.filter(f => f.name !== file.name));
      if (previewFile?.name === file.name) { setPreviewFile(null); setPreviewUrl(null); }
    }
    setDeleting(null);
  };

  const TYPE_FILTERS = [
    { key: "all", label: "All", icon: FolderOpen },
    { key: "image", label: "Images", icon: Image },
    { key: "video", label: "Videos", icon: Film },
    { key: "audio", label: "Audio", icon: Music },
    { key: "document", label: "Docs", icon: FileText },
  ];

  const filtered = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter === "all") return true;
    const mime = f.metadata?.mimetype || "";
    if (typeFilter === "image") return mime.startsWith("image/");
    if (typeFilter === "video") return mime.startsWith("video/");
    if (typeFilter === "audio") return mime.startsWith("audio/");
    if (typeFilter === "document") return mime.startsWith("application/") || mime.startsWith("text/");
    return true;
  });
  const totalSize = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all images, documents, videos, and files across your platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFiles}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Upload Files
          </Button>
          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {BUCKETS.map(bucket => (
          <button
            key={bucket.id}
            onClick={() => setActiveBucket(bucket.id)}
            className={cn(
              "p-3 rounded-xl border text-left transition-all",
              activeBucket === bucket.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <bucket.icon className={cn("h-4 w-4", activeBucket === bucket.id ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium", activeBucket === bucket.id ? "text-primary" : "text-foreground")}>{stats[bucket.id] || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{bucket.label}</p>
          </button>
        ))}
      </div>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPE_FILTERS.map(tf => (
          <button
            key={tf.key}
            onClick={() => setTypeFilter(tf.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              typeFilter === tf.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <tf.icon className="h-3.5 w-3.5" />
            {tf.label}
            {tf.key !== "all" && (
              <span className="ml-0.5 text-[10px] opacity-70">
                {files.filter(f => {
                  const m = f.metadata?.mimetype || "";
                  if (tf.key === "image") return m.startsWith("image/");
                  if (tf.key === "video") return m.startsWith("video/");
                  if (tf.key === "audio") return m.startsWith("audio/");
                  if (tf.key === "document") return m.startsWith("application/") || m.startsWith("text/");
                  return false;
                }).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..." className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5" />
          {filtered.length} files · {formatSize(totalSize)}
          {!bucketConfig?.public && <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-medium">Private</span>}
          {bucketConfig?.public && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">Public</span>}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {search ? "No files match your search" : "This bucket is empty"}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Upload Files
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(file => {
            const FileIcon = getFileIcon(file.metadata?.mimetype);
            const isImage = isPreviewable(file.metadata?.mimetype);
            const fileName = file.name.split("/").pop() || file.name;

            return (
              <div
                key={file.name}
                className="group border border-border rounded-xl bg-card overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => handlePreview(file)}
              >
                <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden">
                  {isImage && bucketConfig?.public ? (
                    <img
                      src={getPublicUrl(file.name)}
                      alt={fileName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <FileIcon className="h-10 w-10 text-muted-foreground/30" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyUrl(file); }}
                      className="p-1.5 rounded-lg bg-white/90 text-foreground hover:bg-white transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                      className="p-1.5 rounded-lg bg-white/90 text-destructive hover:bg-white transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-medium text-foreground truncate">{fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(file.metadata?.size)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {filtered.map(file => {
            const FileIcon = getFileIcon(file.metadata?.mimetype);
            const fileName = file.name.split("/").pop() || file.name;
            const folder = file.name.includes("/") ? file.name.split("/").slice(0, -1).join("/") : "—";

            return (
              <div
                key={file.name}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => handlePreview(file)}
              >
                <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{folder}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{file.metadata?.mimetype?.split("/")[1] || "file"}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(file.metadata?.size)}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">{new Date(file.created_at).toLocaleDateString()}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(file); }} className="p-1 rounded text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    disabled={deleting === file.name}
                  >
                    {deleting === file.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}>
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{previewFile.name.split("/").pop()}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatSize(previewFile.metadata?.size)} · {previewFile.metadata?.mimetype || "Unknown type"} · {new Date(previewFile.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleCopyUrl(previewFile)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-4 w-4" />
                </button>
                {previewUrl && (
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button onClick={() => handleDelete(previewFile)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => { setPreviewFile(null); setPreviewUrl(null); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-5">
              {previewUrl && isPreviewable(previewFile.metadata?.mimetype) ? (
                <img src={previewUrl} alt={previewFile.name} className="w-full max-h-[60vh] object-contain rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Preview not available for this file type</p>
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs text-primary font-medium hover:underline flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" /> Download file
                    </a>
                  )}
                </div>
              )}
            </div>
            {/* File details */}
            <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Bucket</p>
                <p className="text-xs font-medium text-foreground">{activeBucket}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Path</p>
                <p className="text-xs font-medium text-foreground truncate">{previewFile.name}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Size</p>
                <p className="text-xs font-medium text-foreground">{formatSize(previewFile.metadata?.size)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Type</p>
                <p className="text-xs font-medium text-foreground">{previewFile.metadata?.mimetype || "Unknown"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
