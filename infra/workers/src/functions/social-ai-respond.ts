// Port of `supabase/functions/social-ai-respond/index.ts`.
// AI-powered social media response generator. RAG uses OpenAI embeddings + vector
// search against the knowledge base (match_kb_embeddings RPC → raw SQL over the
// `knowledge_base` tables with the `vector` extension and cosine similarity).
// REVIEW: The RPC call is replaced by an inline vector cosine similarity query —
// adjust the SQL column names if your schema differs.

import type { Env } from "../_shared/env";
import { corsHeaders, json, error } from "../_shared/cors";
import { connect, withSession, SERVICE } from "../_shared/db";
import { getPlatformSetting } from "../_shared/secrets";

interface AgentConfig {
  default_mode: string;
  tone: string;
  custom_tone_instructions?: string;
  confidence_threshold: number;
  strict_mode: boolean;
  blacklist_topics: string[];
  greeting_template?: string;
  fallback_message: string;
  auto_cta_enabled: boolean;
  cta_options: string[];
  max_response_length: number;
}

interface AIConfig {
  ai_provider: string;
  model: string;
  enabled: boolean;
  max_tokens?: number;
  temperature?: number;
  api_keys?: Record<string, string>;
}

function getProviderEndpoint(provider: string): { url: string; keyEnv: string } {
  switch (provider) {
    case "anthropic": return { url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY" };
    case "google": return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GOOGLE_AI_API_KEY" };
    default: return { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY" };
  }
}

function buildSystemPrompt(agentConfig: AgentConfig, companyName: string, kbContext: string): string {
  const toneMap: Record<string, string> = {
    friendly: "warm, approachable, and conversational",
    professional: "polished, respectful, and business-like",
    sales_driven: "enthusiastic, persuasive, and action-oriented",
    premium: "refined, exclusive, and sophisticated",
    custom: agentConfig.custom_tone_instructions || "natural and helpful",
  };
  const toneDesc = toneMap[agentConfig.tone] || toneMap.friendly;

  return `You are an AI Social Media Manager representing "${companyName}".

PRIMARY OBJECTIVE: Help users, convert leads into customers, and protect brand trust.

COMMUNICATION STYLE: Be ${toneDesc}. Match the user's tone. Keep responses concise but valuable. Every response must feel like it was written by a real human social media manager.

DATA RESTRICTION — CRITICAL:
You MUST ONLY use the following verified company data to answer questions. If the answer is not explicitly available in this data, say: "${agentConfig.fallback_message}"
NEVER guess. NEVER fabricate information.

===== COMPANY KNOWLEDGE BASE =====
${kbContext || "No knowledge base data available yet. Only respond with general greetings and direct users to contact the team."}
===== END KNOWLEDGE BASE =====

INTENT HANDLING:
- SALES/INQUIRY: Answer clearly, highlight value, guide toward action
- SUPPORT/ISSUE: Acknowledge problem, apologize if needed, offer next step
- PRICE SENSITIVE: Justify value, offer alternatives if available
- UNKNOWN: Say "${agentConfig.fallback_message}"

${agentConfig.blacklist_topics.length > 0 ? `BLACKLISTED TOPICS (never discuss): ${agentConfig.blacklist_topics.join(", ")}` : ""}

${agentConfig.auto_cta_enabled ? `When appropriate, suggest one of these actions: ${JSON.stringify(agentConfig.cta_options)}` : ""}

RESPONSE RULES:
- Max ${agentConfig.max_response_length} characters
- No markdown formatting (plain text for social media)
- Include a confidence assessment as a JSON suffix: {"confidence": 0.0-1.0}
- Format: [your response text]|||{"confidence": 0.85}`;
}

async function searchKB(sql: ReturnType<typeof connect>, tenant_id: string, query: string, apiKey: string): Promise<string> {
  try {
    // Generate embedding.
    const embResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
    });
    if (!embResp.ok) return "";
    const embData: any = await embResp.json();
    const queryEmbedding = embData.data?.[0]?.embedding;
    if (!queryEmbedding) return "";

    // REVIEW: adjust column names to match your actual kb tables.
    // The original used an RPC `match_kb_embeddings`; here we inline a cosine-similarity query.
    const matches = await withSession(sql, SERVICE, async (tx) => {
      const r = await tx`
        SELECT chunk_text, 1 - (embedding <=> ${queryEmbedding}::vector) AS sim
        FROM public.knowledge_base_chunks
        WHERE tenant_id = ${tenant_id}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT 5`;
      return (r as any[]).filter((m) => m.sim > 0.65);
    });
    if (!matches.length) return "";
    return matches.map((m: any) => m.chunk_text).join("\n\n---\n\n");
  } catch (e) {
    console.warn("Embedding search failed, proceeding without RAG:", e);
    return "";
  }
}

