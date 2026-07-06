import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export interface CalendarEventInput {
  title: string;
  description?: string;
  event_type: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
  location?: string;
  attendees?: string[];
  source_module?: string;
  source_id?: string;
  color?: string;
  reminder_minutes?: number;
  is_recurring?: boolean;
  recurrence_rule?: string;
  metadata?: Record<string, any>;
}

// Event type presets with colors
export const CALENDAR_EVENT_TYPES = {
  deal_followup: { label: "Deal Follow-up", color: "#4F46E5", icon: "target" },
  employee_leave: { label: "Employee Leave", color: "#10B981", icon: "calendar-off" },
  invoice_due: { label: "Invoice Due", color: "#F59E0B", icon: "receipt" },
  interview: { label: "Interview", color: "#8B5CF6", icon: "users" },
  delivery: { label: "Product Delivery", color: "#3B82F6", icon: "truck" },
  delivery_failed: { label: "Failed Delivery", color: "#EF4444", icon: "alert-triangle" },
  meeting: { label: "Business Meeting", color: "#06B6D4", icon: "video" },
  payroll: { label: "Payroll Processing", color: "#EC4899", icon: "dollar-sign" },
  project_milestone: { label: "Project Milestone", color: "#14B8A6", icon: "flag" },
  shift_reminder: { label: "Shift Reminder", color: "#F97316", icon: "clock" },
  subscription_renewal: { label: "Subscription Renewal", color: "#6366F1", icon: "credit-card" },
  campaign_launch: { label: "Campaign Launch", color: "#A855F7", icon: "megaphone" },
  contract_expiry: { label: "Contract/Doc Expiry", color: "#EF4444", icon: "file-warning" },
  general: { label: "General", color: "#6B7280", icon: "calendar" },
} as const;

