
-- AI Conversations
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  message_count INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- AI Messages
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  model_used TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own messages" ON public.ai_messages
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND conversation_id IN (
    SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()
  ))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- AI Prompt Library
CREATE TABLE public.ai_prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  is_global BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_prompt_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view org or global prompts" ON public.ai_prompt_library
  FOR SELECT TO authenticated
  USING (is_global = true OR tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users manage own prompts" ON public.ai_prompt_library
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users update own prompts" ON public.ai_prompt_library
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users delete own prompts" ON public.ai_prompt_library
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- AI Usage Logs
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  model TEXT,
  provider TEXT,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  estimated_cost NUMERIC(10,6) DEFAULT 0,
  feature TEXT DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.ai_usage_logs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Seed global prompts
INSERT INTO public.ai_prompt_library (title, prompt, category, is_global) VALUES
('Sales Report Summary', 'Analyze our recent sales data and provide a summary including: top products, revenue trends, and recommendations for improvement.', 'Sales', true),
('Invoice Draft', 'Generate a professional invoice for the following services: [describe services]. Include standard payment terms.', 'Accounting', true),
('Email Draft', 'Draft a professional business email for the following purpose: [describe purpose]. Keep it concise and actionable.', 'Communication', true),
('HR Policy Generator', 'Create a comprehensive HR policy for [topic] that covers key areas, compliance requirements, and best practices.', 'HR', true),
('Meeting Summary', 'Summarize the following meeting notes into key decisions, action items, and next steps: [paste notes]', 'Productivity', true),
('Marketing Campaign', 'Suggest a marketing campaign strategy for [product/service] targeting [audience]. Include channels, messaging, and KPIs.', 'Marketing', true),
('Financial Insights', 'Review the following financial data and provide insights on cash flow, profitability, and areas of concern: [paste data]', 'Finance', true),
('Task Breakdown', 'Break down the following project into actionable tasks with estimated timelines and dependencies: [describe project]', 'Projects', true),
('Customer Response', 'Draft a professional response to the following customer inquiry/complaint: [paste message]', 'Support', true),
('Performance Review', 'Help me write a balanced performance review for an employee who [describe performance]. Include strengths, areas for improvement, and goals.', 'HR', true),
('Inventory Analysis', 'Analyze inventory levels and suggest reorder points, slow-moving items, and optimization strategies.', 'Operations', true),
('Competitor Analysis', 'Conduct a brief competitive analysis for [industry/niche] covering key players, their strengths, and our differentiation strategy.', 'Strategy', true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
