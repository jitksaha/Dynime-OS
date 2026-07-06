import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  departments: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function DepartmentSelect({ value, onChange, departments, placeholder = "Select department...", required, className }: DepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = departments.filter((d) =>
    d.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search departments..."
                className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No match — type in the field above to use custom value
              </div>
            ) : (
              filtered.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => {
                    onChange(dept);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-primary/10 transition-colors ${
                    dept === value ? "bg-primary/5 text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {dept}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {/* Hidden input for form validation */}
      {required && <input type="text" value={value} required tabIndex={-1} className="sr-only" onChange={() => {}} />}
    </div>
  );
}
