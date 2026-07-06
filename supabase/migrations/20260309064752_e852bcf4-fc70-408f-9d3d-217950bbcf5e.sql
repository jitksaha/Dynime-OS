UPDATE payment_gateway_configs 
SET settings = jsonb_set(
  jsonb_set(
    settings::jsonb,
    '{credential_fields}',
    '{"api_key": {"label": "API Key", "placeholder": "Enter your Dodo Payments API key (Bearer token)", "sensitive": true}}'::jsonb
  ),
  '{docs_url}',
  '"https://docs.dodopayments.com/api-reference/introduction"'::jsonb
)
WHERE gateway_key = 'dodo';