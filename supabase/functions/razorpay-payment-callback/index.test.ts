import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/razorpay-payment-callback`;

Deno.test("Razorpay callback - CORS preflight returns 200", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" },
  });
  assertEquals(res.status, 200);
  const body = await res.text();
  assertExists(body);
});

Deno.test("Razorpay callback - ignores unknown event types", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "some.unknown.event",
      payload: {},
    }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.status, "ignored");
  assertEquals(data.event, "some.unknown.event");
});

Deno.test("Razorpay callback - handles payment.captured with missing notes gracefully", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_123",
            order_id: "order_test_nonexistent",
            notes: {
              purpose: "subscription",
              tenant_id: "00000000-0000-0000-0000-000000000000",
              plan_id: "nonexistent",
            },
          },
        },
      },
    }),
  });
  // Should still return 200 (webhook acknowledgment) even if no matching record
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.status, "ok");
});

Deno.test("Razorpay callback - handles payment.failed event", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_fail_123",
            order_id: "order_fail_nonexistent",
            notes: {},
          },
        },
      },
    }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.status, "noted");
});

Deno.test("Razorpay callback - handles missing payment entity in captured event", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "payment.captured",
      payload: {},
    }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.status, "no_payment_entity");
});
