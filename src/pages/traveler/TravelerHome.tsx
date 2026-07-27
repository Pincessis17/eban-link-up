import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { TravelerNav } from "@/components/TravelerNav";

interface Trip {
  id: string;
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  departure_date: string;
  capacity_kg: number;
  available_kg: number;
  status: string;
}

const TravelerHome = () => {
  const { travellerProfile, loading: profileLoading } = useTravellerProfile();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!travellerProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data: tripRows } = await supabase
        .from("trips")
        .select("*")
        .eq("traveller_id", travellerProfile.id)
        .order("departure_date", { ascending: true });

      setTrips(tripRows || []);
      setLoading(false);
    };

    load();
  }, [travellerProfile, profileLoading]);

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />

      <div className="container mx-auto px-6 py-10 max-w-2xl">
        {travellerProfile?.verification_status !== "approved" && (
          <div className="bg-accent/10 text-accent-foreground rounded-xl p-4 mb-6 font-body text-sm">
            Your ID verification is <span className="font-semibold">{travellerProfile?.verification_status ?? "pending"}</span>. You can still share trips, but matches may be held until you're verified.
          </div>
        )}

        <Link
          to="/traveler/new-trip"
          className="flex items-center justify-center gap-2 w-full bg-gradient-gold text-accent-foreground font-display font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity mb-8"
        >
          <Plus className="w-5 h-5" /> Share a trip
        </Link>

        <p className="font-display text-sm font-semibold text-foreground mb-3">Your trips</p>

        {loading && <div className="text-center py-10 font-body text-muted-foreground">Loading...</div>}

        {!loading && trips.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <Plane className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-display font-semibold text-foreground mb-1">No trips yet</p>
            <p className="font-body text-sm text-muted-foreground">Share your next flight to start getting matched.</p>
          </div>
        )}

        <div className="grid gap-3">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
              <div>
                <p className="font-display text-sm font-bold text-foreground">
                  {trip.origin_city} &rarr; {trip.destination_city}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {new Date(trip.departure_date).toLocaleDateString()} &middot; {trip.available_kg}/{trip.capacity_kg}kg available
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-display font-semibold bg-secondary text-secondary-foreground capitalize">
                {trip.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TravelerHome;
