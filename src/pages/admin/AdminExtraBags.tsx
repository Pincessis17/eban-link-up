import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { errMsg, money } from "@/lib/marketplace";
import { paymentReference } from "@/lib/paymentConfig";
import type { ExtraBag } from "@/components/ExtraBagCard";

type Row = ExtraBag & { route: string; sender: string; traveller: string; payout: string; requestStatus: string; created_at: string };

const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);

const AdminExtraBags = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("extra_bags").select("*").not("status", "in", "(settled,cancelled)").order("created_at", { ascending: true });
    const list = (data ?? []) as any[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: reqs } = await supabase.from("delivery_requests").select("id, origin_city, destination_city, status, sender_id").in("id", list.map((b) => b.request_id));
    const { data: senders } = await supabase.from("profiles").select("id, full_name").in("id", list.map((b) => b.sender_id));
    const { data: travs } = await supabase.from("traveller_profiles").select("id, name, payout_method, payout_account_name, payout_account_number, payout_provider").in("id", list.map((b) => b.traveller_id));
    setRows(
      list.map((b) => {
        const r = (reqs ?? []).find((x) => x.id === b.request_id);
        const t = (travs ?? []).find((x) => x.id === b.traveller_id);
        return {
          ...b,
          route: r ? `${r.origin_city} to ${r.destination_city}` : "Unknown route",
          requestStatus: r?.status ?? "",
          sender: (senders ?? []).find((s) => s.id === b.sender_id)?.full_name ?? "Sender",
          traveller: t?.name ?? "Traveller",
          payout: t?.payout_account_number ? `${t.payout_method === "mobile_money" ? "Mobile money" : "Bank"} ${t.payout_provider ?? ""} ${t.payout_account_number} (${t.payout_account_name ?? ""})` : "No payout details yet",
        } as Row;
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (b: Row, fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(b.id);
    const { error } = await rpc(fn, args);
    setBusy(null);
    if (error) return toast({ title: "Couldn't do that", description: errMsg(error), variant: "destructive" });
    toast({ title: ok });
    load();
  };

  const groups: { title: string; hint: string; filter: (b: Row) => boolean; actions: (b: Row) => JSX.Element }[] = [
    {
      title: "Needs your review",
      hint: "The traveler flagged an extra bag. Talk to them, then approve or decline. The sender cannot pay until you approve.",
      filter: (b) => b.status === "proposed",
      actions: (b) => (
        <>
          <button disabled={busy === b.id} onClick={() => act(b, "admin_review_extra_bag", { p_id: b.id, p_approve: true }, "Approved. The sender can now pay.")} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50">Approve</button>
          <button disabled={busy === b.id} onClick={() => act(b, "admin_review_extra_bag", { p_id: b.id, p_approve: false }, "Declined")} className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground disabled:opacity-50">Decline</button>
        </>
      ),
    },
    {
      title: "Approved, waiting for the sender to pay",
      hint: "Nothing to do yet.",
      filter: (b) => b.status === "approved",
      actions: (b) => <button disabled={busy === b.id} onClick={() => act(b, "cancel_extra_bag", { p_id: b.id }, "Cancelled")} className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground disabled:opacity-50">Cancel</button>,
    },
    {
      title: "Confirm the payment arrived",
      hint: "Check your account for the reference and amount.",
      filter: (b) => b.status === "payment_pending",
      actions: (b) => (
        <>
          <button disabled={busy === b.id} onClick={() => act(b, "admin_confirm_extra_bag_payment", { p_id: b.id }, "Confirmed. The money is in escrow.")} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50">Money received</button>
          <button disabled={busy === b.id} onClick={() => act(b, "cancel_extra_bag", { p_id: b.id }, "Cancelled")} className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground disabled:opacity-50">Not received</button>
        </>
      ),
    },
    {
      title: "In escrow: send the early half to the traveler",
      hint: "Send half the bag cost so the traveler can buy the bag, then tap the button.",
      filter: (b) => b.status === "held" && b.requestStatus !== "completed",
      actions: (b) => <button disabled={busy === b.id} onClick={() => act(b, "admin_mark_extra_bag_advance", { p_id: b.id }, "Marked as sent")} className="px-4 py-2 rounded-lg bg-gold text-accent-foreground text-xs font-semibold disabled:opacity-50">I sent {money(b.advance_amount)}</button>,
    },
    {
      title: "Early half sent, waiting for delivery",
      hint: "The final payment unlocks when the sender confirms the parcel arrived.",
      filter: (b) => b.status === "advance_sent" && b.requestStatus !== "completed",
      actions: (b) => <button disabled={busy === b.id} onClick={() => act(b, "cancel_extra_bag", { p_id: b.id }, "Cancelled. Refund the sender yourself.")} className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground disabled:opacity-50">Cancel (refund by hand)</button>,
    },
    {
      title: "Delivered: pay the traveler the rest",
      hint: "The sender confirmed delivery. Pay the amount shown, then tap the button.",
      filter: (b) => ["held", "advance_sent"].includes(b.status) && b.requestStatus === "completed",
      actions: (b) => {
        const owed = b.status === "advance_sent" ? b.final_amount : b.bag_cost + b.compensation;
        return <button disabled={busy === b.id} onClick={() => act(b, "admin_settle_extra_bag", { p_id: b.id }, "Settled")} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50">I paid {money(owed)}</button>;
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className={ADMIN_SIDEBAR_OFFSET_CLASS}>
        <div className="container mx-auto px-6 py-10 max-w-3xl">
          <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink mb-2">Extra bags</h1>
          <p className="font-body text-sm text-muted-foreground mb-8">
            Optional extra baggage, planned with the traveler. The sender pays the bag cost, the traveler's compensation and your percentage on the compensation into escrow. You send half the bag cost early and the rest after delivery.
          </p>
          {loading && <p className="font-body text-sm text-muted-foreground">Loading...</p>}
          {!loading && rows.length === 0 && <p className="font-body text-sm text-muted-foreground bg-card p-6 rounded-2xl border border-border">No extra bags in progress.</p>}
          {groups.map((g) => {
            const items = rows.filter(g.filter);
            if (items.length === 0) return null;
            return (
              <div key={g.title} className="mb-10">
                <h2 className="font-display text-lg font-semibold mb-1">{g.title} ({items.length})</h2>
                <p className="font-body text-xs text-muted-foreground mb-3">{g.hint}</p>
                <div className="grid gap-3">
                  {items.map((b) => (
                    <div key={b.id} className="p-5 rounded-xl border border-border bg-card">
                      <p className="font-display text-sm font-bold text-foreground">{b.route} · sender pays {money(b.total)}</p>
                      <p className="font-body text-sm text-slate mt-2">
                        {b.sender} (sender) with {b.traveller} (traveler) · reference <span className="font-mono font-semibold text-foreground">{paymentReference(b.request_id)}-BAG</span>
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-2">
                        Bag {money(b.bag_cost)} · compensation {money(b.compensation)} · your fee {money(b.service_fee)} · early half {money(b.advance_amount)} · after delivery {money(b.final_amount)}
                      </p>
                      {b.note && <p className="font-body text-xs text-foreground mt-2 bg-secondary/50 rounded-lg p-2">Traveler's note: {b.note}</p>}
                      <p className="font-body text-xs text-muted-foreground mt-2">Pay traveler to: {b.payout}</p>
                      <div className="flex gap-2 mt-3 flex-wrap">{g.actions(b)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminExtraBags;
