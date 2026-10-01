import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, Plus, Calendar, Weight, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
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

      <div className="container mx-auto px-6 py-10 max-w-4xl">
        {/* Verification Status Banner */}
        {travellerProfile?.verification_status !== "approved" && (
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold-dark shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-base font-semibold text-foreground">ID Verification Pending</h4>
                <p className="font-body text-xs text-muted-foreground">
                  Status: <span className="font-semibold text-gold-dark capitalize">{travellerProfile?.verification_status ?? "pending"}</span>. Upload your passport photo to unlock instant matching.
                </p>
              </div>
            </div>
            <Link
              to="/traveler/verification"
              className="bg-earth text-gold-light font-body text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shrink-0 uppercase tracking-wider"
            >
              Verify Passport
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-light text-foreground">Flight Departures</h1>
            <p className="font-body text-xs text-muted-foreground mt-1">Manage your active flight itineraries and luggage space.</p>
          </div>

          <Link
            to="/traveler/new-trip"
            className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl hover:opacity-90 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Share a Flight Trip
          </Link>
        </div>

        {loading && (
          <div className="text-center py-16 font-body text-muted-foreground">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your flight schedule...
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-border/80 p-10 shadow-[var(--shadow-card)] max-w-lg mx-auto">
            <Plane className="w-12 h-12 text-gold-dark/60 mx-auto mb-4" />
            <h3 className="font-display text-2xl font-semibold text-foreground mb-2">No active flight trips listed</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Share your upcoming flight details to get matched with package requests on your exact route.
            </p>
            <Link
              to="/traveler/new-trip"
              className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              Post Flight Itinerary
            </Link>
          </div>
        )}

        <div className="grid gap-6">
          {trips.map((trip) => {
            const usedKg = trip.capacity_kg - trip.available_kg;
            const fillPct = Math.round((usedKg / (trip.capacity_kg || 1)) * 100);

            return (
              <div
                key={trip.id}
                className="bg-card rounded-3xl border border-border/80 p-6 md:p-8 hover:border-gold/50 shadow-[var(--shadow-card)] hover:shadow-gold-glow transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 text-gold-dark" />
                      {new Date(trip.departure_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-body font-semibold bg-secondary text-secondary-foreground uppercase tracking-wider">
                      {trip.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-2xl font-bold text-foreground">{trip.origin_city}</span>
                    <div className="flex-1 flex items-center gap-1 max-w-[120px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      <div className="h-px bg-border flex-1 relative flex items-center justify-center">
                        <Plane className="w-3.5 h-3.5 text-gold absolute -top-1.5" />
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    </div>
                    <span className="font-mono text-2xl font-bold text-foreground">{trip.destination_city}</span>
                  </div>

                  <div className="bg-secondary/40 rounded-xl p-3.5 border border-border/60 max-w-md">
                    <div className="flex justify-between items-center text-xs mb-1 font-body">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Weight className="w-3.5 h-3.5 text-gold-dark" /> Luggage Allowance
                      </span>
                      <span className="font-semibold text-foreground">{trip.available_kg} kg available / {trip.capacity_kg} kg total</span>
                    </div>
                    <div className="w-full h-2 bg-border/60 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-gold rounded-full transition-all duration-500" style={{ width: `${100 - fillPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TravelerHome;

