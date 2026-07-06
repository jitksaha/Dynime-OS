import { Download } from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";

interface ExportButtonProps {
  data: Record<string, any>[];
  filename: string;
  label?: string;
  className?: string;
}

export function ExportButton({ data, filename, label = "Export CSV", className = "" }: ExportButtonProps) {
  const handleExport = () => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(data, filename);
    toast.success(`Exported ${data.length} records to ${filename}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-card text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/20 transition-colors ${className}`}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
