
-- ============================================
-- KNOWLEDGE BASE
-- ============================================

CREATE TABLE public.kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📄',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
CREATE POLICY "Tenant members can manage kb_categories" ON public.kb_categories FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'general',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  embedded_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage kb_documents" ON public.kb_documents FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.kb_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage kb_embeddings" ON public.kb_embeddings FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE INDEX idx_kb_embeddings_tenant ON public.kb_embeddings(tenant_id);
CREATE INDEX idx_kb_embeddings_document ON public.kb_embeddings(document_id);

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_kb_embeddings(
  _tenant_id UUID,
  _query_embedding vector(1536),
  _match_threshold FLOAT DEFAULT 0.7,
  _match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    ke.id,
    ke.document_id,
    ke.chunk_text,
    (1 - (ke.embedding <=> _query_embedding))::float AS similarity
  FROM public.kb_embeddings ke
  WHERE ke.tenant_id = _tenant_id
    AND (1 - (ke.embedding <=> _query_embedding)) > _match_threshold
  ORDER BY ke.embedding <=> _query_embedding
  LIMIT _match_count;
$$;

-- ============================================
-- SOCIAL CHANNELS & CONTACTS
-- ============================================

CREATE TABLE public.social_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage social_channels" ON public.social_channels FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.social_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  lead_score TEXT DEFAULT 'cold',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, platform, platform_user_id)
);
CREATE POLICY "Tenant members can manage social_contacts" ON public.social_contacts FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================

CREATE TABLE public.social_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.social_channels(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.social_contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  ai_mode TEXT NOT NULL DEFAULT 'auto',
  assigned_to UUID,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  message_count INT DEFAULT 0,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage social_conversations" ON public.social_conversations FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.social_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  platform_message_id TEXT,
  ai_confidence FLOAT,
  ai_sources JSONB,
  ai_draft TEXT,
  is_approved BOOLEAN,
  approved_by UUID,
  cta_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage social_messages" ON public.social_messages FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE INDEX idx_social_messages_conversation ON public.social_messages(conversation_id, created_at);

-- ============================================
-- AGENT CONFIGURATION
-- ============================================

CREATE TABLE public.agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  default_mode TEXT NOT NULL DEFAULT 'auto',
  tone TEXT NOT NULL DEFAULT 'friendly',
  custom_tone_instructions TEXT,
  confidence_threshold FLOAT NOT NULL DEFAULT 0.75,
  strict_mode BOOLEAN NOT NULL DEFAULT true,
  blacklist_topics TEXT[] DEFAULT '{}',
  greeting_template TEXT,
  fallback_message TEXT DEFAULT 'Let me confirm this with the team and get back to you shortly.',
  auto_cta_enabled BOOLEAN NOT NULL DEFAULT true,
  cta_options JSONB DEFAULT '["Place order","Book now","Talk to team"]',
  max_response_length INT DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage agent_configs" ON public.agent_configs FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- RESPONSE AUDIT LOG
-- ============================================

CREATE TABLE public.agent_response_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.social_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.social_messages(id) ON DELETE SET NULL,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  confidence FLOAT,
  kb_sources JSONB,
  model_used TEXT,
  tokens_used INT,
  was_escalated BOOLEAN DEFAULT false,
  was_approved BOOLEAN,
  response_time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can read agent_response_logs" ON public.agent_response_logs FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can insert agent_response_logs" ON public.agent_response_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- ESCALATION SYSTEM
-- ============================================

CREATE TABLE public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage escalation_rules" ON public.escalation_rules FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.escalation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.escalation_rules(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can manage escalation_queue" ON public.escalation_queue FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================
-- ANALYTICS
-- ============================================

CREATE TABLE public.social_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  conversation_id UUID REFERENCES public.social_conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.social_contacts(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES public.social_channels(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Tenant members can read social_analytics_events" ON public.social_analytics_events FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can insert social_analytics_events" ON public.social_analytics_events FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE INDEX idx_social_analytics_tenant_type ON public.social_analytics_events(tenant_id, event_type, created_at);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_kb_categories_updated_at BEFORE UPDATE ON public.kb_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kb_documents_updated_at BEFORE UPDATE ON public.kb_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_social_channels_updated_at BEFORE UPDATE ON public.social_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_social_contacts_updated_at BEFORE UPDATE ON public.social_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_social_conversations_updated_at BEFORE UPDATE ON public.social_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON public.agent_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_escalation_queue_updated_at BEFORE UPDATE ON public.escalation_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
