UPDATE payment_gateway_configs 
SET description = 'Accept global payments via Dodo Payments. Only an API key is needed — get it from Developer → API Keys in your Dodo dashboard.'
WHERE gateway_key = 'dodo';