import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ContextualTooltipProps {
  content: string;
  title?: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  iconSize?: number;
}

// Predefined tips for common features
const FEATURE_TIPS: Record<string, { title: string; content: string }> = {
  crm_pipeline: {
    title: "CRM Pipeline",
    content: "Drag deals between stages to update their status. Click on a deal card to view details and add notes.",
  },
  invoice_create: {
    title: "Creating Invoices",
    content: "Fill in client details and line items. The system auto-calculates totals and applies tax based on your settings.",
  },
  employee_attendance: {
    title: "Attendance Tracking",
    content: "Mark daily attendance for your team. Late arrivals are auto-flagged based on shift schedules.",
  },
  leave_management: {
    title: "Leave Management",
    content: "Employees can request leave which follows your approval workflow. Leave balances are auto-calculated.",
  },
  payroll: {
    title: "Payroll Processing",
    content: "Run payroll based on attendance, overtime, and deductions. Review the salary sheet before finalizing.",
  },
  reports: {
    title: "Report Builder",
    content: "Create custom reports by selecting modules, date ranges, and filters. Export as CSV or PDF.",
  },
  workflows: {
    title: "Workflow Automation",
    content: "Build automated workflows with triggers, conditions, and actions. Workflows run automatically in the background.",
  },
  bulk_actions: {
    title: "Bulk Actions",
    content: "Select multiple items using checkboxes. A toolbar will appear at the bottom with available bulk actions.",
  },
  keyboard_shortcuts: {
    title: "Keyboard Shortcuts",
    content: "Press Ctrl+/ to see all available keyboard shortcuts. Use G+D to go to dashboard, G+C for CRM, etc.",
  },
  favorites: {
    title: "Pinned Items",
    content: "Click the star icon next to any page or record to pin it to your sidebar for quick access.",
  },
};

export function ContextualTooltip({ content, title, side = "top", className, iconSize = 14 }: ContextualTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className={cn("inline-flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors", className)}>
            <HelpCircle style={{ width: iconSize, height: iconSize }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {title && <p className="font-medium text-xs mb-0.5">{title}</p>}
          <p className="text-xs text-muted-foreground">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Feature-specific tooltip helper
export function FeatureTooltip({ feature, side, className }: { feature: keyof typeof FEATURE_TIPS; side?: "top" | "bottom" | "left" | "right"; className?: string }) {
  const tip = FEATURE_TIPS[feature];
  if (!tip) return null;
  return <ContextualTooltip title={tip.title} content={tip.content} side={side} className={className} />;
}
