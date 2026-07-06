import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { MegaMenuDropdown, type MegaMenuItem } from "@/components/MegaMenuDropdown";

export function SolutionsDropdown() {
  const [solutions, setSolutions] = useState<MegaMenuItem[]>([]);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "industry_solutions")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          const items = (data.value as any[]).map((s: any) => ({
            title: s.name,
            desc: s.description,
            path: `/solutions/${s.slug}`,
            icon: s.icon || "Heart",
            color: s.color || "hsl(0,72%,50%)",
            visible: true,
          }));
          setSolutions(items);
        }
      });
  }, []);

  return <MegaMenuDropdown label="Solutions" items={solutions} columns={4} width="960px" sectionTitle="Industry Solutions" />;
}
