import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Star, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errMsg } from "@/lib/marketplace";

interface Entry {
  id: string;
  display_name: string;
  role: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

const Stars = ({ value, size = "w-3.5 h-3.5" }: { value: number; size?: string }) => (
  <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`${size} ${n <= value ? "fill-gold text-gold" : "text-border"}`} />
    ))}
  </span>
);

const roleLabel = (r: string | null) => (r === "Traveller" ? "Traveler" : r === "Sender" ? "Sender" : "Member");

export const FeedbackWall = () => {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("public_feedback");
    setEntries((data as Entry[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = entries.length;
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: entries.filter((e) => e.rating === n).length }));
    const avg = total ? entries.reduce((a, e) => a + e.rating, 0) / total : 0;
    return { total, dist, avg };
  }, [entries]);

  const submit = async () => {
    if (!user) return;
    setMsg(null);
    if (rating < 1) return setMsg({ ok: false, text: "Pick a star rating." });
    if (comment.trim().length < 10) return setMsg({ ok: false, text: "Write at least 10 characters." });
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({ user_id: user.id, rating, comment: comment.trim() });
    setBusy(false);
    if (error) {
      const dup = errMsg(error).includes("feedback_one_per_user");
      return setMsg({ ok: false, text: dup ? "You've already sent feedback. Thank you!" : errMsg(error) });
    }
    setMsg({ ok: true, text: "Thank you! Your feedback will appear once our team has reviewed it." });
    setRating(0);
    setComment("");
  };

  return (
    <section id="feedback" className="py-24 bg-background border-t border-gold/10">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-[minmax(0,340px)_1fr] gap-14">
          <div>
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark mb-4">Community feedback</p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight text-foreground">
              Straight from <em className="italic text-gold-dark">our members</em>
            </h2>
            <p className="font-body text-sm text-muted-foreground leading-relaxed mt-5">
              Every review here is written by a real Eban account and approved by our team. No edits, no invented quotes.
            </p>

            {stats.total > 0 && (
              <div className="mt-8 flex items-center gap-5">
                <div className="font-display text-6xl font-light text-foreground leading-none">{stats.avg.toFixed(1)}</div>
                <div className="flex-1 space-y-1">
                  {stats.dist.map((d) => (
                    <div key={d.n} className="flex items-center gap-2 text-[10px] font-body text-muted-foreground">
                      <span className="w-2">{d.n}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-gold" style={{ width: `${(d.c / stats.total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] font-body text-muted-foreground pt-1">
                    {stats.total} review{stats.total === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            )}

            {user ? (
              <button
                onClick={() => {
                  setMsg(null);
                  setOpen(true);
                }}
                className="mt-8 inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-5 py-3 rounded-xl text-xs font-body font-bold tracking-wider uppercase hover:opacity-90 shadow-sm"
              >
                <MessageSquarePlus className="w-4 h-4" /> Share your experience
              </button>
            ) : (
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-2 border border-gold/40 text-gold-dark px-5 py-3 rounded-xl text-xs font-body font-bold tracking-wider uppercase hover:bg-gold/10"
              >
                Sign in to leave a review
              </Link>
            )}
          </div>

          <div>
            {loading ? (
              <p className="font-body text-sm text-muted-foreground">Loading...</p>
            ) : entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="font-display text-xl text-foreground">No reviews yet</p>
                <p className="font-body text-sm text-muted-foreground mt-2">
                  Be the first to share your experience with Eban and help others make informed decisions.
                </p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 gap-5 [&>*]:mb-5">
                {entries.map((e) => (
                  <figure key={e.id} className="break-inside-avoid bg-card border border-border border-l-4 border-l-gold rounded-xl p-6 shadow-sm">
                    <Stars value={e.rating} />
                    <blockquote className="font-body text-sm text-foreground leading-relaxed mt-3">{e.comment}</blockquote>
                    <figcaption className="mt-4 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center font-display text-sm text-gold-dark">
                        {e.display_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-body text-xs">
                        <span className="font-semibold text-foreground block">{e.display_name}</span>
                        <span className="text-muted-foreground">
                          {roleLabel(e.role)} · {new Date(e.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Share your experience</DialogTitle>
            <DialogDescription>
              Posting as {profile?.full_name?.split(" ")[0] ?? "you"}. Reviews are checked by our team before they appear.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star className={`w-8 h-8 ${n <= rating ? "fill-gold text-gold" : "text-border"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={600}
              rows={5}
              placeholder="What was it like? What could we do better?"
              className="w-full rounded-lg border border-border bg-background p-3 font-body text-sm"
            />
            {msg && (
              <p className={`font-body text-sm rounded-lg p-3 border ${msg.ok ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-destructive bg-destructive/10 border-destructive/30"}`}>
                {msg.text}
              </p>
            )}
            <button
              onClick={submit}
              disabled={busy || msg?.ok}
              className="w-full bg-gradient-gold text-accent-foreground py-3 rounded-xl text-xs font-body font-bold tracking-wider uppercase disabled:opacity-50"
            >
              {busy ? "Sending..." : "Submit feedback"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
