// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAppInfo } from "@/hooks/useAppInfo";
import { MegaMenuDropdown, type MegaMenuItem } from "@/components/MegaMenuDropdown";

// Maps platform_modules icon names (kebab-case from DB) to lucide component names
const iconNameMap: Record<string, string> = {
  users: "Users", handshake: "Target", megaphone: "Megaphone",
  workflow: "GitBranch", calculator: "Receipt", headphones: "Headphones",
  kanban: "FolderKanban", file: "FileText", "bar-chart": "BarChart3",
  wallet: "Wallet", "shopping-bag": "ShoppingCart", "message-square": "MessageSquare",
  calendar: "Calendar", briefcase: "Briefcase", percent: "Percent",
  shield: "Shield", zap: "Zap", globe: "Globe", smartphone: "Smartphone",
  phone: "Phone", video: "Video", bell: "Bell", code: "Code", mail: "Mail", bot: "Bot",
  target: "Target", "refresh-cw": "RefreshCw", "pie-chart": "PieChart",
  "graduation-cap": "GraduationCap", monitor: "Monitor", "dollar-sign": "DollarSign",
  building: "Building", leaf: "Leaf", store: "Store", map: "Map",
  gamepad: "Gamepad2", receipt: "Receipt", activity: "Activity",
  "building-2": "Building2", layers: "Layers",
};

const modulePathMap: Record<string, string> = {
  hrms: "/features/hrm", crm: "/features/crm", marketing: "/features/marketing",
  workflows: "/features/workflows", accounting: "/features/accounting",
  helpdesk: "/features/helpdesk", projects: "/features/projects",
  documents: "/features/documents", reports: "/features/reports",
  wallet: "/features/wallet", product_hub: "/features/pos",
  team_chat: "/features/team-chat", calendar: "/features/calendar",
  recruitment: "/features/recruitment", tax_compliance: "/features/tax-compliance",
  security: "/features/security", integrations: "/features/integrations",
  portals: "/features/portals", sms: "/features/sms", whatsapp: "/features/whatsapp",
  meetings: "/features/meetings", notifications: "/features/notifications",
  api: "/features/api", email: "/features/email", ai_assistant: "/features/ai",
  okr: "/features/okr", subscription_management: "/features/subscription-management",
  budget_planning: "/features/budget-planning", compliance: "/features/compliance",
  lms: "/features/lms", it_asset: "/features/it-asset",
  commission: "/features/commission", visitor_management: "/features/visitor-management",
  esg: "/features/esg", vendor_portal: "/features/vendor-portal",
  territory: "/features/territory", gamification: "/features/gamification",
  expense_management: "/features/expense-management",
  control_tower: "/features/control-tower", multi_entity: "/features/multi-entity",
};

const moduleColorMap: Record<string, string> = {
  hrms: "hsl(243,75%,58%)", crm: "hsl(142,71%,45%)", marketing: "hsl(270,80%,60%)",
  workflows: "hsl(38,92%,50%)", accounting: "hsl(199,89%,48%)",
  helpdesk: "hsl(0,72%,50%)", projects: "hsl(200,80%,55%)",
  documents: "hsl(38,92%,50%)", reports: "hsl(290,65%,55%)",
  wallet: "hsl(142,71%,45%)", product_hub: "hsl(38,92%,50%)",
  team_chat: "hsl(270,80%,60%)", calendar: "hsl(199,89%,48%)",
  recruitment: "hsl(310,60%,50%)", tax_compliance: "hsl(0,72%,50%)",
  security: "hsl(220,70%,50%)", integrations: "hsl(45,93%,47%)",
  portals: "hsl(170,60%,45%)", sms: "hsl(160,60%,40%)",
  whatsapp: "hsl(142,70%,40%)", meetings: "hsl(210,80%,55%)",
  notifications: "hsl(350,70%,55%)", api: "hsl(250,60%,55%)",
  email: "hsl(15,80%,55%)", ai_assistant: "hsl(260,80%,60%)",
  okr: "hsl(270,80%,60%)", subscription_management: "hsl(199,89%,48%)",
  budget_planning: "hsl(38,92%,50%)", compliance: "hsl(0,72%,50%)",
  lms: "hsl(142,71%,45%)", it_asset: "hsl(220,13%,46%)",
  commission: "hsl(142,71%,45%)", visitor_management: "hsl(199,89%,48%)",
  esg: "hsl(142,71%,45%)", vendor_portal: "hsl(38,92%,50%)",
  territory: "hsl(243,75%,58%)", gamification: "hsl(38,92%,50%)",
  expense_management: "hsl(170,60%,45%)", control_tower: "hsl(270,80%,60%)",
  multi_entity: "hsl(220,13%,46%)",
};

let cachedFeatures: MegaMenuItem[] | null = null;
let cacheTime = 0;

export function FeaturesDropdown() {
  const { appInfo } = useAppInfo();
  const appName = appInfo.app_name || "Dynime";
  const [features, setFeatures] = useState<MegaMenuItem[]>(cachedFeatures || []);

  useEffect(() => {
    if (cachedFeatures && Date.now() - cacheTime < 60000) { setFeatures(cachedFeatures); return; }

    supabase
      .from("platform_modules")
      .select("name, label, description, icon, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const items: MegaMenuItem[] = data.map((mod) => ({
          title: `${appName} ${mod.label}`,
          desc: mod.description || "",
          path: modulePathMap[mod.name] || `/features/${mod.name.replace(/_/g, "-")}`,
          icon: iconNameMap[mod.icon || ""] || "Heart",
          color: moduleColorMap[mod.name] || "hsl(220,70%,50%)",
        }));
        cachedFeatures = items;
        cacheTime = Date.now();
        setFeatures(items);
      });
  }, [appName]);

  return <MegaMenuDropdown label="Features" items={features} columns={4} width="1020px" />;
}
