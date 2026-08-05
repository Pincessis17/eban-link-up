import { useEffect, useState, useCallback } from "react";
import { AdminNav } from "@/components/AdminNav";
import { supabase } from "@/integrations/supabase/client";

interface TravelerRow {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  verification_status: string;
  rating: number | null;
  total_deliveries: number | null;
  school_affiliation: string | null;
  created_at: string;
  profiles: { email: string | null } | null;
  trips: { id: string; status: string }[] | null;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  pending: "bg-secondary text-secondary-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

const AdminTravelers = () => {
  const [rows, setRows] = useState<TravelerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("traveller_profiles")
      .select(
        "id, user_id, name, phone, verification_status, rating, total_deliveries, school_affiliation, created_at, profiles:user_id(email), trips(id, status)"
      )
      .order("created_at", { ascending: false });
    setRows((data as unknown as TravelerRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = rows.filter((r) => filter === "all" || (r.verification_status ?? "pending") === filter);

  const counts = {
    all: rows.length,
    approved: rows.filter((r) => r.verification_status === "approved").length,
    pending: rows.filter((r) => (r.verification_status ?? "pending") === "pending").length,
    rejected: rows.filter((r) => r.verification_status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Travelers</h1>
          <div className="flex gap-2">
            {(["all", "approved", "pending", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-display text-xs font-semibold capitalize border transition-colors ${
                  filter === f
                    ? "bg-gradient-gold text-accent-foreground border-transparent"
                    : "bg-background border-border text-muted-foreground hover:border-gold/50"
                }`}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="font-body text-sm text-muted-foreground">Loading...</div>}
        {!loading && visible.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border font-body text-sm text-muted-foreground">
            No {filter !== "all" ? filter : ""} travelers yet.
          </div>
        )}

        <div className="grid gap-3">
          {visible.map((r) => {
            const openTrips = (r.trips ?? []).filter((t) => t.status === "open").length;
            return (
              <div key={r.id} className="p-5 rounded-xl border border-border bg-card flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-sm font-bold text-foreground">{r.name ?? "Unnamed traveler"}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-display font-semibold capitalize ${
                        STATUS_STYLES[r.verification_status ?? "pending"] ?? STATUS_STYLES.pending
                      }`}
                    >
                      {r.verification_status ?? "pending"}
                    </span>
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {r.profiles?.email ?? "-"} {r.phone ? `· ${r.phone}` : ""}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    Joined {new Date(r.created_at).toLocaleDateString()}
                    {r.school_affiliation ? ` · ${r.school_affiliation}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-bold text-foreground">
                    {r.total_deliveries ?? 0} {r.total_deliveries === 1 ? "delivery" : "deliveries"}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {(r.trips ?? []).length} trips logged
                    {openTrips > 0 ? ` · ${openTrips} open` : ""}
                  </p>
                  {r.rating != null && (
                    <p className="font-body text-xs text-muted-foreground mt-1">{Number(r.rating).toFixed(1)}★ rating</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminTravelers;
