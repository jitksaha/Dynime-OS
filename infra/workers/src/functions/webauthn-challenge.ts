// Ported from supabase/functions/webauthn-challenge/index.ts.
// User identity comes from the Worker-issued token (contextFromRequest); passkey/
// challenge rows are written through the service-role session. WebAuthn challenge
// logic preserved verbatim (Web Crypto getRandomValues + base64url).

import type { Env } from "../_shared/env";
import { corsHeaders } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { contextFromRequest } from "../_shared/auth-context";

const J = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// base64url encoding via Web Crypto random bytes.
function randomChallenge(): string {
  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);
  return btoa(String.fromCharCode(...challengeBytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    // RP config from Worker secrets (used by callers building the WebAuthn options).
    const _rpId = (env as any).WEBAUTHN_RP_ID;     // Worker secret
    const _rpName = (env as any).WEBAUTHN_RP_NAME;  // Worker secret
    const _origin = (env as any).WEBAUTHN_ORIGIN;   // Worker secret

    const ctx = await contextFromRequest(req, env);
    if (!ctx.userId) throw new Error("Unauthorized");
    const userId = ctx.userId;
    const userEmail = ctx.email;

    const body = await req.json() as any;
    const { action, credentialId, publicKey, friendlyName, transports } = body;

    if (action === "generate-registration-challenge") {
      const challenge = randomChallenge();

      const existing = await withSession(sql, SERVICE, async (tx) => {
        await tx`DELETE FROM public.webauthn_challenges WHERE user_id = ${userId}`;
        await tx`INSERT INTO public.webauthn_challenges ${tx({ user_id: userId, challenge, type: "registration" })}`;
        return tx`SELECT credential_id FROM public.user_passkeys WHERE user_id = ${userId}`;
      });

      return J({
        challenge, userId, userEmail,
        excludeCredentials: (existing || []).map((c: any) => c.credential_id),
      });
    }

    if (action === "generate-authentication-challenge") {
      const challenge = randomChallenge();

      const credentials = await withSession(sql, SERVICE, async (tx) => {
        await tx`DELETE FROM public.webauthn_challenges WHERE user_id = ${userId}`;
        await tx`INSERT INTO public.webauthn_challenges ${tx({ user_id: userId, challenge, type: "authentication" })}`;
        return tx`SELECT credential_id, transports FROM public.user_passkeys WHERE user_id = ${userId}`;
      });

      return J({
        challenge,
        allowCredentials: (credentials || []).map((c: any) => ({ id: c.credential_id, transports: c.transports || [] })),
      });
    }

    if (action === "verify-registration") {
      await withSession(sql, SERVICE, async (tx) => {
        const challengeRows = await tx`
          SELECT * FROM public.webauthn_challenges
          WHERE user_id = ${userId} AND type = 'registration'
          ORDER BY created_at DESC LIMIT 1`;
        const challengeData = challengeRows[0];

        if (!challengeData) throw new Error("No active challenge found");
        if (Date.now() - new Date(challengeData.created_at).getTime() > 5 * 60 * 1000) throw new Error("Challenge expired");

        await tx`INSERT INTO public.user_passkeys ${tx({
          user_id: userId,
          credential_id: credentialId,
          public_key: publicKey,
          friendly_name: friendlyName || "My Passkey",
          transports: transports || [],
        })}`;

        await tx`DELETE FROM public.webauthn_challenges WHERE user_id = ${userId}`;
      });
      return J({ success: true });
    }

    if (action === "verify-authentication") {
      const friendly = await withSession(sql, SERVICE, async (tx) => {
        const credRows = await tx`
          SELECT * FROM public.user_passkeys
          WHERE credential_id = ${credentialId} AND user_id = ${userId} LIMIT 1`;
        const cred = credRows[0];
        if (!cred) throw new Error("Credential not found");

        await tx`UPDATE public.user_passkeys SET sign_count = ${cred.sign_count + 1}, last_used_at = ${new Date().toISOString()} WHERE id = ${cred.id}`;
        await tx`DELETE FROM public.webauthn_challenges WHERE user_id = ${userId}`;
        return cred.friendly_name;
      });

      return J({ success: true, friendlyName: friendly });
    }

    throw new Error("Invalid action");
  } catch (err) {
    return J({ error: err instanceof Error ? err.message : "Unknown error" }, 400);
  }
}
