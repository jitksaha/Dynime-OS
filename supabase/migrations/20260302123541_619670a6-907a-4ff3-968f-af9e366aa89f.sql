
-- Table to track channel membership (needed for DMs and group channels)
CREATE TABLE public.chat_channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

-- Members can see their own memberships
CREATE POLICY "Users can view their channel memberships"
ON public.chat_channel_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own memberships
CREATE POLICY "Users can join channels"
ON public.chat_channel_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can leave channels
CREATE POLICY "Users can leave channels"
ON public.chat_channel_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Company admins can manage memberships
CREATE POLICY "Admins can manage channel members"
ON public.chat_channel_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('company_admin', 'super_admin')
  )
);

-- Add index for fast lookups
CREATE INDEX idx_chat_channel_members_user ON public.chat_channel_members(user_id);
CREATE INDEX idx_chat_channel_members_channel ON public.chat_channel_members(channel_id);

-- Enable realtime for channel members
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
