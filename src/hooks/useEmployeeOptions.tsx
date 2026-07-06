import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";

interface EmployeeOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface EmployeeRecord {
  id: string;
  full_name: string;
  department: string | null;
  salary: number | null;
}

export function useEmployeeOptions() {
  const { tenantId, supabase } = useTenant();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("employees")
      .select("id, full_name, department, salary")
      .eq("tenant_id", tenantId)
      .eq("status", "Active")
      .order("full_name")
      .then(({ data }) => {
        if (data) setEmployees(data);
      });
  }, [tenantId]);

  const autocompleteOptions: EmployeeOption[] = employees.map((e) => ({
    value: e.id,
    label: e.full_name,
    sublabel: e.department || undefined,
  }));

  const findEmployee = (name: string) => employees.find((e) => e.full_name === name);

  return { employees, autocompleteOptions, findEmployee };
}
