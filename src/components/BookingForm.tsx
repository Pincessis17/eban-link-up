import { useState } from "react";
import { Send, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const ITEM_TYPES = ["Documents", "Electronics", "Clothing", "Gifts", "Other"];
const URGENCY_LEVELS = ["standard", "priority", "urgent"] as const;
const HANDLING_FLAGS = ["fragile", "perishable", "high_value"] as const;

const inputClasses =
  "w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

const BookingForm = () => {
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    originCountry: "",
    originCity: "",
    destinationCountry: "",
    destinationCity: "",
    itemType: "Documents",
    itemDescription: "",
    weightKg: "",
    itemValue: "",
    urgencyLevel: "standard" as (typeof URGENCY_LEVELS)[number],
    preferredDate: "",
    flags: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleFlag = (flag: string) => {
    setForm((f) => ({
      ...f,
      flags: f.flags.includes(flag) ? f.flags.filter((x) => x !== flag) : [...f.flags, flag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("delivery_requests").insert({
      sender_id: user.id,
      origin_country: form.originCountry,
      origin_city: form.originCity,
      destination_country: form.destinationCountry,
      destination_city: form.destinationCity,
      item_type: form.itemType,
      item_description: form.itemDescription,
      weight_kg: parseFloat(form.weightKg) || 0,
      item_value: parseFloat(form.itemValue) || 0,
      urgency_level: form.urgencyLevel,
      preferred_date: form.preferredDate || null,
      special_handling_flags: form.flags,
      status: "submitted",
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: "Failed to submit your request. Please try again.", variant: "destructive" });
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section id="book" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center bg-card rounded-2xl p-12 border border-border shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto mb-6">
              <Send className="w-7 h-7 text-accent-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">Request received!</h2>
            <p className="font-body text-muted-foreground text-lg">We'll match you with a traveler and update you here.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!authLoading && !user) {
    return (
      <section id="book" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center bg-card rounded-2xl p-12 border border-border shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto mb-6">
              <Lock className="w-7 h-7 text-accent-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">Log in to send a package</h2>
            <p className="font-body text-muted-foreground text-lg mb-6">
              Create a free account so we can keep you updated on your request.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/signup" className="bg-gradient-gold text-accent-foreground font-display font-semibold px-6 py-3 rounded-lg text-sm hover:opacity-90 transition-opacity">
                Sign up
              </Link>
              <Link to="/login" className="border border-border text-foreground font-display font-semibold px-6 py-3 rounded-lg text-sm hover:bg-secondary transition-colors">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="book" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <span className="font-display text-sm font-semibold text-gold-dark tracking-wider uppercase">Book Now</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mt-3">Send a Package</h2>
          <p className="font-body text-muted-foreground mt-4 max-w-xl mx-auto">
            Tell us what's going where. We'll match you with a traveler already headed that way &mdash; you never deal
            with them directly.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-card rounded-2xl p-8 md:p-10 border border-border shadow-[var(--shadow-card)]">
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Origin country</label>
              <input type="text" required className={inputClasses} placeholder="e.g. Ghana" value={form.originCountry} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Origin city</label>
              <input type="text" required className={inputClasses} placeholder="e.g. Accra" value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Destination country</label>
              <input type="text" required className={inputClasses} placeholder="e.g. United States" value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Destination city</label>
              <input type="text" required className={inputClasses} placeholder="e.g. New York" value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })} />
            </div>
          </div>

          <div className="mb-5">
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Item type</label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`px-4 py-2 rounded-lg font-display text-sm font-semibold border transition-colors ${
                    form.itemType === type ? "bg-gradient-gold text-accent-foreground border-transparent" : "bg-background border-border text-muted-foreground hover:border-gold/50"
                  }`}
                  onClick={() => setForm({ ...form, itemType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Item description</label>
            <textarea
              required
              className={`${inputClasses} resize-none`}
              rows={3}
              placeholder="What are you sending? Be specific for customs purposes."
              value={form.itemDescription}
              onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Weight (kg)</label>
              <input type="number" step="0.1" min="0" required className={inputClasses} placeholder="1.5" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Declared value (USD)</label>
              <input type="number" step="1" min="0" required className={inputClasses} placeholder="200" value={form.itemValue} onChange={(e) => setForm({ ...form, itemValue: e.target.value })} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Preferred date</label>
              <input type="date" className={inputClasses} value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
            </div>
            <div>
              <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Urgency</label>
              <div className="flex gap-2">
                {URGENCY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`flex-1 py-3 rounded-lg font-display text-sm font-semibold capitalize border transition-colors ${
                      form.urgencyLevel === level ? "bg-gradient-gold text-accent-foreground border-transparent" : "bg-background border-border text-muted-foreground hover:border-gold/50"
                    }`}
                    onClick={() => setForm({ ...form, urgencyLevel: level })}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Special handling</label>
            <div className="flex flex-wrap gap-2">
              {HANDLING_FLAGS.map((flag) => (
                <button
                  key={flag}
                  type="button"
                  className={`px-4 py-2 rounded-lg font-display text-sm font-semibold capitalize border transition-colors ${
                    form.flags.includes(flag) ? "bg-gradient-gold text-accent-foreground border-transparent" : "bg-background border-border text-muted-foreground hover:border-gold/50"
                  }`}
                  onClick={() => toggleFlag(flag)}
                >
                  {flag.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground font-display font-bold py-4 rounded-lg text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? "Submitting..." : "Submit Request"} <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </section>
  );
};

export default BookingForm;
