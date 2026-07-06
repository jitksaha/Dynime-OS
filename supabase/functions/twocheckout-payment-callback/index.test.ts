import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/twocheckout-payment-callback`;

Deno.test("2Checkout callback - CORS preflight returns 200", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" },
  });
  assertEquals(res.status, 200);
  const body = await res.text();
  assertExists(body);
});

Deno.test("2Checkout callback - handles JSON IPN notification", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      REFNO: "TEST_REF_123",
      REFNOEXT: "TXN_test_nonexistent",
      ORDERSTATUS: "COMPLETE",
      MESSAGE_TYPE: "ORDER_CREATED",
      DATE: new Date().toISOString(),
      HASH: "test_hash",
    }),
  });
  assertEquals(res.status, 200);
  const body = await res.text();
  assertExists(body);
  // 2Checkout expects XML response with EPAYMENT tag
  assertEquals(body.includes("<EPAYMENT>"), true);
});

Deno.test("2Checkout callback - handles form-urlencoded IPN", async () => {
  const params = new URLSearchParams({
    REFNO: "TEST_REF_456",
    REFNOEXT: "TXN_test_form",
    ORDERSTATUS: "PENDING",
    MESSAGE_TYPE: "INVOICE_STATUS_CHANGED",
    DATE: new Date().toISOString(),
    HASH: "test_hash_2",
  });

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  assertEquals(res.status, 200);
  const body = await res.text();
  assertExists(body);
  assertEquals(body.includes("<EPAYMENT>"), true);
});

Deno.test("2Checkout callback - handles IPN with non-complete status", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      REFNO: "TEST_REF_789",
      REFNOEXT: "TXN_test_pending",
      ORDERSTATUS: "PENDING",
      MESSAGE_TYPE: "ORDER_STATUS_UPDATE",
      DATE: new Date().toISOString(),
    }),
  });
  assertEquals(res.status, 200);
  const body = await res.text();
  assertExists(body);
});
