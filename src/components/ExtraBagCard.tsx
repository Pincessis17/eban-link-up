import { useCallback, useEffect, useState } from "react";
import { Luggage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { errMsg, money } from "@/lib/marketplace";
import { usePlatformFee } from "@/lib/fees";
import { PAYMENT_METHODS, paymentReference } from "@/lib/paymentConfig";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ExtraBag {
  id: string; request_id: string; bag_cost: number; compensation: number; service_fee: number; total: number;
  advance_amount: number; final_amount: number; note: string | null; status: string; admin_note: string | null;
}

const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);

const Breakdown = ({ b }: { b: Pick<ExtraBag, "bag_cost" | "compensation" | "service_fee" | "total"> }) => (
  <div className="rounded-xl border border-border bg-background p-4 font-body text-sm space-y-1.5">
    <div className="flex justify-between"><span>Extra bag cost</span><span>{money(b.bag_cost)}</span></div>
    <div className="flex justify-between"><span>Traveler's compensation</span><span>{money(b.compensation)}</span></div>
    <div className="flex justify-between text-muted-foreground"><span>EBAN service fee (on compensation)</span><span>{money(b.service_fee)}</span></div>
    <div className="flex justify-between font-semibold border-t border-border pt-1.5"><span>Sender pays</span><span>{money(b.total)}</span></div>
  </div>
);

/**
 * Extra baggage, shown on a request page. Optional: the traveler flags it, EBAN plans it, the sender pays into
 * escrow, half the bag cost goes to the traveler early and the rest follows delivery.
 */
