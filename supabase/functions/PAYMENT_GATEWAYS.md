# Payment Gateway Integration Documentation

## Overview

The platform supports multiple payment gateways for processing subscriptions, add-on modules, and wallet top-ups. Each gateway follows a redirect-based flow where the user is redirected to the provider's hosted checkout page.

---

## Gateway Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Frontend   │───▶│ payment-initiate │───▶│  Gateway API    │───▶│ Checkout URL │
│   (React)    │    │  (Edge Function) │    │ (Razorpay/2CO)  │    │  (Redirect)  │
└─────────────┘    └──────────────────┘    └─────────────────┘    └──────┬───────┘
                                                                         │
                   ┌──────────────────┐    ┌─────────────────┐           │
                   │  Callback Edge   │◀───│  Webhook/IPN    │◀──────────┘
                   │    Function      │    │  (from gateway) │    (payment complete)
                   └──────┬───────────┘    └─────────────────┘
                          │
                   ┌──────▼───────────┐
                   │   Database       │
                   │ (activate sub/   │
                   │  addon/wallet)   │
                   └──────────────────┘
```

---

## Razorpay (India)

### Overview
Razorpay is India's leading payment gateway supporting UPI, credit/debit cards, wallets (Paytm, PhonePe), net banking, and EMI options.

### Flow
1. **Order Creation** — `payment-initiate` creates a Razorpay Order via `POST /v1/orders`
2. **Payment Link** — A Payment Link is created via `POST /v1/payment_links` for redirect-based checkout
3. **Redirect** — User is redirected to Razorpay's hosted payment page
4. **Webhook** — On payment completion, Razorpay sends `payment.captured` or `order.paid` webhook
5. **Activation** — `razorpay-payment-callback` verifies the webhook signature and activates the subscription/addon/wallet

### API Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| `POST /v1/orders` | Create order with amount, currency, receipt |
| `POST /v1/payment_links` | Generate hosted checkout URL |
| `GET /v1/orders?count=1` | Connection test (credential verification) |

### Credentials Required
| Field | Description | Example |
|-------|-------------|---------|
| `key_id` | API Key ID | `rzp_test_abc123` or `rzp_live_abc123` |
| `key_secret` | API Key Secret | (hidden) |
| `webhook_secret` | Webhook signing secret | (optional, for HMAC verification) |

### Webhook Events Handled
- `payment.captured` — Payment successfully captured → activate service
- `order.paid` — Order fully paid → activate service
- `payment.failed` — Payment failed → mark as failed

### Security
- **Authentication**: Basic Auth with `key_id:key_secret`
- **Webhook Verification**: HMAC-SHA256 signature via `x-razorpay-signature` header
- **Amount**: Sent in paise (smallest unit), e.g., ₹100 = 10000 paise

### Supported Currencies
Primary: INR (Indian Rupee). The platform auto-converts from USD using exchange rates.

---

## 2Checkout (Verifone)

### Overview
2Checkout (now Verifone) is a global payment platform supporting 45+ payment methods across 200+ countries, including credit cards, PayPal, local payment methods, and wire transfers.

### Flow
1. **Checkout URL** — `payment-initiate` builds a ConvertPlus hosted checkout URL with HMAC signature
2. **Redirect** — User is redirected to 2Checkout's hosted payment page
3. **IPN Notification** — On payment completion, 2Checkout sends an IPN (Instant Payment Notification)
4. **Activation** — `twocheckout-payment-callback` processes the IPN and activates the service

### Checkout URL Parameters
| Parameter | Purpose |
|-----------|---------|
| `merchant` | Merchant/Vendor Code |
| `prod` | Product name |
| `price` | Amount |
| `currency` | Currency code |
| `order-ext-ref` | Platform transaction ID (for matching) |
| `return-url` | Redirect URL after payment |
| `signature` | HMAC-SHA256 signature for security |

### Credentials Required
| Field | Description | Example |
|-------|-------------|---------|
| `merchant_code` | Merchant/Vendor Code | `123456` |
| `secret_key` | Secret Key / Buy Link Secret Word | (hidden) |
| `ipn_secret` | IPN Secret (optional) | (for webhook verification) |

### IPN Events Handled
- `ORDER_CREATED` — New order created
- `INVOICE_STATUS_CHANGED` — Invoice status updated
- `ORDERSTATUS: COMPLETE` — Payment completed → activate service

### IPN Response Format
2Checkout expects a specific XML response:
```xml
<EPAYMENT>{DATE}|{HASH}</EPAYMENT>
```

### Security
- **Checkout Signing**: HMAC-SHA256 of `merchantCode + tranId + amount + currency`
- **IPN Verification**: Hash-based verification of incoming notifications
- **Sandbox URL**: `https://sandbox.2checkout.com`
- **Production URL**: `https://secure.2checkout.com`

### Supported Currencies
45+ currencies. The platform uses USD as default and converts as needed.

---

## Admin Panel Configuration

Both gateways are configured via **Admin Panel → Payment Gateways**:

1. **Enable** the gateway toggle
2. **Enter credentials** (sandbox or live mode)
3. **Test Connection** to verify credentials
4. **Set up webhooks** using the provided callback URLs
5. **Configure country availability** via Country Payment Methods

### Connection Test Details
| Gateway | Test Method |
|---------|-------------|
| Razorpay | `GET /v1/orders?count=1` with Basic Auth |
| 2Checkout | Validates credential presence + merchant code |

---

## Database Tables Involved

| Table | Purpose |
|-------|---------|
| `payment_gateway_configs` | Gateway credentials, settings, test status |
| `tenant_subscriptions` | Subscription records (pending → active) |
| `tenant_addon_modules` | Add-on module records |
| `company_wallet_transactions` | Wallet top-up records |
| `company_wallets` | Wallet balance updates |
| `country_payment_methods` | Country-specific gateway availability |

---

## Error Handling

Both callbacks follow these principles:
- Always return HTTP 200 to acknowledge webhook receipt (prevent retries)
- Log errors for debugging via `console.error`
- Gracefully handle missing records (e.g., no matching pending transaction)
- Validate webhook signatures when secret is configured

---

## Testing

Edge function tests are in:
- `supabase/functions/razorpay-payment-callback/index.test.ts`
- `supabase/functions/twocheckout-payment-callback/index.test.ts`

Tests cover:
- CORS preflight handling
- Unknown event type handling (Razorpay)
- Payment captured/failed events (Razorpay)
- JSON and form-urlencoded IPN handling (2Checkout)
- XML response format verification (2Checkout)
- Non-complete status handling

Run tests via the Supabase edge function test runner.
