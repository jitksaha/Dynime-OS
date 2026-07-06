-- Add limit_reset_cycle to subscription_plans
ALTER TABLE public.subscription_plans 
  ADD COLUMN IF NOT EXISTS limit_reset_cycle text NOT NULL DEFAULT 'billing_cycle';

-- Tenant usage counters - tracks usage per billing cycle
CREATE TABLE IF NOT EXISTS public.tenant_usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  counter_key text NOT NULL,
  current_count integer NOT NULL DEFAULT 0,
  cycle_start timestamptz NOT NULL DEFAULT now(),
  cycle_end timestamptz,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  last_reset_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, counter_key)
);

ALTER TABLE public.tenant_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view usage counters"
  ON public.tenant_usage_counters FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages usage counters"
  ON public.tenant_usage_counters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Usage reset log
CREATE TABLE IF NOT EXISTS public.usage_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  counter_key text NOT NULL,
  previous_count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL DEFAULT now(),
  billing_cycle text NOT NULL,
  cycle_start timestamptz,
  cycle_end timestamptz
);

ALTER TABLE public.usage_reset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view reset logs"
  ON public.usage_reset_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Function: increment usage counter
CREATE OR REPLACE FUNCTION public.increment_usage_counter(_tenant_id uuid, _counter_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current integer;
  _limit integer;
  _limit_col text;
  _plan text;
  _billing_cycle text;
  _cycle_end timestamptz;
  _result jsonb;
BEGIN
  SELECT t.plan INTO _plan FROM public.tenants t WHERE t.id = _tenant_id;
  
  SELECT ts.billing_cycle, ts.current_period_end 
  INTO _billing_cycle, _cycle_end
  FROM public.tenant_subscriptions ts 
  WHERE ts.tenant_id = _tenant_id AND ts.status = 'active'
  ORDER BY ts.created_at DESC LIMIT 1;
  
  IF _billing_cycle IS NULL THEN _billing_cycle := 'monthly'; END IF;

  _limit_col := CASE _counter_key
    WHEN 'invoices' THEN 'max_invoices'
    WHEN 'deals' THEN 'max_deals'
    WHEN 'documents' THEN 'max_documents'
    WHEN 'projects' THEN 'max_projects'
    WHEN 'employees' THEN 'max_employees'
    WHEN 'users' THEN 'max_users'
    WHEN 'companies' THEN 'max_companies'
    ELSE NULL
  END;

  IF _limit_col IS NOT NULL THEN
    EXECUTE format('SELECT %I FROM public.subscription_plans WHERE slug = $1', _limit_col)
    INTO _limit USING _plan;
  END IF;

  IF _limit IS NULL THEN _limit := -1; END IF;

  INSERT INTO public.tenant_usage_counters (tenant_id, counter_key, current_count, billing_cycle, cycle_end, cycle_start)
  VALUES (_tenant_id, _counter_key, 0, _billing_cycle, _cycle_end, now())
  ON CONFLICT (tenant_id, counter_key) DO NOTHING;

  SELECT tuc.current_count INTO _current
  FROM public.tenant_usage_counters tuc
  WHERE tuc.tenant_id = _tenant_id AND tuc.counter_key = _counter_key;

  IF _limit != -1 AND _current >= _limit THEN
    _result := jsonb_build_object(
      'allowed', false, 
      'current', _current, 
      'limit', _limit,
      'message', format('You have reached the maximum of %s %s for your current plan.', _limit, _counter_key)
    );
    RETURN _result;
  END IF;

  UPDATE public.tenant_usage_counters 
  SET current_count = current_count + 1, updated_at = now()
  WHERE tenant_id = _tenant_id AND counter_key = _counter_key;

  _result := jsonb_build_object('allowed', true, 'current', _current + 1, 'limit', _limit);
  RETURN _result;
END;
$$;

-- Function: check usage limit without incrementing
CREATE OR REPLACE FUNCTION public.check_usage_limit(_tenant_id uuid, _counter_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current integer;
  _limit integer;
  _limit_col text;
  _plan text;
  _billing_cycle text;
  _cycle_end timestamptz;
  _remaining integer;
BEGIN
  SELECT t.plan INTO _plan FROM public.tenants t WHERE t.id = _tenant_id;

  SELECT ts.billing_cycle, ts.current_period_end 
  INTO _billing_cycle, _cycle_end
  FROM public.tenant_subscriptions ts 
  WHERE ts.tenant_id = _tenant_id AND ts.status = 'active'
  ORDER BY ts.created_at DESC LIMIT 1;

  IF _billing_cycle IS NULL THEN _billing_cycle := 'monthly'; END IF;

  _limit_col := CASE _counter_key
    WHEN 'invoices' THEN 'max_invoices'
    WHEN 'deals' THEN 'max_deals'
    WHEN 'documents' THEN 'max_documents'
    WHEN 'projects' THEN 'max_projects'
    WHEN 'employees' THEN 'max_employees'
    WHEN 'users' THEN 'max_users'
    WHEN 'companies' THEN 'max_companies'
    ELSE NULL
  END;

  IF _limit_col IS NOT NULL THEN
    EXECUTE format('SELECT %I FROM public.subscription_plans WHERE slug = $1', _limit_col)
    INTO _limit USING _plan;
  END IF;

  IF _limit IS NULL THEN _limit := -1; END IF;

  SELECT COALESCE(tuc.current_count, 0) INTO _current
  FROM public.tenant_usage_counters tuc
  WHERE tuc.tenant_id = _tenant_id AND tuc.counter_key = _counter_key;

  IF _current IS NULL THEN _current := 0; END IF;

  IF _limit = -1 THEN
    _remaining := -1;
  ELSE
    _remaining := GREATEST(0, _limit - _current);
  END IF;

  RETURN jsonb_build_object(
    'allowed', _limit = -1 OR _current < _limit,
    'current', _current,
    'limit', _limit,
    'remaining', _remaining,
    'billing_cycle', _billing_cycle,
    'cycle_end', _cycle_end
  );
END;
$$;

-- Function: reset usage counters for a tenant
CREATE OR REPLACE FUNCTION public.reset_usage_counters(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reset_count integer := 0;
  _counter record;
BEGIN
  FOR _counter IN 
    SELECT * FROM public.tenant_usage_counters 
    WHERE tenant_id = _tenant_id 
      AND billing_cycle != 'lifetime'
      AND (cycle_end IS NOT NULL AND cycle_end <= now())
  LOOP
    INSERT INTO public.usage_reset_logs (tenant_id, counter_key, previous_count, billing_cycle, cycle_start, cycle_end)
    VALUES (_tenant_id, _counter.counter_key, _counter.current_count, _counter.billing_cycle, _counter.cycle_start, _counter.cycle_end);

    UPDATE public.tenant_usage_counters 
    SET current_count = 0,
        last_reset_at = now(),
        cycle_start = now(),
        cycle_end = CASE _counter.billing_cycle
          WHEN 'monthly' THEN now() + interval '1 month'
          WHEN 'quarterly' THEN now() + interval '3 months'
          WHEN 'yearly' THEN now() + interval '1 year'
          ELSE NULL
        END,
        updated_at = now()
    WHERE id = _counter.id;

    _reset_count := _reset_count + 1;
  END LOOP;

  RETURN _reset_count;
END;
$$;

-- Function: bulk reset all expired counters (for cron)
CREATE OR REPLACE FUNCTION public.reset_all_expired_usage_counters()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_reset integer := 0;
  _tenant_reset integer;
  _tid uuid;
BEGIN
  FOR _tid IN 
    SELECT DISTINCT tenant_id FROM public.tenant_usage_counters 
    WHERE billing_cycle != 'lifetime' 
      AND cycle_end IS NOT NULL 
      AND cycle_end <= now()
  LOOP
    SELECT public.reset_usage_counters(_tid) INTO _tenant_reset;
    _total_reset := _total_reset + _tenant_reset;
  END LOOP;

  RETURN _total_reset;
END;
$$;