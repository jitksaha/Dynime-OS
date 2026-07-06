# Phase 5 — Edge Functions → Workers porting checklist (70 functions)

All 70 Supabase Deno edge functions have been ported to `infra/workers/src/functions/<name>.ts`
and registered in `gateway.ts`. Use this file as a per-function review list during testing.

Status: ✅ ported · ⚠️ needs special handling

## AI (17)
- ✅ `ai-proxy` — template (openai/anthropic/google, streaming, retries, fallbacks)
- ✅ `ai-assistant`
- ✅ `ai-business-insights`
- ✅ `ai-business-ops`
- ✅ `ai-chat`
- ✅ `ai-churn-detection`
- ✅ `ai-copilot`
- ✅ `ai-deal-scoring`
- ✅ `ai-document-gen`
- ✅ `ai-expense-categorize`
- ✅ `ai-invoice-summary`
- ✅ `ai-smart-features`
- ✅ `ai-threat-detection`
- ✅ `ai-workflow-nlp`
- ✅ `ai-models-list`
- ✅ `ai-provider-status`
- ✅ `kb-embed` ⚠️ (vector column used; ensure `vector` extension installed on target PG)

## Payments (18)
- ✅ `payment-initiate` ⚠️ (large; verify gateway dispatch logic)
- ✅ `payment-verify`
- ✅ `stripe-create-intent`
- ✅ `stripe-checkout`
- ✅ `gateway-config`
- ✅ `bkash-tokenize`
- ✅ `sslcommerz-initiate`
- ✅ `sslcommerz-callback`
- ✅ `addon-payment-initiate`
- ✅ `addon-payment-callback`
- ✅ `wallet-topup-initiate`
- ✅ `wallet-topup-callback`
- ✅ `razorpay-payment-callback` ⚠️ (preserve HMAC sig verification exactly)
- ✅ `twocheckout-payment-callback`
- ✅ `subscription-notification`
- ✅ `recurring-charge`
- ✅ `usage-reset` (cron)
- ✅ `invoice-reminders` (cron)

## Comms (5)
- ✅ `send-custom-email` ⚠️ (nodemailer → `@shared/email`; MailChannels default)
- ✅ `send-auth-email` ⚠️ (nodemailer + `@lovable.dev` webhook verify removed, HMAC fallback added)
- ✅ `sms-send`
- ✅ `sms-balance-check`
- ✅ `whatsapp-send`

## Identity / Security (8)
- ✅ `kyc-ai-verify`
- ✅ `kyb-verify`
- ✅ `sumsub-access-token`
- ✅ `phone-verify`
- ✅ `webauthn-challenge` ⚠️ (WebAuthn challenge; test with real browser)
- ✅ `api-key-generate`
- ✅ `api-v1` ⚠️ (public REST; scope-per-key logic may need adjustment)
- ✅ `auth-email-hook` ⚠️ (lovable webhook verify packages removed, HMAC fallback)

## Integrations (6)
- ✅ `google-calendar-sync`
- ✅ `social-oauth-init` — NOTE: overlaps auth/oauth.ts
- ✅ `social-oauth-callback` — NOTE: overlaps auth/oauth.ts; magiclink return preserved
- ✅ `social-ai-respond` ⚠️ (RAG vector search column names may need adjustment per schema)
- ✅ `integration-send`
- ✅ `integration-test`
- ✅ `webhook-dispatch`

## POS / Courier (4)
- ✅ `pos-send-courier`
- ✅ `pos-courier-test`
- ✅ `pos-store-sync`
- ✅ `kb-embed` (also listed under AI)

## Admin / Tenant / Misc (13)
- ✅ `admin-create-user`
- ✅ `admin-delete`
- ✅ `invite-user`
- ✅ `hire-employee`
- ✅ `company-self-delete`
- ✅ `contact-submit`
- ✅ `notify-job-application`
- ✅ `invoice-pdf` ⚠️ (PDF lib compatibility — confirm Workers-compatible at deploy time)
- ✅ `live-chat`

## Done criteria
Smoke-test one per category: `ai-proxy`, `stripe-checkout`, `sms-send`, `webhook-dispatch`,
`live-chat` (real), `invoice-pdf`, and the two cron jobs `usage-reset` / `invoice-reminders`.
