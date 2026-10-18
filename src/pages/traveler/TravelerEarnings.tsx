import { useEffect, useState, useCallback } from "react";
import { Wallet, DollarSign, Clock, ArrowUpRight, CheckCircle2, Landmark, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { TravelerNav } from "@/components/TravelerNav";

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  delivery_requests: { origin_city: string; destination_city: string } | null;
}

const HELD_STATUSES = ["paid", "dropped_off", "handed_to_traveller", "in_transit", "delivered"];

interface HeldRequest {
  id: string;
  agreed_price: number | null;
  status: string;
}

const inputCls =
  "w-full bg-background border border-border rounded-xl px-4 py-3 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const statusColors: Record<string, string> = {
  pending: "bg-gold/15 text-gold-dark border-gold/30",
  processing: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

const TravelerEarnings = () => {
  const { travellerProfile, loading: profileLoading } = useTravellerProfile();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [held, setHeld] = useState<HeldRequest[]>([]);
  const [details, setDetails] = useState({ method: "bank", name: "", number: "", provider: "" });
  const [hasDetails, setHasDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!travellerProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("payouts")
      .select("id, amount, status, created_at, delivery_requests(origin_city, destination_city)")
      .eq("traveller_id", travellerProfile.id)
      .order("created_at", { ascending: false });
    setPayouts((data as unknown as Payout[]) || []);

    // Money already paid in by senders and held by Eban, for deliveries not yet confirmed.
    const { data: heldRows } = await supabase
      .from("delivery_requests")
      .select("id, agreed_price, status")
      .eq("matched_traveller_id", travellerProfile.id)
      .in("status", HELD_STATUSES);
    setHeld((heldRows as unknown as HeldRequest[]) || []);

    const tp = travellerProfile;
    const saved = Boolean(tp.payout_method && tp.payout_account_number);
    setHasDetails(saved);
    setDetails({
      method: tp.payout_method ?? "bank",
      name: tp.payout_account_name ?? tp.name ?? "",
      number: tp.payout_account_number ?? "",
      provider: tp.payout_provider ?? "",
    });
    setLoading(false);
  }, [travellerProfile, profileLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPaid = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);
  const awaitingTransfer = payouts.filter((p) => p.status === "pending" || p.status === "processing").reduce((sum, p) => sum + Number(p.amount), 0);
  const inEscrow = held.reduce((sum, r) => sum + Number(r.agreed_price ?? 0), 0);

  const saveDetails = async () => {
    if (!travellerProfile) return;
    if (!details.name.trim() || !details.number.trim()) {
      toast({ title: "Missing details", description: "Add the account name and the account or mobile number.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("traveller_profiles")
      .update({
        payout_method: details.method,
        payout_account_name: details.name.trim(),
        payout_account_number: details.number.trim(),
        payout_provider: details.provider.trim() || null,
      })
      .eq("id", travellerProfile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: "Your payout details weren't saved. Try again.", variant: "destructive" });
      return;
    }
    setHasDetails(true);
    setEditing(false);
    toast({ title: "Payout details saved", description: "Eban will send your earnings here." });
  };

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />

      <div className="container mx-auto px-6 py-10 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-md">
            <Wallet className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-light text-foreground">Traveler Earnings &amp; Payouts</h1>
            <p className="font-body text-xs text-muted-foreground mt-0.5">Track your baggage space compensation and withdrawal history.</p>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-charcoal text-white rounded-3xl p-6 border border-gold/20 shadow-xl relative overflow-hidden">
            <span className="font-body text-[10px] uppercase tracking-widest text-gold-light">Total Disbursed Payouts</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-display text-4xl font-bold text-white">${totalPaid}</span>
              <span className="font-body text-xs text-gray-400">USD</span>
            </div>
            <p className="font-body text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Transfer completed directly to bank
            </p>
          </div>

          <div className="bg-card rounded-3xl p-6 border border-border/80 shadow-[var(--shadow-card)]">
            <span className="font-body text-[10px] uppercase tracking-widest text-muted-foreground">In escrow</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-display text-4xl font-bold text-gold-dark">${inEscrow}</span>
              <span className="font-body text-xs text-muted-foreground">USD</span>
            </div>
            <p className="font-body text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gold-dark" /> Held by Eban until the sender confirms receipt
            </p>
            {awaitingTransfer > 0 && (
              <p className="font-body text-xs text-foreground mt-2">${awaitingTransfer} confirmed and waiting for Eban to transfer</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border/80 shadow-[var(--shadow-card)] mb-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Landmark className="w-5 h-5 text-forest" />
              <h3 className="font-display text-xl text-foreground">Where we send your earnings</h3>
            </div>
            {hasDetails && !editing && (
              <button onClick={() => setEditing(true)} className="font-body text-sm font-semibold text-forest hover:underline">
                Edit
              </button>
            )}
          </div>

          {!hasDetails && !editing && (
            <div className="mt-4 flex items-start gap-3 bg-gold/10 border border-gold/30 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 text-gold-dark mt-0.5 shrink-0" />
              <p className="font-body text-sm text-foreground">
                Add your bank or mobile money details so Eban can pay you after a delivery is confirmed.
              </p>
            </div>
          )}

          {hasDetails && !editing && (
            <dl className="mt-4 grid sm:grid-cols-2 gap-4 font-body text-sm">
              <div><dt className="text-muted-foreground">Method</dt><dd className="text-foreground font-semibold">{details.method === "bank" ? "Bank transfer" : "Mobile money"}</dd></div>
              <div><dt className="text-muted-foreground">Account name</dt><dd className="text-foreground font-semibold">{details.name}</dd></div>
              <div><dt className="text-muted-foreground">{details.method === "bank" ? "Account number" : "Mobile number"}</dt><dd className="text-foreground font-semibold">{details.number}</dd></div>
              {details.provider && <div><dt className="text-muted-foreground">{details.method === "bank" ? "Bank" : "Provider"}</dt><dd className="text-foreground font-semibold">{details.provider}</dd></div>}
            </dl>
          )}

          {(editing || !hasDetails) && (
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="font-body text-sm font-semibold text-foreground mb-2 block">How should we pay you?</label>
                <div className="flex gap-2">
                  {[{ id: "bank", label: "Bank transfer" }, { id: "mobile_money", label: "Mobile money" }].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDetails({ ...details, method: m.id })}
                      className={`px-4 py-2.5 rounded-xl border font-body text-sm transition-colors ${details.method === m.id ? "bg-forest text-white border-forest font-semibold" : "bg-card text-muted-foreground border-border hover:border-gold/50"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-body text-sm font-semibold text-foreground mb-2 block">Account name</label>
                <input className={inputCls} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} placeholder="Name on the account" />
              </div>
              <div>
                <label className="font-body text-sm font-semibold text-foreground mb-2 block">{details.method === "bank" ? "Account number" : "Mobile number"}</label>
                <input className={inputCls} value={details.number} onChange={(e) => setDetails({ ...details, number: e.target.value })} placeholder={details.method === "bank" ? "Account number or IBAN" : "e.g. +233 24 000 0000"} />
              </div>
              <div className="sm:col-span-2">
                <label className="font-body text-sm font-semibold text-foreground mb-2 block">{details.method === "bank" ? "Bank name" : "Provider (MTN, Vodafone, Orange...)"}</label>
                <input className={inputCls} value={details.provider} onChange={(e) => setDetails({ ...details, provider: e.target.value })} />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button onClick={saveDetails} disabled={saving} className="bg-gradient-gold text-accent-foreground font-body text-sm font-bold px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving..." : "Save payout details"}
                </button>
                {hasDetails && (
                  <button onClick={() => setEditing(false)} className="font-body text-sm text-muted-foreground px-4">Cancel</button>
                )}
              </div>
              <p className="sm:col-span-2 font-body text-xs text-muted-foreground">Only you and the Eban team can see these details.</p>
            </div>
          )}
        </div>

        <h3 className="font-display text-2xl font-light text-foreground mb-4">Payout Transaction History</h3>

        {loading && (
          <div className="text-center py-16 font-body text-muted-foreground">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading payout history...
          </div>
        )}

        {!loading && payouts.length === 0 && (
          <div className="text-center py-16 bg-card rounded-3xl border border-border/80 p-8 font-body text-sm text-muted-foreground max-w-md mx-auto">
            No payouts processed yet. Completed package handoffs will automatically trigger payouts here.
          </div>
        )}

        <div className="grid gap-3">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-5 rounded-2xl border border-border/80 bg-card shadow-sm hover:border-gold/30 transition-colors">
              <div>
                <p className="font-body text-sm font-semibold text-foreground">
                  {p.delivery_requests?.origin_city ?? "Route"} &rarr; {p.delivery_requests?.destination_city ?? "Destination"}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-lg font-bold text-foreground">${p.amount} USD</span>
                <span className={`px-3 py-1 rounded-full text-xs font-body font-semibold uppercase tracking-wider border ${statusColors[p.status] ?? statusColors.pending}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TravelerEarnings;

