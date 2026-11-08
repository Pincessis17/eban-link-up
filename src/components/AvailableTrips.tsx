import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ebanSymbol from "@/assets/eban-symbol.png";

interface OpenTrip {
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  departure_date: string;
  available_kg: number;
}

export interface RouteGroup {
  key: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  trips: number;
  kg: number;
  next: string;
}

export const codeOf = (city: string) => city.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
export const shortDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/** Open space on the network grouped by route. Carries no traveller details: no names, prices or ids. */
export const useOpenRoutes = () => {
  const [trips, setTrips] = useState<OpenTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
    })();
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
          next: t.departure_date,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.next.localeCompare(b.next) || b.trips - a.trips).slice(0, 8);
  }, [trips]);

  return { routes, loading };
};

export const RouteCodes = ({ from, to, fromCity, toCity, size = "md" }: { from: string; to: string; fromCity?: string; toCity?: string; size?: "md" | "lg" }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className="min-w-0">
      <p className={`font-body font-semibold text-ink leading-none ${size === "lg" ? "text-3xl" : "text-lg"}`}>{from}</p>
      {fromCity && <p className="font-body text-[11px] text-slate mt-1 truncate">{fromCity}</p>}
    </div>
    <div className="flex-1 min-w-[40px] flex items-center gap-1.5 text-brass-deep">
      <span className="h-px flex-1 bg-line" />
      <Plane className="w-3.5 h-3.5 shrink-0" />
      <span className="h-px flex-1 bg-line" />
    </div>
    <div className="min-w-0">
      <p className={`font-body font-semibold text-ink leading-none ${size === "lg" ? "text-3xl" : "text-lg"}`}>{to}</p>
      {toCity && <p className="font-body text-[11px] text-slate mt-1 truncate">{toCity}</p>}
    </div>
  </div>
);

export const AvailableTrips = () => {
  const { user, loading: authLoading } = useAuth();
  const { routes, loading } = useOpenRoutes();

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
    <section id="routes" className="py-20 md:py-24 bg-background">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow mb-3">Open routes</p>
            <h2 className="font-display text-3xl md:text-[40px] leading-tight text-ink">Where space is open right now.</h2>
          </div>
          <p className="font-body text-sm text-slate max-w-sm">
            Travellers with spare luggage space. Names and prices show once you sign in.
          </p>
        </div>

        {loading ? (
          <div className="h-40 rounded-xl border border-line bg-white animate-pulse" />
        ) : routes.length === 0 ? (
          <div className="rounded-xl border border-line bg-white p-10 text-center">
            <img src={ebanSymbol} alt="" className="w-9 h-9 mx-auto mb-4" />
            <h3 className="font-display text-xl text-ink mb-2">No open routes at the moment.</h3>
            <p className="font-body text-sm text-slate">Post an open request and travellers heading your way can claim it.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-white overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.6fr_1fr_.7fr_.7fr_auto] gap-6 px-6 py-3 border-b border-line text-[11px] font-body font-semibold uppercase tracking-[0.12em] text-slate">
              <span>Route</span><span>Next departure</span><span>Space</span><span>Trips</span><span className="w-28" />
            </div>
            {routes.map((r) => (
              <Link
                key={r.key}
                to={routeLink(r)}
                className="group grid grid-cols-2 md:grid-cols-[1.6fr_1fr_.7fr_.7fr_auto] gap-x-6 gap-y-3 items-center px-6 py-5 border-b border-line last:border-0 hover:bg-paper transition-colors"
              >
                <div className="col-span-2 md:col-span-1">
                  <RouteCodes from={codeOf(r.origin_city)} to={codeOf(r.destination_city)} fromCity={r.origin_city} toCity={r.destination_city} />
                </div>
                <p className="font-body text-sm text-ink"><span className="md:hidden text-slate">Departs </span>{shortDate(r.next)}</p>
                <p className="font-body text-sm text-ink">{r.kg} kg</p>
                <p className="hidden md:block font-body text-sm text-slate">{r.trips}</p>
                <span className="hidden md:inline-flex w-28 justify-end items-center gap-1 font-body text-sm font-semibold text-brass-deep">
                  Request space <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}

        {!authLoading && !user && (
          <p className="mt-5 font-body text-sm text-slate">
            New here? <Link to="/signup" className="font-semibold text-brass-deep hover:underline">Create a free account</Link> to see travellers and book space.
          </p>
        )}
      </div>
    </section>
  );
};
