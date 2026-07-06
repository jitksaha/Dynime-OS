import { Filter, X } from "lucide-react";

interface EmployeeFiltersProps {
  departments: string[];
  statusFilter: string;
  departmentFilter: string;
  employmentTypeFilter: string;
  onStatusChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onEmploymentTypeChange: (v: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const STATUSES = ["Active", "Inactive", "On Leave", "Terminated"];
const EMPLOYMENT_TYPES = ["Permanent", "Intern", "Part-time", "Contract", "Freelancer", "Executive Management", "Consultant", "Temporary", "Probation"];

export default function EmployeeFilters({
  departments, statusFilter, departmentFilter, employmentTypeFilter,
  onStatusChange, onDepartmentChange, onEmploymentTypeChange, onClear, hasActiveFilters,
}: EmployeeFiltersProps) {
  const selectClass = "h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className={selectClass}>
        <option value="">All Status</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={departmentFilter} onChange={(e) => onDepartmentChange(e.target.value)} className={selectClass}>
        <option value="">All Departments</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={employmentTypeFilter} onChange={(e) => onEmploymentTypeChange(e.target.value)} className={selectClass}>
        <option value="">All Types</option>
        {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {hasActiveFilters && (
        <button onClick={onClear} className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors">
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
