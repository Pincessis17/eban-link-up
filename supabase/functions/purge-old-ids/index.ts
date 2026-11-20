// Eban: deletes ID photos and face videos 30 days after review (Privacy Policy, section 5).
// Called nightly by the database timer (public.trigger_identity_purge). Keeps the decision record; only files go.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type Due = { kind: "id_documents" | "identity_checks" | "verifications"; row_id: string; bucket: string; path: string };

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Only the database timer may run this.
  const { data: ok } = await db.rpc("email_cron_secret_ok", { p_secret: req.headers.get("x-eban-cron") ?? "" });
  if (!ok) return new Response("Forbidden", { status: 403 });

  const { data, error } = await db.rpc("identity_files_due", { p_days: 30, p_limit: 200 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const due = (data ?? []) as Due[];

  let deleted = 0;
  const failed: string[] = [];
  // One storage call per bucket, then mark the rows per table.
  for (const bucket of [...new Set(due.map((d) => d.bucket))]) {
    const items = due.filter((d) => d.bucket === bucket);
    const { error: rmErr } = await db.storage.from(bucket).remove(items.map((d) => d.path));
    if (rmErr) {
      console.error("Storage delete failed", bucket, rmErr.message);
      failed.push(...items.map((d) => d.row_id));
      continue;
    }
    for (const kind of [...new Set(items.map((d) => d.kind))]) {
      const ids = items.filter((d) => d.kind === kind).map((d) => d.row_id);
      const { data: n, error: markErr } = await db.rpc("mark_identity_files_deleted", { p_kind: kind, p_ids: ids });
      if (markErr) console.error("Mark failed", kind, markErr.message);
      else deleted += Number(n ?? 0);
    }
  }
  return Response.json({ due: due.length, deleted, failed: failed.length });
});