export async function handler(req: Request, env: Env): Promise<Response> {
  const sql = connect(env);
  try {
    const { conversation_id, message, tenant_id } = await req.json() as Record<string, string>;

    if (!message || !tenant_id) {
      return error("message and tenant_id required", 400);
    }

    const startTime = Date.now();

    // Fetch agent config.
    const agentRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT value FROM public.platform_settings WHERE key = 'agent_configs' LIMIT 1`);
    const agentPlatformData = (agentRows[0] as any)?.value;
    const agentConfig: AgentConfig = agentPlatformData || {
      default_mode: "auto", tone: "friendly", confidence_threshold: 0.75, strict_mode: true,
      blacklist_topics: [], fallback_message: "Let me confirm this with the team and get back to you shortly.",
      auto_cta_enabled: true, cta_options: ["Place order", "Book now", "Talk to team"], max_response_length: 500,
    };

    const aiCfg = await getPlatformSetting<AIConfig>(sql, "ai_config");
    const aiConfig: AIConfig = aiCfg || {
      ai_provider: "openai", model: "gpt-4o", enabled: true, max_tokens: 1024, temperature: 0.7,
    };

    if (!aiConfig.enabled) {
      return error("AI features are disabled", 403);
    }

    const { keyEnv } = getProviderEndpoint(aiConfig.ai_provider);
    const apiKey = aiConfig.api_keys?.[aiConfig.ai_provider] || (env as any)[keyEnv];
    if (!apiKey) {
      return error("API key not configured. Add it in Super Admin → AI Configuration.", 500);
    }

    const kbContext = await searchKB(sql, tenant_id, message, apiKey);

    // Fetch tenant name.
    const tenantRows = await withSession(sql, SERVICE, (tx) =>
      tx`SELECT name FROM public.tenants WHERE id = ${tenant_id} LIMIT 1`);
    const companyName = (tenantRows[0] as any)?.name || "Our Company";

    const systemPrompt = buildSystemPrompt(agentConfig, companyName, kbContext);

    // Conversation history.
    let conversationMessages: any[] = [];
    if (conversation_id) {
      const history = await withSession(sql, SERVICE, (tx) =>
        tx`SELECT sender_type, content FROM public.social_messages
           WHERE conversation_id = ${conversation_id}
           ORDER BY created_at ASC LIMIT 20`);
      conversationMessages = (history as any[]).map((m) => ({
        role: m.sender_type === "customer" ? "user" : "assistant",
        content: m.content,
      }));
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
      { role: "user", content: message },
    ];

    let aiResponse = "";
    const { url } = getProviderEndpoint(aiConfig.ai_provider);

    if (aiConfig.ai_provider === "anthropic") {
      const systemMsgs = messages.filter((m) => m.role === "system");
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: aiConfig.model,
          max_tokens: aiConfig.max_tokens || 1024,
          temperature: aiConfig.temperature ?? 0.7,
          system: systemMsgs.map((m) => m.content).join("\n"),
          messages: nonSystemMsgs,
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.error("Anthropic error:", err);
        return error("AI service error", 500);
      }
      const data: any = await resp.json();
      aiResponse = data.content?.[0]?.text || "";
    } else {
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiConfig.model,
          messages,
          max_tokens: aiConfig.max_tokens || 1024,
          temperature: aiConfig.temperature ?? 0.7,
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.error(`${aiConfig.ai_provider} error:`, err);
        return error("AI service error", 500);
      }
      const data: any = await resp.json();
      aiResponse = data.choices?.[0]?.message?.content || "";
    }

    let responseText = aiResponse;
    let confidence = 0;
    try {
      const parts = aiResponse.split("|||");
      if (parts.length === 2) {
        responseText = parts[0].trim();
        confidence = JSON.parse(parts[1].trim()).confidence || 0;
      }
    } catch {
      confidence = 0.5;
    }

    const shouldEscalate = confidence < agentConfig.confidence_threshold;
    const responseTimeMs = Date.now() - startTime;

    // Log response.
    await withSession(sql, SERVICE, (tx) =>
      tx`INSERT INTO public.agent_response_logs
         (tenant_id, conversation_id, input_text, output_text, confidence,
          kb_sources, model_used, was_escalated, response_time_ms)
         VALUES (${tenant_id as any}, ${conversation_id || null as any}, ${message as any}, ${responseText as any},
                 ${confidence as any}, ${(kbContext ? { chunks: kbContext.split("\n\n---\n\n").length } : null) as any},
                 ${aiConfig.model as any}, ${shouldEscalate as any}, ${responseTimeMs as any})`);

    if (shouldEscalate && conversation_id) {
      await withSession(sql, SERVICE, (tx) =>
        tx`INSERT INTO public.escalation_queue
           (tenant_id, conversation_id, reason, priority, status)
           VALUES (${tenant_id}, ${conversation_id},
                   ${`Low AI confidence: ${(confidence * 100).toFixed(0)}%`},
                   ${confidence < 0.3 ? "high" : "medium"}, 'pending')`);
      if (agentConfig.strict_mode) responseText = agentConfig.fallback_message;
    }

    // Analytics.
    await withSession(sql, SERVICE, (tx) =>
      tx`INSERT INTO public.social_analytics_events
         (tenant_id, event_type, conversation_id, data)
         VALUES (${tenant_id}, 'ai_response', ${conversation_id || null},
                 ${tx.json({ confidence, response_time_ms: responseTimeMs, was_escalated: shouldEscalate, model: aiConfig.model, kb_matched: !!kbContext })})`);

    return json({
      response: responseText,
      confidence,
      escalated: shouldEscalate,
      mode: agentConfig.default_mode,
      response_time_ms: responseTimeMs,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
