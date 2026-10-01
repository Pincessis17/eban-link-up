import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Plane, ArrowLeft, CheckCircle2, ShieldCheck, Clock, MapPin, Package, AlertCircle, Edit3, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SenderNav } from "@/components/SenderNav";

interface DeliveryRequest {
  id: string;
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  item_type: string;
  item_description: string;
  weight_kg: number;
  item_value: number;
  urgency_level: string;
  preferred_date: string | null;
  status: string;
  special_handling_flags: string[];
  created_at: string;
  sender_dropoff_confirmed_at: string | null;
  delivered_at: string | null;
  pickup_confirmed_at: string | null;
}

const STATUS_STEPS = ["submitted", "matched", "dropped_off", "handed_to_traveller", "in_transit", "delivered", "completed"];
const STATUS_STEP_LABELS: Record<string, string> = {
  submitted: "Submitted",
  matched: "Matched",
  dropped_off: "Hub Dropoff",
  handed_to_traveller: "With Traveler",
  in_transit: "In Flight",
  delivered: "Ready for Pickup",
  completed: "Picked Up",
};

const ITEM_TYPES = ["Documents", "Electronics", "Clothing", "Gifts", "Other"];
const URGENCY_LEVELS = ["standard", "priority", "urgent"] as const;
const HANDLING_FLAGS = ["fragile", "perishable", "high_value"] as const;

const normalizeStatus = (status: string) => {
  if (["draft", "submitted"].includes(status)) return "submitted";
  if (["matched", "accepted_by_traveller", "paid"].includes(status)) return "matched";
  if (status === "dropped_off") return "dropped_off";
  if (status === "handed_to_traveller") return "handed_to_traveller";
  if (status === "in_transit") return "in_transit";
  if (status === "delivered") return "delivered";
  if (status === "completed") return "completed";
  return status;
};

const inputClasses = "bg-secondary/60 rounded-xl p-4 border border-border/60 font-body";
const fieldClasses =
  "w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all";

type EditForm = {
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  itemType: string;
  itemDescription: string;
  weightKg: string;
  itemValue: string;
  urgencyLevel: (typeof URGENCY_LEVELS)[number];
  preferredDate: string;
  flags: string[];
};

const toEditForm = (r: DeliveryRequest): EditForm => ({
  originCountry: r.origin_country,
  originCity: r.origin_city,
  destinationCountry: r.destination_country,
  destinationCity: r.destination_city,
  itemType: r.item_type,
  itemDescription: r.item_description ?? "",
  weightKg: String(r.weight_kg ?? ""),
  itemValue: String(r.item_value ?? ""),
  urgencyLevel: (r.urgency_level as (typeof URGENCY_LEVELS)[number]) ?? "standard",
  preferredDate: r.preferred_date ? r.preferred_date.slice(0, 10) : "",
  flags: r.special_handling_flags ?? [],
});

const SenderRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("delivery_requests").select("*").eq("id", id).maybeSingle();
    setRequest(data as DeliveryRequest);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const startEditing = () => {
    if (!request) return;
    setForm(toEditForm(request));
    setEditing(true);
  };

  const toggleFlag = (flag: string) => {
    setForm((f) =>
      f ? { ...f, flags: f.flags.includes(flag) ? f.flags.filter((x) => x !== flag) : [...f.flags, flag] } : f
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !form) return;
    setSaving(true);

    const { error } = await supabase
      .from("delivery_requests")
      .update({
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
      })
      .eq("id", request.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Couldn't save your changes. Try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Request updated successfully" });
    setEditing(false);
    load();
  };

  const confirmDropoff = async () => {
    if (!request) return;
    setConfirming(true);
    const { error } = await supabase
      .from("delivery_requests")
      .update({ sender_dropoff_confirmed_at: new Date().toISOString() })
      .eq("id", request.id);
    setConfirming(false);
    if (error) {
      toast({ title: "Error", description: "Couldn't confirm. Try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Drop-off confirmed!" });
    load();
  };

  const confirmPickup = async () => {
    if (!request) return;
    setConfirming(true);
    const { error } = await supabase
      .from("delivery_requests")
      .update({ status: "completed", pickup_confirmed_at: new Date().toISOString() })
      .eq("id", request.id);
    setConfirming(false);
    if (error) {
      toast({ title: "Error", description: "Couldn't confirm. Try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Delivery pickup confirmed!" });
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SenderNav />
        <div className="text-center py-20 font-body text-muted-foreground">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading request details...
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <SenderNav />
        <div className="text-center py-20 font-body text-muted-foreground">
          Request not found.{" "}
          <Link to="/sender/requests" className="text-gold-dark font-semibold hover:underline">
            Back to requests
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = request.status === "cancelled";
  const isDisputed = request.status === "disputed";
  const canEdit = request.status === "submitted";
  const normalized = normalizeStatus(request.status);
  const currentIdx = STATUS_STEPS.indexOf(normalized);

  return (
    <div className="min-h-screen bg-background">
      <SenderNav />

      <div className="container mx-auto px-6 py-10 max-w-3xl">
        <Link to="/sender/requests" className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to My Requests
        </Link>

        {/* Flight-Style Route Card */}
        <div className="bg-charcoal text-white rounded-3xl p-8 mb-8 border border-gold/20 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
            <div>
              <span className="font-body text-[10px] uppercase tracking-widest text-gold-light">Tracking Reference</span>
              <p className="font-mono text-sm font-bold text-white uppercase">{request.id.slice(0, 13)}</p>
            </div>
            {canEdit && !editing && (
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1.5 bg-gold/10 hover:bg-gold/20 text-gold-light border border-gold/30 px-3.5 py-1.5 rounded-xl font-body text-xs font-semibold transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Request
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-mono text-3xl font-bold text-white">{request.origin_city.slice(0, 3).toUpperCase()}</span>
              <p className="font-body text-xs text-gray-300">{request.origin_city}</p>
              <p className="font-body text-[10px] text-gray-400 uppercase">{request.origin_country}</p>
            </div>

            <div className="flex-1 flex flex-col items-center px-4">
              <div className="w-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gold" />
                <div className="h-px bg-gold/40 flex-1 relative flex items-center justify-center">
                  <Plane className="w-5 h-5 text-gold absolute -top-2.5" />
                </div>
                <span className="w-2 h-2 rounded-full bg-gold" />
              </div>
              <span className="font-body text-[10px] uppercase tracking-widest text-gold-light mt-2 font-medium">Chain of Custody</span>
            </div>

            <div className="text-right">
              <span className="font-mono text-3xl font-bold text-white">{request.destination_city.slice(0, 3).toUpperCase()}</span>
              <p className="font-body text-xs text-gray-300">{request.destination_city}</p>
              <p className="font-body text-[10px] text-gray-400 uppercase">{request.destination_country}</p>
            </div>
          </div>
        </div>

        {/* Status Tracker Line */}
        {!isCancelled && !isDisputed && (
          <div className="bg-card rounded-3xl border border-border/80 p-8 shadow-[var(--shadow-card)] mb-8">
            <h3 className="font-display text-xl font-medium text-foreground mb-6">Delivery Progress Timeline</h3>
            <div className="flex items-center justify-between relative overflow-x-auto pb-4">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step} className="flex-1 text-center min-w-[70px]">
                    <div
                      className={`w-7 h-7 rounded-full mx-auto mb-2 flex items-center justify-center font-body text-xs font-bold transition-all ${
                        done
                          ? "bg-gradient-gold text-accent-foreground shadow-sm"
                          : "bg-muted text-muted-foreground border border-border"
                      } ${isCurrent ? "ring-4 ring-gold/20 scale-110" : ""}`}
                    >
                      {done ? "✓" : idx + 1}
                    </div>
                    <p className={`font-body text-[11px] leading-tight ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {STATUS_STEP_LABELS[step]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Banners */}
        {!isCancelled && !isDisputed && currentIdx >= STATUS_STEPS.indexOf("dropped_off") && !request.sender_dropoff_confirmed_at && (
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display text-lg font-semibold text-gold-dark">Hub Drop-off Verification Required</h4>
              <p className="font-body text-xs text-muted-foreground mt-1">Please confirm when you have left your package at the EBAN hub.</p>
            </div>
            <button
              onClick={confirmDropoff}
              disabled={confirming}
              className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {confirming ? "Confirming..." : "Confirm Drop-off"}
            </button>
          </div>
        )}

        {normalized === "delivered" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display text-lg font-semibold text-emerald-700">Package Arrived &amp; Ready for Pickup</h4>
              <p className="font-body text-xs text-muted-foreground mt-1">Recipient can collect the package from the destination hub.</p>
            </div>
            <button
              onClick={confirmPickup}
              disabled={confirming}
              className="bg-emerald-600 text-white font-body font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {confirming ? "Confirming..." : "Confirm Final Receipt"}
            </button>
          </div>
        )}

        {/* Package Specifications Container */}
        <div className="bg-card rounded-3xl border border-border/80 p-8 shadow-[var(--shadow-card)]">
          {editing && form ? (
            <form onSubmit={handleSave} className="space-y-5">
              <h3 className="font-display text-2xl font-normal text-foreground">Edit Package Details</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Origin Country</label>
                  <input required className={fieldClasses} value={form.originCountry} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} />
                </div>
                <div>
                  <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Origin City</label>
                  <input required className={fieldClasses} value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
                </div>
                <div>
                  <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Destination Country</label>
                  <input required className={fieldClasses} value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })} />
                </div>
                <div>
                  <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Destination City</label>
                  <input required className={fieldClasses} value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Item Type</label>
                <div className="flex flex-wrap gap-2">
                  {ITEM_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`px-3.5 py-1.5 rounded-xl font-body text-xs font-semibold border transition-all ${
                        form.itemType === type ? "bg-gradient-gold text-accent-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:border-gold/50"
                      }`}
                      onClick={() => setForm({ ...form, itemType: type })}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Item Description</label>
                <textarea
                  required
                  rows={3}
                  className={`${fieldClasses} resize-none`}
                  value={form.itemDescription}
                  onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Weight (kg)</label>
                  <input type="number" step="0.1" min="0" required className={fieldClasses} value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
                </div>
                <div>
                  <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Declared Value (USD $)</label>
                  <input type="number" step="1" min="0" required className={fieldClasses} value={form.itemValue} onChange={(e) => setForm({ ...form, itemValue: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="flex-1 border border-border text-foreground font-body font-semibold py-3.5 rounded-xl text-xs uppercase tracking-wider hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-gold text-accent-foreground font-body font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 shadow-md transition-all"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h3 className="font-display text-2xl font-normal text-foreground mb-6">Cargo Specifications</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className={inputClasses}>
                  <span className="font-body text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Category</span>
                  <span className="font-body text-sm font-semibold text-foreground">{request.item_type}</span>
                </div>
                <div className={inputClasses}>
                  <span className="font-body text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Weight</span>
                  <span className="font-body text-sm font-semibold text-foreground">{request.weight_kg} kg</span>
                </div>
                <div className={inputClasses}>
                  <span className="font-body text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Declared Value</span>
                  <span className="font-body text-sm font-semibold text-foreground">${request.item_value} USD</span>
                </div>
                <div className={inputClasses}>
                  <span className="font-body text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Target Date</span>
                  <span className="font-body text-sm font-semibold text-foreground">
                    {request.preferred_date ? new Date(request.preferred_date).toLocaleDateString() : "Flexible"}
                  </span>
                </div>
              </div>

              {request.item_description && (
                <div className="mb-6 bg-secondary/30 p-4 rounded-xl border border-border/60">
                  <span className="font-body text-xs font-semibold uppercase text-muted-foreground block mb-1">Item Description</span>
                  <p className="font-body text-sm text-foreground leading-relaxed">{request.item_description}</p>
                </div>
              )}

              {request.special_handling_flags?.length > 0 && (
                <div className="mb-6">
                  <span className="font-body text-xs font-semibold uppercase text-muted-foreground block mb-2">Special Handling Instructions</span>
                  <div className="flex flex-wrap gap-2">
                    {request.special_handling_flags.map((flag) => (
                      <span key={flag} className="px-3 py-1 rounded-xl text-xs font-body font-semibold bg-earth text-gold-light border border-gold/30 capitalize">
                        + {flag.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gold/10 border border-gold/20 text-gold-dark rounded-xl p-4 font-body text-xs flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-gold shrink-0" />
                <span>EBAN manages all physical drop-offs, security checks, and traveler handoffs. Direct contact between users is strictly prevented for your privacy.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SenderRequestDetail;

