import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, ArrowRight, Calendar, Weight, ShieldAlert, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { toast } from "@/hooks/use-toast";
import { TravelerNav } from "@/components/TravelerNav";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errMsg, formatDate, money } from "@/lib/marketplace";

type OpenRequest = Database["public"]["Functions"]["browse_open_requests"]["Returns"][number];
type MyTrip = Pick<
  Database["public"]["Tables"]["trips"]["Row"],
  "id" | "origin_city" | "destination_city" | "departure_date" | "available_kg" | "price_per_kg"
>;

const norm = (s: string) => s.trim().toLowerCase();

const TravelerBrowseRequests = () => {
  const navigate = useNavigate();
  const { travellerProfile, loading: profileLoading } = useTravellerProfile();
  const [requests, setRequests] = useState<OpenRequest[]>([]);
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [claiming, setClaiming] = useState<OpenRequest | null>(null);
  const [tripId, setTripId] = useState("");
  const [busy, setBusy] = useState(false);

  const verified = travellerProfile?.verification_status === "approved";

  useEffect(() => {
    if (!travellerProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    const load = async () => {
      const [{ data: reqs, error }, { data: myTrips }] = await Promise.all([
        supabase.rpc("browse_open_requests"),
        supabase
          .from("trips")
          .select("id, origin_city, destination_city, departure_date, available_kg, price_per_kg")
          .eq("traveller_id", travellerProfile.id)
          .eq("status", "open")
          .gte("departure_date", new Date().toISOString().slice(0, 10)),
      ]);
      if (error) toast({ title: "Couldn't load requests", description: errMsg(error), variant: "destructive" });
      setRequests(reqs ?? []);
      setTrips((myTrips as MyTrip[]) ?? []);
      setLoading(false);
    };
    load();
  }, [travellerProfile, profileLoading]);

  const tripsFor = (r: OpenRequest) =>
    trips.filter(
      (t) =>
        norm(t.origin_city) === norm(r.origin_city) &&
        norm(t.destination_city) === norm(r.destination_city) &&
        Number(t.available_kg) >= Number(r.weight_kg)
    );

  const visible = useMemo(() => {
    const f = norm(from);
    const t = norm(to);
    return requests.filter(
      (r) =>
        (!f || norm(r.origin_city).includes(f) || norm(r.origin_country).includes(f)) &&
        (!t || norm(r.destination_city).includes(t) || norm(r.destination_country).includes(t))
    );
  }, [requests, from, to]);

  const openClaim = (r: OpenRequest) => {
    const options = tripsFor(r);
    setClaiming(r);
    setTripId(options[0]?.id ?? "");
  };

  const chosenTrip = trips.find((t) => t.id === tripId);
  const earning =
    claiming == null
      ? null
      : claiming.offered_price != null
        ? Number(claiming.offered_price)
        : chosenTrip?.price_per_kg != null
          ? Number(claiming.weight_kg) * Number(chosenTrip.price_per_kg)
          : null;

  const confirmClaim = async () => {
    if (!claiming || !tripId) return;
    setBusy(true);
    const { error } = await supabase.rpc("claim_request", { p_request_id: claiming.id, p_trip_id: tripId });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't claim this request", description: errMsg(error), variant: "destructive" });
      return;
    }
    toast({ title: "Request claimed", description: "The sender now pays into escrow to lock it in." });
    setClaiming(null);
    navigate("/traveler/requests");
  };

  const newTripLink = (r: OpenRequest) => {
    const p = new URLSearchParams({
      originCountry: r.origin_country,
      originCity: r.origin_city,
      destinationCountry: r.destination_country,
      destinationCity: r.destination_city,
    });
    return `/traveler/new-trip?${p.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-light text-foreground">Browse requests</h1>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Senders looking for someone on their route. Claim one with a trip you've posted and you're paid when they confirm delivery.
          </p>
        </div>

        {!verified && !profileLoading && (
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 font-body text-sm text-foreground">
              <ShieldAlert className="w-5 h-5 text-gold-dark shrink-0" />
              You can browse now, but you need to finish ID verification before claiming a request.
            </div>
            <Link to="/traveler/verification" className="bg-earth text-gold-light font-body text-xs font-semibold px-4 py-2.5 rounded-xl uppercase tracking-wider shrink-0">
              Verify
            </Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <input className="w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-gold" placeholder="From (city or country)" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-gold" placeholder="To (city or country)" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {loading && <div className="text-center py-16 font-body text-muted-foreground">Loading requests...</div>}

        {!loading && visible.length === 0 && (
          <div className="text-center py-16 bg-card rounded-3xl border border-border/80 shadow-[var(--shadow-card)]">
            <Package className="w-10 h-10 text-gold-dark/60 mx-auto mb-3" />
            <p className="font-display text-xl font-semibold text-foreground mb-1">No open requests right now</p>
            <p className="font-body text-sm text-muted-foreground">Post a trip so senders can find and book you directly.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          {visible.map((r) => {
            const options = tripsFor(r);
            return (
              <div key={r.id} className="bg-card rounded-2xl border border-border/80 shadow-[var(--shadow-card)] p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-secondary px-2.5 py-1 rounded-md text-xs font-body font-medium text-foreground">{r.item_type}</span>
                  <span className="font-body text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {r.preferred_date ? `By ${formatDate(r.preferred_date)}` : "Flexible date"}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-display text-xl font-bold text-foreground mb-1">
                  {r.origin_city} <ArrowRight className="w-4 h-4 text-gold-dark" /> {r.destination_city}
                </div>
                <p className="font-body text-xs text-muted-foreground mb-3">
                  {r.origin_country} to {r.destination_country}
                </p>
                <p className="font-body text-sm text-foreground mb-3 line-clamp-3">{r.item_description}</p>
                <div className="grid grid-cols-3 gap-2 mb-4 font-body text-xs">
                  <div className="bg-secondary/60 rounded-xl p-2.5">
                    <span className="text-muted-foreground flex items-center gap-1"><Weight className="w-3 h-3" /> Weight</span>
                    <strong className="text-foreground">{Number(r.weight_kg)} kg</strong>
                  </div>
                  <div className="bg-secondary/60 rounded-xl p-2.5">
                    <span className="text-muted-foreground block">Value</span>
                    <strong className="text-foreground">{money(r.item_value)}</strong>
                  </div>
                  <div className="bg-secondary/60 rounded-xl p-2.5">
                    <span className="text-muted-foreground block">Offer</span>
                    <strong className="text-foreground">{r.offered_price != null ? money(r.offered_price) : "Your price"}</strong>
                  </div>
                </div>
                {r.special_handling_flags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {r.special_handling_flags.map((f) => (
                      <span key={f} className="px-2.5 py-0.5 rounded-lg text-[11px] font-body font-semibold bg-earth text-gold-light capitalize">
                        {f.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto">
                  {options.length > 0 ? (
                    <button
                      onClick={() => openClaim(r)}
                      disabled={!verified}
                      className="w-full bg-gradient-gold text-accent-foreground font-body text-xs font-bold uppercase tracking-wider py-3 rounded-xl hover:opacity-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verified ? "Claim with my trip" : "Verify to claim"}
                    </button>
                  ) : (
                    <Link
                      to={newTripLink(r)}
                      className="w-full inline-flex items-center justify-center gap-1.5 border border-border text-foreground font-body text-xs font-semibold uppercase tracking-wider py-3 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Post a trip on this route
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!claiming} onOpenChange={(o) => !o && setClaiming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Claim this request</DialogTitle>
            <DialogDescription>
              {claiming?.origin_city} to {claiming?.destination_city}, {claiming ? Number(claiming.weight_kg) : 0} kg of {claiming?.item_type.toLowerCase()}.
              You're responsible for checking the item before you take it.
            </DialogDescription>
          </DialogHeader>
          {claiming && (
            <div className="space-y-4">
              <div>
                <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Which trip?</label>
                <select
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm"
                >
                  {tripsFor(claiming).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.origin_city} to {t.destination_city} &middot; {formatDate(t.departure_date)} &middot; {Number(t.available_kg)} kg left
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-secondary/60 rounded-xl p-4 flex items-center justify-between font-body">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">You earn</span>
                <span className="font-display text-2xl font-bold text-gold-dark">{money(earning)}</span>
              </div>
              {earning == null && (
                <p className="font-body text-xs text-destructive">Set a price per kg on this trip first so we can work out your earnings.</p>
              )}
              <button
                onClick={confirmClaim}
                disabled={busy || earning == null}
                className="w-full bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Claiming..." : "Confirm claim"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TravelerBrowseRequests;
