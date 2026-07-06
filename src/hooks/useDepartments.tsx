import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/db";

// 100 commonly used departments as defaults
const DEFAULT_DEPARTMENTS = [
  "Accounting", "Administration", "Advertising", "Analytics", "Architecture",
  "Audit", "Automation", "Banking", "Brand Management", "Business Development",
  "Business Intelligence", "Clinical", "Communications", "Community", "Compliance",
  "Construction", "Consulting", "Content", "Corporate Strategy", "Creative",
  "Customer Experience", "Customer Service", "Customer Success", "Cybersecurity", "Data Engineering",
  "Data Science", "Design", "DevOps", "Digital Marketing", "Distribution",
  "E-Commerce", "Education", "Engineering", "Enterprise Sales", "Environmental",
  "Events", "Facilities", "Finance", "Fundraising", "General Management",
  "Government Relations", "Graphic Design", "Growth", "Health & Safety", "Help Desk",
  "HR", "Human Resources", "Import/Export", "Information Security", "Information Technology",
  "Innovation", "Inside Sales", "Insurance", "Internal Audit", "Inventory",
  "Investment", "IT Infrastructure", "IT Support", "Legal", "Licensing",
  "Logistics", "Maintenance", "Manufacturing", "Marketing", "Media",
  "Merchandising", "Mobile Development", "Network Engineering", "Operations", "Outreach",
  "Partnerships", "Payroll", "Performance", "Planning", "Procurement",
  "Product", "Product Design", "Product Management", "Production", "Project Management",
  "Public Relations", "Purchasing", "Quality Assurance", "Quality Control", "R&D",
  "Real Estate", "Recruitment", "Research", "Retail", "Revenue Operations",
  "Risk Management", "Sales", "Security", "SEO", "Social Media",
  "Software Engineering", "Strategy", "Supply Chain", "Support", "Sustainability",
  "Tax", "Technology", "Training", "Transportation", "UX Design",
];

export function useDepartments(tenantId: string | undefined) {
  const [companyDepts, setCompanyDepts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("departments")
      .select("name")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setCompanyDepts(data.map((d) => d.name));
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, [tenantId]);

  // Merge company departments (priority) with defaults, deduplicated
  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    companyDepts.forEach((d) => set.add(d));
    DEFAULT_DEPARTMENTS.forEach((d) => set.add(d));
    return Array.from(set).sort();
  }, [companyDepts]);

  return { departments: allDepartments, companyDepartments: companyDepts, loading, refetch: fetchDepartments };
}

export { DEFAULT_DEPARTMENTS };
