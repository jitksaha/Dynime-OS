import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    }).auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, event, eventId, tenantId } = await req.json();

    // Get tenant's Google Calendar config
    const { data: config } = await supabase
      .from("tenant_integrations")
      .select("config")
      .eq("tenant_id", tenantId)
      .eq("integration_key", "google_calendar")
      .eq("is_enabled", true)
      .single();

    const apiKey = config?.config?.api_key;
    const calendarId = config?.config?.calendar_id || "primary";

    // Always save to our calendar_events table
    if (action === "create") {
      const { data: calEvent, error: insertErr } = await supabase
        .from("calendar_events")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
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
          color: event.color || null,
          reminder_minutes: event.reminder_minutes || 30,
          is_recurring: event.is_recurring || false,
          recurrence_rule: event.recurrence_rule || null,
          metadata: event.metadata || {},
          sync_status: apiKey ? "syncing" : "local_only",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // If Google Calendar API key exists, sync to Google
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
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(googleEvent) }
          );

          if (res.ok) {
            const gEvent = await res.json();
            await supabase.from("calendar_events").update({ google_event_id: gEvent.id, sync_status: "synced" }).eq("id", calEvent.id);
            calEvent.sync_status = "synced";
            calEvent.google_event_id = gEvent.id;
          } else {
            await supabase.from("calendar_events").update({ sync_status: "sync_failed" }).eq("id", calEvent.id);
            calEvent.sync_status = "sync_failed";
          }
        } catch {
          await supabase.from("calendar_events").update({ sync_status: "sync_failed" }).eq("id", calEvent.id);
          calEvent.sync_status = "sync_failed";
        }
      }

      return new Response(JSON.stringify({ success: true, event: calEvent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update" && eventId) {
      const updateData: any = {};
      if (event.title) updateData.title = event.title;
      if (event.description !== undefined) updateData.description = event.description;
      if (event.start_time) updateData.start_time = event.start_time;
      if (event.end_time !== undefined) updateData.end_time = event.end_time;
      if (event.location !== undefined) updateData.location = event.location;
      if (event.attendees) updateData.attendees = event.attendees;
      if (event.color) updateData.color = event.color;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("calendar_events")
        .update(updateData)
        .eq("id", eventId)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, event: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete" && eventId) {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, events: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
