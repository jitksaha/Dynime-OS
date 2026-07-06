// Phase 5 — Email over HTTP (Workers-compatible). Replaces `npm:nodemailer` used by
// send-custom-email / send-auth-email, which does NOT run on Workers.
//
// Default provider is MailChannels (free to send from Cloudflare Workers, no API key).
// Resend / Postmark supported via EMAIL_API_KEY.

import type { Env } from "./env";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

export async function sendEmail(env: Env, msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const provider = (env.EMAIL_PROVIDER || "mailchannels").toLowerCase();
  const from = msg.from || env.EMAIL_FROM || "no-reply@dynime.com";
  const fromName = msg.fromName || env.EMAIL_FROM_NAME || "Dynime";
  const to = Array.isArray(msg.to) ? msg.to : [msg.to];

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.EMAIL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: `${fromName} <${from}>`, to, subject: msg.subject,
        html: msg.html, text: msg.text, reply_to: msg.replyTo,
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: await res.text() };
  }

  if (provider === "postmark") {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": env.EMAIL_API_KEY || "", "content-type": "application/json" },
      body: JSON.stringify({
        From: `${fromName} <${from}>`, To: to.join(","), Subject: msg.subject,
        HtmlBody: msg.html, TextBody: msg.text, ReplyTo: msg.replyTo,
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: await res.text() };
  }

  // MailChannels (default)
  const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: to.map((e) => ({ email: e })) }],
      from: { email: from, name: fromName },
      reply_to: msg.replyTo ? { email: msg.replyTo } : undefined,
      subject: msg.subject,
      content: [
        ...(msg.text ? [{ type: "text/plain", value: msg.text }] : []),
        ...(msg.html ? [{ type: "text/html", value: msg.html }] : []),
      ],
    }),
  });
  return res.ok ? { ok: true } : { ok: false, error: await res.text() };
}
