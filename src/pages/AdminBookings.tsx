import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, RefreshCw, ArrowRight, User, Mail, Phone, Calendar, Weight, DollarSign } from "lucide-react";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";

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
  created_at: string;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
}

const statusColors: Record<string, string> = {
  submitted: "bg-gold/15 text-gold-dark border-gold/30",
  matched: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  accepted_by_traveller: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  paid: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  dropped_off: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  handed_to_traveller: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30",
  in_transit: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const AdminBookings = () => {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("delivery_requests")
      .select("*, profiles:sender_id(full_name, email, phone)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRequests((data as unknown as DeliveryRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const deleteRequest = async (id: string): Promise<string | null> => {
    const { data, error: deleteError } = await supabase.from("delivery_requests").delete().eq("id", id).select("id");
    if (deleteError) return deleteError.message;
    if (!data || data.length === 0) return "Nothing was deleted. You may not have permission.";
    setRequests((prev) => prev.filter((r) => r.id !== id));
    return null;
  };

  return (
    <div className={`min-h-screen bg-background ${ADMIN_SIDEBAR_OFFSET_CLASS}`}>
      <AdminNav />

      <div className="container mx-auto px-6 py-10 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-md">
              <Package className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-light text-foreground">Delivery Requests Console</h1>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                Total Requests Logged: <strong>{requests.length}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 border border-border bg-card hover:bg-secondary text-foreground px-4 py-2.5 rounded-xl font-body text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <RefreshCw className="w-4 h-4 text-gold-dark" /> Refresh Live Stream
          </button>
        </div>

        {error && (
          <div className="bg-destructive/15 border border-destructive/30 text-destructive rounded-2xl p-6 text-center font-body text-sm mb-6">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="text-center py-20 font-body text-muted-foreground">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading request dispatch records...
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-border/80 p-10 max-w-lg mx-auto shadow-[var(--shadow-card)]">
            <Package className="w-12 h-12 text-gold-dark/60 mx-auto mb-4" />
            <h3 className="font-display text-2xl font-semibold text-foreground mb-2">No delivery requests found</h3>
            <p className="font-body text-sm text-muted-foreground">New package submissions will stream here in real-time.</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="grid gap-5">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-card rounded-3xl border border-border/80 p-6 hover:border-gold/50 shadow-[var(--shadow-card)] transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gold-dark" />
                        <h3 className="font-display text-xl font-bold text-foreground">{req.profiles?.full_name ?? "Anonymous Sender"}</h3>
                      </div>
                      <span className={`px-3.5 py-1 rounded-full text-xs font-body font-semibold uppercase tracking-wider border ${statusColors[req.status] || statusColors.submitted}`}>
                        {req.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-body text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {req.profiles?.email ?? "N/A"}</span>
                      {req.profiles?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {req.profiles?.phone}</span>}
                    </div>

                    <div className="bg-secondary/40 rounded-xl p-4 border border-border/60 grid sm:grid-cols-3 gap-3 font-body text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Route</span>
                        <span className="font-semibold text-foreground">{req.origin_city} &rarr; {req.destination_city}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Cargo</span>
                        <span className="font-semibold text-foreground">{req.item_type} ({req.weight_kg} kg)</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Declared Value</span>
                        <span className="font-semibold text-foreground">${req.item_value} USD</span>
                      </div>
                    </div>

                    {req.item_description && (
                      <p className="font-body text-xs text-muted-foreground bg-card p-3 rounded-lg border border-border/50">
                        {req.item_description}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-xs font-body text-muted-foreground border-t lg:border-t-0 pt-3 lg:pt-0 border-border">
                    <p className="font-mono text-[11px] font-bold text-foreground mb-1">REQ #{req.id.slice(0, 8)}</p>
                    <p>{new Date(req.created_at).toLocaleString()}</p>
                    <div className="flex justify-end mt-3">
                      <AdminDeleteButton
                        label="Delete"
                        title="Delete this delivery request?"
                        description={`REQ #${req.id.slice(0, 8)} from ${req.profiles?.full_name ?? "this sender"} (${req.origin_city} → ${req.destination_city}) will be permanently removed, along with its matches, payments, payouts, ratings and disputes. This can't be undone.`}
                        onConfirm={() => deleteRequest(req.id)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;

