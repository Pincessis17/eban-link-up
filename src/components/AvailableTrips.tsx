import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, ArrowRight, Calendar, Weight, Lock, Route as RouteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OpenTrip {
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  departure_date: string;
  available_kg: number;
}

interface RouteGroup {
  key: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  trips: number;
  kg: number;
  next: string;
}

// Public view of open space on the network, grouped by route.
// Deliberately carries no traveler details: no names, prices or ids.
export const AvailableTrips = () => {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<OpenTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("trips")
        .select("origin_country, origin_city, destination_country, destination_city, departure_date, available_kg")
        .eq("status", "open")
        .gte("departure_date", new Date().toISOString().slice(0, 10))
        .gt("available_kg", 0)
        .order("departure_date", { ascending: true })
        .limit(200);
      setTrips((data as OpenTrip[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const routes = useMemo<RouteGroup[]>(() => {
    const map = new Map<string, RouteGroup>();
    for (const t of trips) {
      const key = `${t.origin_city}|${t.destination_city}`.toLowerCase();
      const g = map.get(key);
      if (g) {
        g.trips += 1;
        g.kg += Number(t.available_kg);
      } else {
        map.set(key, {
          key,
          origin_city: t.origin_city,
          origin_country: t.origin_country,
          destination_city: t.destination_city,
          destination_country: t.destination_country,
          trips: 1,
          kg: Number(t.available_kg),
          next: t.departure_date, // trips are sorted, so the first is the soonest
        });
      }
    }
    return [...map.values()].sort((a, b) => b.trips - a.trips || a.next.localeCompare(b.next)).slice(0, 9);
  }, [trips]);

  const routeLink = (r: RouteGroup) => {
    if (user) return "/sender/trips";
    const params = new URLSearchParams({
      originCountry: r.origin_country,
      originCity: r.origin_city,
      destinationCountry: r.destination_country,
      destinationCity: r.destination_city,
    });
    return `/signup?${params.toString()}`;
  };

  return (
    <section id="routes" className="py-24 bg-earth/5 relative overflow-hidden border-y border-gold/10">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 px-3.5 py-1 rounded-full mb-4">
            <RouteIcon className="w-3.5 h-3.5 text-gold-dark" />
            <span className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark">Available routes</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-foreground">
            Where space is <em className="italic text-gold-dark font-normal">open right now</em>
          </h2>
          <p className="font-body text-muted-foreground mt-4 text-base">
            Routes with travelers who have spare luggage space. Traveler details and prices are shown after you sign in.
          </p>
        </div>

        {loading ? null : routes.length === 0 ? (
          <div className="max-w-md bg-card rounded-2xl border border-border p-8">
            <Plane className="w-10 h-10 text-gold/60 mb-4" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No open routes at the moment</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Post a request and travelers heading your way can claim it.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {routes.map((r) => (
              <Link
                key={r.key}
                to={routeLink(r)}
                className="group bg-card rounded-2xl border border-border/80 hover:border-gold/50 shadow-[var(--shadow-card)] hover:shadow-gold-glow transition-all p-6 block"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-xl text-foreground truncate">{r.origin_city}</p>
                    <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{r.origin_country}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gold shrink-0 transition-transform group-hover:translate-x-1" />
                  <div className="min-w-0">
                    <p className="font-display text-xl text-foreground truncate">{r.destination_city}</p>
                    <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{r.destination_country}</p>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap gap-x-5 gap-y-2 font-body text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-gold-dark" /> {r.trips} trip{r.trips === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Weight className="w-3.5 h-3.5 text-gold-dark" /> {r.kg} kg open
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gold-dark" /> from{" "}
                    {new Date(r.next).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* First-time visitors: the sign-up prompt lives right here, beside the routes. */}
        {!authLoading && !user && (
          <div id="book" className="mt-12 rounded-3xl border border-gold/30 bg-card p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-8 shadow-[var(--shadow-card)]">
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <Lock className="w-6 h-6 text-gold-dark" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-2xl md:text-3xl font-light text-foreground">New here? Sign in to book or post a request</h3>
              <p className="font-body text-sm text-muted-foreground mt-2 max-w-xl">
                Create a free Eban account to see traveler profiles and prices, book space on these routes, or post what you need sent. Payment stays in escrow until you confirm delivery.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-7 py-3.5 rounded-xl hover:opacity-90 shadow-md text-center">
                Create account
              </Link>
              <Link to="/login" className="border border-border text-foreground font-body font-semibold text-xs uppercase tracking-wider px-7 py-3.5 rounded-xl hover:bg-secondary text-center">
                Log in
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
