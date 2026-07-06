// Phase 6 — Cron dispatcher. Replaces Supabase pg_cron.
// Add schedules in ../cloudflare/wrangler.toml [triggers].crons, then dispatch here
// on event.cron. Each branch should call the corresponding ported function handler.

import type { Env } from "./_shared/env";

export async function handleScheduled(event: ScheduledController, env: Env): Promise<void> {
  switch (event.cron) {
    // case "*/5 * * * *":  await recurringCharge(env); break;
    // case "0 0 * * *":    await usageReset(env); break;
    // case "0 * * * *":    await exchangeRatesSync(env); break;
    // case "0 9 * * *":    await invoiceReminders(env); break;
    default:
      console.log(`No cron handler registered for: ${event.cron}`);
  }
}
