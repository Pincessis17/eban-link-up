// Eban: phone and computer notifications (web push).
// Called by the database the moment a notification is created (public.trigger_push_send),
// and once more a day later if it is still unread (public.trigger_push_reminders).
// Secrets this function reads (set in Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY  – the "publicKey" from PRIVATE-eban-push-keys.json
//   VAPID_PRIVATE_KEY – the "privateKey" from the same file (never share it)
//   VAPID_SUBJECT     – optional, defaults to mailto:support@ebancompany.com
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

type Row = { user_id: string; title: string | null; message: string; link: string | null; type: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Only the database's own timer secret may call this.
  const secret = req.headers.get("x-eban-cron") ?? "";
  const { data: ok } = await db.rpc("email_cron_secret_ok", { p_secret: secret });
  if (!ok) return new Response("forbidden", { status: 403 });

  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return new Response("push keys not set", { status: 200 });
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@ebancompany.com", pub, priv);

  const { id, reminder = false } = await req.json().catch(() => ({ id: null }));
  if (!id) return new Response("missing id", { status: 400 });

  const { data, error } = await db.rpc("push_payload", { p_id: id, p_reminder: reminder === true });
  if (error) return new Response(error.message, { status: 500 });
  const rows = (data ?? []) as Row[];
  if (!rows.length) return new Response("nothing to send", { status: 200 });

  const payload = JSON.stringify({
    id,
    title: (reminder ? "Reminder: " : "") + (rows[0].title ?? "Eban"),
    body: rows[0].message,
    url: rows[0].link ?? "/",
  });

  const dead: string[] = [];
  const sent: string[] = [];
  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
        sent.push(r.endpoint);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // The device unsubscribed or the browser forgot it: stop sending there.
        if (code === 404 || code === 410) dead.push(r.endpoint);
        else console.error("push failed", code, (e as Error).message);
      }
    }),
  );

  if (reminder) await db.rpc("push_done", { p_id: null, p_dead: dead, p_ok: sent });
  else await db.rpc("push_done", { p_id: id, p_dead: dead, p_ok: sent });
  return new Response(JSON.stringify({ sent: sent.length, removed: dead.length }), { headers: { "Content-Type": "application/json" } });
});
