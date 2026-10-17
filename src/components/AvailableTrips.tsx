import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, ArrowRight, Calendar, Weight, Lock } from "lucide-react";
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


// Photos are optional: drop JPGs into public/images/routes/ (see README there).
// If a file is missing the illustrated sky underneath shows instead.
const SKY_PHOTOS = ["sky-1.jpg", "sky-2.jpg", "sky-3.jpg"];
const codeOf = (city: string) => city.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();

const SKY_CSS = `
@keyframes eban-drift { from { transform: translateX(-20%); } to { transform: translateX(120%); } }
@keyframes eban-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.eban-cloud { position:absolute; border-radius:9999px; background:rgba(255,255,255,.75); filter:blur(6px); animation: eban-drift linear infinite; }
.eban-route:hover .eban-cloud { animation-duration: 8s !important; }
.eban-route:hover .eban-plane { animation: eban-float 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .eban-cloud, .eban-plane { animation: none !important; } }
`;

const Sky = ({ photo, className = "" }: { photo?: string; className?: string }) => (
  <div
    className={`absolute inset-0 overflow-hidden ${className}`}
    style={{ background: "linear-gradient(180deg,#4f86d0 0%,#9cc3ec 52%,#f7dcbc 100%)" }}
  >
    <div className="eban-cloud" style={{ top: "18%", left: 0, width: 90, height: 26, animationDuration: "38s" }} />
    <div className="eban-cloud" style={{ top: "52%", left: 0, width: 130, height: 34, animationDuration: "52s", animationDelay: "-20s", opacity: 0.6 }} />
    <div className="eban-cloud" style={{ top: "34%", left: 0, width: 70, height: 20, animationDuration: "44s", animationDelay: "-30s" }} />
    {photo && (
      <img
        src={`/images/routes/${photo}`}
        alt=""
        loading="lazy"
        onError={(e) => (e.currentTarget.style.display = "none")}
        className="absolute inset-0 w-full h-full object-cover"
        decoding="async"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
    )}
  </div>
);

const FlightArc = ({ id, from, to }: { id: string; from: string; to: string }) => (
  <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
    <path id={id} d="M 36 92 Q 150 -14 264 92" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.6" strokeDasharray="4 5" />
    <circle cx="36" cy="92" r="4.5" fill="#fff" />
    <circle cx="264" cy="92" r="4.5" fill="#fff" />
    <g className="eban-plane">
      <path d="M10 0 L-6 -6 L-4 0 L-6 6 Z" fill="#fff" stroke="rgba(0,0,0,.25)" strokeWidth=".6">
        <animateMotion dur="7s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${id}`} />
        </animateMotion>
      </path>
    </g>
    <text x="36" y="112" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" letterSpacing="2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>{from}</text>
    <text x="264" y="112" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" letterSpacing="2" style={{ textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>{to}</text>
  </svg>
);

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
    <section id="routes" className="py-24 bg-background relative overflow-hidden border-t border-gold/10">
      <div className="container mx-auto px-6 relative z-10">
        <style>{SKY_CSS}</style>
        <div className="relative rounded-3xl overflow-hidden mb-12 min-h-[260px] flex items-end">
          <Sky photo="airport.jpg" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="relative p-8 md:p-12 max-w-2xl text-white">
            <p className="font-body text-xs font-semibold tracking-[0.25em] uppercase text-white/80 mb-3">Available routes</p>
            <h2 className="font-display text-4xl md:text-5xl font-light" style={{ textShadow: "0 2px 12px rgba(0,0,0,.35)" }}>
              Where space is <em className="italic font-normal">open right now</em>
            </h2>
            <p className="font-body text-white/90 mt-3 text-base">
              Explore real routes with available luggage space. Sign in to view trip details and continue with a booking.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Loading available routes" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-border/80 bg-card">
                <div className="h-44 animate-pulse bg-secondary/80" />
                <div className="space-y-4 p-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                  <div className="h-px bg-border/70" />
                  <div className="h-4 w-full animate-pulse rounded bg-secondary/70" />
                </div>
              </div>
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="max-w-md bg-card rounded-2xl border border-border p-8">
            <Plane className="w-10 h-10 text-gold/60 mb-4" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No open routes just yet</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Post a request and travelers heading your way can claim it.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {routes.map((r, i) => (
              <Link
                key={r.key}
                to={routeLink(r)}
                className="eban-route group bg-card rounded-2xl border border-border/80 hover:border-gold/60 shadow-[var(--shadow-card)] hover:shadow-gold-glow hover:-translate-y-1 transition-all duration-300 overflow-hidden block"
              >
                <div className="relative h-44">
                  <Sky photo={SKY_PHOTOS[i % SKY_PHOTOS.length]} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  <FlightArc id={`arc-${i}`} from={codeOf(r.origin_city)} to={codeOf(r.destination_city)} />
                  <span className="absolute top-3 right-3 text-[10px] font-body font-semibold uppercase tracking-wider bg-white/90 text-gold-dark px-2.5 py-1 rounded-full">
                    {r.trips} trip{r.trips === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg text-foreground truncate">{r.origin_city}</p>
                      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{r.origin_country}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gold shrink-0" />
                    <div className="min-w-0 text-right">
                      <p className="font-display text-lg text-foreground truncate">{r.destination_city}</p>
                      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{r.destination_country}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between font-body text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Weight className="w-3.5 h-3.5 text-gold-dark" /> {r.kg} kg open
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-dark" /> from{" "}
                      {new Date(r.next).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-gold-dark font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                  </div>
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
                Create a free Eban account to see traveler profiles and prices, book space on these routes, or post what you need sent. Eban manually confirms payment and holds it until you confirm delivery.
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
