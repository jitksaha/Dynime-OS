import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { toast } from "sonner";

interface EmployeePhotoUploadProps {
  value: string;
  onChange: (url: string) => void;
  employeeId?: string;
  tenantId?: string;
}

export default function EmployeePhotoUpload({ value, onChange, employeeId, tenantId }: EmployeePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${tenantId || "general"}/${employeeId || crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("employee-photos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("employee-photos").getPublicUrl(path);
    onChange(urlData.publicUrl);
    setUploading(false);
    toast.success("Photo uploaded");
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Employee Photo</label>
      <div className="flex items-center gap-3">
        <div
          onClick={() => inputRef.current?.click()}
          className="h-16 w-16 rounded-full border-2 border-dashed border-input bg-secondary/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden shrink-0"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : value ? (
            <img src={value} alt="Employee" className="h-full w-full object-cover rounded-full" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-primary hover:underline"
          >
            {value ? "Change photo" : "Upload photo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-destructive hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
          <p className="text-[10px] text-muted-foreground">JPG, PNG up to 5MB</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
}
