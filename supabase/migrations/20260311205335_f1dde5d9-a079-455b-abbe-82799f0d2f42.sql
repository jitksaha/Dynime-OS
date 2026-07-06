
-- Table to track social login providers linked to user accounts
CREATE TABLE public.social_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_key TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  provider_name TEXT,
  provider_avatar TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider_key)
);

ALTER TABLE public.social_linked_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own linked accounts
CREATE POLICY "Users can view own linked accounts"
  ON public.social_linked_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own linked accounts
CREATE POLICY "Users can insert own linked accounts"
  ON public.social_linked_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own linked accounts
CREATE POLICY "Users can delete own linked accounts"
  ON public.social_linked_accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
