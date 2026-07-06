// Ported from supabase/functions/kb-embed/index.ts — chunks a KB document, generates
// OpenAI embeddings, and stores them in kb_embeddings (pgvector). Original had no auth
// gate and used the service-role client throughout. Behaviour preserved 1:1.
//   - createClient(SERVICE_ROLE) ops  becomes  connect(env) + withSession(SERVICE)
//   - Supabase query-builder ops        becomes  raw SQL via tx tagged templates
//   - Deno.env.get("OPENAI_API_KEY")    becomes  (env as any).OPENAI_API_KEY (Worker secret)

import type { Env } from "../_shared/env";
import { json } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";

function chunkText(text: string, maxChunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Overlap: keep last part
      const words = current.split(" ");
      current = words.slice(-Math.ceil(overlap / 5)).join(" ") + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export async function handler(req: Request, env: Env): Promise<Response> {
  try {
    const { document_id, tenant_id } = await req.json() as any;

    if (!document_id || !tenant_id) {
      return json({ error: "document_id and tenant_id required" }, { status: 400 });
    }

    const sql = connect(env);

    // Fetch document
    const docRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT * FROM kb_documents WHERE id = ${document_id} AND tenant_id = ${tenant_id}`);
    const doc = docRows[0];
    if (!doc) {
      return json({ error: "Document not found" }, { status: 404 });
    }

    // Get OpenAI key for embeddings (Worker secret)
    const openaiKey = (env as any).OPENAI_API_KEY;
    if (!openaiKey) {
      return json({ error: "OPENAI_API_KEY required for embeddings" }, { status: 500 });
    }

    // Chunk the content
    const fullText = `${doc.title}\n\n${doc.content}`;
    const chunks = chunkText(fullText);

    // Delete existing embeddings for this document
    await withSession(sql, SERVICE, (tx) =>
      tx`DELETE FROM kb_embeddings WHERE document_id = ${document_id} AND tenant_id = ${tenant_id}`);

    // Generate embeddings for all chunks
    const embeddingResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: chunks,
      }),
    });

    if (!embeddingResp.ok) {
      const err = await embeddingResp.text();
      console.error("Embedding API error:", err);
      return json({ error: "Failed to generate embeddings" }, { status: 500 });
    }

    const embData = await embeddingResp.json() as any;

    // Insert embeddings.
    // REVIEW: Supabase stored the embedding as JSON.stringify(d.embedding) into the
    // pgvector `embedding` column. Here we insert the same text form with an explicit
    // ::vector cast so postgres.js parameterization lands in the vector column.
    try {
      await withSession(sql, SERVICE, async (tx) => {
        for (let idx = 0; idx < embData.data.length; idx++) {
          const d = embData.data[idx];
          await tx`INSERT INTO kb_embeddings (tenant_id, document_id, chunk_index, chunk_text, embedding)
            VALUES (${tenant_id}, ${document_id}, ${idx}, ${chunks[idx]}, ${JSON.stringify(d.embedding)}::vector)`;
        }
      });
    } catch (insertErr) {
      console.error("Insert embeddings error:", insertErr);
      return json({ error: "Failed to store embeddings" }, { status: 500 });
    }

    // Mark document as embedded
    await withSession(sql, SERVICE, (tx) =>
      tx`UPDATE kb_documents SET embedded_at = ${new Date().toISOString()} WHERE id = ${document_id}`);

    return json({
      success: true,
      chunks_created: chunks.length,
      document_id,
    });
  } catch (e) {
    console.error("kb-embed error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
