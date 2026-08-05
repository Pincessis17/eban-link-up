import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { PackageCheck, Send, CheckCircle2 } from "lucide-react";

interface IntakeRequest {
  id: string;
  origin_city: string;
  destination_city: string;
  item_type: string;
  status: string;
  handoff_preferences: { type: string; scheduled_time: string | null; location: string | null } | null;
  traveller_profiles: { name: string | null } | null;
}

const AdminIntake = () => {
  const [requests, setRequests] = useState<IntakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("delivery_requests")
      .select(
        "id, origin_city, destination_city, item_type, status, handoff_preferences(type, scheduled_time, location), traveller_profiles:matched_traveller_id(name)"
      )
      .in("status", ["accepted_by_traveller", "paid", "dropped_off", "in_transit"])
      .order("created_at", { ascending: true });
    setRequests((data as unknown as IntakeRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markDroppedOff = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("delivery_requests")
      .update({ status: "dropped_off", dropped_off_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast({ title: "Error", description: "Couldn't update. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  const markHandedToTraveller = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("delivery_requests")
      .update({ status: "handed_to_traveller", handed_to_traveller_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast({ title: "Error", description: "Couldn't update. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  const markReceivedFromTraveller = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("delivery_requests")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast({ title: "Error", description: "Couldn't update. Try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Marked as received", description: "The sender will see it's ready for pickup." });
    load();
  };

  const awaitingDropOff = requests.filter((r) => ["accepted_by_traveller", "paid"].includes(r.status));
  const readyForPickup = requests.filter((r) => r.status === "dropped_off");
  const awaitingDestinationHandoff = requests.filter((r) => r.status === "in_transit");

  const handoffLabel = (r: IntakeRequest) => {
    if (!r.handoff_preferences) return "No handoff preference yet";
    if (r.handoff_preferences.type === "airport") return "Airport handoff (standard)";
    const time = r.handoff_preferences.scheduled_time ? new Date(r.handoff_preferences.scheduled_time).toLocaleString() : "";
    return `${r.handoff_preferences.location ?? "Custom"} · ${time}`;
  };

  return (
    <div className={`min-h-screen bg-background ${ADMIN_SIDEBAR_OFFSET_CLASS}`}>
      <AdminNav />
      <div className="container mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold text-foreground mb-8">Intake / handoff</h1>

        {loading && <div className="font-body text-sm text-muted-foreground">Loading...</div>}

        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <p className="font-display text-sm font-semibold text-foreground mb-3">Awaiting drop-off from sender</p>
            {!loading && awaitingDropOff.length === 0 && (
              <div className="text-center py-10 bg-card rounded-xl border border-border font-body text-sm text-muted-foreground">
                Nothing waiting on a sender drop-off.
              </div>
            )}
            <div className="grid gap-2">
              {awaitingDropOff.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
                  <p className="font-display text-sm font-bold text-foreground">
                    {r.origin_city} &rarr; {r.destination_city}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">{r.item_type}</p>
                  <p className="font-body text-xs text-muted-foreground">Traveler: {r.traveller_profiles?.name ?? "-"}</p>
                  <button
                    onClick={() => markDroppedOff(r.id)}
                    disabled={busy === r.id}
                    className="mt-3 w-full flex items-center justify-center gap-2 border border-border text-foreground font-display font-semibold py-2 rounded-lg text-xs hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <PackageCheck className="w-4 h-4" /> Mark package dropped off
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-display text-sm font-semibold text-foreground mb-3">Ready for traveler handoff</p>
            {!loading && readyForPickup.length === 0 && (
              <div className="text-center py-10 bg-card rounded-xl border border-border font-body text-sm text-muted-foreground">
                Nothing ready for handoff yet.
              </div>
            )}
            <div className="grid gap-2">
              {readyForPickup.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
                  <p className="font-display text-sm font-bold text-foreground">
                    {r.origin_city} &rarr; {r.destination_city}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Traveler: {r.traveller_profiles?.name ?? "-"}</p>
                  <p className="font-body text-xs text-muted-foreground">{handoffLabel(r)}</p>
                  <button
                    onClick={() => markHandedToTraveller(r.id)}
                    disabled={busy === r.id}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-display font-semibold py-2 rounded-lg text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Mark handed to traveler
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-display text-sm font-semibold text-foreground mb-3">Awaiting handoff at destination</p>
            {!loading && awaitingDestinationHandoff.length === 0 && (
              <div className="text-center py-10 bg-card rounded-xl border border-border font-body text-sm text-muted-foreground">
                Nothing in transit right now.
              </div>
            )}
            <div className="grid gap-2">
              {awaitingDestinationHandoff.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
                  <p className="font-display text-sm font-bold text-foreground">
                    {r.origin_city} &rarr; {r.destination_city}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">{r.item_type}</p>
                  <p className="font-body text-xs text-muted-foreground">Traveler: {r.traveller_profiles?.name ?? "-"}</p>
                  <button
                    onClick={() => markReceivedFromTraveller(r.id)}
                    disabled={busy === r.id}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-display font-semibold py-2 rounded-lg text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark received from traveler
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIntake;
