// Ported from supabase/functions/pos-send-courier/index.ts
// Courier provider HTTP calls (Steadfast/Pathao/RedX) preserved verbatim.

import type { Env } from "../_shared/env";
import { json } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) return json({ error: "Unauthorized" }, { status: 400 });

    const sql = connect(env);

    const { orderIds, courierKey, tenantId } = await req.json() as any;
    if (!orderIds?.length || !courierKey || !tenantId) return json({ error: "Missing parameters" }, { status: 400 });

    // Get courier config (service-role; creds are server-only)
    const configRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT * FROM public.pdm_courier_configs
         WHERE tenant_id = ${tenantId} AND courier_key = ${courierKey} AND is_enabled = true
         LIMIT 1`);
    const config = configRows[0];
    if (!config) return json({ error: "Courier not configured or disabled" }, { status: 400 });

    const creds = config.credentials as Record<string, string>;
    const isSandbox = config.is_sandbox;

    // Get orders
    const orders = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT * FROM public.pdm_orders
         WHERE id IN ${tx(orderIds)} AND tenant_id = ${tenantId}`);
    if (!orders?.length) return json({ error: "No orders found" }, { status: 400 });

    const results: { orderId: string; success: boolean; trackingId?: string; message?: string }[] = [];

    for (const order of orders) {
      try {
        let trackingId = "";
        let consignmentId = "";

        if (courierKey === "steadfast") {
          const baseUrl = "https://portal.packzy.com/api/v1";
          const res = await fetch(`${baseUrl}/create_order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Api-Key": creds.api_key,
              "Secret-Key": creds.secret_key,
            },
            body: JSON.stringify({
              invoice: order.order_number,
              recipient_name: order.customer_name,
              recipient_phone: order.customer_phone,
              recipient_address: order.customer_address,
              cod_amount: order.cod_amount || 0,
              note: order.notes || "",
            }),
          });
          const data = await res.json() as any;
          if (data.status === 200) {
            trackingId = data.consignment?.tracking_code || "";
            consignmentId = data.consignment?.consignment_id || "";
          } else {
            throw new Error(data.message || "Steadfast API error");
          }
        } else if (courierKey === "pathao") {
          const baseUrl = isSandbox ? "https://hermes-api.p-stageenv.xyz" : "https://api-hermes.pathao.com";
          const tokenRes = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: creds.client_id,
              client_secret: creds.client_secret,
              username: creds.username,
              password: creds.password,
              grant_type: "password",
            }),
          });
          const tokenData = await tokenRes.json() as any;
          if (!tokenData.access_token) throw new Error("Pathao auth failed");

          const orderRes = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tokenData.access_token}`,
            },
            body: JSON.stringify({
              store_id: creds.store_id || "",
              merchant_order_id: order.order_number,
              recipient_name: order.customer_name,
              recipient_phone: order.customer_phone,
              recipient_address: order.customer_address,
              recipient_city: order.customer_city ? parseInt(order.customer_city) : 1,
              recipient_zone: order.customer_zone ? parseInt(order.customer_zone) : 1,
              delivery_type: 48,
              item_type: 2,
              item_quantity: 1,
              item_weight: 0.5,
              amount_to_collect: order.cod_amount || 0,
              special_instruction: order.notes || "",
            }),
          });
          const orderData = await orderRes.json() as any;
          if (orderData.data?.consignment_id) {
            consignmentId = orderData.data.consignment_id;
            trackingId = orderData.data.consignment_id;
          } else {
            throw new Error(orderData.message || "Pathao order creation failed");
          }
        } else if (courierKey === "redx") {
          const baseUrl = isSandbox ? "https://sandbox.redx.com.bd/v1.0.0-beta" : "https://openapi.redx.com.bd/v1.0.0-beta";
          const res = await fetch(`${baseUrl}/parcel`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "API-ACCESS-TOKEN": `Bearer ${creds.token}`,
            },
            body: JSON.stringify({
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              delivery_area: order.customer_city || "Dhaka",
              delivery_area_id: 1,
              customer_address: order.customer_address,
              merchant_invoice_id: order.order_number,
              cash_collection_amount: String(order.cod_amount || 0),
              parcel_weight: 500,
              instruction: order.notes || "",
              value: String(order.total),
            }),
          });
          const data = await res.json() as any;
          if (data.tracking_id) {
            trackingId = data.tracking_id;
            consignmentId = data.tracking_id;
          } else {
            throw new Error(data.message || "RedX API error");
          }
        }

        // Update order with courier info
        await withSession(sql, SERVICE, (tx) =>
          tx`UPDATE public.pdm_orders SET
               courier_name = ${courierKey},
               courier_tracking_id = ${trackingId},
               courier_consignment_id = ${consignmentId},
               courier_status = ${"booked"},
               order_status = ${"shipped"}
             WHERE id = ${order.id}`);

        results.push({ orderId: order.id, success: true, trackingId });
      } catch (err: any) {
        results.push({ orderId: order.id, success: false, message: err.message });
      }
    }

    return json({ results });
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 });
  }
}
