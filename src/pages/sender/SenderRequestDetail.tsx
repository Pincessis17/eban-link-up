import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
  dropped_off: "Dropped off",
  handed_to_traveller: "With traveler",
  in_transit: "In transit",
  delivered: "Ready for pickup",
  completed: "Picked up",
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

const inputClasses = "bg-secondary rounded-lg p-3";
const fieldClasses =
  "w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

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

    toast({ title: "Request updated" });
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
    toast({ title: "Thanks for confirming!" });
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SenderNav />
        <div className="text-center py-16 font-body text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <SenderNav />
        <div className="text-center py-16 font-body text-muted-foreground">
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
      <div className="container mx-auto px-6 py-10 max-w-xl">
        <Link to="/sender/requests" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block">
          &larr; My requests
        </Link>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4 mb-1">
            <p className="font-body text-xs text-muted-foreground">
              Request &middot; {new Date(request.created_at).toLocaleDateString()}
            </p>
            {canEdit && !editing && (
              <button
                onClick={startEditing}
                className="font-body text-xs font-semibold text-gold-dark hover:text-gold transition-colors whitespace-nowrap"
              >
                Edit request
              </button>
            )}
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-6">
            {request.origin_city}, {request.origin_country} &rarr; {request.destination_city}, {request.destination_country}
          </h1>

          {isCancelled && (
            <div className="bg-secondary text-foreground rounded-lg p-4 mb-6 font-body text-sm text-center">
              This request was cancelled.
            </div>
          )}
          {isDisputed && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6 font-body text-sm text-center">
              This request is under review by EBAN. We'll be in touch.
            </div>
          )}

          {!isCancelled && !isDisputed && (
            <div className="flex items-center justify-between mb-8">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                return (
                  <div key={step} className="flex-1 text-center">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${done ? "bg-gold" : "border border-border"}`} />
                    <p className={`font-body text-[10px] leading-tight ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {STATUS_STEP_LABELS[step]}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {!isCancelled && !isDisputed && currentIdx >= STATUS_STEPS.indexOf("dropped_off") && !request.sender_dropoff_confirmed_at && (
            <div className="bg-secondary rounded-lg p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
              <p className="font-body text-sm text-foreground">
                EBAN has received your package and is arranging the handoff to your traveler. Can you confirm you dropped it off with us?
              </p>
              <button
                onClick={confirmDropoff}
                disabled={confirming}
                className="bg-gradient-gold text-accent-foreground font-display text-xs font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              >
                {confirming ? "Confirming..." : "Confirm drop-off"}
              </button>
            </div>
          )}

          {normalized === "delivered" && (
            <div className="bg-gradient-gold text-accent-foreground rounded-lg p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
              <p className="font-body text-sm font-semibold">
                Your item has arrived and EBAN has received it from your traveler &mdash; it's ready for you to pick up.
              </p>
              <button
                onClick={confirmPickup}
                disabled={confirming}
                className="bg-background text-foreground font-display text-xs font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              >
                {confirming ? "Confirming..." : "Confirm pickup"}
              </button>
            </div>
          )}

          {normalized === "completed" && (
            <div className="bg-secondary text-foreground rounded-lg p-4 mb-6 font-body text-sm text-center">
              You confirmed pickup{request.pickup_confirmed_at ? ` on ${new Date(request.pickup_confirmed_at).toLocaleDateString()}` : ""}. This request is complete &mdash; thank you for using EBAN.
            </div>
          )}

          {editing && form ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Origin country</label>
                  <input required className={fieldClasses} value={form.originCountry} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} />
                </div>
                <div>
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Origin city</label>
                  <input required className={fieldClasses} value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
                </div>
                <div>
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Destination country</label>
                  <input required className={fieldClasses} value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })} />
                </div>
                <div>
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Destination city</label>
                  <input required className={fieldClasses} value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="font-display text-xs font-semibold text-foreground mb-1 block">Item type</label>
                <div className="flex flex-wrap gap-2">
                  {ITEM_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg font-display text-xs font-semibold border transition-colors ${
                        form.itemType === type ? "bg-gradient-gold text-accent-foreground border-transparent" : "bg-background border-border text-muted-foreground hover:border-gold/50"
                      }`}
                      onClick={() => setForm({ ...form, itemType: type })}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-display text-xs font-semibold text-foreground mb-1 block">Item description</label>
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
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Weight (kg)</label>
                  <input type="number" step="0.1" min="0" required className={fieldClasses} value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
                </div>
                <div>
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Declared value (USD)</label>
                  <input type="number" step="1" min="0" required className={fieldClasses} value={form.itemValue} onChange={(e) => setForm({ ...form, itemValue: e.target.value })} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Preferred date</label>
                  <input type="date" className={fieldClasses} value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
                </div>
                <div>
                  <label className="font-display text-xs font-semibold text-foreground mb-1 block">Urgency</label>
                  <div className="flex gap-2">
                    {URGENCY_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`flex-1 py-2.5 rounded-lg font-display text-xs font-semibold capitalize border transition-colors ${
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

              <div>
                <label className="font-display text-xs font-semibold text-foreground mb-1 block">Special handling</label>
                <div className="flex flex-wrap gap-2">
                  {HANDLING_FLAGS.map((flag) => (
                    <button
                      key={flag}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg font-display text-xs font-semibold capitalize border transition-colors ${
                        form.flags.includes(flag) ? "bg-gradient-gold text-accent-foreground border-transparent" : "bg-background border-border text-muted-foreground hover:border-gold/50"
                      }`}
                      onClick={() => toggleFlag(flag)}
                    >
                      {flag.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="flex-1 border border-border text-foreground font-display font-semibold py-3 rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-gold text-accent-foreground font-display font-bold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={inputClasses}>
                  <p className="font-body text-xs text-muted-foreground">Item</p>
                  <p className="font-display text-sm font-semibold text-foreground capitalize">{request.item_type}</p>
                </div>
                <div className={inputClasses}>
                  <p className="font-body text-xs text-muted-foreground">Weight</p>
                  <p className="font-display text-sm font-semibold text-foreground">{request.weight_kg}kg</p>
                </div>
                <div className={inputClasses}>
                  <p className="font-body text-xs text-muted-foreground">Declared value</p>
                  <p className="font-display text-sm font-semibold text-foreground">${request.item_value}</p>
                </div>
                <div className={inputClasses}>
                  <p className="font-body text-xs text-muted-foreground">Preferred date</p>
                  <p className="font-display text-sm font-semibold text-foreground">
                    {request.preferred_date ? new Date(request.preferred_date).toLocaleDateString() : "Flexible"}
                  </p>
                </div>
              </div>

              {request.item_description && (
                <div className="mb-6">
                  <p className="font-body text-xs text-muted-foreground mb-1">Description</p>
                  <p className="font-body text-sm text-foreground">{request.item_description}</p>
                </div>
              )}

              {request.special_handling_flags?.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {request.special_handling_flags.map((flag) => (
                    <span key={flag} className="px-3 py-1 rounded-full text-xs font-display font-semibold bg-secondary text-secondary-foreground capitalize">
                      {flag.replace("_", " ")}
                    </span>
                  ))}
                </div>
              )}

              {!canEdit && !isCancelled && !isDisputed && (
                <p className="font-body text-xs text-muted-foreground mb-4">
                  This request has already been matched, so details are locked in. Contact EBAN if something needs to change.
                </p>
              )}

              <div className="bg-accent/10 text-accent-foreground rounded-lg p-3 font-body text-xs">
                EBAN handles the handoff to your traveler directly &mdash; you won't be contacted by them, and they won't contact you.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SenderRequestDetail;
