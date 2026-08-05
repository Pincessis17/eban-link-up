import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, RefreshCw } from "lucide-react";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";

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

  const statusColors: Record<string, string> = {
    submitted: "bg-accent/20 text-accent-foreground",
    matched: "bg-blue-100 text-blue-800",
    accepted_by_traveller: "bg-blue-100 text-blue-800",
    paid: "bg-purple-100 text-purple-800",
    dropped_off: "bg-amber-100 text-amber-800",
    handed_to_traveller: "bg-amber-100 text-amber-800",
    in_transit: "bg-amber-100 text-amber-800",
    delivered: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
  };

  return (
    <div className={`min-h-screen bg-background ${ADMIN_SIDEBAR_OFFSET_CLASS}`}>
      <AdminNav />

      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
              <Package className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Delivery Requests</h1>
              <p className="font-body text-sm text-muted-foreground">{requests.length} request{requests.length !== 1 ? "s" : ""} total</p>
            </div>
          </div>
          <button onClick={fetchRequests} className="flex items-center gap-2 text-sm font-display font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-6 text-center font-body">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="text-center py-16 font-body text-muted-foreground">Loading requests...</div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-lg font-semibold text-foreground mb-1">No requests yet</p>
            <p className="font-body text-muted-foreground">Requests will appear here when a sender submits one.</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="grid gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-lg font-bold text-foreground">{req.profiles?.full_name ?? "Unknown sender"}</h3>
                      <span className={`px-3 py-0.5 rounded-full text-xs font-display font-semibold capitalize ${statusColors[req.status] || statusColors.submitted}`}>
                        {req.status.replace(/_/g, " ")}
                      </span>
                      <span className="px-3 py-0.5 rounded-full text-xs font-display font-semibold bg-secondary text-secondary-foreground capitalize">
                        {req.item_type}
                      </span>
                    </div>
                    <p className="font-body text-sm text-muted-foreground">{req.profiles?.email} · {req.profiles?.phone}</p>
                    <p className="font-body text-sm text-foreground">
                      <span className="font-semibold">Route:</span> {req.origin_city}, {req.origin_country} → {req.destination_city}, {req.destination_country}
                    </p>
                    <p className="font-body text-sm text-foreground">
                      <span className="font-semibold">Weight/Value:</span> {req.weight_kg}kg · ${req.item_value}
                    </p>
                    {req.preferred_date && (
                      <p className="font-body text-sm text-foreground">
                        <span className="font-semibold">Date:</span> {new Date(req.preferred_date).toLocaleDateString()}
                      </p>
                    )}
                    <p className="font-body text-sm text-muted-foreground">{req.item_description}</p>
                  </div>
                  <p className="font-body text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(req.created_at).toLocaleString()}
                  </p>
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
