import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, ArrowRight, Calendar, Weight, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OpenTrip {
  id: string;
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  departure_date: string;
  available_kg: number;
}

export const AvailableTrips = () => {
  const { user } = useAuth();
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
    });
    const target = user ? "/sender/new-request" : "/signup";
    return `${target}?${params.toString()}`;
  };

  if (loading) return null;

  return (
    <section className="py-24 bg-earth/5 relative overflow-hidden border-y border-gold/10">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 px-3.5 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
            <span className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark">
              Live Traveler Board
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-foreground">
            Travelers <em className="italic text-gold-dark font-normal">already scheduled</em> on route
          </h2>
          <p className="font-body text-muted-foreground mt-4 max-w-xl mx-auto text-base">
            Send packages with verified travelers holding open baggage allowance today. EBAN guarantees end-to-end handoff security.
          </p>
        </div>

        {trips.length === 0 ? (
          <div className="max-w-md mx-auto text-center bg-card/80 backdrop-blur-md rounded-2xl border border-border p-10 shadow-[var(--shadow-card)]">
            <Plane className="w-12 h-12 text-gold/60 mx-auto mb-4 animate-bounce" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No active departures listed right now</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Submit your package request below. Our automated dispatch system will notify you as soon as a traveler posts your route.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {trips.map((t) => {
              const originCode = t.origin_city.slice(0, 3).toUpperCase();
              const destCode = t.destination_city.slice(0, 3).toUpperCase();
              const maxEstimate = 20; // illustrative gauge basis
              const pctAvailable = Math.min(100, Math.round((t.available_kg / maxEstimate) * 100));

              return (
                <div
                  key={t.id}
                  className="group bg-card rounded-2xl border border-border/80 hover:border-gold/50 shadow-[var(--shadow-card)] hover:shadow-gold-glow transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Top Flight Ticket Header */}
                  <div className="bg-charcoal px-6 py-4 text-primary-foreground border-b border-gold/15 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gold-light text-xs font-medium uppercase tracking-widest">
                      <Calendar className="w-3.5 h-3.5 text-gold" />
                      {new Date(t.departure_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  </div>

                  {/* Flight Route Visual */}
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div className="text-left">
                        <span className="font-mono text-2xl font-bold tracking-wider text-foreground">{originCode}</span>
                        <p className="font-body text-xs font-medium text-muted-foreground truncate max-w-[100px]">{t.origin_city}</p>
                        <p className="font-body text-[10px] text-muted-foreground/70 uppercase">{t.origin_country}</p>
                      </div>

                      <div className="flex-1 flex flex-col items-center px-2">
                        <div className="w-full flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                          <div className="h-px bg-border flex-1 relative flex items-center justify-center">
                            <Plane className="w-4 h-4 text-gold absolute -top-2 transition-transform duration-500 group-hover:translate-x-3" />
                          </div>
                          <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                        </div>
                        <span className="font-body text-[10px] font-semibold text-gold-dark uppercase tracking-widest mt-2">
                          Direct Flight
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-2xl font-bold tracking-wider text-foreground">{destCode}</span>
                        <p className="font-body text-xs font-medium text-muted-foreground truncate max-w-[100px]">{t.destination_city}</p>
                        <p className="font-body text-[10px] text-muted-foreground/70 uppercase">{t.destination_country}</p>
                      </div>
                    </div>

                    {/* Baggage Capacity Bar */}
                    <div className="bg-secondary/60 rounded-xl p-3.5 border border-border/60">
                      <div className="flex justify-between items-center text-xs mb-1.5 font-body">
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Weight className="w-3.5 h-3.5 text-gold-dark" /> Available Capacity
                        </span>
                        <span className="font-semibold text-foreground">{t.available_kg} kg left</span>
                      </div>
                      <div className="w-full h-2 bg-border/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-gold rounded-full transition-all duration-500"
                          style={{ width: `${pctAvailable}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="px-6 pb-6 pt-0">
                    <Link
                      to={tripLink(t)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-body text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl hover:opacity-95 shadow-md hover:shadow-gold-glow transition-all"
                    >
                      Book Delivery Space <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

