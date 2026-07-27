import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav } from "@/components/AdminNav";

interface PayoutRow {
  id: string;
  status: string;
  amount: number;
}

interface DeliveredRequest {
  id: string;
  origin_city: string;
  destination_city: string;
  item_value: number;
  status: string;
  matched_traveller_id: string | null;
  traveller_profiles: { name: string | null } | null;
  payouts: PayoutRow | null;
}

const payoutStatusColors: Record<string, string> = {
  pending: "bg-accent/20 text-accent-foreground",
  processing: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const AdminPayouts = () => {
  const [rows, setRows] = useState<DeliveredRequest[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("delivery_requests")
      .select(
        "id, origin_city, destination_city, item_value, status, matched_traveller_id, traveller_profiles:matched_traveller_id(name), payouts(id, status, amount)"
      )
      .in("status", ["delivered", "completed"])
      .not("matched_traveller_id", "is", null)
      .order("created_at", { ascending: false });
    setRows((data as unknown as DeliveredRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreatePayout = async (row: DeliveredRequest) => {
    const amount = parseFloat(amounts[row.id] || "0");
    if (!amount || !row.matched_traveller_id) return;
    setBusy(row.id);
    const { error } = await supabase.from("payouts").insert({
      traveller_id: row.matched_traveller_id,
      request_id: row.id,
      amount,
      status: "pending",
    });
    setBusy(null);
    if (error) {
      toast({ title: "Error", description: "Couldn't record the payout. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  const handleMarkPaid = async (payoutId: string) => {
    setBusy(payoutId);
    const { error } = await supabase.from("payouts").update({ status: "paid" }).eq("id", payoutId);
    setBusy(null);
    if (error) {
      toast({ title: "Error", description: "Couldn't update the payout. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold text-foreground mb-8">Traveler payouts</h1>

        {loading && <div className="font-body text-sm text-muted-foreground">Loading...</div>}
        {!loading && rows.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border font-body text-sm text-muted-foreground">
            No delivered requests awaiting payout yet.
          </div>
        )}

        <div className="grid gap-3 max-w-2xl">
          {rows.map((r) => (
            <div key={r.id} className="p-5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-sm font-bold text-foreground">
                  {r.origin_city} &rarr; {r.destination_city}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Traveler: {r.traveller_profiles?.name ?? "-"} &middot; Declared value ${r.item_value}
                </p>
              </div>

              {!r.payouts && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Amount"
                    value={amounts[r.id] ?? ""}
                    onChange={(e) => setAmounts({ ...amounts, [r.id]: e.target.value })}
                    className="w-24 bg-background border border-border rounded-lg px-3 py-2 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => handleCreatePayout(r)}
                    disabled={busy === r.id}
                    className="bg-gradient-gold text-accent-foreground font-display font-semibold px-4 py-2 rounded-lg text-xs hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                  >
                    Record payout
                  </button>
                </div>
              )}

              {r.payouts && (
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-semibold text-foreground">${r.payouts.amount}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-display font-semibold capitalize ${payoutStatusColors[r.payouts.status] ?? payoutStatusColors.pending}`}>
                    {r.payouts.status}
                  </span>
                  {r.payouts.status !== "paid" && (
                    <button
                      onClick={() => handleMarkPaid(r.payouts!.id)}
                      disabled={busy === r.payouts.id}
                      className="border border-border text-foreground font-display font-semibold px-3 py-2 rounded-lg text-xs hover:bg-secondary transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPayouts;
