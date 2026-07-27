import { useEffect, useState, useCallback } from "react";
import { Wallet } from "lucide-react";
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
  pending: "bg-accent/20 text-accent-foreground",
  processing: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
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

  const total = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />
      <div className="container mx-auto px-6 py-10 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Wallet className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Earnings</h1>
            <p className="font-body text-sm text-muted-foreground">${total} paid out so far</p>
          </div>
        </div>

        {loading && <div className="font-body text-sm text-muted-foreground">Loading...</div>}
        {!loading && payouts.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border font-body text-sm text-muted-foreground">
            No payouts yet &mdash; they'll show up here once a delivery is completed.
          </div>
        )}

        <div className="grid gap-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="font-display text-sm font-semibold text-foreground">
                  {p.delivery_requests?.origin_city} &rarr; {p.delivery_requests?.destination_city}
                </p>
                <p className="font-body text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-semibold text-foreground">${p.amount}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-display font-semibold capitalize ${statusColors[p.status] ?? statusColors.pending}`}>
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
