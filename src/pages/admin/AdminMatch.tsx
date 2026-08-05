import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";

interface PendingRequest {
  id: string;
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  item_type: string;
  weight_kg: number;
  item_value: number;
  preferred_date: string | null;
}

interface CompatibleTrip {
  id: string;
  traveller_id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  capacity_kg: number;
  available_kg: number;
  traveller_profiles: { name: string | null; rating: number; total_deliveries: number; verification_status: string } | null;
}

const AdminMatch = () => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [selected, setSelected] = useState<PendingRequest | null>(null);
  const [trips, setTrips] = useState<CompatibleTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("delivery_requests")
      .select("id, origin_country, origin_city, destination_country, destination_city, item_type, weight_kg, item_value, preferred_date")
      .eq("status", "submitted")
      .is("matched_traveller_id", null)
      .order("created_at", { ascending: true });
    setRequests(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadTrips = useCallback(async (request: PendingRequest) => {
    const { data } = await supabase
      .from("trips")
      .select("id, traveller_id, origin_city, destination_city, departure_date, capacity_kg, available_kg, traveller_profiles(name, rating, total_deliveries, verification_status)")
      .eq("status", "open")
      .eq("origin_country", request.origin_country)
      .eq("destination_country", request.destination_country)
      .order("departure_date", { ascending: true });
    setTrips((data as unknown as CompatibleTrip[]) || []);
  }, []);

  const handleSelect = (request: PendingRequest) => {
    setSelected(request);
    loadTrips(request);
  };

  const handleConfirmMatch = async (trip: CompatibleTrip) => {
    if (!selected) return;
    setBusy(true);

    const { error: matchError } = await supabase.from("matches").insert({
      request_id: selected.id,
      traveller_id: trip.traveller_id,
      match_score: 80,
      status: "pending",
    });

    const { error: reqError } = await supabase
      .from("delivery_requests")
      .update({ matched_traveller_id: trip.traveller_id, status: "matched" })
      .eq("id", selected.id);

    setBusy(false);

    if (matchError || reqError) {
      toast({ title: "Error", description: "Couldn't create the match. Try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Match created", description: "The traveler will see this in their requests." });
    setSelected(null);
    setTrips([]);
    loadRequests();
  };

  return (
    <div className={`min-h-screen bg-background ${ADMIN_SIDEBAR_OFFSET_CLASS}`}>
      <AdminNav />
      <div className="container mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold text-foreground mb-8">Match requests to trips</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="font-display text-sm font-semibold text-foreground mb-3">Unmatched requests</p>
            {loading && <div className="font-body text-sm text-muted-foreground">Loading...</div>}
            {!loading && requests.length === 0 && (
              <div className="text-center py-10 bg-card rounded-xl border border-border font-body text-sm text-muted-foreground">
                No unmatched requests right now.
              </div>
            )}
            <div className="grid gap-2">
              {requests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    selected?.id === r.id ? "border-gold bg-accent/10" : "border-border bg-card hover:border-gold/50"
                  }`}
                >
                  <p className="font-display text-sm font-bold text-foreground">
                    {r.origin_city} &rarr; {r.destination_city}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {r.item_type} &middot; {r.weight_kg}kg &middot; ${r.item_value}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-display text-sm font-semibold text-foreground mb-3">Compatible trips</p>
            {!selected && (
              <div className="text-center py-10 bg-card rounded-xl border border-border font-body text-sm text-muted-foreground">
                Select a request to see matching trips.
              </div>
            )}
            {selected && trips.length === 0 && (
              <div className="text-center py-10 bg-card rounded-xl border border-border font-body text-sm text-muted-foreground">
                No open trips on this route yet.
              </div>
            )}
            <div className="grid gap-2">
              {selected &&
                trips.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">{t.traveller_profiles?.name ?? "Traveler"}</p>
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        {t.origin_city} &rarr; {t.destination_city} &middot; {new Date(t.departure_date).toLocaleDateString()}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        {t.available_kg}/{t.capacity_kg}kg available &middot; {t.traveller_profiles?.verification_status ?? "pending"} verification
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfirmMatch(t)}
                      disabled={busy}
                      className="bg-gradient-gold text-accent-foreground font-display font-semibold px-4 py-2 rounded-lg text-xs hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                    >
                      Confirm match
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMatch;
