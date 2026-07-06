// Port of `supabase/functions/google-calendar-sync/index.ts`.
// CRUD for Calendar events with optional Google Calendar API sync per-tenant.

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getTenantIntegration } from "../_shared/secrets";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("No authorization header", 401);

    // Resolve caller — this function uses both caller identity (for created_by)
    // and service-role for provider config lookups.
    const ctx = await (await import("../_shared/auth-context")).contextFromRequest(req, env);

    const { action, event, eventId, tenantId } = await req.json() as Record<string, any>;

    // Get tenant's Google Calendar config.
    const intRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT config FROM public.tenant_integrations
         WHERE tenant_id = ${tenantId} AND integration_key = 'google_calendar' AND is_enabled = true LIMIT 1`);
    const tenantConfig: any = (intRows[0] as any)?.config || {};
    const apiKey = tenantConfig.api_key;
    const calendarId = tenantConfig.calendar_id || "primary";

    if (action === "create") {
      const syncStatus = apiKey ? "syncing" : "local_only";
      const inserted = await withSession(sql, ctx, (tx) =>
        tx`INSERT INTO public.calendar_events
           (tenant_id, created_by, title, description, event_type,
            start_time, end_time, all_day, location, attendees,
            source_module, source_id, color, reminder_minutes,
            is_recurring, recurrence_rule, metadata, sync_status)
           VALUES (${tenantId}, ${ctx.userId!}, ${event.title}, ${event.description || null},
                   ${event.event_type || "general"}, ${event.start_time},
                   ${event.end_time || null}, ${event.all_day || false},
                   ${event.location || null}, ${event.attendees || []},
                   ${event.source_module || null}, ${event.source_id || null},
                   ${event.color || null}, ${event.reminder_minutes || 30},
                   ${event.is_recurring || false}, ${event.recurrence_rule || null},
                   ${event.metadata || {}}, ${syncStatus})
           RETURNING *`);
      const calEvent = inserted[0];

      if (apiKey) {
        try {
          const googleEvent = {
            summary: event.title,
            description: event.description || "",
            location: event.location || "",
            start: event.all_day
              ? { date: event.start_time.split("T")[0] }
              : { dateTime: event.start_time, timeZone: "UTC" },
            end: event.all_day
              ? { date: (event.end_time || event.start_time).split("T")[0] }
              : { dateTime: event.end_time || event.start_time, timeZone: "UTC" },
            attendees: (event.attendees || []).map((e: string) => ({ email: e })),
            reminders: { useDefault: false, overrides: [{ method: "popup", minutes: event.reminder_minutes || 30 }] },
          };
          const res = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(googleEvent) },
          );
          if (res.ok) {
            const gEvent = await res.json() as any;
            await withSession(sql, SERVICE, (tx) =>
              tx`UPDATE public.calendar_events SET google_event_id = ${gEvent.id}, sync_status = 'synced' WHERE id = ${calEvent.id}`);
            calEvent.sync_status = "synced";
            calEvent.google_event_id = gEvent.id;
          } else {
            await withSession(sql, SERVICE, (tx) =>
              tx`UPDATE public.calendar_events SET sync_status = 'sync_failed' WHERE id = ${calEvent.id}`);
            calEvent.sync_status = "sync_failed";
          }
        } catch {
          await withSession(sql, SERVICE, (tx) =>
            tx`UPDATE public.calendar_events SET sync_status = 'sync_failed' WHERE id = ${calEvent.id}`);
          calEvent.sync_status = "sync_failed";
        }
      }

      return json({ success: true, event: calEvent });
    }

    if (action === "update" && eventId) {
      const updateData: any = {};
      if (event.title) updateData.title = event.title;
      if (event.description !== undefined) updateData.description = event.description;
      if (event.start_time) updateData.start_time = event.start_time;
      if (event.end_time !== undefined) updateData.end_time = event.end_time;
      if (event.location !== undefined) updateData.location = event.location;
      if (event.attendees) updateData.attendees = event.attendees;
      if (event.color !== undefined) updateData.color = event.color;
      updateData.updated_at = new Date().toISOString();

      const updated = await withSession(sql, ctx, (tx) =>
        tx`UPDATE public.calendar_events SET ${tx(updateData)} WHERE id = ${eventId} AND tenant_id = ${tenantId} RETURNING *`);
      return json({ success: true, event: updated[0] });
    }

    if (action === "delete" && eventId) {
      await withSession(sql, ctx, (tx) =>
        tx`DELETE FROM public.calendar_events WHERE id = ${eventId} AND tenant_id = ${tenantId}`);
      return json({ success: true });
    }

    if (action === "list") {
      const events = await withSession(sql, ctx, (tx) =>
        tx`SELECT * FROM public.calendar_events WHERE tenant_id = ${tenantId} ORDER BY start_time ASC`);
      return json({ success: true, events });
    }

    return error(`Unknown action: ${action}`, 400);
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
