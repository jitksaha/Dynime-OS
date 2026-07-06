import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

const BATCH_SIZE = 50;

async function fetchAllPages(url: string, headers: Record<string, string>, platform: string): Promise<any[]> {
  const allItems: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { headers });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    const data: any = await res.json();

    if (platform === "woocommerce") {
      allItems.push(...(Array.isArray(data) ? data : []));
      const linkHeader: string | null = res.headers.get("Link");
      const nextMatch: RegExpMatchArray | null = linkHeader?.match(/<([^>]+)>;\s*rel="next"/) || null;
      nextUrl = nextMatch ? nextMatch[1] : null;
    } else if (platform === "shopify") {
      const key = Object.keys(data)[0]; // "products" or "orders"
      allItems.push(...(data[key] || []));
      const linkHeader: string | null = res.headers.get("Link");
      const nextMatch: RegExpMatchArray | null = linkHeader?.match(/<([^>]+)>;\s*rel="next"/) || null;
      nextUrl = nextMatch ? nextMatch[1] : null;
    } else {
      break;
    }
  }
  return allItems;
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { integrationId, syncType = "full", tenantId } = await req.json() as Record<string, any>;

    const { data: integration, error: intErr } = await withSession(sql, SERVICE, async (tx) => {
      const result = await tx`SELECT * FROM public.pdm_store_integrations WHERE id = ${integrationId}`;
      return { data: result[0] || null, error: null };
    });

    if (intErr || !integration) throw new Error("Integration not found");

    // Create sync log (import only)
    const { data: syncLog } = await withSession(sql, SERVICE, async (tx) => {
      const result = await tx`INSERT INTO public.pdm_sync_logs (tenant_id, integration_id, sync_type, direction, status) VALUES (${tenantId}, ${integrationId}, ${syncType}, 'import', 'running') RETURNING id`;
      return { data: result[0] || null };
    });

    await withSession(sql, SERVICE, async (tx) => {
      await tx`UPDATE public.pdm_store_integrations SET sync_status = 'syncing' WHERE id = ${integrationId}`;
    });

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

              const _insertRes = await withSession(sql, SERVICE, async (tx) => {
                const result = await tx`INSERT INTO public.pdm_products (tenant_id, created_by, name, sku, category, price, cost_price, stock_quantity, weight_grams, is_active, external_id, external_platform, external_url) VALUES ${tx(batch as any)} ON CONFLICT (tenant_id, external_id, external_platform) DO UPDATE SET name = EXCLUDED.name, sku = EXCLUDED.sku, category = EXCLUDED.category, price = EXCLUDED.price, cost_price = EXCLUDED.cost_price, stock_quantity = EXCLUDED.stock_quantity, weight_grams = EXCLUDED.weight_grams, is_active = EXCLUDED.is_active, external_url = EXCLUDED.external_url`;
                return null as any;
              });

              itemsSynced += batch.length;
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

              const _insertRes = await withSession(sql, SERVICE, async (tx) => {
                const result = await tx`INSERT INTO public.pdm_orders (tenant_id, created_by, order_number, customer_name, customer_phone, customer_email, customer_address, customer_city, customer_zone, customer_area, subtotal, total, cod_amount, payment_status, order_status, external_id, external_platform) VALUES ${tx(batch as any)} ON CONFLICT (tenant_id, external_id, external_platform) DO UPDATE SET customer_name = EXCLUDED.customer_name, customer_phone = EXCLUDED.customer_phone, customer_email = EXCLUDED.customer_email, customer_address = EXCLUDED.customer_address, customer_city = EXCLUDED.customer_city, customer_zone = EXCLUDED.customer_zone, customer_area = EXCLUDED.customer_area, subtotal = EXCLUDED.subtotal, total = EXCLUDED.total, cod_amount = EXCLUDED.cod_amount, payment_status = EXCLUDED.payment_status, order_status = EXCLUDED.order_status`;
                return null as any;
              });

              itemsSynced += batch.length;
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

              const _insertRes = await withSession(sql, SERVICE, async (tx) => {
                const result = await tx`INSERT INTO public.pdm_products (tenant_id, created_by, name, sku, category, price, cost_price, stock_quantity, weight_grams, is_active, external_id, external_platform, external_url) VALUES ${tx(batch as any)} ON CONFLICT (tenant_id, external_id, external_platform) DO UPDATE SET name = EXCLUDED.name, sku = EXCLUDED.sku, category = EXCLUDED.category, price = EXCLUDED.price, cost_price = EXCLUDED.cost_price, stock_quantity = EXCLUDED.stock_quantity, weight_grams = EXCLUDED.weight_grams, is_active = EXCLUDED.is_active, external_url = EXCLUDED.external_url`;
                return null as any;
              });

              itemsSynced += batch.length;
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
                customer_name: o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "Shopify Customer",
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

              const _insertRes = await withSession(sql, SERVICE, async (tx) => {
                const result = await tx`INSERT INTO public.pdm_orders (tenant_id, created_by, order_number, customer_name, customer_phone, customer_email, customer_address, customer_city, customer_zone, customer_area, subtotal, total, cod_amount, payment_status, order_status, external_id, external_platform) VALUES ${tx(batch as any)} ON CONFLICT (tenant_id, external_id, external_platform) DO UPDATE SET customer_name = EXCLUDED.customer_name, customer_phone = EXCLUDED.customer_phone, customer_email = EXCLUDED.customer_email, customer_address = EXCLUDED.customer_address, customer_city = EXCLUDED.customer_city, customer_zone = EXCLUDED.customer_zone, customer_area = EXCLUDED.customer_area, subtotal = EXCLUDED.subtotal, total = EXCLUDED.total, cod_amount = EXCLUDED.cod_amount, payment_status = EXCLUDED.payment_status, order_status = EXCLUDED.order_status`;
                return null as any;
              });

              itemsSynced += batch.length;
            }
          } catch (e: any) {
            errorDetails.push({ type: "orders", error: e.message });
          }
        }
      }

      const finalStatus = errorDetails.length > 0 ? (itemsSynced > 0 ? "success" : "failed") : "success";

      await withSession(sql, SERVICE, async (tx) => {
        await tx`UPDATE public.pdm_sync_logs SET status = ${finalStatus}, items_synced = ${itemsSynced}, items_failed = ${itemsFailed}, error_details = ${tx(errorDetails as any)}, completed_at = ${new Date().toISOString()} WHERE id = ${syncLog?.id}`;
        await tx`UPDATE public.pdm_store_integrations SET sync_status = ${finalStatus}, last_synced_at = ${new Date().toISOString()}, sync_error = ${errorDetails.length > 0 ? (errorDetails[0] as any)?.error : null} WHERE id = ${integrationId}`;
      });

      return new Response(JSON.stringify({
        success: true, itemsSynced, itemsFailed, errors: errorDetails,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (syncErr: any) {
      await withSession(sql, SERVICE, async (tx) => {
        await tx`UPDATE public.pdm_sync_logs SET status = 'failed', error_details = ${tx([{ error: syncErr.message }] as any)}, completed_at = ${new Date().toISOString()} WHERE id = ${syncLog?.id}`;
        await tx`UPDATE public.pdm_store_integrations SET sync_status = 'failed', sync_error = ${syncErr.message} WHERE id = ${integrationId}`;
      });
      throw syncErr;
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}