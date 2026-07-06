import { useMemo } from "react";
import { navGroups } from "@/components/layout/AdminSidebar";
import { DynamicSearchDialog } from "@/components/DynamicSearchDialog";

export function AdminSearch() {
  const navItems = useMemo(() => {
    const items: { label: string; path: string; group: string; icon: React.ElementType }[] = [];
    for (const group of navGroups) {
      for (const item of group.items) {
        items.push({ label: item.label, path: item.path, group: group.label, icon: item.icon });
      }
    }
    return items;
  }, []);

  return (
    <DynamicSearchDialog
      navItems={navItems}
      totalNavCount={navItems.length}
      tenantId={null}
      placeholder="Search all admin features, records, content..."
      accentClass="destructive"
      portalLabel={`${navItems.length} features & all records`}
    />
  );
}
