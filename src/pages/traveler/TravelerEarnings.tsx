import { useEffect, useState, useCallback } from "react";
import { Wallet, DollarSign, Clock, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { TravelerNav } from "@/components/TravelerNav";

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  delivery_requests: { origin_city: string; destination_city: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-gold/15 text-gold-dark border-gold/30",
  processing: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

const TravelerEarnings = () => {
  const { travellerProfile, loading: profileLoading } = useTravellerProfile();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!travellerProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("payouts")
      .select("id, amount, status, created_at, delivery_requests(origin_city, destination_city)")
      .eq("traveller_id", travellerProfile.id)
      .order("created_at", { ascending: false });
    setPayouts((data as unknown as Payout[]) || []);
    setLoading(false);
  }, [travellerProfile, profileLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPaid = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingEscrow = payouts.filter((p) => p.status === "pending" || p.status === "processing").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />

      <div className="container mx-auto px-6 py-10 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-md">
            <Wallet className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-light text-foreground">Traveler Earnings &amp; Payouts</h1>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Track your baggage space compensation and withdrawal history.</p>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-charcoal text-white rounded-3xl p-6 border border-gold/20 shadow-xl relative overflow-hidden">
            <span className="font-body text-[10px] uppercase tracking-widest text-gold-light">Total Disbursed Payouts</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-display text-4xl font-bold text-white">${totalPaid}</span>
              <span className="font-body text-xs text-gray-400">USD</span>
            </div>
            <p className="font-body text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Transfer completed directly to bank
            </p>
          </div>

          <div className="bg-card rounded-3xl p-6 border border-border/80 shadow-[var(--shadow-card)]">
            <span className="font-body text-[10px] uppercase tracking-widest text-muted-foreground">Pending Escrow</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-display text-4xl font-bold text-gold-dark">${pendingEscrow}</span>
              <span className="font-body text-xs text-muted-foreground">USD</span>
            </div>
            <p className="font-body text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gold-dark" /> Released upon verified handoff receipt
            </p>
          </div>
        </div>

        <h3 className="font-display text-2xl font-light text-foreground mb-4">Payout Transaction History</h3>

        {loading && (
          <div className="text-center py-16 font-body text-muted-foreground">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading payout history...
          </div>
        )}

        {!loading && payouts.length === 0 && (
          <div className="text-center py-16 bg-card rounded-3xl border border-border/80 p-8 font-body text-sm text-muted-foreground max-w-md mx-auto">
            No payouts processed yet. Completed package handoffs will automatically trigger payouts here.
          </div>
        )}

        <div className="grid gap-3">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-5 rounded-2xl border border-border/80 bg-card shadow-sm hover:border-gold/30 transition-colors">
              <div>
                <p className="font-body text-sm font-semibold text-foreground">
                  {p.delivery_requests?.origin_city ?? "Route"} &rarr; {p.delivery_requests?.destination_city ?? "Destination"}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-lg font-bold text-foreground">${p.amount} USD</span>
                <span className={`px-3 py-1 rounded-full text-xs font-body font-semibold uppercase tracking-wider border ${statusColors[p.status] ?? statusColors.pending}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TravelerEarnings;

