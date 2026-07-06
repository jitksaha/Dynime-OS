import { useState, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface FormField {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "select" | "textarea" | "date" | "autocomplete";
  placeholder?: string;
  options?: string[];
  autocompleteOptions?: AutocompleteOption[];
  onAutocompleteSelect?: (option: AutocompleteOption, setFormData: (updater: (prev: Record<string, string>) => Record<string, string>) => void) => void;
  required?: boolean;
}

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
  extraContent?: React.ReactNode;
  defaultValues?: Record<string, string>;
  layout?: "single" | "grid-2" | "grid-3";
}

function AutocompleteInput({
  field,
  value,
  onChange,
  onSelect,
}: {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  onSelect: (option: AutocompleteOption) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = (field.autocompleteOptions || []).filter(
    (opt) =>
      opt.label.toLowerCase().includes((search || value).toLowerCase()) ||
      (opt.sublabel || "").toLowerCase().includes((search || value).toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={field.placeholder}
          required={field.required}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt);
                setShowDropdown(false);
                setSearch("");
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-primary/10 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                {opt.label.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{opt.label}</p>
                {opt.sublabel && <p className="text-xs text-muted-foreground truncate">{opt.sublabel}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
      {showDropdown && filtered.length === 0 && value && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg px-3 py-2.5">
          <p className="text-xs text-muted-foreground">No matches — type to enter manually</p>
        </div>
      )}
    </div>
  );
}

export default function FormDialog({ open, onClose, title, fields, onSubmit, extraContent, defaultValues, layout = "single" }: FormDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>(defaultValues || {});

  useEffect(() => {
    if (open) {
      setFormData(defaultValues || {});
    }
  }, [open]);

  if (!open) return null;

  const isEdit = !!defaultValues && Object.keys(defaultValues).length > 0;
  const dialogWidthClass = layout === "grid-3" ? "max-w-5xl" : layout === "grid-2" ? "max-w-3xl" : "max-w-lg";
  const fieldGridClass = layout === "grid-3"
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    : layout === "grid-2"
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
      : "space-y-4";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-card border border-border rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto", dialogWidthClass)}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className={fieldGridClass}>
            {fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">{field.label}</label>
                {field.type === "autocomplete" ? (
                  <AutocompleteInput
                    field={field}
                    value={formData[field.name] || ""}
                    onChange={(val) => setFormData({ ...formData, [field.name]: val })}
                    onSelect={(opt) => {
                      setFormData((prev) => ({ ...prev, [field.name]: opt.label }));
                      if (field.onAutocompleteSelect) {
                        field.onAutocompleteSelect(opt, setFormData);
                      }
                    }}
                  />
                ) : field.type === "textarea" ? (
                  <textarea
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    required={field.required}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || "text"}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            ))}
          </div>
          {extraContent}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              {isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

