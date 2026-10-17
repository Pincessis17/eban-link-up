import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { toast } from "@/hooks/use-toast";
import { TravelerNav } from "@/components/TravelerNav";
import { PRICE_SUGGESTIONS } from "@/lib/pricingGuide";

const inputClasses =
  "w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

const TravelerNewTrip = () => {
  const { travellerProfile } = useTravellerProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    originCountry: searchParams.get("originCountry") ?? "",
    originCity: searchParams.get("originCity") ?? "",
    destinationCountry: searchParams.get("destinationCountry") ?? "",
    destinationCity: searchParams.get("destinationCity") ?? "",
    departureDate: "",
    arrivalDate: "",
    capacityKg: "",
    pricePerKg: "",
    restrictions: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!travellerProfile) return;
    setLoading(true);

    const capacity = parseFloat(form.capacityKg) || 0;

    const { error } = await supabase.from("trips").insert({
      traveller_id: travellerProfile.id,
      origin_country: form.originCountry,
      origin_city: form.originCity,
      destination_country: form.destinationCountry,
      destination_city: form.destinationCity,
      departure_date: form.departureDate,
      arrival_date: form.arrivalDate || form.departureDate,
      capacity_kg: capacity,
      available_kg: capacity,
      price_per_kg: parseFloat(form.pricePerKg) || null,
      restricted_item_preferences: form.restrictions || null,
      status: "open",
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: "Failed to post your trip. Please try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Trip posted", description: "Senders can now book space on it. You can also claim open requests." });
    navigate("/traveler");
  };

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />
      <div className="container mx-auto px-6 py-10 max-w-xl">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Share a trip</h1>
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 border border-border shadow-[var(--shadow-card)]">
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">From (country)</label>
              <input type="text" required className={inputClasses} placeholder="e.g. United States" value={form.originCountry} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">From (city)</label>
              <input type="text" required className={inputClasses} placeholder="e.g. New York" value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">To (country)</label>
              <input type="text" required className={inputClasses} placeholder="e.g. Ghana" value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">To (city)</label>
              <input type="text" required className={inputClasses} placeholder="e.g. Accra" value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Departure date</label>
              <input type="date" required className={inputClasses} value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Arrival date</label>
              <input type="date" className={inputClasses} value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Available capacity (kg)</label>
              <input type="number" step="0.5" min="0" required className={inputClasses} placeholder="5" value={form.capacityKg} onChange={(e) => setForm({ ...form, capacityKg: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Your price per kg (USD)</label>
              <input type="number" step="0.5" min="0.5" required className={inputClasses} placeholder="8" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} />
            </div>
          </div>
          <p className="font-body text-xs text-muted-foreground mb-4 -mt-2">
            You set the price. Senders see it before booking, and the money is held in escrow until they confirm delivery.
          </p>
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 mb-5">
            <p className="font-display text-sm font-semibold text-foreground">Suggested prices per kg</p>
            <p className="font-body text-xs text-muted-foreground mt-0.5 mb-3">
              Just a guide to get you started. You can charge whatever you like, higher or lower. Tap one to use it.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {PRICE_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setForm({ ...form, pricePerKg: String(s.perKg) })}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left font-body text-xs transition-colors ${
                    form.pricePerKg === String(s.perKg) ? "border-gold bg-gold/15" : "border-border bg-card hover:border-gold/50"
                  }`}
                >
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold text-foreground">${s.perKg}/kg</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-8">
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Anything you'd rather not carry? (optional)</label>
            <textarea className={`${inputClasses} resize-none`} rows={2} placeholder="e.g. no perishables" value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-display font-bold py-4 rounded-lg text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? "Posting..." : "Post trip"} <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TravelerNewTrip;
