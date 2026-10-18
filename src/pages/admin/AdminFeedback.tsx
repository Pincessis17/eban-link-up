import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { DeleteButton } from "@/components/AdminDeleteButton";
import { errMsg } from "@/lib/marketplace";

interface Row {
  id: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null; role: string | null } | null;
}

const BADGE: Record<string, string> = {
  pending: "bg-accent/20 text-accent-foreground",
  approved: "bg-green-100 text-green-800",
  hidden: "bg-gray-100 text-gray-600",
};

const AdminFeedback = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "hidden">("approved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("id, rating, comment, status, created_at, profiles:user_id(full_name, role)")
      .order("created_at", { ascending: false });
    if (error) setError(errMsg(error));
    setRows((data as unknown as Row[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    setError(null);
    const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
    if (error) setError(errMsg(error));
    else load();
  };

  const remove = async (id: string) => {
    const { data, error } = await supabase.from("feedback").delete().eq("id", id).select("id");
    if (error) return errMsg(error);
    if (!data?.length) return "Nothing was deleted (permission denied).";
    load();
    return null;
  };

  const shown = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className={ADMIN_SIDEBAR_OFFSET_CLASS}>
        <div className="container mx-auto px-6 py-10 max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Feedback &amp; reviews</h1>
          <p className="font-body text-sm text-muted-foreground mb-6">Reviews go live as soon as they are posted. Hide any that break the rules.</p>
          <div className="flex gap-2 mb-6">
            {(["approved", "hidden", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body font-semibold capitalize border ${
                  filter === f ? "bg-gold/15 border-gold/40 text-gold-dark" : "border-border text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {error && <p className="mb-4 font-body text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">{error}</p>}
          {loading && <p className="font-body text-sm text-muted-foreground">Loading...</p>}
          {!loading && shown.length === 0 && (
            <div className="text-center py-16 bg-card rounded-2xl border border-border font-body text-sm text-muted-foreground">Nothing here.</div>
          )}
          <div className="grid gap-3">
            {shown.map((r) => (
              <div key={r.id} className="p-5 rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-gold text-gold" : "text-border"}`} />
                      ))}
                    </span>
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      {r.profiles?.full_name ?? "Unknown"} · {r.profiles?.role ?? "-"} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-semibold uppercase ${BADGE[r.status] ?? ""}`}>{r.status}</span>
                </div>
                <p className="font-body text-sm text-foreground mt-3 whitespace-pre-wrap">{r.comment}</p>
                <div className="flex items-center gap-2 mt-4">
                  {r.status !== "approved" && (
                    <button onClick={() => setStatus(r.id, "approved")} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-body font-semibold">
                      Show again
                    </button>
                  )}
                  {r.status !== "hidden" && (
                    <button onClick={() => setStatus(r.id, "hidden")} className="px-3 py-1.5 rounded-lg border border-border text-xs font-body font-semibold text-muted-foreground">
                      Hide
                    </button>
                  )}
                  <DeleteButton title="Delete this feedback?" description="This permanently removes it." onConfirm={() => remove(r.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFeedback;
