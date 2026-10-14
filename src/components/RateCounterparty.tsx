import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/marketplace";

interface Props {
  requestId: string;
  /** Rating already given by the current user, if any. */
  existingRating: number | null;
  /** Who is being rated, e.g. "the traveler". */
  who: string;
  onDone: () => void;
}

export const RateCounterparty = ({ requestId, existingRating, who, onDone }: Props) => {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (existingRating != null) {
    return (
      <div className="bg-card rounded-3xl border border-border/80 p-6 shadow-[var(--shadow-card)] font-body text-sm text-muted-foreground">
        You rated {who} <strong className="text-foreground">{existingRating}/5</strong>. Thank you.
      </div>
    );
  }

  const submit = async () => {
    if (!stars) {
      toast({ title: "Pick a rating", description: "Tap a star from 1 to 5.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("rate_request", {
      p_request_id: requestId,
      p_rating: stars,
      p_comment: comment.trim() || undefined,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't save rating", description: errMsg(error), variant: "destructive" });
      return;
    }
    toast({ title: "Thanks for the feedback" });
    onDone();
  };

  return (
    <div className="bg-card rounded-3xl border border-border/80 p-6 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-xl font-medium text-foreground mb-1">Rate {who}</h3>
      <p className="font-body text-xs text-muted-foreground mb-4">Ratings are shown on profiles and help others decide who to trust.</p>
      <div className="flex gap-1 mb-4" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => setStars(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={`w-8 h-8 ${n <= (hover || stars) ? "fill-gold text-gold" : "text-border"}`} />
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment"
        className="w-full bg-background border border-border rounded-xl px-4 py-3 font-body text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Saving..." : "Submit rating"}
      </button>
    </div>
  );
};
