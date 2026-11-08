import { useCallback, useEffect, useState } from "react";
import { Check, X, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";
import { ReviewBadge, ReviewTabs, type ReviewFilter } from "@/components/ReviewStatus";
import { errMsg } from "@/lib/marketplace";

type Row = { id: string; user_id: string; video_path: string; challenge_code: string | null; status: string; reviewer_note: string | null; created_at: string; name: string; role: string; email: string; url: string | null };

const AdminIdentity = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const signed = async (path: string) => (await supabase.storage.from("kyc-videos").createSignedUrl(path, 900)).data?.signedUrl ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("identity_checks").select("*").order("created_at", { ascending: false }).limit(300);
    const list = (data ?? []) as any[];
    const { data: people } = list.length
      ? await supabase.from("profiles").select("id, full_name, email, role").in("id", [...new Set(list.map((c) => c.user_id))])
      : { data: [] as any[] };
    const withUrls = await Promise.all(
      list.map(async (c) => {
        const p = (people ?? []).find((x: any) => x.id === c.user_id);
        return {
          ...c,
          name: p?.full_name ?? "Unknown",
          role: p?.role ?? "",
          email: p?.email ?? "",
          url: c.status === "pending" ? await signed(c.video_path) : null,
        } as Row;
      })
    );
    // Waiting first. Order is kept after a decision so the row stays put and just changes label.
    const rank = (st: string) => (st === "pending" ? 0 : 1);
    setRows(withUrls.sort((x, y) => rank(x.status) - rank(y.status)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (r: Row, approve: boolean) => {
    const note = (notes[r.id] ?? "").trim();
    if (!approve && !note) return toast({ title: "Add a short reason so they know what to fix", variant: "destructive" });
    setBusy(r.id);
    const { error } = await (supabase as any).rpc("admin_review_identity_check", { p_id: r.id, p_approve: approve, p_note: note });
    setBusy(null);
    if (error) return toast({ title: "Couldn't save", description: errMsg(error), variant: "destructive" });
    // Keep the row on screen with its new label.
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: approve ? "approved" : "rejected", reviewer_note: note || null } : x)));
    toast({ title: approve ? "Approved" : "Declined", description: approve ? `${r.name} now has the face check badge.` : `${r.name} can record again.` });
  };

  const showVideo = async (r: Row) => {
    const url = await signed(r.video_path);
    if (!url) return toast({ title: "Couldn't load the video", variant: "destructive" });
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, url } : x)));
  };

  const remove = async (r: Row): Promise<string | null> => {
    const { data: path, error } = await (supabase as any).rpc("admin_delete_identity_check", { p_id: r.id });
    if (error) return errMsg(error);
    if (path) await supabase.storage.from("kyc-videos").remove([path as string]);
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    return null;
  };

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    all: rows.length,
  };
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className={ADMIN_SIDEBAR_OFFSET_CLASS}>
        <div className="container mx-auto py-10 max-w-3xl">
          <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink mb-2">Face checks</h1>
          <p className="font-body text-sm text-slate mb-6">
            Check that it is one real person, the face is clear, they turn left and right, and they say their name and the numbers shown. Reviewed checks stay here with their result, and you can delete any of them.
          </p>
          <ReviewTabs value={filter} onChange={setFilter} counts={counts} />

          {loading && <p className="font-body text-sm text-slate">Loading...</p>}
          {!loading && shown.length === 0 && (
            <div className="text-center py-14 bg-card rounded-xl border border-line font-body text-sm text-slate">
              {filter === "pending" ? "Nothing waiting for review." : "Nothing here yet."}
            </div>
          )}

          <div className="grid gap-4">
            {shown.map((r) => (
              <div key={r.id} className="p-5 rounded-xl border border-line bg-card">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-body text-[15px] font-semibold text-ink">{r.name}</p>
                      <ReviewBadge status={r.status} />
                    </div>
                    <p className="font-body text-sm text-slate mt-1">{[r.role, r.email, new Date(r.created_at).toLocaleString()].filter(Boolean).join(" · ")}</p>
                    <p className="font-body text-sm text-ink mt-2">
                      Asked to say: <strong className="tracking-widest">{r.challenge_code ? r.challenge_code.split("").join(" ") : "-"}</strong>
                    </p>
                    {r.status === "rejected" && r.reviewer_note && <p className="font-body text-sm text-kente mt-1">Reason: {r.reviewer_note}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!r.url && (
                      <button onClick={() => showVideo(r)} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white font-body text-sm font-semibold text-ink hover:bg-paper-2">
                        <Play className="w-4 h-4" /> Watch
                      </button>
                    )}
                    <AdminDeleteButton
                      title="Delete this face check?"
                      description={`${r.name}'s video and its record will be permanently removed. If it was approved, they lose the badge and need to record again. This can't be undone.`}
                      onConfirm={() => remove(r)}
                    />
                  </div>
                </div>

                {r.url && <video src={r.url} controls playsInline className="mt-4 w-full max-w-sm rounded-xl bg-black" />}

                {r.status === "pending" && (
                  <>
                    <input
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Reason (needed if you decline)"
                      className="w-full mt-4 h-10 bg-white border border-line rounded-lg px-3 font-body text-sm focus:outline-none focus:border-brass"
                    />
                    <div className="flex gap-2 mt-3">
                      <button disabled={busy === r.id} onClick={() => review(r, true)} className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-forest text-white font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button disabled={busy === r.id} onClick={() => review(r, false)} className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg border border-kente/30 text-kente font-body text-sm font-semibold hover:bg-kente/5 disabled:opacity-50">
                        <X className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIdentity;
