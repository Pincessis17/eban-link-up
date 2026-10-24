import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { errMsg, money } from "@/lib/marketplace";

type Row = {
  id: string; request_id: string; reason: string; kind: string; status: string; resolution: string | null; admin_note: string | null; created_at: string;
  route: string; sender: string; traveller: string; held: number | null; price: number | null; payout: string;
};

const OUTCOMES = [
  { key: "release", label: "Item arrived: pay the traveler", style: "bg-green-600 text-white" },
  { key: "refund", label: "Not delivered: refund the sender", style: "bg-destructive text-destructive-foreground" },
  { key: "back_to_delivered", label: "Send back to sender to confirm", style: "border border-border text-muted-foreground" },
] as const;

const AdminDisputes = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ds } = await (supabase as any).from("disputes").select("*").order("created_at", { ascending: false });
    const list = (ds ?? []) as any[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ids = list.map((d) => d.request_id);
    const { data: reqs } = await supabase
      .from("delivery_requests")
      .select("id, origin_city, destination_city, agreed_price, sender_id, matched_traveller_id")
      .in("id", ids);
    const { data: pays } = await supabase.from("payments").select("request_id, amount, status").in("request_id", ids);
    const senderIds = [...new Set((reqs ?? []).map((r) => r.sender_id))];
    const travIds = [...new Set((reqs ?? []).map((r) => r.matched_traveller_id).filter(Boolean))] as string[];
    const { data: senders } = await supabase.from("profiles").select("id, full_name").in("id", senderIds);
    const { data: travs } = await supabase.from("traveller_profiles").select("id, name, payout_method, payout_account_name, payout_account_number, payout_provider").in("id", travIds);
    setRows(
      list.map((d) => {
        const r = (reqs ?? []).find((x) => x.id === d.request_id);
        const t = (travs ?? []).find((x) => x.id === r?.matched_traveller_id);
        const pay = (pays ?? []).find((p) => p.request_id === d.request_id);
        return {
          id: d.id, request_id: d.request_id, reason: d.reason, kind: d.kind ?? "general", status: d.status, resolution: d.resolution,
          admin_note: d.admin_note, created_at: d.created_at,
          route: r ? `${r.origin_city} to ${r.destination_city}` : "Unknown route",
          sender: (senders ?? []).find((s) => s.id === r?.sender_id)?.full_name ?? "Sender",
          traveller: t?.name ?? "Traveller",
          held: pay ? Number(pay.amount) : null,
          price: r?.agreed_price != null ? Number(r.agreed_price) : null,
          payout: t?.payout_account_number ? `${t.payout_method === "mobile_money" ? "Mobile money" : "Bank"} ${t.payout_provider ?? ""} ${t.payout_account_number} (${t.payout_account_name ?? ""})` : "No payout details yet",
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (row: Row, outcome: string) => {
    setBusy(row.id);
    const { error } = await supabase.rpc("admin_resolve_dispute" as any, { p_request_id: row.request_id, p_outcome: outcome, p_note: notes[row.id] ?? "" } as any);
    setBusy(null);
    if (error) return toast({ title: "Couldn't resolve", description: errMsg(error), variant: "destructive" });
    toast({
      title: outcome === "refund" ? "Marked refunded. Send the money back to the sender yourself." : outcome === "release" ? "Released. The traveler now shows in Payouts." : "Sent back to the sender.",
    });
    load();
  };

  const open = rows.filter((r) => r.status === "open");
  const done = rows.filter((r) => r.status !== "open");

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className={ADMIN_SIDEBAR_OFFSET_CLASS}>
        <div className="container mx-auto px-6 py-10 max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Disputes</h1>
          <p className="font-body text-sm text-muted-foreground mb-8">
            The payment stays held while a dispute is open. Read the sender's report, check with both people, then choose an outcome.
            A refund only marks the payment as refunded; you send the money back yourself.
          </p>
          {loading && <p className="font-body text-sm text-muted-foreground">Loading...</p>}
          <h2 className="font-display text-lg font-semibold mb-3">Open ({open.length})</h2>
          <div className="grid gap-4 mb-10">
            {!loading && open.length === 0 && <p className="font-body text-sm text-muted-foreground bg-card p-6 rounded-2xl border border-border">No open disputes.</p>}
            {open.map((r) => (
              <div key={r.id} className="p-5 rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-sm font-bold text-foreground">{r.route}</p>
                  <span className={`font-body text-xs font-semibold px-3 py-1 rounded-full ${r.kind === "not_received" ? "bg-red-100 text-red-700" : "bg-secondary text-muted-foreground"}`}>
                    {r.kind === "not_received" ? "Item not received" : "Issue reported"}
                  </span>
                </div>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {r.sender} (sender) with {r.traveller} (traveler) · {new Date(r.created_at).toLocaleString()}
                </p>
                <p className="font-body text-sm text-foreground mt-3 whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">{r.reason}</p>
                <p className="font-body text-xs text-muted-foreground mt-3">
                  Held: <strong className="text-foreground">{r.held != null ? money(r.held) : "-"}</strong> · Traveler's price: <strong className="text-foreground">{r.price != null ? money(r.price) : "-"}</strong>
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">Pay traveler to: {r.payout}</p>
                <textarea
                  rows={2}
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="Note for your records (optional)"
                  className="w-full mt-3 bg-background border border-border rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {OUTCOMES.map((o) => (
                    <button key={o.key} disabled={busy === r.id} onClick={() => resolve(r, o.key)} className={`px-4 py-2 rounded-lg text-xs font-body font-semibold disabled:opacity-50 ${o.style}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowResolved((v) => !v)} className="font-display text-lg font-semibold mb-3 text-left">
            Resolved ({done.length}) {showResolved ? "▾" : "▸"}
          </button>
          {showResolved && (
            <div className="grid gap-3">
              {done.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-border bg-card font-body text-sm">
                  <p className="font-semibold text-foreground">{r.route} · {r.resolution === "release" ? "Traveler paid" : r.resolution === "refund" ? "Sender refunded" : "Sent back to sender"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                  {r.admin_note && <p className="text-xs text-foreground mt-1">Note: {r.admin_note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDisputes;
