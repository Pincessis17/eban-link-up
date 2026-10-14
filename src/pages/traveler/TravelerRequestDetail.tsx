import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { TravelerNav } from "@/components/TravelerNav";
import { SignaturePad } from "@/components/SignaturePad";
import { RequestMessages } from "@/components/RequestMessages";
import { RateCounterparty } from "@/components/RateCounterparty";
import { ReportIssueButton } from "@/components/ReportIssueButton";
import { IN_FLIGHT, errMsg, money } from "@/lib/marketplace";

interface DeliveryRequest {
  id: string;
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  item_type: string;
  weight_kg: number;
  item_value: number;
  preferred_date: string | null;
  status: string;
  special_handling_flags: string[];
  agreed_price: number | null;
  offered_price: number | null;
}

interface Counterparty {
  first_name: string;
  my_rating: number | null;
}

interface MatchDetail {
  id: string;
  status: string;
  delivery_requests: DeliveryRequest | null;
}

interface HandoffPreference {
  id: string;
  type: string;
  scheduled_time: string | null;
  location: string | null;
}

const STATUS_STEPS = ["accepted_by_traveller", "paid", "handed_to_traveller", "in_transit", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  accepted_by_traveller: "Accepted",
  paid: "Funded",
  handed_to_traveller: "Received",
  in_transit: "In transit",
  delivered: "Delivered",
};
const stepKey = (status: string) => {
  if (status === "dropped_off") return "paid";
  if (status === "completed") return "delivered";
  return status;
};

const inputClasses =
  "w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

const TravelerRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [handoff, setHandoff] = useState<HandoffPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [handoffType, setHandoffType] = useState<"airport" | "custom">("airport");
  const [customTime, setCustomTime] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [showSignature, setShowSignature] = useState(false);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: matchData } = await supabase
      .from("matches")
      .select("id, status, delivery_requests(*)")
      .eq("id", id)
      .maybeSingle();
    setMatch(matchData as unknown as MatchDetail);

    if (matchData?.delivery_requests) {
      const { data: handoffData } = await supabase
        .from("handoff_preferences")
        .select("*")
        .eq("request_id", (matchData.delivery_requests as unknown as DeliveryRequest).id)
        .maybeSingle();
      setHandoff(handoffData);
      const { data: cp } = await supabase.rpc("get_request_counterparty", {
        p_request_id: (matchData.delivery_requests as unknown as DeliveryRequest).id,
      });
      setCounterparty(cp?.[0] ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const request = match?.delivery_requests;

  const handleAccept = async () => {
    if (!match || !request) return;
    setBusy(true);
    const { error: matchError } = await supabase.from("matches").update({ status: "accepted" }).eq("id", match.id);
    const { error: reqError } = await supabase.from("delivery_requests").update({ status: "accepted_by_traveller" }).eq("id", request.id);
    setBusy(false);
    if (matchError || reqError) {
      toast({ title: "Error", description: "Couldn't accept the request. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  const handleDecline = async () => {
    if (!match) return;
    setBusy(true);
    const { error } = await supabase.rpc("decline_match", { p_match_id: match.id });
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: errMsg(error, "Couldn't decline the request. Try again."), variant: "destructive" });
      return;
    }
    navigate("/traveler/requests");
  };

  const handleHandoffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setBusy(true);
    const { error } = await supabase.from("handoff_preferences").insert({
      request_id: request.id,
      type: handoffType,
      scheduled_time: handoffType === "custom" && customTime ? customTime : null,
      location: handoffType === "custom" ? customLocation : "Airport",
    });
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: "Couldn't save your handoff choice. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  const advanceStatus = async (nextStatus: string, extra: Record<string, unknown> = {}) => {
    if (!request) return;
    setBusy(true);
    const { error } = await supabase.from("delivery_requests").update({ status: nextStatus, ...extra }).eq("id", request.id);
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: "Couldn't update the status. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  const handleSignatureCapture = async (blob: Blob) => {
    if (!request || !user) return;
    setBusy(true);
    const path = `${user.id}/${request.id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from("handoff-signatures").upload(path, blob, {
      contentType: "image/png",
    });
    if (uploadError) {
      setBusy(false);
      toast({ title: "Error", description: "Couldn't save your signature. Try again.", variant: "destructive" });
      return;
    }
    setBusy(false);
    setShowSignature(false);
    await advanceStatus("handed_to_traveller", {
      handed_to_traveller_at: new Date().toISOString(),
      handoff_signature_url: path,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TravelerNav />
        <div className="text-center py-16 font-body text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!match || !request) {
    return (
      <div className="min-h-screen bg-background">
        <TravelerNav />
        <div className="text-center py-16 font-body text-muted-foreground">Request not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />
      <div className="container mx-auto px-6 py-10 max-w-xl">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-[var(--shadow-card)]">
          <p className="font-body text-xs text-muted-foreground mb-1">Request</p>
          <h1 className="font-display text-xl font-bold text-foreground mb-4">
            {request.origin_city}, {request.origin_country} &rarr; {request.destination_city}, {request.destination_country}
          </h1>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-secondary rounded-lg p-3">
              <p className="font-body text-xs text-muted-foreground">Item</p>
              <p className="font-display text-sm font-semibold text-foreground capitalize">{request.item_type}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="font-body text-xs text-muted-foreground">Weight</p>
              <p className="font-display text-sm font-semibold text-foreground">{request.weight_kg}kg</p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="font-body text-xs text-muted-foreground">Declared value</p>
              <p className="font-display text-sm font-semibold text-foreground">${request.item_value}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 col-span-2">
              <p className="font-body text-xs text-muted-foreground">You earn</p>
              <p className="font-display text-sm font-semibold text-foreground">{money(request.agreed_price ?? request.offered_price)}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 col-span-2">
              <p className="font-body text-xs text-muted-foreground">Needed by</p>
              <p className="font-display text-sm font-semibold text-foreground">
                {request.preferred_date ? new Date(request.preferred_date).toLocaleDateString() : "Flexible"}
              </p>
            </div>
          </div>

          <div className="bg-accent/10 text-accent-foreground rounded-lg p-3 mb-6 font-body text-xs">
            EBAN is a marketplace: you and the sender are responsible for the item and its handover. Check what you are carrying before you take it. Use Messages to agree the handover.
          </div>

          {match.status === "pending" && (
            <div className="flex gap-3">
              <button onClick={handleAccept} disabled={busy} className="flex-1 bg-gradient-gold text-accent-foreground font-display font-bold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                Accept
              </button>
              <button onClick={handleDecline} disabled={busy} className="flex-1 border border-border text-foreground font-display font-bold py-3 rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-50">
                Decline
              </button>
            </div>
          )}

          {match.status === "rejected" && (
            <p className="font-body text-sm text-muted-foreground text-center py-4">You declined this request.</p>
          )}

          {match.status === "accepted" && !handoff && (
            <form onSubmit={handleHandoffSubmit} className="space-y-4">
              <p className="font-display text-sm font-semibold text-foreground">When would you like to receive the package?</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setHandoffType("airport")}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    handoffType === "airport" ? "border-gold bg-accent/10" : "border-border"
                  }`}
                >
                  <p className="font-display text-sm font-semibold text-foreground">Airport handoff (standard)</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Sender brings the package to the airport before your flight.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffType("custom")}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    handoffType === "custom" ? "border-gold bg-accent/10" : "border-border"
                  }`}
                >
                  <p className="font-display text-sm font-semibold text-foreground">Custom location</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Agree on a convenient time and place with the sender.</p>
                </button>
              </div>
              {handoffType === "custom" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-display text-xs font-semibold text-foreground mb-1 block">Time</label>
                    <input type="datetime-local" required className={inputClasses} value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="font-display text-xs font-semibold text-foreground mb-1 block">Location</label>
                    <input type="text" required className={inputClasses} placeholder="e.g. Arrival hall, Terminal 2" value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} />
                  </div>
                </div>
              )}
              <button type="submit" disabled={busy} className="w-full bg-gradient-gold text-accent-foreground font-display font-bold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                Confirm handoff
              </button>
            </form>
          )}

          {match.status === "accepted" && handoff && (
            <div>
              <div className="flex items-center justify-between mb-6">
                {STATUS_STEPS.map((step) => {
                  const currentIdx = STATUS_STEPS.indexOf(stepKey(request.status));
                  const stepIdx = STATUS_STEPS.indexOf(step);
                  const done = stepIdx <= currentIdx;
                  return (
                    <div key={step} className="flex-1 text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${done ? "bg-gold" : "border border-border"}`} />
                      <p className={`font-body text-[11px] ${done ? "text-foreground" : "text-muted-foreground"}`}>{STATUS_LABELS[step]}</p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-secondary rounded-lg p-3 mb-6 font-body text-sm text-foreground">
                {handoff.type === "airport" ? "Airport handoff (standard)" : `${handoff.location} · ${handoff.scheduled_time ? new Date(handoff.scheduled_time).toLocaleString() : ""}`}
              </div>

              {request.status === "accepted_by_traveller" && (
                <p className="font-body text-sm text-muted-foreground text-center py-4">
                  Waiting for the sender to pay into escrow. Don't take the item until the payment shows as funded.
                </p>
              )}
              {["paid", "dropped_off"].includes(request.status) && !showSignature && (
                <button onClick={() => setShowSignature(true)} disabled={busy} className="w-full border border-border text-foreground font-display font-bold py-3 rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-50">
                  I've received the item (sign to confirm)
                </button>
              )}
              {["paid", "dropped_off"].includes(request.status) && showSignature && (
                <SignaturePad onCapture={handleSignatureCapture} onCancel={() => setShowSignature(false)} />
              )}
              {request.status === "handed_to_traveller" && (
                <button onClick={() => advanceStatus("in_transit")} disabled={busy} className="w-full border border-border text-foreground font-display font-bold py-3 rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-50">
                  Mark in transit
                </button>
              )}
              {request.status === "in_transit" && (
                <div className="space-y-3">
                  <p className="font-body text-sm text-muted-foreground text-center">
                    Once you land, hand the item to the sender's recipient at the place you agreed in Messages, then mark it delivered.
                  </p>
                  <button
                    onClick={() => advanceStatus("delivered", { delivered_at: new Date().toISOString() })}
                    disabled={busy}
                    className="w-full bg-gradient-gold text-accent-foreground font-display font-bold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Mark as delivered
                  </button>
                </div>
              )}
              {request.status === "delivered" && (
                <p className="font-body text-sm text-muted-foreground text-center py-4">
                  Delivered. Waiting for the sender to confirm receipt, then {money(request.agreed_price ?? request.offered_price)} is released to you.
                </p>
              )}
              {request.status === "completed" && (
                <p className="font-body text-sm text-green-700 text-center py-4">
                  Confirmed by the sender. {money(request.agreed_price ?? request.offered_price)} is on its way to you. Thank you for carrying!
                </p>
              )}
              {request.status === "disputed" && (
                <p className="font-body text-sm text-destructive text-center py-4">A dispute is open. The payment stays in escrow while EBAN reviews it.</p>
              )}
            </div>
          )}
        </div>

        {match.status === "accepted" && (
          <div className="mt-6 space-y-6">
            <RequestMessages requestId={request.id} otherName={counterparty?.first_name} />
            {request.status === "completed" && (
              <RateCounterparty
                requestId={request.id}
                existingRating={counterparty?.my_rating ?? null}
                who={counterparty?.first_name ?? "the sender"}
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
    </div>
  );
};

export default TravelerRequestDetail;
