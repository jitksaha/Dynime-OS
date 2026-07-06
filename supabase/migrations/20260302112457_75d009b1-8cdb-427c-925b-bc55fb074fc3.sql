
-- Add online presence tracking
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  status TEXT NOT NULL DEFAULT 'online',
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presence in their tenant"
ON public.user_presence FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own presence"
ON public.user_presence FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add emoji reactions to messages
CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their tenant messages"
ON public.chat_reactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can add reactions"
ON public.chat_reactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions"
ON public.chat_reactions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add realtime for reactions and presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Add channel member count & last message timestamp
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
