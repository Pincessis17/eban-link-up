import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SenderNav } from "@/components/SenderNav";

interface DeliveryRequestRow {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  item_type: string;
  weight_kg: number;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  matched: "Matched with a traveler",
  accepted_by_traveller: "Matched with a traveler",
  paid: "Matched with a traveler",
  dropped_off: "Dropped off with EBAN",
  handed_to_traveller: "With traveler",
  in_transit: "In transit",
  delivered: "Delivered",
  completed: "Delivered",
  disputed: "Under review",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  matched: "bg-accent/20 text-accent-foreground",
  accepted_by_traveller: "bg-accent/20 text-accent-foreground",
  paid: "bg-accent/20 text-accent-foreground",
  dropped_off: "bg-accent/20 text-accent-foreground",
  handed_to_traveller: "bg-accent/20 text-accent-foreground",
  in_transit: "bg-accent/20 text-accent-foreground",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-destructive/10 text-destructive",
  cancelled: "bg-secondary text-secondary-foreground",
};

const SenderRequests = () => {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<DeliveryRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("delivery_requests")
        .select("id, origin_city, origin_country, destination_city, destination_country, item_type, weight_kg, status, created_at")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false });

      setRequests((data as DeliveryRequestRow[]) || []);
      setLoading(false);
    };

    load();
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-background">
      <SenderNav />
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">My requests</h1>

        {loading && <div className="text-center py-10 font-body text-muted-foreground">Loading...</div>}

        {!loading && requests.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-display font-semibold text-foreground mb-1">No requests yet</p>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Book a delivery and track its progress here.
            </p>
            <Link to="/sender/new-request" className="inline-block bg-gradient-gold text-accent-foreground font-display font-semibold px-6 py-3 rounded-lg text-sm hover:opacity-90 transition-opacity">
              Send a package
            </Link>
          </div>
        )}

        <div className="grid gap-3">
          {requests.map((r) => (
            <Link
              key={r.id}
              to={`/sender/requests/${r.id}`}
              className="block bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    {r.origin_city} &rarr; {r.destination_city}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {r.item_type} &middot; {r.weight_kg}kg &middot; {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-display font-semibold whitespace-nowrap ${STATUS_STYLE[r.status] ?? "bg-secondary text-secondary-foreground"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SenderRequests;
