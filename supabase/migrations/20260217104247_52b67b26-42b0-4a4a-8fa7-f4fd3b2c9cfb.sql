
-- Add country and currency columns to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS country text DEFAULT 'US';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS currency_symbol text DEFAULT '$';

-- Insert default enabled countries (table already exists)
INSERT INTO public.platform_settings (key, value) VALUES (
  'enabled_countries',
  '[
    {"code":"US","name":"United States","flag":"🇺🇸","currency":"USD","symbol":"$"},
    {"code":"GB","name":"United Kingdom","flag":"🇬🇧","currency":"GBP","symbol":"£"},
    {"code":"BD","name":"Bangladesh","flag":"🇧🇩","currency":"BDT","symbol":"৳"},
    {"code":"IN","name":"India","flag":"🇮🇳","currency":"INR","symbol":"₹"},
    {"code":"CA","name":"Canada","flag":"🇨🇦","currency":"CAD","symbol":"CA$"},
    {"code":"AU","name":"Australia","flag":"🇦🇺","currency":"AUD","symbol":"A$"},
    {"code":"DE","name":"Germany","flag":"🇩🇪","currency":"EUR","symbol":"€"},
    {"code":"FR","name":"France","flag":"🇫🇷","currency":"EUR","symbol":"€"},
    {"code":"JP","name":"Japan","flag":"🇯🇵","currency":"JPY","symbol":"¥"},
    {"code":"CN","name":"China","flag":"🇨🇳","currency":"CNY","symbol":"¥"},
    {"code":"BR","name":"Brazil","flag":"🇧🇷","currency":"BRL","symbol":"R$"},
    {"code":"AE","name":"UAE","flag":"🇦🇪","currency":"AED","symbol":"د.إ"},
    {"code":"SA","name":"Saudi Arabia","flag":"🇸🇦","currency":"SAR","symbol":"﷼"},
    {"code":"SG","name":"Singapore","flag":"🇸🇬","currency":"SGD","symbol":"S$"},
    {"code":"MY","name":"Malaysia","flag":"🇲🇾","currency":"MYR","symbol":"RM"},
    {"code":"PK","name":"Pakistan","flag":"🇵🇰","currency":"PKR","symbol":"₨"},
    {"code":"NG","name":"Nigeria","flag":"🇳🇬","currency":"NGN","symbol":"₦"},
    {"code":"ZA","name":"South Africa","flag":"🇿🇦","currency":"ZAR","symbol":"R"},
    {"code":"KR","name":"South Korea","flag":"🇰🇷","currency":"KRW","symbol":"₩"},
    {"code":"MX","name":"Mexico","flag":"🇲🇽","currency":"MXN","symbol":"MX$"},
    {"code":"TR","name":"Turkey","flag":"🇹🇷","currency":"TRY","symbol":"₺"},
    {"code":"ID","name":"Indonesia","flag":"🇮🇩","currency":"IDR","symbol":"Rp"},
    {"code":"PH","name":"Philippines","flag":"🇵🇭","currency":"PHP","symbol":"₱"},
    {"code":"TH","name":"Thailand","flag":"🇹🇭","currency":"THB","symbol":"฿"},
    {"code":"VN","name":"Vietnam","flag":"🇻🇳","currency":"VND","symbol":"₫"},
    {"code":"EG","name":"Egypt","flag":"🇪🇬","currency":"EGP","symbol":"E£"},
    {"code":"KE","name":"Kenya","flag":"🇰🇪","currency":"KES","symbol":"KSh"},
    {"code":"GH","name":"Ghana","flag":"🇬🇭","currency":"GHS","symbol":"GH₵"},
    {"code":"NZ","name":"New Zealand","flag":"🇳🇿","currency":"NZD","symbol":"NZ$"},
    {"code":"SE","name":"Sweden","flag":"🇸🇪","currency":"SEK","symbol":"kr"},
    {"code":"NO","name":"Norway","flag":"🇳🇴","currency":"NOK","symbol":"kr"},
    {"code":"DK","name":"Denmark","flag":"🇩🇰","currency":"DKK","symbol":"kr"},
    {"code":"CH","name":"Switzerland","flag":"🇨🇭","currency":"CHF","symbol":"CHF"},
    {"code":"PL","name":"Poland","flag":"🇵🇱","currency":"PLN","symbol":"zł"},
    {"code":"RU","name":"Russia","flag":"🇷🇺","currency":"RUB","symbol":"₽"},
    {"code":"IT","name":"Italy","flag":"🇮🇹","currency":"EUR","symbol":"€"},
    {"code":"ES","name":"Spain","flag":"🇪🇸","currency":"EUR","symbol":"€"},
    {"code":"NL","name":"Netherlands","flag":"🇳🇱","currency":"EUR","symbol":"€"},
    {"code":"PT","name":"Portugal","flag":"🇵🇹","currency":"EUR","symbol":"€"},
    {"code":"LK","name":"Sri Lanka","flag":"🇱🇰","currency":"LKR","symbol":"Rs"},
    {"code":"NP","name":"Nepal","flag":"🇳🇵","currency":"NPR","symbol":"Rs"},
    {"code":"MM","name":"Myanmar","flag":"🇲🇲","currency":"MMK","symbol":"K"},
    {"code":"KW","name":"Kuwait","flag":"🇰🇼","currency":"KWD","symbol":"د.ك"},
    {"code":"QA","name":"Qatar","flag":"🇶🇦","currency":"QAR","symbol":"﷼"},
    {"code":"BH","name":"Bahrain","flag":"🇧🇭","currency":"BHD","symbol":"BD"},
    {"code":"OM","name":"Oman","flag":"🇴🇲","currency":"OMR","symbol":"﷼"},
    {"code":"JO","name":"Jordan","flag":"🇯🇴","currency":"JOD","symbol":"JD"},
    {"code":"CL","name":"Chile","flag":"🇨🇱","currency":"CLP","symbol":"CL$"},
    {"code":"CO","name":"Colombia","flag":"🇨🇴","currency":"COP","symbol":"COL$"},
    {"code":"AR","name":"Argentina","flag":"🇦🇷","currency":"ARS","symbol":"AR$"}
  ]'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Update complete_onboarding function to accept country/currency
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _company_name text, 
  _slug text, 
  _industry text DEFAULT NULL, 
  _size text DEFAULT NULL,
  _country text DEFAULT 'US',
  _currency text DEFAULT 'USD',
  _currency_symbol text DEFAULT '$'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid;
  _existing_tenant_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT tenant_id INTO _existing_tenant_id
  FROM public.profiles WHERE user_id = _user_id;

  IF _existing_tenant_id IS NOT NULL THEN
    UPDATE public.profiles SET onboarding_completed = true WHERE user_id = _user_id;
    RETURN _existing_tenant_id;
  END IF;

  INSERT INTO public.tenants (name, slug, industry, size, plan, trial_ends_at, country, currency, currency_symbol)
  VALUES (_company_name, _slug, _industry, _size, 'starter', now() + interval '14 days', _country, _currency, _currency_symbol)
  RETURNING id INTO _tenant_id;

  UPDATE public.profiles SET tenant_id = _tenant_id, is_owner = true, onboarding_completed = true WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'company_admin');

  RETURN _tenant_id;
END;
$$;
