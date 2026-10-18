import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Plane, ArrowLeft, ShieldCheck, Edit3, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SenderNav } from "@/components/SenderNav";
import { DeleteButton } from "@/components/AdminDeleteButton";
import { RequestMessages } from "@/components/RequestMessages";
import { RateCounterparty } from "@/components/RateCounterparty";
import { ReportIssueButton } from "@/components/ReportIssueButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAYMENT_METHODS, paymentReference } from "@/lib/paymentConfig";
import { calcServiceFee, usePlatformFee } from "@/lib/fees";
import { REQUEST_STEPS, stepIndex, SENDER_DELETABLE, IN_FLIGHT, errMsg, money } from "@/lib/marketplace";

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
  matched_traveller_id: string | null;
  offered_price: number | null;
  agreed_price: number | null;
  delivered_at: string | null;
  pickup_confirmed_at: string | null;
}

interface Counterparty {
  counterparty_role: string;
  first_name: string;
  rating: number | null;
  total_deliveries: number | null;
  verified: boolean | null;
  my_rating: number | null;
}

const ITEM_TYPES = ["Documents", "Electronics", "Clothing", "Gifts", "Other"];
const URGENCY_LEVELS = ["standard", "priority", "urgent"] as const;
const HANDLING_FLAGS = ["fragile", "perishable", "high_value"] as const;

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
  offeredPrice: string;
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
  offeredPrice: r.offered_price != null ? String(r.offered_price) : "",
  flags: r.special_handling_flags ?? [],
});

const SenderRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [acting, setActing] = useState(false);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [payment, setPayment] = useState<{ status: string; amount: number; service_fee: number } | null>(null);
  const feeSettings = usePlatformFee();
  const [payOpen, setPayOpen] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("delivery_requests").select("*").eq("id", id).maybeSingle();
    setRequest(data as DeliveryRequest);
    const { data: pay } = await supabase.from("payments").select("status, amount, service_fee").eq("request_id", id).maybeSingle();
    setPayment(pay);
    if (data?.matched_traveller_id) {
      const { data: cp } = await supabase.rpc("get_request_counterparty", { p_request_id: id });
      setCounterparty(cp?.[0] ?? null);
    } else {
      setCounterparty(null);
    }
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
        offered_price: form.offeredPrice ? parseFloat(form.offeredPrice) : null,
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

  const run = async (call: () => PromiseLike<{ error: unknown }>, okTitle: string) => {
    setActing(true);
    const { error } = await call();
    setActing(false);
    if (error) {
      toast({ title: "Couldn't do that", description: errMsg(error), variant: "destructive" });
      return;
    }
    toast({ title: okTitle });
    load();
  };

  const reportPayment = async () => {
    await run(() => supabase.rpc("report_payment_sent", { p_request_id: request!.id }), "Thanks! EBAN will confirm your payment shortly.");
    setPayOpen(false);
  };
  const confirmReceipt = () =>
    run(() => supabase.rpc("confirm_receipt", { p_request_id: request!.id }), "Receipt confirmed. Payment released to the traveler.");
  const cancelRequest = () =>
    run(() => supabase.rpc("cancel_request", { p_request_id: request!.id }), "Request cancelled");

  const deleteRequest = async (): Promise<string | null> => {
    if (!request) return null;
    const { data, error } = await supabase.from("delivery_requests").delete().eq("id", request.id).select("id");
    if (error) return errMsg(error);
    if (!data || data.length === 0) return "Nothing was deleted. You may not have permission.";
    navigate("/sender/requests");
    return null;
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
  const currentIdx = stepIndex(request.status);
  const price = request.agreed_price ?? request.offered_price;
  const serviceFee = price != null ? calcServiceFee(price, feeSettings) : 0;
  const total = price != null ? Number(price) + serviceFee : null;
  const hasTraveler = !!request.matched_traveller_id && !isCancelled && request.status !== "submitted";

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
            <div className="flex items-center gap-2">
              {canEdit && !editing && (
                <button
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 bg-gold/10 hover:bg-gold/20 text-gold-light border border-gold/30 px-3.5 py-1.5 rounded-xl font-body text-xs font-semibold transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Request
                </button>
              )}
              {["matched", "accepted_by_traveller"].includes(request.status) && (
                <button
                  onClick={cancelRequest}
                  disabled={acting}
                  className="inline-flex items-center gap-1.5 border border-white/20 text-white/80 hover:bg-white/10 px-3.5 py-1.5 rounded-xl font-body text-xs font-semibold transition-all disabled:opacity-50"
                >
                  Cancel request
                </button>
              )}
              {SENDER_DELETABLE.includes(request.status) && (
                <DeleteButton
                  label="Delete"
                  title="Delete this request?"
                  description="This request will be permanently removed. Space reserved on a traveler's trip goes back to them. This can't be undone."
                  onConfirm={deleteRequest}
                />
              )}
            </div>
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
              <span className="font-body text-[10px] uppercase tracking-widest text-gold-light mt-2 font-medium">P2P Delivery Route</span>
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
            <h3 className="font-display text-xl font-medium text-foreground mb-6">Delivery progress</h3>
            <div className="flex items-center justify-between relative overflow-x-auto pb-4">
              {REQUEST_STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step.key} className="flex-1 text-center min-w-[70px]">
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
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status banners */}
        {request.status === "submitted" && (
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display text-lg font-semibold text-foreground">Your request is on the open board</h4>
              <p className="font-body text-xs text-muted-foreground mt-1">Travelers on your route can claim it. You can also pick a traveler yourself.</p>
            </div>
            <Link to="/sender/trips" className="bg-earth text-gold-light font-body font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl hover:opacity-90 whitespace-nowrap">
              Browse trips
            </Link>
          </div>
        )}

        {request.status === "matched" && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
            <h4 className="font-display text-lg font-semibold text-foreground">Waiting for {counterparty?.first_name ?? "the traveler"} to accept</h4>
            <p className="font-body text-xs text-muted-foreground mt-1">You'll be asked to pay into escrow as soon as they confirm.</p>
          </div>
        )}

        {request.status === "accepted_by_traveller" && payment?.status === "pending" && (
          <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6 mb-8">
            <h4 className="font-display text-lg font-semibold text-foreground">Payment reported. Waiting for EBAN to confirm it arrived.</h4>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Reference <span className="font-mono font-semibold text-foreground">{paymentReference(request.id)}</span> · {money(payment.amount)}. Once confirmed, the traveler can collect your item.
            </p>
          </div>
        )}

        {request.status === "accepted_by_traveller" && !payment && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display text-lg font-semibold text-foreground">
                {counterparty?.first_name ?? "The traveler"} accepted. Pay to lock it in.
              </h4>
              <p className="font-body text-xs text-muted-foreground mt-1">
                EBAN holds your payment and only releases it to the traveler after you confirm you received the item.
              </p>
            </div>
            <button
              onClick={() => setPayOpen(true)}
              className="bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl hover:opacity-90 shadow-sm whitespace-nowrap"
            >
              {`Pay ${money(total)}`}
            </button>
          </div>
        )}

        {["paid", "dropped_off", "handed_to_traveller", "in_transit"].includes(request.status) && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8">
            <h4 className="font-display text-lg font-semibold text-emerald-700">{money(payment?.amount ?? price)} is held by EBAN</h4>
            <p className="font-body text-xs text-muted-foreground mt-1">
              It stays safe until you confirm receipt. Agree the handover with the traveler in Messages below.
            </p>
          </div>
        )}

        {request.status === "delivered" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display text-lg font-semibold text-emerald-700">The traveler says it's delivered</h4>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Check the item. Confirming releases {money(price)} to the traveler. If something is wrong, report an issue instead.
              </p>
            </div>
            <button
              onClick={confirmReceipt}
              disabled={acting}
              className="bg-emerald-600 text-white font-body font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {acting ? "Confirming..." : "Confirm receipt & release payment"}
            </button>
          </div>
        )}

        {isDisputed && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 mb-8">
            <h4 className="font-display text-lg font-semibold text-destructive">Dispute open</h4>
            <p className="font-body text-xs text-muted-foreground mt-1">Payment stays in escrow while EBAN reviews what happened.</p>
          </div>
        )}

        {hasTraveler && counterparty && counterparty.counterparty_role === "traveller" && (
          <div className="bg-card rounded-2xl border border-border/80 p-5 mb-8 flex items-center justify-between gap-4 shadow-[var(--shadow-card)]">
            <div>
              <p className="font-body text-[10px] uppercase font-semibold text-muted-foreground">Your traveler</p>
              <p className="font-display text-lg font-semibold text-foreground">{counterparty.first_name}</p>
            </div>
            <div className="text-right font-body text-xs text-muted-foreground">
              <p className="flex items-center justify-end gap-1">
                <Star className="w-3.5 h-3.5 text-gold" /> {Number(counterparty.rating ?? 0).toFixed(1)} &middot; {counterparty.total_deliveries ?? 0} deliveries
              </p>
              <p className="flex items-center justify-end gap-1 mt-1">
                <ShieldCheck className={`w-3.5 h-3.5 ${counterparty.verified ? "text-emerald-600" : "text-amber-500"}`} />
                {counterparty.verified ? "ID verified" : "ID not verified"}
              </p>
            </div>
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

              <div>
                <label className="font-body text-xs font-semibold uppercase text-foreground mb-1 block">Price you offer the traveler (USD $)</label>
                <input type="number" step="0.5" min="0" className={fieldClasses} placeholder="Leave empty to accept the traveler's price per kg. Eban's service fee is added when you pay." value={form.offeredPrice} onChange={(e) => setForm({ ...form, offeredPrice: e.target.value })} />
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
              <h3 className="font-display text-2xl font-normal text-foreground mb-6">Item details</h3>

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
                  <span className="font-body text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Needed by</span>
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
                <span>EBAN is a marketplace: you and the traveler are responsible for the item and its handover. Your payment is protected by escrow, and only released when you confirm receipt.</span>
              </div>
              {price != null && (
                <p className="font-body text-xs text-muted-foreground mt-4">
                  Total: <strong className="text-foreground">{money(total)}</strong>, including Eban's service fee
                  {request.agreed_price == null && " (based on your offer; the traveler confirms when they claim it)"}
                </p>
              )}
            </div>
          )}
        </div>

        {hasTraveler && (
          <div className="mt-8 space-y-6">
            <RequestMessages requestId={request.id} otherName={counterparty?.first_name} />
            {request.status === "completed" && (
              <RateCounterparty
                requestId={request.id}
                existingRating={counterparty?.my_rating ?? null}
                who={counterparty?.first_name ?? "the traveler"}
                onDone={load}
              />
            )}
            {IN_FLIGHT.includes(request.status) && (
              <div className="text-center">
                <ReportIssueButton requestId={request.id} onDone={load} />
              </div>
            )}
          </div>
        )}
      </div>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Pay {money(total)}</DialogTitle>
            <DialogDescription>Send the money to EBAN, then tell us you've sent it. EBAN holds it until you confirm delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 font-body text-sm">
            <div className="rounded-xl border border-border p-4">
              <div className="flex justify-between font-semibold"><span>Total to send</span><span>{money(total)}</span></div>
              <p className="text-xs text-muted-foreground mt-1">
                Price includes Eban's service fee.
                {serviceFee > 0 && price != null && serviceFee > Math.round(Number(price) * feeSettings.percent) / 100 && ` Small parcels have a ${money(feeSettings.minimum)} minimum.`}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Use this reference</p>
              <p className="font-mono text-lg font-bold text-foreground">{request ? paymentReference(request.id) : ""}</p>
            </div>
            {PAYMENT_METHODS.filter((m) => m.details.length > 0).length === 0 ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive p-4 text-xs">
                EBAN's payment details haven't been added yet. Please message the EBAN team before sending anything.
              </p>
            ) : (
              PAYMENT_METHODS.filter((m) => m.details.length > 0).map((m) => (
                <div key={m.label} className="rounded-xl border border-border p-4">
                  <p className="font-semibold text-foreground">{m.label}</p>
                  {m.details.map((d) => (
                    <p key={d} className="text-muted-foreground">{d}</p>
                  ))}
                </div>
              ))
            )}
            <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
              <li>Send exactly {money(total)} and put the reference in the note.</li>
              <li>Tap the button below once you've sent it.</li>
              <li>EBAN confirms it arrived, usually within a few hours.</li>
            </ol>
            <button
              onClick={reportPayment}
              disabled={acting || PAYMENT_METHODS.every((m) => m.details.length === 0)}
              className="w-full bg-gradient-gold text-accent-foreground font-bold text-xs uppercase tracking-wider py-3 rounded-xl disabled:opacity-50"
            >
              {acting ? "Saving..." : "I've sent the payment"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SenderRequestDetail;

