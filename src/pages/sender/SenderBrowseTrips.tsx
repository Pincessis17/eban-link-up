import { useEffect, useMemo, useState } from "react";
import { EmptyIllustration } from "@/components/EmptyIllustration";
import { Link, useNavigate } from "react-router-dom";
import { Plane, ArrowRight, Calendar, Weight, ShieldCheck, ShieldAlert, Star, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { SenderNav } from "@/components/SenderNav";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errMsg, formatDate, money } from "@/lib/marketplace";
import { allInRate, parcelQuote, usePlatformFee } from "@/lib/fees";

type OpenTrip = Database["public"]["Functions"]["browse_open_trips"]["Returns"][number];

const ITEM_TYPES = ["Documents", "Electronics", "Clothing", "Gifts", "Food", "Other"];
const HANDLING_FLAGS = ["fragile", "perishable", "high_value"] as const;

const fieldClasses =
  "w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all";

const SenderBrowseTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<OpenTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const feeSettings = usePlatformFee();
  const [booking, setBooking] = useState<OpenTrip | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ itemType: "Gifts", description: "", weight: "1", value: "50", flags: [] as string[] });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("browse_open_trips");
      if (error) toast({ title: "Couldn't load trips", description: errMsg(error), variant: "destructive" });
      setTrips(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const visible = useMemo(() => {
    const f = from.trim().toLowerCase();
    const t = to.trim().toLowerCase();
    return trips.filter(
      (x) =>
        (!f || x.origin_city.toLowerCase().includes(f) || x.origin_country.toLowerCase().includes(f)) &&
        (!t || x.destination_city.toLowerCase().includes(t) || x.destination_country.toLowerCase().includes(t))
    );
  }, [trips, from, to]);

  const weight = parseFloat(form.weight) || 0;
  const quote = booking?.price_per_kg != null && weight > 0 ? parcelQuote(weight, Number(booking.price_per_kg), feeSettings) : null;
  const total = quote?.total ?? null;

  const blockedReason = (t: OpenTrip) => {
    if (t.is_mine) return "This is your own trip";
    if (!t.traveller_verified) return "Traveler not ID-verified yet";
    if (t.price_per_kg == null) return "Traveler hasn't set a price yet";
    return null;
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    if (weight <= 0 || weight > Number(booking.available_kg)) {
      toast({ title: "Check the weight", description: `This trip has ${booking.available_kg} kg left.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("book_trip", {
      p_trip_id: booking.id,
      p_item_type: form.itemType,
      p_item_description: form.description,
      p_weight_kg: weight,
      p_item_value: parseFloat(form.value) || 0,
      p_flags: form.flags,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't book this trip", description: errMsg(error), variant: "destructive" });
      return;
    }
    toast({ title: "Request sent", description: "The traveler will confirm. You pay once they accept." });
    setBooking(null);
    navigate(`/sender/requests/${data}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SenderNav />
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-light text-foreground">Browse trips</h1>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Pick a traveler already flying your route and book space for your item. You pay into escrow once they accept.
          </p>
        </div>

        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 mb-8">
          <input className={fieldClasses} placeholder="From (city or country)" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className={fieldClasses} placeholder="To (city or country)" value={to} onChange={(e) => setTo(e.target.value)} />
          <Link
            to="/sender/new-request"
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground font-body font-semibold text-xs uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <Search className="w-4 h-4" /> No match? Post a request
          </Link>
        </div>

        {loading && <div className="text-center py-16 font-body text-muted-foreground">Loading trips...</div>}

        {!loading && visible.length === 0 && (
          <div className="text-center py-16 bg-card rounded-3xl border border-border/80 shadow-[var(--shadow-card)]">
            <EmptyIllustration kind="plane" />
            <p className="font-display text-xl font-semibold text-foreground mb-1">No trips on that route yet</p>
            <p className="font-body text-sm text-muted-foreground mb-5">
              Post an open request and travelers heading your way will be able to claim it.
            </p>
            <Link
              to="/sender/new-request"
              className="inline-flex bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:opacity-90"
            >
              Post a request
            </Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          {visible.map((t) => {
            const blocked = blockedReason(t);
            return (
              <div key={t.id} className="bg-card rounded-2xl border border-border/80 shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
                <div className="bg-charcoal px-5 py-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-gold-light uppercase tracking-widest font-medium">
                    <Calendar className="w-3.5 h-3.5 text-gold" /> {formatDate(t.departure_date)}
                  </span>
                  {t.traveller_verified ? (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-emerald-400">
                      <ShieldCheck className="w-3 h-3" /> ID verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-amber-400">
                      <ShieldAlert className="w-3 h-3" /> Not verified
                    </span>
                  )}
                </div>
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2 font-display text-xl font-bold text-foreground mb-1">
                    {t.origin_city} <ArrowRight className="w-4 h-4 text-gold-dark" /> {t.destination_city}
                  </div>
                  <p className="font-body text-xs text-muted-foreground mb-4">
                    {t.origin_country} to {t.destination_country}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4 font-body text-xs">
                    <div className="bg-secondary/60 rounded-xl p-3">
                      <span className="text-muted-foreground flex items-center gap-1 mb-0.5"><Weight className="w-3.5 h-3.5" /> Space left</span>
                      <strong className="text-foreground text-sm">{Number(t.available_kg)} kg</strong>
                    </div>
                    <div className="bg-secondary/60 rounded-xl p-3">
                      <span className="text-muted-foreground block mb-0.5">Price</span>
                      <strong className="text-foreground text-sm">{t.price_per_kg != null ? `${money(allInRate(t.price_per_kg, feeSettings))} / kg` : "Not set"}</strong>
                    </div>
                  </div>
                  <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-gold" />
                    {t.traveller_first_name} &middot; {Number(t.traveller_rating).toFixed(1)} rating &middot; {t.traveller_deliveries}{" "}
                    {t.traveller_deliveries === 1 ? "delivery" : "deliveries"}
                  </p>
                  {t.restricted_item_preferences && (
                    <p className="font-body text-xs text-muted-foreground mt-2">Won't carry: {t.restricted_item_preferences}</p>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button
                    disabled={!!blocked}
                    onClick={() => setBooking(t)}
                    className="w-full bg-gradient-gold text-accent-foreground font-body text-xs font-bold uppercase tracking-wider py-3 rounded-xl hover:opacity-95 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {blocked ?? "Book space"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!booking} onOpenChange={(o) => !o && setBooking(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {booking?.origin_city} to {booking?.destination_city}
            </DialogTitle>
            <DialogDescription>
              Tell {booking?.traveller_first_name} what you want carried. You are responsible for the item and for what it contains.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBooking} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, itemType: type })}
                  className={`px-3.5 py-1.5 rounded-xl font-body text-xs font-semibold border transition-all ${
                    form.itemType === type ? "bg-gradient-gold text-accent-foreground border-transparent" : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={3}
              className={`${fieldClasses} resize-none`}
              placeholder="Describe the item clearly (what it is, how it is packed)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Weight (kg)</label>
                <input type="number" step="0.1" min="0.1" max={Number(booking?.available_kg ?? 0)} required className={fieldClasses} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div>
                <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Item value (USD)</label>
                <input type="number" step="1" min="0" required className={fieldClasses} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {HANDLING_FLAGS.map((flag) => (
                <button
                  key={flag}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, flags: f.flags.includes(flag) ? f.flags.filter((x) => x !== flag) : [...f.flags, flag] }))
                  }
                  className={`px-3.5 py-1.5 rounded-xl font-body text-xs font-semibold capitalize border transition-all ${
                    form.flags.includes(flag) ? "bg-earth text-gold-light border-gold/40" : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  + {flag.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="bg-secondary/60 rounded-xl p-4 flex items-center justify-between font-body">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total (held in escrow)</span>
              <span className="font-display text-2xl font-bold text-gold-dark">{money(total)}</span>
            </div>
            {quote && quote.minimumTopUp > 0 && booking?.price_per_kg != null && (
              <div className="font-body text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>{weight} kg &times; {money(allInRate(booking.price_per_kg, feeSettings))}</span><span>{money(quote.subtotal)}</span></div>
                <div className="flex justify-between"><span>Small parcel minimum</span><span>+ {money(quote.minimumTopUp)}</span></div>
                <p>Small parcels have a {money(feeSettings.minimum)} minimum service fee.</p>
              </div>
            )}
            <p className="font-body text-xs text-muted-foreground">
              Nothing is charged yet. You pay into escrow after the traveler accepts, and the money is released only when you confirm you received the item.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Sending..." : "Send booking request"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SenderBrowseTrips;
