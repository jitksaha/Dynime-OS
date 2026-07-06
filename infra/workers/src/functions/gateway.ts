// Phase 5 — Functions gateway. Maps /functions/<name> to its ported handler.
//
// The frontend calls invokeFunction('<name>', { body }) (infra/frontend/invoke-shim.ts),
// a drop-in for supabase.functions.invoke. Each ported edge function exports
// handler(req, env, ctx) and is registered in REGISTRY below. This file is generated to
// cover all 68 functions; regenerate if you add one.

import type { Env } from "../_shared/env";
import { error, corsHeaders } from "../_shared/cors";
import { contextFromRequest } from "../_shared/auth-context";
import { handler as addonPaymentCallback } from "./addon-payment-callback";
import { handler as addonPaymentInitiate } from "./addon-payment-initiate";
import { handler as adminCreateUser } from "./admin-create-user";
import { handler as adminDelete } from "./admin-delete";
import { handler as aiAssistant } from "./ai-assistant";
import { handler as aiBusinessInsights } from "./ai-business-insights";
import { handler as aiBusinessOps } from "./ai-business-ops";
import { handler as aiChat } from "./ai-chat";
import { handler as aiChurnDetection } from "./ai-churn-detection";
import { handler as aiCopilot } from "./ai-copilot";
import { handler as aiDealScoring } from "./ai-deal-scoring";
import { handler as aiDocumentGen } from "./ai-document-gen";
import { handler as aiExpenseCategorize } from "./ai-expense-categorize";
import { handler as aiInvoiceSummary } from "./ai-invoice-summary";
import { handler as aiModelsList } from "./ai-models-list";
import { handler as aiProviderStatus } from "./ai-provider-status";
import { handler as aiProxy } from "./ai-proxy";
import { handler as aiSmartFeatures } from "./ai-smart-features";
import { handler as aiThreatDetection } from "./ai-threat-detection";
import { handler as aiWorkflowNlp } from "./ai-workflow-nlp";
import { handler as apiKeyGenerate } from "./api-key-generate";
import { handler as apiV1 } from "./api-v1";
import { handler as authEmailHook } from "./auth-email-hook";
import { handler as bkashTokenize } from "./bkash-tokenize";
import { handler as companySelfDelete } from "./company-self-delete";
import { handler as contactSubmit } from "./contact-submit";
import { handler as exchangeRatesSync } from "./exchange-rates-sync";
import { handler as gatewayConfig } from "./gateway-config";
import { handler as googleCalendarSync } from "./google-calendar-sync";
import { handler as hireEmployee } from "./hire-employee";
import { handler as integrationSend } from "./integration-send";
import { handler as integrationTest } from "./integration-test";
import { handler as inviteUser } from "./invite-user";
import { handler as invoicePdf } from "./invoice-pdf";
import { handler as invoiceReminders } from "./invoice-reminders";
import { handler as kbEmbed } from "./kb-embed";
import { handler as kybVerify } from "./kyb-verify";
import { handler as kycAiVerify } from "./kyc-ai-verify";
import { handler as liveChat } from "./live-chat";
import { handler as notifyJobApplication } from "./notify-job-application";
import { handler as paymentInitiate } from "./payment-initiate";
import { handler as paymentVerify } from "./payment-verify";
import { handler as phoneVerify } from "./phone-verify";
import { handler as posCourierTest } from "./pos-courier-test";
import { handler as posSendCourier } from "./pos-send-courier";
import { handler as posStoreSync } from "./pos-store-sync";
import { handler as razorpayPaymentCallback } from "./razorpay-payment-callback";
import { handler as recurringCharge } from "./recurring-charge";
import { handler as sendAuthEmail } from "./send-auth-email";
import { handler as sendCustomEmail } from "./send-custom-email";
import { handler as smsBalanceCheck } from "./sms-balance-check";
import { handler as smsSend } from "./sms-send";
import { handler as socialAiRespond } from "./social-ai-respond";
import { handler as socialOauthCallback } from "./social-oauth-callback";
import { handler as socialOauthInit } from "./social-oauth-init";
import { handler as sslcommerzCallback } from "./sslcommerz-callback";
import { handler as sslcommerzInitiate } from "./sslcommerz-initiate";
import { handler as stripeCheckout } from "./stripe-checkout";
import { handler as stripeCreateIntent } from "./stripe-create-intent";
import { handler as subscriptionNotification } from "./subscription-notification";
import { handler as sumsubAccessToken } from "./sumsub-access-token";
import { handler as twocheckoutPaymentCallback } from "./twocheckout-payment-callback";
import { handler as usageReset } from "./usage-reset";
import { handler as walletTopupCallback } from "./wallet-topup-callback";
import { handler as walletTopupInitiate } from "./wallet-topup-initiate";
import { handler as webauthnChallenge } from "./webauthn-challenge";
import { handler as webhookDispatch } from "./webhook-dispatch";
import { handler as whatsappSend } from "./whatsapp-send";

