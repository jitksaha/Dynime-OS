import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BATCH_SIZE = 50;

async function fetchAllPages(url: string, headers: Record<string, string>, platform: string) {
  const allItems: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    const data = await res.json();

    if (platform === "woocommerce") {
      allItems.push(...(Array.isArray(data) ? data : []));
      // WooCommerce pagination via Link header
      const linkHeader = res.headers.get("Link");
      const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = nextMatch ? nextMatch[1] : null;
    } else if (platform === "shopify") {
      const key = Object.keys(data)[0]; // "products" or "orders"
      allItems.push(...(data[key] || []));
      // Shopify pagination via Link header
      const linkHeader = res.headers.get("Link");
      const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = nextMatch ? nextMatch[1] : null;
    } else {
      break;
    }
  }
  return allItems;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { integrationId, syncType = "full", tenantId } = await req.json();

    const { data: integration, error: intErr } = await supabase
      .from("pdm_store_integrations")
      .select("*")
      .eq("id", integrationId)
      .single();

    if (intErr || !integration) throw new Error("Integration not found");

    // Create sync log (import only)
    const { data: syncLog } = await supabase
      .from("pdm_sync_logs")
      .insert({
        tenant_id: tenantId,
        integration_id: integrationId,
        sync_type: syncType,
        direction: "import",
        status: "running",
      })
      .select()
      .single();

    await supabase
      .from("pdm_store_integrations")
      .update({ sync_status: "syncing" })
      .eq("id", integrationId);

    let itemsSynced = 0;
    let itemsFailed = 0;
    const errorDetails: any[] = [];

    try {
      const platform = integration.platform;
      const creds = integration.credentials as Record<string, string>;
      const storeUrl = integration.store_url.replace(/\/$/, "");

      // ========== WOOCOMMERCE IMPORT ==========
      if (platform === "woocommerce") {
        const authHeader = btoa(`${creds.consumer_key}:${creds.consumer_secret}`);
        const wcHeaders = { "Authorization": `Basic ${authHeader}` };

        // Import products
        if (syncType === "full" || syncType === "products") {
          try {
            const products = await fetchAllPages(
              `${storeUrl}/wp-json/wc/v3/products?per_page=100`,
              wcHeaders, "woocommerce"
            );

            // Batch insert
            for (let i = 0; i < products.length; i += BATCH_SIZE) {
              const batch = products.slice(i, i + BATCH_SIZE).map((p: any) => ({
                tenant_id: tenantId,
                created_by: integration.created_by,
                name: p.name,
                sku: p.sku || null,
                category: p.categories?.[0]?.name || "General",
                price: parseFloat(p.price) || 0,
                cost_price: 0,
                stock_quantity: p.stock_quantity || 0,
                weight_grams: Math.round((parseFloat(p.weight) || 0) * 1000),
                is_active: p.status === "publish",
                external_id: String(p.id),
                external_platform: "woocommerce",
                external_url: p.permalink || null,
              }));

              const { error, count } = await supabase.from("pdm_products").upsert(batch, {
                onConflict: "tenant_id,external_id,external_platform",
                ignoreDuplicates: false,
              });
              if (error) {
                itemsFailed += batch.length;
                errorDetails.push({ type: "products_batch", error: error.message });
              } else {
                itemsSynced += batch.length;
              }
            }
          } catch (e: any) {
            errorDetails.push({ type: "products", error: e.message });
          }
        }

        // Import orders
        if (syncType === "full" || syncType === "orders") {
          try {
            const orders = await fetchAllPages(
              `${storeUrl}/wp-json/wc/v3/orders?per_page=100`,
              wcHeaders, "woocommerce"
            );

            const statusMap: Record<string, string> = {
              pending: "pending", processing: "confirmed", completed: "delivered",
              cancelled: "cancelled", refunded: "cancelled", "on-hold": "pending",
            };

            for (let i = 0; i < orders.length; i += BATCH_SIZE) {
              const batch = orders.slice(i, i + BATCH_SIZE).map((o: any) => ({
                tenant_id: tenantId,
                created_by: integration.created_by,
                order_number: `WC-${o.number || o.id}`,
                customer_name: `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim() || "WooCommerce Customer",
                customer_phone: o.billing?.phone || "N/A",
                customer_email: o.billing?.email || "",
                customer_address: o.billing?.address_1 || "N/A",
                customer_city: o.billing?.city || "",
                customer_zone: o.billing?.state || "",
                customer_area: "",
                subtotal: parseFloat(o.total) || 0,
                total: parseFloat(o.total) || 0,
                cod_amount: o.payment_method === "cod" ? parseFloat(o.total) || 0 : 0,
                payment_status: o.date_paid ? "paid" : "unpaid",
                order_status: statusMap[o.status] || "pending",
                external_id: String(o.id),
                external_platform: "woocommerce",
              }));

              const { error } = await supabase.from("pdm_orders").upsert(batch, {
                onConflict: "tenant_id,external_id,external_platform",
                ignoreDuplicates: false,
              });
              if (error) {
                itemsFailed += batch.length;
                errorDetails.push({ type: "orders_batch", error: error.message });
              } else {
                itemsSynced += batch.length;
              }
            }
          } catch (e: any) {
            errorDetails.push({ type: "orders", error: e.message });
          }
        }

      // ========== SHOPIFY IMPORT ==========
      } else if (platform === "shopify") {
        const shopifyHeaders = {
          "X-Shopify-Access-Token": creds.access_token,
          "Content-Type": "application/json",
        };

        // Import products
        if (syncType === "full" || syncType === "products") {
          try {
            const products = await fetchAllPages(
              `${storeUrl}/admin/api/2024-01/products.json?limit=250`,
              shopifyHeaders, "shopify"
            );

            for (let i = 0; i < products.length; i += BATCH_SIZE) {
              const batch = products.slice(i, i + BATCH_SIZE).map((p: any) => {
                const variant = p.variants?.[0];
                const weightGrams = (variant?.weight || 0) * (
                  variant?.weight_unit === "kg" ? 1000 :
                  variant?.weight_unit === "lb" ? 453.592 : 1
                );
                return {
                  tenant_id: tenantId,
                  created_by: integration.created_by,
                  name: p.title,
                  sku: variant?.sku || null,
                  category: p.product_type || "General",
                  price: parseFloat(variant?.price) || 0,
                  cost_price: 0,
                  stock_quantity: variant?.inventory_quantity || 0,
                  weight_grams: Math.round(weightGrams),
                  is_active: p.status === "active",
                  external_id: String(p.id),
                  external_platform: "shopify",
                  external_url: `${storeUrl}/products/${p.handle}`,
                };
              });

              const { error } = await supabase.from("pdm_products").upsert(batch, {
                onConflict: "tenant_id,external_id,external_platform",
                ignoreDuplicates: false,
              });
              if (error) {
                itemsFailed += batch.length;
                errorDetails.push({ type: "products_batch", error: error.message });
              } else {
                itemsSynced += batch.length;
              }
            }
          } catch (e: any) {
            errorDetails.push({ type: "products", error: e.message });
          }
        }

        // Import orders
        if (syncType === "full" || syncType === "orders") {
          try {
            const orders = await fetchAllPages(
              `${storeUrl}/admin/api/2024-01/orders.json?limit=250&status=any`,
              shopifyHeaders, "shopify"
            );

            const statusMap: Record<string, string> = {
              fulfilled: "delivered", unfulfilled: "confirmed", partial: "confirmed",
            };

            for (let i = 0; i < orders.length; i += BATCH_SIZE) {
              const batch = orders.slice(i, i + BATCH_SIZE).map((o: any) => ({
                tenant_id: tenantId,
                created_by: integration.created_by,
                order_number: `SH-${o.order_number || o.name || o.id}`,
                customer_name: o.customer
                  ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim()
                  : "Shopify Customer",
                customer_phone: o.phone || o.customer?.phone || "N/A",
                customer_email: o.customer?.email || o.email || "",
                customer_address: o.shipping_address?.address1 || "N/A",
                customer_city: o.shipping_address?.city || "",
                customer_zone: o.shipping_address?.province || "",
                customer_area: "",
                subtotal: parseFloat(o.subtotal_price) || 0,
                total: parseFloat(o.total_price) || 0,
                cod_amount: o.gateway === "cash_on_delivery" ? parseFloat(o.total_price) || 0 : 0,
                payment_status: o.financial_status === "paid" ? "paid" : "unpaid",
                order_status: o.cancelled_at ? "cancelled" : (statusMap[o.fulfillment_status || "unfulfilled"] || "pending"),
                external_id: String(o.id),
                external_platform: "shopify",
              }));

              const { error } = await supabase.from("pdm_orders").upsert(batch, {
                onConflict: "tenant_id,external_id,external_platform",
                ignoreDuplicates: false,
              });
              if (error) {
                itemsFailed += batch.length;
                errorDetails.push({ type: "orders_batch", error: error.message });
              } else {
                itemsSynced += batch.length;
              }
            }
          } catch (e: any) {
            errorDetails.push({ type: "orders", error: e.message });
          }
        }
      }

      const finalStatus = errorDetails.length > 0 ? (itemsSynced > 0 ? "success" : "failed") : "success";

      await supabase.from("pdm_sync_logs").update({
        status: finalStatus,
        items_synced: itemsSynced,
        items_failed: itemsFailed,
        error_details: errorDetails,
        completed_at: new Date().toISOString(),
      }).eq("id", syncLog?.id);

      await supabase.from("pdm_store_integrations").update({
        sync_status: finalStatus,
        last_synced_at: new Date().toISOString(),
        sync_error: errorDetails.length > 0 ? errorDetails[0]?.error : null,
      }).eq("id", integrationId);

      return new Response(JSON.stringify({
        success: true, itemsSynced, itemsFailed, errors: errorDetails,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (syncErr: any) {
      await supabase.from("pdm_sync_logs").update({
        status: "failed", error_details: [{ error: syncErr.message }],
        completed_at: new Date().toISOString(),
      }).eq("id", syncLog?.id);

      await supabase.from("pdm_store_integrations").update({
        sync_status: "failed", sync_error: syncErr.message,
      }).eq("id", integrationId);

      throw syncErr;
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
