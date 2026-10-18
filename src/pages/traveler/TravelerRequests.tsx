import { useEffect, useState } from "react";
import { EmptyIllustration } from "@/components/EmptyIllustration";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { TravelerNav } from "@/components/TravelerNav";

interface MatchRow {
  id: string;
  status: string;
  created_at: string;
  delivery_requests: {
    id: string;
    origin_city: string;
    origin_country: string;
    destination_city: string;
    destination_country: string;
    item_type: string;
    weight_kg: number;
    preferred_date: string | null;
    status: string;
  } | null;
}

const matchStatusLabel: Record<string, string> = {
  pending: "Needs your response",
  accepted: "Accepted",
  rejected: "Declined",
};

const requestStatusLabel: Record<string, string> = {
  accepted_by_traveller: "Waiting for sender to pay",
  paid: "Funded: collect the item",
  dropped_off: "Funded: collect the item",
  handed_to_traveller: "You have the item",
  in_transit: "In transit",
  delivered: "Awaiting sender confirmation",
  completed: "Completed and paid out",
  disputed: "Dispute open",
  cancelled: "Cancelled",
};

const TravelerRequests = () => {
  const { travellerProfile, loading: profileLoading } = useTravellerProfile();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!travellerProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("matches")
        .select(
          "id, status, created_at, delivery_requests(id, origin_city, origin_country, destination_city, destination_country, item_type, weight_kg, preferred_date, status)"
        )
        .eq("traveller_id", travellerProfile.id)
        .order("created_at", { ascending: false });

      setMatches((data as unknown as MatchRow[]) || []);
      setLoading(false);
    };

    load();
  }, [travellerProfile, profileLoading]);

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">My bookings</h1>

        {loading && <div className="text-center py-10 font-body text-muted-foreground">Loading...</div>}

        {!loading && matches.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <EmptyIllustration kind="package" />
            <p className="font-display font-semibold text-foreground mb-1">No requests yet</p>
            <p className="font-body text-sm text-muted-foreground">
              When a sender books one of your trips, or you claim a request, it shows up here. Browse open requests to find one.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {matches.map((m) => (
            <Link
              key={m.id}
              to={`/traveler/requests/${m.id}`}
              className="block bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    {m.delivery_requests?.origin_city} &rarr; {m.delivery_requests?.destination_city}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {m.delivery_requests?.item_type} &middot; {m.delivery_requests?.weight_kg}kg
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-display font-semibold ${
                    m.status === "pending" ? "bg-accent/20 text-accent-foreground" : m.status === "accepted" ? "bg-green-100 text-green-800" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m.status === "accepted" && m.delivery_requests
                    ? requestStatusLabel[m.delivery_requests.status] ?? matchStatusLabel.accepted
                    : matchStatusLabel[m.status] ?? m.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TravelerRequests;
