-- Seed platform_settings with enabled countries + base currency
-- Idempotent: uses ON CONFLICT (key) DO UPDATE so it always reflects latest list

-- Make sure key has a unique constraint (required for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_settings_key_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'platform_settings_key_key'
  ) THEN
    BEGIN
      ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_key_key UNIQUE (key);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Base currency
INSERT INTO public.platform_settings (key, value)
VALUES ('base_currency', '"USD"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Enabled countries with currencies, symbols, flags, and exchange rates (1 USD → currency)
INSERT INTO public.platform_settings (key, value)
VALUES (
  'enabled_countries',
  '[
    {"code":"US","name":"United States","flag":"🇺🇸","currency":"USD","symbol":"$","exchange_rate":1},
    {"code":"GB","name":"United Kingdom","flag":"🇬🇧","currency":"GBP","symbol":"£","exchange_rate":0.79},
    {"code":"EU","name":"European Union","flag":"🇪🇺","currency":"EUR","symbol":"€","exchange_rate":0.92},
    {"code":"CA","name":"Canada","flag":"🇨🇦","currency":"CAD","symbol":"C$","exchange_rate":1.37},
    {"code":"AU","name":"Australia","flag":"🇦🇺","currency":"AUD","symbol":"A$","exchange_rate":1.53},
    {"code":"NZ","name":"New Zealand","flag":"🇳🇿","currency":"NZD","symbol":"NZ$","exchange_rate":1.65},
    {"code":"BD","name":"Bangladesh","flag":"🇧🇩","currency":"BDT","symbol":"৳","exchange_rate":110},
    {"code":"IN","name":"India","flag":"🇮🇳","currency":"INR","symbol":"₹","exchange_rate":83},
    {"code":"PK","name":"Pakistan","flag":"🇵🇰","currency":"PKR","symbol":"₨","exchange_rate":278},
    {"code":"LK","name":"Sri Lanka","flag":"🇱🇰","currency":"LKR","symbol":"Rs","exchange_rate":300},
    {"code":"NP","name":"Nepal","flag":"🇳🇵","currency":"NPR","symbol":"Rs","exchange_rate":133},
    {"code":"JP","name":"Japan","flag":"🇯🇵","currency":"JPY","symbol":"¥","exchange_rate":149},
    {"code":"CN","name":"China","flag":"🇨🇳","currency":"CNY","symbol":"¥","exchange_rate":7.25},
    {"code":"KR","name":"South Korea","flag":"🇰🇷","currency":"KRW","symbol":"₩","exchange_rate":1370},
    {"code":"SG","name":"Singapore","flag":"🇸🇬","currency":"SGD","symbol":"S$","exchange_rate":1.34},
    {"code":"MY","name":"Malaysia","flag":"🇲🇾","currency":"MYR","symbol":"RM","exchange_rate":4.4},
    {"code":"ID","name":"Indonesia","flag":"🇮🇩","currency":"IDR","symbol":"Rp","exchange_rate":15700},
    {"code":"PH","name":"Philippines","flag":"🇵🇭","currency":"PHP","symbol":"₱","exchange_rate":56},
    {"code":"TH","name":"Thailand","flag":"🇹🇭","currency":"THB","symbol":"฿","exchange_rate":34},
    {"code":"VN","name":"Vietnam","flag":"🇻🇳","currency":"VND","symbol":"₫","exchange_rate":25300},
    {"code":"AE","name":"United Arab Emirates","flag":"🇦🇪","currency":"AED","symbol":"د.إ","exchange_rate":3.67},
    {"code":"SA","name":"Saudi Arabia","flag":"🇸🇦","currency":"SAR","symbol":"﷼","exchange_rate":3.75},
    {"code":"QA","name":"Qatar","flag":"🇶🇦","currency":"QAR","symbol":"﷼","exchange_rate":3.64},
    {"code":"KW","name":"Kuwait","flag":"🇰🇼","currency":"KWD","symbol":"د.ك","exchange_rate":0.31},
    {"code":"BH","name":"Bahrain","flag":"🇧🇭","currency":"BHD","symbol":".د.ب","exchange_rate":0.38},
    {"code":"OM","name":"Oman","flag":"🇴🇲","currency":"OMR","symbol":"﷼","exchange_rate":0.38},
    {"code":"JO","name":"Jordan","flag":"🇯🇴","currency":"JOD","symbol":"د.ا","exchange_rate":0.71},
    {"code":"EG","name":"Egypt","flag":"🇪🇬","currency":"EGP","symbol":"£","exchange_rate":48},
    {"code":"TR","name":"Türkiye","flag":"🇹🇷","currency":"TRY","symbol":"₺","exchange_rate":34},
    {"code":"ZA","name":"South Africa","flag":"🇿🇦","currency":"ZAR","symbol":"R","exchange_rate":18.5},
    {"code":"NG","name":"Nigeria","flag":"🇳🇬","currency":"NGN","symbol":"₦","exchange_rate":1550},
    {"code":"KE","name":"Kenya","flag":"🇰🇪","currency":"KES","symbol":"KSh","exchange_rate":129},
    {"code":"GH","name":"Ghana","flag":"🇬🇭","currency":"GHS","symbol":"₵","exchange_rate":15.5},
    {"code":"BR","name":"Brazil","flag":"🇧🇷","currency":"BRL","symbol":"R$","exchange_rate":5.7},
    {"code":"MX","name":"Mexico","flag":"🇲🇽","currency":"MXN","symbol":"$","exchange_rate":17.5},
    {"code":"AR","name":"Argentina","flag":"🇦🇷","currency":"ARS","symbol":"$","exchange_rate":1000},
    {"code":"CL","name":"Chile","flag":"🇨🇱","currency":"CLP","symbol":"$","exchange_rate":950},
    {"code":"CO","name":"Colombia","flag":"🇨🇴","currency":"COP","symbol":"$","exchange_rate":4100},
    {"code":"CH","name":"Switzerland","flag":"🇨🇭","currency":"CHF","symbol":"Fr","exchange_rate":0.88},
    {"code":"SE","name":"Sweden","flag":"🇸🇪","currency":"SEK","symbol":"kr","exchange_rate":10.6},
    {"code":"NO","name":"Norway","flag":"🇳🇴","currency":"NOK","symbol":"kr","exchange_rate":10.8},
    {"code":"DK","name":"Denmark","flag":"🇩🇰","currency":"DKK","symbol":"kr","exchange_rate":6.9},
    {"code":"PL","name":"Poland","flag":"🇵🇱","currency":"PLN","symbol":"zł","exchange_rate":4},
    {"code":"RU","name":"Russia","flag":"🇷🇺","currency":"RUB","symbol":"₽","exchange_rate":92}
  ]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();