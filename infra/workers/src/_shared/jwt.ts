// Session JWTs issued by our auth Worker (replaces Supabase-issued JWTs).
// Access token = short-lived bearer; refresh token = opaque, rotated, stored in KV.

import { SignJWT, jwtVerify } from "jose";
import type { Env } from "./env";

export interface AccessClaims {
  sub: string;            // user id
  email?: string | null;
  role: "authenticated" | "service_role";
  tenant_id?: string | null;
  [k: string]: unknown;
}

function secret(env: Env): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signAccessToken(env: Env, claims: AccessClaims): Promise<string> {
  const ttl = parseInt(env.JWT_ACCESS_TTL || "3600", 10);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.JWT_ISSUER)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret(env));
}

export async function verifyAccessToken(env: Env, token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(env), { issuer: env.JWT_ISSUER });
    return payload as unknown as AccessClaims;
  } catch {
    return null;
  }
}

// Refresh tokens are random opaque strings persisted in KV (so we can revoke/rotate).
export function newRefreshToken(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) =>
    ({ "+": "-", "/": "_", "=": "" }[c] as string));
}

const REFRESH_PREFIX = "refresh:";

export async function storeRefreshToken(env: Env, token: string, userId: string) {
  const ttl = parseInt(env.JWT_REFRESH_TTL || "2592000", 10);
  await env.CACHE.put(REFRESH_PREFIX + token, userId, { expirationTtl: ttl });
}

export async function consumeRefreshToken(env: Env, token: string): Promise<string | null> {
  const key = REFRESH_PREFIX + token;
  const userId = await env.CACHE.get(key);
  if (userId) await env.CACHE.delete(key); // single-use: rotate on every refresh
  return userId;
}
