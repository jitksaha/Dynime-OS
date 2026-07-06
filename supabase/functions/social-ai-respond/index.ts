import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

function getProviderEndpoint(provider: string) {
  switch (provider) {
    case "anthropic":
      return { url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY" };
    case "google":
      return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GOOGLE_AI_API_KEY" };
    default:
      return { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY" };
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, message, tenant_id } = await req.json();

    if (!message || !tenant_id) {
      return new Response(JSON.stringify({ error: "message and tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startTime = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch agent config
    const { data: agentData } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    const agentConfig: AgentConfig = agentData || {
      default_mode: "auto",
      tone: "friendly",
      confidence_threshold: 0.75,
      strict_mode: true,
      blacklist_topics: [],
      fallback_message: "Let me confirm this with the team and get back to you shortly.",
      auto_cta_enabled: true,
      cta_options: ["Place order", "Book now", "Talk to team"],
      max_response_length: 500,
    };

    // Fetch AI config
    const { data: aiConfigData } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_config")
      .maybeSingle();

    const aiConfig: AIConfig & { api_keys?: Record<string, string> } = aiConfigData?.value
      ? {
          ai_provider: (aiConfigData.value as any).ai_provider || "openai",
          model: (aiConfigData.value as any).model || "gpt-4o",
          enabled: (aiConfigData.value as any).enabled !== false,
          max_tokens: (aiConfigData.value as any).max_tokens || 1024,
          temperature: (aiConfigData.value as any).temperature ?? 0.7,
          api_keys: (aiConfigData.value as any).api_keys || {},
        }
      : { ai_provider: "openai", model: "gpt-4o", enabled: true, max_tokens: 1024, temperature: 0.7 };

    if (!aiConfig.enabled) {
      return new Response(JSON.stringify({ error: "AI features are disabled" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key (prefer DB config, fallback to env)
    const { keyEnv } = getProviderEndpoint(aiConfig.ai_provider);
    const apiKey = aiConfig.api_keys?.[aiConfig.ai_provider] || Deno.env.get(keyEnv);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API key not configured. Add it in Super Admin → AI Configuration.` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RAG: Get embeddings for the query (simplified — use OpenAI embeddings API)
    let kbContext = "";
    try {
      // Generate embedding for the query
      const embeddingResp = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY") || apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: message }),
      });

      if (embeddingResp.ok) {
        const embData = await embeddingResp.json();
        const queryEmbedding = embData.data?.[0]?.embedding;

        if (queryEmbedding) {
          const { data: matches } = await supabase.rpc("match_kb_embeddings", {
            _tenant_id: tenant_id,
            _query_embedding: JSON.stringify(queryEmbedding),
            _match_threshold: 0.65,
            _match_count: 5,
          });

          if (matches?.length) {
            kbContext = matches.map((m: any) => m.chunk_text).join("\n\n---\n\n");
          }
        }
      }
    } catch (e) {
      console.warn("Embedding search failed, proceeding without RAG:", e);
    }

    // Get company name
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    const companyName = tenantData?.name || "Our Company";

    // Build system prompt
    const systemPrompt = buildSystemPrompt(agentConfig, companyName, kbContext);

    // Get conversation history
    let conversationMessages: any[] = [];
    if (conversation_id) {
      const { data: history } = await supabase
        .from("social_messages")
        .select("sender_type, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true })
        .limit(20);

      if (history) {
        conversationMessages = history.map((m: any) => ({
          role: m.sender_type === "customer" ? "user" : "assistant",
          content: m.content,
        }));
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
      { role: "user", content: message },
    ];

    // Call AI
    let aiResponse = "";
    let confidence = 0;
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
          max_tokens: aiConfig.max_tokens,
          temperature: aiConfig.temperature,
          system: systemMsgs.map((m) => m.content).join("\n"),
          messages: nonSystemMsgs,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error("Anthropic error:", err);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      aiResponse = data.content?.[0]?.text || "";
    } else {
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiConfig.model,
          messages,
          max_tokens: aiConfig.max_tokens,
          temperature: aiConfig.temperature,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`${aiConfig.ai_provider} error:`, err);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      aiResponse = data.choices?.[0]?.message?.content || "";
    }

    // Parse confidence from response
    let responseText = aiResponse;
    try {
      const parts = aiResponse.split("|||");
      if (parts.length === 2) {
        responseText = parts[0].trim();
        const meta = JSON.parse(parts[1].trim());
        confidence = meta.confidence || 0;
      }
    } catch {
      confidence = 0.5; // Default if parsing fails
    }

    // Check escalation
    const shouldEscalate = confidence < agentConfig.confidence_threshold;
    const responseTimeMs = Date.now() - startTime;

    // Log the response
    await supabase.from("agent_response_logs").insert({
      tenant_id,
      conversation_id: conversation_id || null,
      input_text: message,
      output_text: responseText,
      confidence,
      kb_sources: kbContext ? { chunks: kbContext.split("\n\n---\n\n").length } : null,
      model_used: aiConfig.model,
      was_escalated: shouldEscalate,
      response_time_ms: responseTimeMs,
    });

    // If escalation needed, create escalation entry
    if (shouldEscalate && conversation_id) {
      await supabase.from("escalation_queue").insert({
        tenant_id,
        conversation_id,
        reason: `Low AI confidence: ${(confidence * 100).toFixed(0)}%`,
        priority: confidence < 0.3 ? "high" : "medium",
        status: "pending",
      });

      // Use fallback message if strict mode
      if (agentConfig.strict_mode) {
        responseText = agentConfig.fallback_message;
      }
    }

    // Track analytics
    await supabase.from("social_analytics_events").insert({
      tenant_id,
      event_type: "ai_response",
      conversation_id,
      data: {
        confidence,
        response_time_ms: responseTimeMs,
        was_escalated: shouldEscalate,
        model: aiConfig.model,
        kb_matched: kbContext ? true : false,
      },
    });

    return new Response(JSON.stringify({
      response: responseText,
      confidence,
      escalated: shouldEscalate,
      mode: agentConfig.default_mode,
      response_time_ms: responseTimeMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("social-ai-respond error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
