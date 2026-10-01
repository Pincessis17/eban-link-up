import { useState } from "react";
import { Send, Lock, Package, MapPin, DollarSign, Calendar, Sparkles, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const ITEM_TYPES = ["Documents", "Electronics", "Clothing", "Gifts", "Other"];
const URGENCY_LEVELS = ["standard", "priority", "urgent"] as const;
const HANDLING_FLAGS = ["fragile", "perishable", "high_value"] as const;

const inputClasses =
  "w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all";

const BookingForm = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    originCountry: searchParams.get("originCountry") ?? "",
    originCity: searchParams.get("originCity") ?? "",
    destinationCountry: searchParams.get("destinationCountry") ?? "",
    destinationCity: searchParams.get("destinationCity") ?? "",
    itemType: "Documents",
    itemDescription: "",
    weightKg: "1.5",
    itemValue: "150",
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

  // Estimated delivery fee calculation
  const baseRate = 25; // USD base
  const kgRate = (parseFloat(form.weightKg) || 1) * 12;
  const urgencyMultiplier = form.urgencyLevel === "urgent" ? 1.5 : form.urgencyLevel === "priority" ? 1.25 : 1.0;
  const estimatedFee = Math.round((baseRate + kgRate) * urgencyMultiplier);

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
          <div className="max-w-2xl mx-auto text-center bg-card rounded-3xl p-12 border border-gold/30 shadow-gold-glow">
            <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center mx-auto mb-6 glow-gold">
              <CheckCircle2 className="w-10 h-10 text-accent-foreground" />
            </div>
            <h2 className="font-display text-4xl font-light text-foreground mb-3">Delivery Request Submitted!</h2>
            <p className="font-body text-muted-foreground text-base mb-8 max-w-md mx-auto">
              Your request is officially on the EBAN dispatch desk. We will automatically match you with verified travelers on your route.
            </p>
            <Link
              to="/sender/requests"
              className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-body font-bold uppercase tracking-wider px-8 py-4 rounded-xl text-xs hover:opacity-90 shadow-md transition-all"
            >
              Track Request Status <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!authLoading && !user) {
    return (
      <section id="book" className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-2xl mx-auto text-center bg-card/90 backdrop-blur-xl rounded-3xl p-12 border border-border/80 shadow-[var(--shadow-elevated)]">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-7 h-7 text-gold-dark" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-3">Sign in to book a package delivery</h2>
            <p className="font-body text-muted-foreground text-base mb-8 max-w-md mx-auto">
              Create your free EBAN account to book deliveries, track travelers in real-time, and get digital receipts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-xl hover:opacity-90 shadow-md transition-all"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="border border-border text-foreground font-body font-semibold text-xs uppercase tracking-wider px-8 py-4 rounded-xl hover:bg-secondary transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="book" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
            <span className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark">
              Instant Dispatch Portal
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-foreground">
            Schedule a <em className="italic text-gold-dark font-normal">Package Delivery</em>
          </h2>
          <p className="font-body text-muted-foreground mt-3 max-w-xl mx-auto text-base">
            Tell us your route and item specs. EBAN manages traveler verification, pickup intake, and digital sign-off.
          </p>
        </div>

        {/* Wizard Form Container */}
        <div className="max-w-3xl mx-auto bg-card rounded-3xl border border-border/80 shadow-[var(--shadow-elevated)] overflow-hidden">
          {/* Step Stepper Navigation Header */}
          <div className="bg-charcoal px-8 py-6 border-b border-gold/15 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-body uppercase tracking-wider text-primary-foreground">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${step >= 1 ? "bg-gold text-charcoal" : "bg-muted text-muted-foreground"}`}>1</span>
              <span className={step === 1 ? "text-gold-light font-semibold" : "text-muted-foreground"}>Route</span>
            </div>
            <div className="w-12 h-px bg-gold/20" />
            <div className="flex items-center gap-2 text-xs font-body uppercase tracking-wider text-primary-foreground">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${step >= 2 ? "bg-gold text-charcoal" : "bg-muted text-muted-foreground"}`}>2</span>
              <span className={step === 2 ? "text-gold-light font-semibold" : "text-muted-foreground"}>Item Specs</span>
            </div>
            <div className="w-12 h-px bg-gold/20" />
            <div className="flex items-center gap-2 text-xs font-body uppercase tracking-wider text-primary-foreground">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${step === 3 ? "bg-gold text-charcoal" : "bg-muted text-muted-foreground"}`}>3</span>
              <span className={step === 3 ? "text-gold-light font-semibold" : "text-muted-foreground"}>Review</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-10">
            {form.originCity && form.destinationCity && (
              <div className="bg-gold/10 border border-gold/25 text-gold-dark rounded-xl p-3.5 mb-6 font-body text-xs flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-gold" />
                <span>Pre-filled from open traveler trip: <strong>{form.originCity}</strong> &rarr; <strong>{form.destinationCity}</strong>.</span>
              </div>
            )}

            {/* STEP 1: ROUTE & DATES */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-up">
                <h3 className="font-display text-2xl font-normal text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gold-dark" /> Select Origin &amp; Destination
                </h3>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Origin Country</label>
                    <input type="text" required className={inputClasses} placeholder="e.g. Ghana" value={form.originCountry} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} />
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Origin City</label>
                    <input type="text" required className={inputClasses} placeholder="e.g. Accra" value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Destination Country</label>
                    <input type="text" required className={inputClasses} placeholder="e.g. United States" value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })} />
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Destination City</label>
                    <input type="text" required className={inputClasses} placeholder="e.g. New York" value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Preferred Target Date</label>
                  <div className="relative">
                    <input type="date" className={inputClasses} value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
                    <Calendar className="w-4 h-4 text-muted-foreground absolute right-4 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.originCountry || !form.originCity || !form.destinationCountry || !form.destinationCity) {
                        toast({ title: "Incomplete", description: "Please enter origin and destination details.", variant: "destructive" });
                        return;
                      }
                      setStep(2);
                    }}
                    className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
                  >
                    Next: Item Specifications <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ITEM SPECS */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-up">
                <h3 className="font-display text-2xl font-normal text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-gold-dark" /> Item &amp; Special Handling
                </h3>

                <div>
                  <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {ITEM_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`px-4 py-2.5 rounded-xl font-body text-xs font-semibold transition-all border ${
                          form.itemType === type
                            ? "bg-gradient-gold text-accent-foreground border-transparent shadow-sm"
                            : "bg-card border-border text-muted-foreground hover:border-gold/50"
                        }`}
                        onClick={() => setForm({ ...form, itemType: type })}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Item Description</label>
                  <textarea
                    required
                    className={`${inputClasses} resize-none`}
                    rows={3}
                    placeholder="Describe your item clearly for customs and intake verification..."
                    value={form.itemDescription}
                    onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Weight (kg)</label>
                    <input type="number" step="0.1" min="0.1" required className={inputClasses} placeholder="1.5" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Declared Value (USD $)</label>
                    <input type="number" step="1" min="0" required className={inputClasses} placeholder="150" value={form.itemValue} onChange={(e) => setForm({ ...form, itemValue: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Urgency Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {URGENCY_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`py-3 rounded-xl font-body text-xs font-semibold capitalize transition-all border ${
                          form.urgencyLevel === level
                            ? "bg-gradient-gold text-accent-foreground border-transparent shadow-sm"
                            : "bg-card border-border text-muted-foreground hover:border-gold/50"
                        }`}
                        onClick={() => setForm({ ...form, urgencyLevel: level })}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Special Handling Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {HANDLING_FLAGS.map((flag) => (
                      <button
                        key={flag}
                        type="button"
                        className={`px-4 py-2 rounded-xl font-body text-xs font-semibold capitalize border transition-all ${
                          form.flags.includes(flag)
                            ? "bg-earth text-gold-light border-gold/40 shadow-sm"
                            : "bg-card border-border text-muted-foreground hover:border-gold/40"
                        }`}
                        onClick={() => toggleFlag(flag)}
                      >
                        + {flag.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="border border-border text-muted-foreground font-body font-semibold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl hover:bg-secondary transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.itemDescription) {
                        toast({ title: "Incomplete", description: "Please enter an item description.", variant: "destructive" });
                        return;
                      }
                      setStep(3);
                    }}
                    className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
                  >
                    Review &amp; Estimate <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & ESTIMATE */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-up">
                <h3 className="font-display text-2xl font-normal text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gold-dark" /> Review Request Summary
                </h3>

                <div className="bg-secondary/60 rounded-2xl p-6 border border-border/80 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Route</span>
                    <span className="font-body text-sm font-semibold text-foreground">{form.originCity} ({form.originCountry}) &rarr; {form.destinationCity} ({form.destinationCountry})</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Package</span>
                    <span className="font-body text-sm font-semibold text-foreground">{form.itemType} ({form.weightKg} kg)</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Declared Value</span>
                    <span className="font-body text-sm font-semibold text-foreground">${form.itemValue} USD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Estimated Delivery Reward</span>
                    <span className="font-display text-2xl font-bold text-gold-dark">${estimatedFee} USD</span>
                  </div>
                </div>

                <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl font-body text-xs text-gold-dark">
                  * Final pricing is confirmed upon EBAN hub intake inspection. You pay only after a verified traveler accepts your package route.
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="border border-border text-muted-foreground font-body font-semibold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl hover:bg-secondary transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-widest px-10 py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg glow-gold disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Submit Dispatch Request"} <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default BookingForm;

