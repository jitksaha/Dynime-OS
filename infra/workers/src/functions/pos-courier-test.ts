// Ported from supabase/functions/pos-courier-test/index.ts
// Stateless connectivity test — no DB. Courier provider HTTP calls preserved verbatim.

import type { Env } from "../_shared/env";
import { json } from "../_shared/cors";

async function safeJsonParse(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) as any };
  } catch {
    return { ok: res.ok, status: res.status, data: null as any, text: text.slice(0, 200) };
  }
}

export async function handler(req: Request, _env: Env): Promise<Response> {
  try {
    const { courierKey, credentials, isSandbox } = await req.json() as any;
    if (!courierKey || !credentials) throw new Error("Missing courierKey or credentials");

    if (courierKey === "steadfast") {
      const apiKey = credentials.api_key;
      const secretKey = credentials.secret_key;
      if (!apiKey || !secretKey) throw new Error("Steadfast requires both API Key and Secret Key");
      const baseUrl = "https://portal.packzy.com/api/v1";
      const res = await fetch(`${baseUrl}/get_balance`, {
        headers: { "Api-Key": apiKey, "Secret-Key": secretKey, "Content-Type": "application/json" },
      });
      const parsed = await safeJsonParse(res);
      console.log("Steadfast response:", parsed.status, JSON.stringify(parsed.data || parsed.text));
      if (!parsed.data) throw new Error(`Steadfast returned non-JSON response (HTTP ${parsed.status}). Check your credentials.`);
      if (parsed.data.status === 200) {
        return json({ success: true, message: `Steadfast connected. Balance: ${parsed.data.current_balance ?? "N/A"}` });
      }
      throw new Error(parsed.data.message || `Steadfast API error (HTTP ${parsed.status})`);
    }

    if (courierKey === "pathao") {
      const { client_id, client_secret, username, password } = credentials;
      if (!client_id || !client_secret || !username || !password) throw new Error("Pathao requires Client ID, Client Secret, Merchant Email and Password");
      const baseUrl = isSandbox ? "https://hermes-api.p-stageenv.xyz" : "https://api-hermes.pathao.com";
      const res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id, client_secret, username, password, grant_type: "password" }),
      });
      const parsed = await safeJsonParse(res);
      console.log("Pathao response:", parsed.status, JSON.stringify(parsed.data || parsed.text));
      if (!parsed.data) throw new Error(`Pathao returned non-JSON response (HTTP ${parsed.status}). Check your credentials.`);
      if (parsed.data.access_token) {
        return json({ success: true, message: "Pathao connected successfully" });
      }
      const errMsg = parsed.data.message || parsed.data.error || "Invalid Pathao credentials";
      throw new Error(`${errMsg}. ${isSandbox ? "Try turning OFF Sandbox mode if you have production credentials." : "Try turning ON Sandbox mode if you have sandbox/test credentials."}`);
    }

    if (courierKey === "redx") {
      const token = credentials.token;
      if (!token) throw new Error("RedX requires a Token");
      const baseUrl = isSandbox ? "https://sandbox.redx.com.bd/v1.0.0-beta" : "https://openapi.redx.com.bd/v1.0.0-beta";
      const res = await fetch(`${baseUrl}/areas`, {
        headers: { "API-ACCESS-TOKEN": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const parsed = await safeJsonParse(res);
      console.log("RedX response:", parsed.status, JSON.stringify(parsed.data || parsed.text));
      if (parsed.ok) {
        return json({ success: true, message: "RedX connected successfully" });
      }
      if (!parsed.data) throw new Error(`RedX returned non-JSON response (HTTP ${parsed.status}). Check your credentials.`);
      throw new Error(parsed.data.message || "Invalid RedX credentials");
    }

    throw new Error(`Unknown courier: ${courierKey}`);
  } catch (err: any) {
    console.error("pos-courier-test error:", err.message);
    return json({ success: false, message: err.message }, { status: 200 });
  }
}
