#!/usr/bin/env node
// Phase 3 — Copy every object from Supabase Storage into Cloudflare R2,
// preserving the "<bucket>/<path>" key layout so only the URL host changes.
//
// Requires Node 18+ (global fetch). Install one dep:  npm i @aws-sdk/client-s3
//
// Env (set in .env.migrate / shell):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service-role key (lists + downloads private buckets)
//   R2_ACCOUNT_ID                Cloudflare account id
//   R2_ACCESS_KEY_ID             R2 S3 API token key
//   R2_SECRET_ACCESS_KEY         R2 S3 API token secret
//   R2_BUCKET                    dynime-storage  (default)
//
// R2 S3 creds: Cloudflare dashboard -> R2 -> Manage R2 API Tokens.

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET = "dynime-storage",
} = process.env;

for (const [k, v] of Object.entries({
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
})) {
  if (!v) { console.error(`Missing env ${k}`); process.exit(1); }
}

const sb = (path, init = {}) =>
  fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
  });

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// List every bucket.
async function listBuckets() {
  const res = await sb("/storage/v1/bucket");
  if (!res.ok) throw new Error(`list buckets: ${res.status} ${await res.text()}`);
  return res.json();
}

// Page through all objects in a bucket (Storage list is 100/page by default).
async function* listObjects(bucket, prefix = "") {
  let offset = 0;
  const limit = 100;
  for (;;) {
    const res = await sb(`/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefix, limit, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list ${bucket}: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) return;
    for (const row of rows) {
      // A row with no id/metadata is a "folder" — recurse into it.
      if (row.id === null && row.metadata === null) {
        yield* listObjects(bucket, `${prefix}${row.name}/`);
      } else {
        yield `${prefix}${row.name}`;
      }
    }
    if (rows.length < limit) return;
    offset += limit;
  }
}

async function existsInR2(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; }
  catch { return false; }
}

async function migrate() {
  const buckets = await listBuckets();
  console.log(`Found ${buckets.length} bucket(s): ${buckets.map(b => b.name).join(", ")}`);
  let copied = 0, skipped = 0, failed = 0;

  for (const bucket of buckets) {
    for await (const path of listObjects(bucket.name)) {
      const key = `${bucket.name}/${path}`;        // preserve <bucket>/<path>
      if (await existsInR2(key)) { skipped++; continue; }
      try {
        const dl = await sb(`/storage/v1/object/${bucket.name}/${path}`);
        if (!dl.ok) throw new Error(`download ${dl.status}`);
        const body = Buffer.from(await dl.arrayBuffer());
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: body,
          ContentType: dl.headers.get("content-type") || "application/octet-stream",
        }));
        copied++;
        if (copied % 50 === 0) console.log(`  …${copied} copied`);
      } catch (e) {
        failed++;
        console.error(`  FAIL ${key}: ${e.message}`);
      }
    }
  }
  console.log(`\nDone. copied=${copied} skipped=${skipped} failed=${failed}`);
  if (failed) process.exit(2);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