export function useCalendarSync() {
  const { tenantId } = useTenant();

  const createEvent = useCallback(
    async (event: CalendarEventInput, showToast = true) => {
      if (!tenantId) return null;
      try {
        // Direct insert to calendar_events (works even without Google Calendar connected)
        const { data, error } = await supabase
          .from("calendar_events" as any)
          .insert({
            tenant_id: tenantId,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            title: event.title,
            description: event.description || null,
            event_type: event.event_type || "general",
            start_time: event.start_time,
            end_time: event.end_time || null,
            all_day: event.all_day || false,
            location: event.location || null,
            attendees: event.attendees || [],
            source_module: event.source_module || null,
            source_id: event.source_id || null,
            color: event.color || CALENDAR_EVENT_TYPES[event.event_type as keyof typeof CALENDAR_EVENT_TYPES]?.color || "#6B7280",
            reminder_minutes: event.reminder_minutes ?? 30,
            is_recurring: event.is_recurring || false,
            recurrence_rule: event.recurrence_rule || null,
            metadata: event.metadata || {},
            sync_status: "local_only",
          } as any)
          .select()
          .single();

        if (error) throw error;
        if (showToast) toast.success("Calendar event created");
        return data;
      } catch (err: any) {
        if (showToast) toast.error("Failed to create calendar event");
        console.error("Calendar sync error:", err);
        return null;
      }
    },
    [tenantId]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!tenantId) return false;
      const { error } = await supabase
        .from("calendar_events" as any)
        .delete()
        .eq("id", eventId)
        .eq("tenant_id", tenantId);
      if (error) {
        toast.error("Failed to delete event");
        return false;
      }
      toast.success("Event deleted");
      return true;
    },
    [tenantId]
  );

  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<CalendarEventInput>) => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("calendar_events" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", eventId)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) {
        toast.error("Failed to update event");
        return null;
      }
      toast.success("Event updated");
      return data;
    },
    [tenantId]
  );

  // Convenience helpers for specific event types
  const createDealFollowup = (dealName: string, followUpDate: string, dealId: string, contactEmail?: string) =>
    createEvent({
      title: `Follow-up: ${dealName}`,
      description: `Scheduled follow-up for deal "${dealName}"`,
      event_type: "deal_followup",
      start_time: followUpDate,
      end_time: new Date(new Date(followUpDate).getTime() + 30 * 60000).toISOString(),
      source_module: "deals",
      source_id: dealId,
      attendees: contactEmail ? [contactEmail] : [],
      reminder_minutes: 60,
    });

  const createLeaveEvent = (employeeName: string, startDate: string, endDate: string, leaveId: string) =>
    createEvent({
      title: `Leave: ${employeeName}`,
      description: `${employeeName} is on approved leave`,
      event_type: "employee_leave",
      start_time: startDate,
      end_time: endDate,
      all_day: true,
      source_module: "leave_requests",
      source_id: leaveId,
    });

  const createInvoiceDueReminder = (invoiceNumber: string, dueDate: string, amount: number, invoiceId: string) =>
    createEvent({
      title: `Invoice Due: ${invoiceNumber}`,
      description: `Invoice ${invoiceNumber} for ${amount} is due`,
      event_type: "invoice_due",
      start_time: dueDate,
      all_day: true,
      source_module: "invoices",
      source_id: invoiceId,
      reminder_minutes: 1440, // 1 day before
    });

  const createInterviewEvent = (candidateName: string, position: string, interviewDate: string, jobId: string) =>
    createEvent({
      title: `Interview: ${candidateName} — ${position}`,
      description: `Interview for ${position} position`,
      event_type: "interview",
      start_time: interviewDate,
      end_time: new Date(new Date(interviewDate).getTime() + 60 * 60000).toISOString(),
      source_module: "job_applications",
      source_id: jobId,
      reminder_minutes: 60,
    });

  const createDeliveryEvent = (orderRef: string, deliveryDate: string, orderId: string, status: "delivery" | "delivery_failed" = "delivery") =>
    createEvent({
      title: status === "delivery_failed" ? `⚠ Failed Delivery: ${orderRef}` : `Delivery: ${orderRef}`,
      description: status === "delivery_failed" ? `Delivery failed for order ${orderRef}. Re-attempt needed.` : `Expected delivery for order ${orderRef}`,
      event_type: status,
      start_time: deliveryDate,
      all_day: true,
      source_module: "orders",
      source_id: orderId,
    });

  const createMeetingEvent = (title: string, startTime: string, endTime: string, location?: string, attendees?: string[]) =>
    createEvent({
      title,
      event_type: "meeting",
      start_time: startTime,
      end_time: endTime,
      location,
      attendees,
      reminder_minutes: 15,
    });

  const createPayrollReminder = (month: string, processingDate: string) =>
    createEvent({
      title: `Payroll Processing: ${month}`,
      description: `Payroll cut-off and processing day for ${month}`,
      event_type: "payroll",
      start_time: processingDate,
      all_day: true,
      source_module: "payroll_records",
      is_recurring: true,
      recurrence_rule: "FREQ=MONTHLY",
      reminder_minutes: 1440,
    });

  const createProjectMilestone = (projectName: string, milestone: string, dueDate: string, projectId: string) =>
    createEvent({
      title: `Milestone: ${milestone} — ${projectName}`,
      description: `Project "${projectName}" milestone deadline`,
      event_type: "project_milestone",
      start_time: dueDate,
      all_day: true,
      source_module: "projects",
      source_id: projectId,
      reminder_minutes: 1440,
    });

  const createShiftReminder = (employeeName: string, shiftDate: string, shiftTime: string, shiftId: string) =>
    createEvent({
      title: `Shift: ${employeeName}`,
      description: `Scheduled shift for ${employeeName} at ${shiftTime}`,
      event_type: "shift_reminder",
      start_time: shiftDate,
      source_module: "attendance_records",
      source_id: shiftId,
      reminder_minutes: 120,
    });

  const createSubscriptionRenewal = (planName: string, renewalDate: string, tenantIdRef: string) =>
    createEvent({
      title: `Subscription Renewal: ${planName}`,
      description: `Your ${planName} plan renewal is coming up`,
      event_type: "subscription_renewal",
      start_time: renewalDate,
      all_day: true,
      source_module: "tenant_subscriptions",
      source_id: tenantIdRef,
      reminder_minutes: 4320, // 3 days before
    });

  const createCampaignLaunch = (campaignName: string, launchDate: string, campaignId: string) =>
    createEvent({
      title: `Campaign Launch: ${campaignName}`,
      description: `Marketing campaign "${campaignName}" starts`,
      event_type: "campaign_launch",
      start_time: launchDate,
      all_day: true,
      source_module: "campaigns",
      source_id: campaignId,
      reminder_minutes: 1440,
    });

  const createContractExpiry = (documentName: string, expiryDate: string, docId: string) =>
    createEvent({
      title: `Expiring: ${documentName}`,
      description: `Document or contract "${documentName}" is expiring soon`,
      event_type: "contract_expiry",
      start_time: expiryDate,
      all_day: true,
      source_module: "documents",
      source_id: docId,
      reminder_minutes: 10080, // 7 days before
    });

  return {
    createEvent,
    deleteEvent,
    updateEvent,
    // Typed helpers
    createDealFollowup,
    createLeaveEvent,
    createInvoiceDueReminder,
    createInterviewEvent,
    createDeliveryEvent,
    createMeetingEvent,
    createPayrollReminder,
    createProjectMilestone,
    createShiftReminder,
    createSubscriptionRenewal,
    createCampaignLaunch,
    createContractExpiry,
  };
}
