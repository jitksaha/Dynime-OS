
-- Live chat conversations table
CREATE TABLE public.live_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  assigned_agent_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  is_escalated BOOLEAN NOT NULL DEFAULT false,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  satisfaction_rating INT
);

-- Live chat messages table
CREATE TABLE public.live_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.live_chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'visitor',
  sender_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: anyone can insert (visitor starts chat)
CREATE POLICY "Anyone can create conversations"
  ON public.live_chat_conversations FOR INSERT
  WITH CHECK (true);

-- Conversations: agents can view their tenant's chats
CREATE POLICY "Agents can view tenant conversations"
  ON public.live_chat_conversations FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Conversations: agents can update
CREATE POLICY "Agents can update conversations"
  ON public.live_chat_conversations FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Messages: anyone can insert (visitor or agent)
CREATE POLICY "Anyone can create messages"
  ON public.live_chat_messages FOR INSERT
  WITH CHECK (true);

-- Messages: agents can view messages for their tenant's conversations
CREATE POLICY "Agents can view messages"
  ON public.live_chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.live_chat_conversations
      WHERE tenant_id IS NULL
        OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
        OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;

-- Indexes
CREATE INDEX idx_live_chat_conversations_tenant ON public.live_chat_conversations(tenant_id);
CREATE INDEX idx_live_chat_conversations_status ON public.live_chat_conversations(status);
CREATE INDEX idx_live_chat_messages_conversation ON public.live_chat_messages(conversation_id);

-- Updated at trigger
CREATE TRIGGER update_live_chat_conversations_updated_at
  BEFORE UPDATE ON public.live_chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
