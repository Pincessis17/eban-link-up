import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ArrowRight, Plus, Sparkles, Filter, ChevronRight, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SenderNav } from "@/components/SenderNav";
import { DeleteButton } from "@/components/AdminDeleteButton";
import { SENDER_STATUS_LABEL as STATUS_LABEL, STATUS_BADGE, SENDER_DELETABLE, errMsg } from "@/lib/marketplace";

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

const SenderRequests = () => {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<DeliveryRequestRow[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");
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

  const deleteRequest = async (id: string): Promise<string | null> => {
    const { data, error } = await supabase.from("delivery_requests").delete().eq("id", id).select("id");
    if (error) return errMsg(error);
    if (!data || data.length === 0) return "Nothing was deleted. You may not have permission.";
    setRequests((prev) => prev.filter((r) => r.id !== id));
    return null;
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "active") return !["delivered", "completed", "cancelled"].includes(r.status);
    if (filter === "delivered") return ["delivered", "completed"].includes(r.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <SenderNav />

      <div className="container mx-auto px-6 py-10 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-light text-foreground">Package Requests</h1>
            <p className="font-body text-xs text-muted-foreground mt-1">Track your active requests and coordinate with your matched traveler.</p>
          </div>

          <Link
            to="/sender/new-request"
            className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:opacity-90 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> New Package Request
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border/80 pb-3">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-body font-semibold uppercase tracking-wider transition-all ${
              filter === "all" ? "bg-earth text-gold-light shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Requests ({requests.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-xl text-xs font-body font-semibold uppercase tracking-wider transition-all ${
              filter === "active" ? "bg-earth text-gold-light shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({requests.filter((r) => !["delivered", "completed", "cancelled"].includes(r.status)).length})
          </button>
          <button
            onClick={() => setFilter("delivered")}
            className={`px-4 py-2 rounded-xl text-xs font-body font-semibold uppercase tracking-wider transition-all ${
              filter === "delivered" ? "bg-earth text-gold-light shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Delivered ({requests.filter((r) => ["delivered", "completed"].includes(r.status)).length})
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 font-body text-muted-foreground">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your package requests...
          </div>
        )}

        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-border/80 p-10 shadow-[var(--shadow-card)] max-w-lg mx-auto">
            <Package className="w-12 h-12 text-gold-dark/60 mx-auto mb-4" />
            <h3 className="font-display text-2xl font-semibold text-foreground mb-2">No package requests found</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Browse trips to book a traveler, or post a request and let travelers claim it.
            </p>
            <Link
              to="/sender/trips"
              className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              Browse Trips <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="grid gap-4">
          {filteredRequests.map((r) => (
            <div
              key={r.id}
              className="group bg-card rounded-2xl border border-border/80 hover:border-gold/50 shadow-[var(--shadow-card)] hover:shadow-gold-glow transition-all duration-300 flex items-center gap-3 pr-4"
            >
            <Link
              to={`/sender/requests/${r.id}`}
              className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-foreground font-display text-xl font-bold">
                  <span>{r.origin_city}</span>
                  <ArrowRight className="w-4 h-4 text-gold-dark group-hover:translate-x-1 transition-transform" />
                  <span>{r.destination_city}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-body text-xs text-muted-foreground">
                  <span className="bg-secondary px-2.5 py-1 rounded-md text-foreground font-medium">{r.item_type}</span>
                  <span>Weight: <strong>{r.weight_kg} kg</strong></span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-body font-semibold uppercase tracking-wider border ${STATUS_BADGE[r.status] ?? "bg-secondary text-foreground border-border"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-gold-dark transition-colors" />
              </div>
            </Link>
            {SENDER_DELETABLE.includes(r.status) && (
              <DeleteButton
                title="Delete this request?"
                description={`${r.origin_city} to ${r.destination_city} (${r.item_type}, ${r.weight_kg} kg) will be permanently removed. Space reserved on a traveler's trip goes back to them. This can't be undone.`}
                onConfirm={() => deleteRequest(r.id)}
              />
            )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SenderRequests;