type Handler = (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

const REGISTRY: Record<string, Handler> = {
  "addon-payment-callback": (req, env) => addonPaymentCallback(req, env),
  "addon-payment-initiate": (req, env) => addonPaymentInitiate(req, env),
  "admin-create-user": (req, env) => adminCreateUser(req, env),
  "admin-delete": (req, env) => adminDelete(req, env),
  "ai-assistant": (req, env) => aiAssistant(req, env),
  "ai-business-insights": (req, env) => aiBusinessInsights(req, env),
  "ai-business-ops": (req, env) => aiBusinessOps(req, env),
  "ai-chat": (req, env) => aiChat(req, env),
  "ai-churn-detection": (req, env) => aiChurnDetection(req, env),
  "ai-copilot": (req, env) => aiCopilot(req, env),
  "ai-deal-scoring": (req, env) => aiDealScoring(req, env),
  "ai-document-gen": (req, env) => aiDocumentGen(req, env),
  "ai-expense-categorize": (req, env) => aiExpenseCategorize(req, env),
  "ai-invoice-summary": (req, env) => aiInvoiceSummary(req, env),
  "ai-models-list": (req, env) => aiModelsList(req, env),
  "ai-provider-status": (req, env) => aiProviderStatus(req, env),
  "ai-proxy": (req, env) => aiProxy(req, env),
  "ai-smart-features": (req, env) => aiSmartFeatures(req, env),
  "ai-threat-detection": (req, env) => aiThreatDetection(req, env),
  "ai-workflow-nlp": (req, env) => aiWorkflowNlp(req, env),
  "api-key-generate": (req, env) => apiKeyGenerate(req, env),
  "api-v1": (req, env) => apiV1(req, env),
  "auth-email-hook": (req, env) => authEmailHook(req, env),
  "bkash-tokenize": (req, env) => bkashTokenize(req, env),
  "company-self-delete": (req, env) => companySelfDelete(req, env),
  "contact-submit": (req, env) => contactSubmit(req, env),
  "exchange-rates-sync": (req, env) => exchangeRatesSync(req, env),
  "gateway-config": (req, env) => gatewayConfig(req, env),
  "google-calendar-sync": (req, env) => googleCalendarSync(req, env),
  "hire-employee": (req, env) => hireEmployee(req, env),
  "integration-send": (req, env) => integrationSend(req, env),
  "integration-test": (req, env) => integrationTest(req, env),
  "invite-user": (req, env) => inviteUser(req, env),
  "invoice-pdf": (req, env) => invoicePdf(req, env),
  "invoice-reminders": (req, env) => invoiceReminders(req, env),
  "kb-embed": (req, env) => kbEmbed(req, env),
  "kyb-verify": (req, env) => kybVerify(req, env),
  "kyc-ai-verify": (req, env) => kycAiVerify(req, env),
  "live-chat": (req, env) => liveChat(req, env),
  "notify-job-application": (req, env) => notifyJobApplication(req, env),
  "payment-initiate": (req, env) => paymentInitiate(req, env),
  "payment-verify": (req, env) => paymentVerify(req, env),
  "phone-verify": (req, env) => phoneVerify(req, env),
  "pos-courier-test": (req, env) => posCourierTest(req, env),
  "pos-send-courier": (req, env) => posSendCourier(req, env),
  "pos-store-sync": (req, env) => posStoreSync(req, env),
  "razorpay-payment-callback": (req, env) => razorpayPaymentCallback(req, env),
  "recurring-charge": (req, env) => recurringCharge(req, env),
  "send-auth-email": (req, env) => sendAuthEmail(req, env),
  "send-custom-email": (req, env) => sendCustomEmail(req, env),
  "sms-balance-check": (req, env) => smsBalanceCheck(req, env),
  "sms-send": (req, env) => smsSend(req, env),
  "social-ai-respond": (req, env) => socialAiRespond(req, env),
  "social-oauth-callback": (req, env) => socialOauthCallback(req, env),
  "social-oauth-init": (req, env) => socialOauthInit(req, env),
  "sslcommerz-callback": (req, env) => sslcommerzCallback(req, env),
  "sslcommerz-initiate": (req, env) => sslcommerzInitiate(req, env),
  "stripe-checkout": (req, env) => stripeCheckout(req, env),
  "stripe-create-intent": (req, env) => stripeCreateIntent(req, env),
  "subscription-notification": (req, env) => subscriptionNotification(req, env),
  "sumsub-access-token": (req, env) => sumsubAccessToken(req, env),
  "twocheckout-payment-callback": (req, env) => twocheckoutPaymentCallback(req, env),
  "usage-reset": (req, env) => usageReset(req, env),
  "wallet-topup-callback": (req, env) => walletTopupCallback(req, env),
  "wallet-topup-initiate": (req, env) => walletTopupInitiate(req, env),
  "webauthn-challenge": (req, env) => webauthnChallenge(req, env),
  "webhook-dispatch": (req, env) => webhookDispatch(req, env),
  "whatsapp-send": (req, env) => whatsappSend(req, env),
};

export async function handleFunctions(
  req: Request, env: Env, ctx: ExecutionContext, path: string,
): Promise<Response> {
  const name = path.replace(/^\/functions\/(v1\/)?/, "").split("/")[0];
  const fn = REGISTRY[name];
  if (!fn) {
    return error(`Unknown function: ${name}`, 404, {
      hint: "See infra/workers/PORTING_CHECKLIST.md for the function list.",
    });
  }

  // Validate the bearer token early (handlers re-resolve via contextFromRequest as needed).
  await contextFromRequest(req, env);

  try {
    return await fn(req, env, ctx);
  } catch (e) {
    return new Response(JSON.stringify({ error: `${name}: ${(e as Error).message}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
