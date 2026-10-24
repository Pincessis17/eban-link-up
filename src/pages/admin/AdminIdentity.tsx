import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { errMsg } from "@/lib/marketplace";

type Row = { id: string; user_id: string; video_path: string; challenge_code: string | null; duration_seconds: number | null; status: string; reviewer_note: string | null; created_at: string; name: string; role: string; email: string; url: string | null };

const AdminIdentity = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("identity_checks").select("*").order("created_at", { ascending: true });
    const list = (data ?? []) as any[];
    const { data: people } = list.length ? await supabase.from("profiles").select("id, full_name, email, role").in("id", list.map((c) => c.user_id)) : { data: [] as any[] };
    const withUrls = await Promise.all(
      list.map(async (c) => {
        const p = (people ?? []).find((x: any) => x.id === c.user_id);
        const { data: signed } = c.status === "pending" ? await supabase.storage.from("kyc-videos").createSignedUrl(c.video_path, 900) : { data: null };
        return { ...c, name: p?.full_name ?? "Unknown", role: p?.role ?? "", email: p?.email ?? "", url: signed?.signedUrl ?? null } as Row;
      })
    );
    setRows(withUrls);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (r: Row, approve: boolean) => {
    if (!approve && !(notes[r.id] ?? "").trim()) return toast({ title: "Add a short reason so they know what to fix", variant: "destructive" });
    setBusy(r.id);
    const { error } = await (supabase as any).rpc("admin_review_identity_check", { p_id: r.id, p_approve: approve, p_note: notes[r.id] ?? "" });
    setBusy(null);
    if (error) return toast({ title: "Couldn't save", description: errMsg(error), variant: "destructive" });
    toast({ title: approve ? "Approved" : "Rejected. They can record again." });
    load();
  };

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending").reverse();

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className={ADMIN_SIDEBAR_OFFSET_CLASS}>
        <div className="container mx-auto px-6 py-10 max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Face checks</h1>
          <p className="font-body text-sm text-muted-foreground mb-8">
            Watch each video. Check that it is one real person, the face is clear, they turn left and right, and they say their name and the numbers shown. Approve to give them a badge, or reject with a reason.
          </p>
          {loading && <p className="font-body text-sm text-muted-foreground">Loading...</p>}
          <h2 className="font-display text-lg font-semibold mb-3">Waiting for review ({pending.length})</h2>
          <div className="grid gap-4 mb-10">
            {!loading && pending.length === 0 && <p className="font-body text-sm text-muted-foreground bg-card p-6 rounded-2xl border border-border">Nothing to review.</p>}
            {pending.map((r) => (
              <div key={r.id} className="p-5 rounded-xl border border-border bg-card">
                <p className="font-display text-sm font-bold text-foreground">{r.name} <span className="font-body font-normal text-muted-foreground">({r.role.toLowerCase()})</span></p>
                <p className="font-body text-xs text-muted-foreground mt-1">{r.email} · {new Date(r.created_at).toLocaleString()}</p>
                <p className="font-body text-sm text-foreground mt-3">They were asked to say: <strong className="tracking-widest">{r.challenge_code ? r.challenge_code.split("").join(" ") : "-"}</strong></p>
                {r.url ? <video src={r.url} controls playsInline className="mt-3 w-full max-w-sm rounded-xl bg-black" /> : <p className="font-body text-xs text-destructive mt-3">Couldn't load the video. Refresh the page.</p>}
                <input value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="Reason (required if you reject)" className="w-full mt-3 bg-background border border-border rounded-xl px-3 py-2 font-body text-sm" />
                <div className="flex gap-2 mt-3">
                  <button disabled={busy === r.id} onClick={() => review(r, true)} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50">Approve</button>
                  <button disabled={busy === r.id} onClick={() => review(r, false)} className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground disabled:opacity-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowDone((v) => !v)} className="font-display text-lg font-semibold mb-3 text-left">Reviewed ({done.length}) {showDone ? "▾" : "▸"}</button>
          {showDone && (
            <div className="grid gap-2">
              {done.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-border bg-card font-body text-sm flex justify-between gap-3">
                  <span>{r.name} ({r.role.toLowerCase()})</span>
                  <span className={r.status === "approved" ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>{r.status}{r.reviewer_note ? `: ${r.reviewer_note}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminIdentity;