export const ExtraBagCard = ({ requestId, role, requestStatus }: { requestId: string; role: "sender" | "traveller"; requestStatus: string }) => {
  const fee = usePlatformFee();
  const [bag, setBag] = useState<ExtraBag | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [cost, setCost] = useState("");
  const [comp, setComp] = useState("");
  const [note, setNote] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from("extra_bags").select("*").eq("request_id", requestId).neq("status", "cancelled").maybeSingle();
    setBag((data as ExtraBag) ?? null);
    setLoaded(true);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast({ title: "Couldn't do that", description: errMsg(error), variant: "destructive" });
    toast({ title: ok });
    setFormOpen(false);
    setPayOpen(false);
    load();
  };

  if (!loaded) return null;

  // No extra bag yet: only the traveler can start one, and only before the handover.
  if (!bag) {
    if (role !== "traveller" || !["accepted_by_traveller", "paid"].includes(requestStatus)) return null;
    const c = Number(cost) || 0;
    const p = Number(comp) || 0;
    const f = Math.round(p * fee.percent) / 100;
    return (
      <div className="bg-card rounded-2xl border border-border p-5 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <Luggage className="w-4 h-4 text-gold-dark" /> Does this parcel need an extra bag?
            </h4>
            <p className="font-body text-xs text-muted-foreground mt-1 max-w-md">
              Optional. If the sender needs more space than you have, flag it here. EBAN reviews it with you first. The sender pays the bag into escrow, so you are never out of pocket for more than half.
            </p>
          </div>
          {!formOpen && (
            <button onClick={() => setFormOpen(true)} className="text-xs font-body font-bold uppercase tracking-wider text-gold-dark border border-gold/40 rounded-xl px-4 py-2 hover:bg-gold/10">
              Flag an extra bag
            </button>
          )}
        </div>
        {formOpen && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="eb-cost" className="font-body text-xs font-semibold text-muted-foreground block mb-1">Full cost of the bag (USD)</label>
                <input id="eb-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="60" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 font-body text-sm" />
              </div>
              <div>
                <label htmlFor="eb-comp" className="font-body text-xs font-semibold text-muted-foreground block mb-1">Your compensation (USD)</label>
                <input id="eb-comp" inputMode="decimal" value={comp} onChange={(e) => setComp(e.target.value)} placeholder="15" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 font-body text-sm" />
              </div>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Airline, bag size, anything EBAN should know (optional)" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 font-body text-sm resize-none" />
            {c > 0 && (
              <div className="font-body text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3 space-y-1">
                <p>Sender pays about <strong className="text-foreground">{money(c + p + f)}</strong> into escrow (bag {money(c)} + your compensation {money(p)} + EBAN fee {money(f)} on the compensation).</p>
                <p>You receive <strong className="text-foreground">{money(c / 2)}</strong> early toward the bag, pay the other half yourself, then get <strong className="text-foreground">{money(c / 2 + p)}</strong> after delivery.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                disabled={busy || c <= 0}
                onClick={() => run(() => rpc("propose_extra_bag", { p_request_id: requestId, p_bag_cost: c, p_compensation: p, p_note: note.trim() || null }), "Sent to EBAN for review")}
                className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send to EBAN"}
              </button>
              <button onClick={() => setFormOpen(false)} className="text-xs font-body text-muted-foreground px-3">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const stage: Record<string, { title: string; text: string }> = {
    proposed: {
      title: role === "sender" ? "The traveler flagged an extra bag" : "Waiting for EBAN to review",
      text: role === "sender" ? "EBAN is reviewing the plan and will confirm before you pay anything." : "EBAN will review the plan and contact you to arrange the purchase.",
    },
    approved: {
      title: role === "sender" ? "Extra bag approved: pay to go ahead" : "Approved by EBAN. Waiting for the sender to pay",
      text: role === "sender" ? "Your payment is held in escrow. EBAN sends half the bag cost to the traveler now and the rest only after you confirm delivery." : "Once the sender pays, EBAN sends you half the bag cost.",
    },
    payment_pending: { title: "Payment reported", text: "EBAN is checking that the money arrived." },
    held: {
      title: "Extra bag money is in escrow",
      text: role === "traveller" ? `EBAN will send you ${money(bag.advance_amount)} toward the bag. You cover the other half, and get ${money(bag.final_amount)} after delivery.` : "EBAN is sending the traveler the early half of the bag cost.",
    },
    advance_sent: {
      title: "Early payment sent to the traveler",
      text: role === "traveller" ? `You'll receive ${money(bag.final_amount)} (the other half of the bag plus your compensation) after the sender confirms delivery.` : "The rest is released to the traveler after you confirm delivery.",
    },
    settled: { title: "Extra bag settled", text: role === "traveller" ? "You've been paid in full for the extra bag." : "The traveler has been paid for the extra bag." },
  };
  const s = stage[bag.status] ?? { title: bag.status, text: "" };

  return (
    <div className="bg-card rounded-2xl border border-gold/30 p-5 mb-6">
      <h4 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
        <Luggage className="w-4 h-4 text-gold-dark" /> {s.title}
      </h4>
      <p className="font-body text-xs text-muted-foreground mt-1 mb-3">{s.text}</p>
      <Breakdown b={bag} />
      {role === "traveller" && (
        <p className="font-body text-xs text-muted-foreground mt-2">
          You receive {money(bag.advance_amount)} early + {money(bag.final_amount)} after delivery = {money(bag.advance_amount + bag.final_amount)}.
        </p>
      )}
      {bag.note && <p className="font-body text-xs text-muted-foreground mt-2">Note: {bag.note}</p>}
      <div className="flex flex-wrap gap-2 mt-4">
        {role === "sender" && bag.status === "approved" && (
          <button onClick={() => setPayOpen(true)} className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl">
            Pay {money(bag.total)}
          </button>
        )}
        {["proposed", "approved"].includes(bag.status) && (
          <button disabled={busy} onClick={() => run(() => rpc("cancel_extra_bag", { p_id: bag.id }), "Extra bag cancelled")} className="text-xs font-body font-semibold text-muted-foreground hover:text-destructive px-3">
            {role === "sender" ? "Decline" : "Cancel"}
          </button>
        )}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Pay {money(bag.total)} for the extra bag</DialogTitle>
            <DialogDescription>Send the money to EBAN, then tell us you've sent it. EBAN holds it until you confirm delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 font-body text-sm">
            <Breakdown b={bag} />
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Use this reference</p>
              <p className="font-mono text-lg font-bold text-foreground">{paymentReference(requestId)}-BAG</p>
            </div>
            {PAYMENT_METHODS.filter((m) => m.details.length > 0).map((m) => (
              <div key={m.label} className="rounded-xl border border-border p-4">
                <p className="font-semibold text-foreground">{m.label}</p>
                {m.details.map((d) => (
                  <p key={d} className="text-muted-foreground">{d}</p>
                ))}
              </div>
            ))}
            <button
              onClick={() => run(() => rpc("report_extra_bag_payment", { p_id: bag.id }), "Thanks! EBAN will confirm your payment shortly.")}
              disabled={busy}
              className="w-full bg-gradient-gold text-accent-foreground font-bold text-xs uppercase tracking-wider py-3 rounded-xl disabled:opacity-50"
            >
              {busy ? "Saving..." : "I've sent the payment"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
