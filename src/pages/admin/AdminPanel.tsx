import { useState } from "react";
import { Users, Shield, Package, CreditCard, Settings as SettingsIcon, Code, ArrowLeft, ChevronRight, MessageSquare, FileText, Brain, Activity } from "lucide-react";
import UserManagement from "./UserManagement";
import RoleManagement from "./RoleManagement";
import ModuleManagement from "./ModuleManagement";
import SubscriptionManagement from "./SubscriptionManagement";
import PlanManagement from "./PlanManagement";
import CustomCodeManager from "./CustomCodeManager";
import SocialInbox from "./SocialInbox";
import KnowledgeBaseManager from "./KnowledgeBaseManager";
import AgentSettings from "./AgentSettings";
import EscalationManager from "./EscalationManager";
import SocialAnalytics from "./SocialAnalytics";

interface AdminSection {
  icon: React.ElementType;
  label: string;
  description: string;
  key: string;
}

const sections: AdminSection[] = [
  { icon: Users, label: "User Management", description: "Manage users, invitations, and team members", key: "users" },
  { icon: Shield, label: "Role Assignment", description: "Assign and manage user roles and permissions", key: "roles" },
  { icon: Package, label: "Module Access", description: "Control which modules are available for your tenant", key: "modules" },
  { icon: CreditCard, label: "Subscription Plans", description: "Manage pricing plans and billing cycles", key: "plans" },
  { icon: SettingsIcon, label: "Billing & Subscriptions", description: "View and manage tenant subscriptions", key: "subscriptions" },
  { icon: Code, label: "Custom CSS & JS", description: "Add custom code snippets for quick design tweaks", key: "custom-code" },
  { icon: MessageSquare, label: "Social Inbox", description: "Manage all social media conversations in one place", key: "social-inbox" },
  { icon: FileText, label: "Knowledge Base", description: "Manage AI knowledge base documents and embeddings", key: "knowledge-base" },
  { icon: Brain, label: "Agent Settings", description: "Configure AI agent tone, mode, and safety rules", key: "agent-settings" },
  { icon: Shield, label: "Escalation Manager", description: "Set up escalation rules and manage queue", key: "escalation" },
  { icon: Activity, label: "Social Analytics", description: "Track AI agent performance and conversion metrics", key: "social-analytics" },
];

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeSection) {
      case "users": return <UserManagement />;
      case "roles": return <RoleManagement />;
      case "modules": return <ModuleManagement />;
      case "plans": return <PlanManagement />;
      case "subscriptions": return <SubscriptionManagement />;
      case "custom-code": return <CustomCodeManager />;
      case "social-inbox": return <SocialInbox />;
      case "knowledge-base": return <KnowledgeBaseManager />;
      case "agent-settings": return <AgentSettings />;
      case "escalation": return <EscalationManager />;
      case "social-analytics": return <SocialAnalytics />;
      default: return null;
    }
  };

  const activeLabel = sections.find((s) => s.key === activeSection)?.label;

  if (activeSection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Admin Panel
        </button>
        <h1 className="text-2xl font-bold text-foreground">{activeLabel}</h1>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage users, roles, modules, and billing</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className="flex items-center gap-4 w-full p-5 rounded-xl border border-border bg-card hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
          >
            <div className="p-2.5 rounded-lg bg-primary/10">
              <section.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{section.label}</p>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
