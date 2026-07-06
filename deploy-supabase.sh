#!/bin/bash
# deploy-supabase.sh — Deploy all Supabase Edge Functions + configure auth
#
# Prerequisites:
#   1. Unpause the Supabase project at https://supabase.com/dashboard
#   2. Get a Personal Access Token: https://supabase.com/dashboard/account/tokens
#   3. Run: bash deploy-supabase.sh YOUR_PERSONAL_ACCESS_TOKEN
#
# Usage: bash deploy-supabase.sh <your-supabase-pat>

set -e

PROJECT_REF="msibxlvqeydgmlofwlbx"
PAT="${1:-}"

if [ -z "$PAT" ]; then
  echo "❌ Error: Please provide your Supabase Personal Access Token as the first argument."
  echo "   Get it from: https://supabase.com/dashboard/account/tokens"
  echo "   Usage: bash deploy-supabase.sh sbp_xxxxxxxxxxxxxxxxxxxx"
  exit 1
fi

echo "🔐 Logging in to Supabase..."
supabase login --token "$PAT"

echo "🔗 Linking to project $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

echo ""
echo "📦 Deploying all Edge Functions..."
echo "   (auth-email-hook is deployed without JWT verification)"
echo ""

# Functions that should NOT verify JWT (public endpoints)
NO_JWT_FUNCTIONS=(
  auth-email-hook
  send-auth-email
  contact-submit
  social-oauth-callback
  webhook-dispatch
  addon-payment-callback
  razorpay-payment-callback
  sslcommerz-callback
  twocheckout-payment-callback
  wallet-topup-callback
  stripe-checkout
)

# All deployable functions
ALL_FUNCTIONS=(
  addon-payment-callback
  addon-payment-initiate
  admin-create-user
  admin-delete
  ai-assistant
  ai-business-insights
  ai-business-ops
  ai-chat
  ai-churn-detection
  ai-copilot
  ai-deal-scoring
  ai-document-gen
  ai-expense-categorize
  ai-invoice-summary
  ai-models-list
  ai-provider-status
  ai-proxy
  ai-smart-features
  ai-threat-detection
  ai-workflow-nlp
  api-key-generate
  auth-email-hook
  bkash-tokenize
  company-self-delete
  contact-submit
  exchange-rates-sync
  gateway-config
  google-calendar-sync
  hire-employee
  integration-send
  integration-test
  invite-user
  invoice-pdf
  invoice-reminders
  kb-embed
  kyb-verify
  kyc-ai-verify
  live-chat
  notify-job-application
  payment-initiate
  payment-verify
  phone-verify
  pos-courier-test
  pos-send-courier
  pos-store-sync
  razorpay-payment-callback
  recurring-charge
  send-auth-email
  send-custom-email
  sms-balance-check
  sms-send
  social-ai-respond
  social-oauth-callback
  social-oauth-init
  sslcommerz-callback
  sslcommerz-initiate
  stripe-checkout
  stripe-create-intent
  subscription-notification
  sumsub-access-token
  twocheckout-payment-callback
  usage-reset
  wallet-topup-callback
  wallet-topup-initiate
  webauthn-challenge
  webhook-dispatch
  whatsapp-send
)

is_no_jwt() {
  local fn="$1"
  for item in "${NO_JWT_FUNCTIONS[@]}"; do
    [ "$item" = "$fn" ] && return 0
  done
  return 1
}

DEPLOYED=0
FAILED=0

for fn in "${ALL_FUNCTIONS[@]}"; do
  if is_no_jwt "$fn"; then
    echo -n "  deploying $fn (no-verify-jwt)... "
    if supabase functions deploy "$fn" --no-verify-jwt 2>&1 | grep -q "Deployed"; then
      echo "✅"
      ((DEPLOYED++))
    else
      echo "❌ (see above for error)"
      ((FAILED++))
    fi
  else
    echo -n "  deploying $fn... "
    if supabase functions deploy "$fn" 2>&1 | grep -q "Deployed"; then
      echo "✅"
      ((DEPLOYED++))
    else
      echo "❌ (see above for error)"
      ((FAILED++))
    fi
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Functions deployed: $DEPLOYED / ${#ALL_FUNCTIONS[@]}"
[ $FAILED -gt 0 ] && echo "  Failed: $FAILED (re-run script to retry)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Applying database migrations..."
supabase db push --include-all

echo ""
echo "🔑 Setting auth redirect URLs (dynime.com)..."
# This is done via the Supabase Management API
curl -s -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://dynime.com",
    "additional_redirect_urls": [
      "https://dynime.com",
      "https://dynime.com/**",
      "https://dynime.com/auth/callback",
      "https://dynime.com/reset-password"
    ]
  }' | python3 -m json.tool 2>/dev/null || echo "⚠️  Set redirect URLs manually in dashboard"

echo ""
echo "✅ Supabase deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Go to Supabase dashboard → Authentication → URL Configuration"
echo "     and verify Site URL is 'https://dynime.com'"
echo "  2. Set any required secrets via:"
echo "     supabase secrets set OPENAI_API_KEY=sk-... STRIPE_SECRET_KEY=sk_live_..."
echo "  3. The frontend at dynime.com will automatically work once functions are deployed"
