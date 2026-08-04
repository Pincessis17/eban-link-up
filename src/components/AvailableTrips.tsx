import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OpenTrip {
  id: string;
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  departure_date: string;
  available_kg: number;
}

interface AvailableTripsProps {
  /** Path the "Send on this route" button links to; query params carry the route. */
  basePath: string;
  /** Optional anchor appended to the link (e.g. "#book"). */
  anchor?: string;
  /** Extra query params to merge in (e.g. { view: "site" } to keep the marketing page visible). */
  extraParams?: Record<string, string>;
}

export const AvailableTrips = ({ basePath, anchor = "", extraParams = {} }: AvailableTripsProps) => {
  const [trips, setTrips] = useState<OpenTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("trips")
        .select("id, origin_country, origin_city, destination_country, destination_city, departure_date, available_kg")
        .eq("status", "open")
        .gte("departure_date", new Date().toISOString().slice(0, 10))
        .order("departure_date", { ascending: true })
        .limit(6);
      setTrips((data as OpenTrip[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const tripLink = (t: OpenTrip) => {
    const params = new URLSearchParams({
      originCountry: t.origin_country,
      originCity: t.origin_city,
      destinationCountry: t.destination_country,
      destinationCity: t.destination_city,
      ...extraParams,
    });
    return `${basePath}?${params.toString()}${anchor}`;
  };

  if (loading) return null;

  return (
    <section className="py-16 bg-secondary/40">
      <div className="container mx-auto px-6">
        <div className="text-center mb-10">
          <span className="font-display text-sm font-semibold text-gold-dark tracking-wider uppercase">
            Live availability
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3">
            Travelers already headed your way
          </h2>
          <p className="font-body text-muted-foreground mt-3 max-w-xl mx-auto">
            These are real, verified travelers with space in their luggage right now. Send on their route and EBAN
            handles the rest.
          </p>
        </div>

        {trips.length === 0 ? (
          <div className="max-w-lg mx-auto text-center bg-card rounded-xl border border-border p-8">
            <p className="font-body text-sm text-muted-foreground">
              No open trips on the board right now &mdash; submit a request anyway and we'll match you the moment a
              traveler is available on your route.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {trips.map((t) => (
              <div key={t.id} className="bg-card rounded-xl border border-border p-6 hover:border-gold/50 transition-colors">
                <div className="flex items-center gap-2 text-gold-dark mb-3">
                  <Plane className="w-4 h-4" />
                  <span className="font-body text-xs font-semibold uppercase tracking-wide">
                    {new Date(t.departure_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="font-display text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                  {t.origin_city} <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" /> {t.destination_city}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {t.origin_country} to {t.destination_country}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-2">
                  {Number(t.available_kg)}kg of space available
                </p>
                <Link
                  to={tripLink(t)}
                  className="mt-4 inline-flex items-center gap-1 bg-gradient-gold text-accent-foreground font-display text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Send on this trip <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
