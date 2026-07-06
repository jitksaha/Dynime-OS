import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parallel: fetch gateway config + parse form data
    const [gwConfigRes, formData] = await Promise.all([
      supabase
        .from("payment_gateway_configs")
        .select("credentials, is_sandbox")
        .eq("gateway_key", "sslcommerz")
        .single(),
      req.formData(),
    ]);

    const creds = (gwConfigRes.data?.credentials || {}) as Record<string, string>;
    const STORE_ID = creds.store_id || "";
    const STORE_PASS = creds.store_password || "";

    const data: Record<string, string> = {};
    formData.forEach((value, key) => { data[key] = value.toString(); });

    const tranId = data.tran_id;
    const status = data.status;
    const valId = data.val_id;
    const tenantId = data.value_a;
    const moduleName = data.value_b;
    const paymentType = data.value_c;
    const siteUrl = data.value_d || "https://dynime.com";

    console.log(`Addon callback: status=${status}, tran_id=${tranId}, module=${moduleName}`);

    if (status === "VALID" && valId) {
      const isSandbox = gwConfigRes.data?.is_sandbox ?? STORE_ID.toLowerCase().includes("test");
      const validationUrl = isSandbox
        ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
        : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`;

      const verifyRes = await fetch(
        `${validationUrl}?val_id=${valId}&store_id=${STORE_ID}&store_passwd=${STORE_PASS}&format=json`
      );

      const contentType = verifyRes.headers.get("content-type") || "";
      let verification;
      if (contentType.includes("application/json")) {
        verification = await verifyRes.json();
      } else {
        const text = await verifyRes.text();
        try { verification = JSON.parse(text); } catch {
          console.error("Verification returned non-JSON:", text.substring(0, 500));
          verification = { status: "INVALID" };
        }
      }

      if (verification.status === "VALID" || verification.status === "VALIDATED") {
        // Parallel: activate addon + check existing module
        const [, { data: existingModule }] = await Promise.all([
          supabase
            .from("tenant_addon_modules")
            .update({
              status: "active",
              transaction_id: tranId,
              activated_at: new Date().toISOString(),
            })
            .eq("transaction_id", tranId)
            .eq("status", "pending"),
          supabase
            .from("tenant_modules")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("module_name", moduleName)
            .maybeSingle(),
        ]);

        if (!existingModule) {
          await supabase.from("tenant_modules").insert({
            tenant_id: tenantId, module_name: moduleName, is_enabled: true,
          });
        } else {
          await supabase.from("tenant_modules").update({ is_enabled: true }).eq("id", existingModule.id);
        }

        return new Response(null, {
          status: 302,
          headers: { Location: `${siteUrl}/subscription?payment=success&addon=${moduleName}` },
        });
      }
    }

    if (tranId) {
      await supabase
        .from("tenant_addon_modules")
        .delete()
        .eq("transaction_id", tranId)
        .eq("status", "pending");
    }

    const failStatus = status === "CANCELLED" ? "cancelled" : "failed";
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/subscription?payment=${failStatus}` },
    });
  } catch (err) {
    console.error("Addon callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "https://dynime.com/subscription?payment=error" },
    });
  }
});
