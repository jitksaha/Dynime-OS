import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_id, tenant_id } = await req.json();

    if (!document_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "document_id and tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch document
    const { data: doc, error: docErr } = await supabase
      .from("kb_documents")
      .select("*")
      .eq("id", document_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenAI key for embeddings
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY required for embeddings" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chunk the content
    const fullText = `${doc.title}\n\n${doc.content}`;
    const chunks = chunkText(fullText);

    // Delete existing embeddings for this document
    await supabase
      .from("kb_embeddings")
      .delete()
      .eq("document_id", document_id)
      .eq("tenant_id", tenant_id);

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
      return new Response(JSON.stringify({ error: "Failed to generate embeddings" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embData = await embeddingResp.json();

    // Insert embeddings
    const rows = embData.data.map((d: any, idx: number) => ({
      tenant_id,
      document_id,
      chunk_index: idx,
      chunk_text: chunks[idx],
      embedding: JSON.stringify(d.embedding),
    }));

    const { error: insertErr } = await supabase.from("kb_embeddings").insert(rows);

    if (insertErr) {
      console.error("Insert embeddings error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to store embeddings" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark document as embedded
    await supabase
      .from("kb_documents")
      .update({ embedded_at: new Date().toISOString() })
      .eq("id", document_id);

    return new Response(JSON.stringify({
      success: true,
      chunks_created: chunks.length,
      document_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-embed error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
