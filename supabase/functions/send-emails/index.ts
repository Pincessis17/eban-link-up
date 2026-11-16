// Eban: email copies of in-app notifications, sent through Resend or Brevo.
// Called every 5 minutes by the database timer (public.trigger_email_send).
// Secrets this function reads (set in Supabase > Edge Functions > Secrets):
//   RESEND_API_KEY – from Resend > API Keys            (use this one, or BREVO_API_KEY)
//   BREVO_API_KEY  – from Brevo > SMTP & API > API keys
//   EMAIL_FROM     – e.g. notifications@ebancompany.com (an address on your verified domain)
//   SITE_URL       – e.g. https://eban-link-up.vercel.app (no trailing slash)
// If both keys are set, Resend is used.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Row = { id: string; email: string; full_name: string | null; title: string | null; message: string; link: string | null; type: string };

const html = (r: Row, site: string) => {
  const first = (r.full_name ?? "").trim().split(/\s+/)[0];
  const url = site + (r.link ?? "/");
  return `<!doctype html><html><body style="margin:0;background:#F4EEE2;font-family:Georgia,'Times New Roman',serif;color:#1C1A17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EEE2;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FBF8F1;border:1px solid #E2D8C6">
<tr><td style="height:6px;background:repeating-linear-gradient(90deg,#C8932F 0 18px,#1C1A17 18px 24px,#2F5D3A 24px 42px,#1C1A17 42px 48px,#B5432F 48px 66px,#1C1A17 66px 72px)"></td></tr>
<tr><td style="padding:28px 32px 8px;font-size:20px;letter-spacing:2px">EBAN</td></tr>
<tr><td style="padding:8px 32px 0;font-size:22px;line-height:1.3">${esc(r.title ?? "Update")}</td></tr>
<tr><td style="padding:12px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#4A463F">
${first ? `Hi ${esc(first)},<br><br>` : ""}${esc(r.message)}</td></tr>
<tr><td style="padding:24px 32px 28px"><a href="${esc(url)}" style="display:inline-block;background:#B07D22;color:#FBF8F1;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:12px 22px">Open in Eban</a></td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #E2D8C6;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#7A746A">
You get this because you use Eban. To stop these emails, switch them off on <a href="${esc(site)}/profile" style="color:#7A746A">your profile</a>.</td></tr>
</table></td></tr></table></body></html>`;
};

const text = (r: Row, site: string) =>
  `${r.title ?? "Update"}\n\n${r.message}\n\nOpen in Eban: ${site}${r.link ?? "/"}\n\nTo stop these emails, switch them off on your profile: ${site}/profile`;

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Only the database timer may run this.
  const secret = req.headers.get("x-eban-cron") ?? "";
  const { data: ok } = await db.rpc("email_cron_secret_ok", { p_secret: secret });
  if (!ok) return new Response("Forbidden", { status: 403 });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
  if ((!resendKey && !brevoKey) || !from || !site) {
    return Response.json({ skipped: "RESEND_API_KEY (or BREVO_API_KEY), EMAIL_FROM or SITE_URL not set yet" });
  }

  const send = (r: Row) => {
    const subject = r.title ? `${r.title} · Eban` : "Update from Eban";
    if (resendKey) {
      return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: `Eban <${from}>`,
          to: [r.email],
          subject,
          html: html(r, site),
          text: text(r, site),
          tags: [{ name: "type", value: r.type.replace(/[^A-Za-z0-9_-]/g, "_") }],
        }),
      });
    }
    return fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: "Eban" },
        to: [{ email: r.email, ...(r.full_name ? { name: r.full_name } : {}) }],
        subject,
        htmlContent: html(r, site),
        textContent: text(r, site),
        tags: [r.type],
      }),
    });
  };

  await db.rpc("skip_stale_emails");
  const { data, error } = await db.rpc("claim_email_batch", { p_limit: 20 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  const failed: string[] = [];
  for (const r of (data ?? []) as Row[]) {
    if (sent + failed.length > 0) await new Promise((ok) => setTimeout(ok, 600)); // stay under the provider's per-second limit
    const res = await send(r);
    if (res.ok) {
      sent++;
    } else {
      failed.push(r.id);
      console.error("Email provider error", res.status, await res.text());
    }
  }

  // Put failures back in the queue; they are retried for up to a day.
  if (failed.length) {
    await db.from("notifications").update({ email_sent_at: null }).in("id", failed);
  }
  return Response.json({ sent, failed: failed.length });
});
