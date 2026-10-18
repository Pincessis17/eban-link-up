import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { errMsg, money } from "@/lib/marketplace";
import { paymentReference } from "@/lib/paymentConfig";

interface PaymentRow {
  id: string;
  request_id: string;
  amount: number;
  service_fee: number;
  status: string;
  created_at: string;
  delivery_requests: { origin_city: string; destination_city: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

const AdminPayments = () => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("id, request_id, amount, service_fee, status, created_at, delivery_requests(origin_city, destination_city), profiles:sender_id(full_name, email)")
      .in("status", ["pending", "held"])
      .order("created_at", { ascending: false });
    setRows((data as unknown as PaymentRow[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (row: PaymentRow, fn: "admin_confirm_payment" | "admin_reject_payment", okTitle: string) => {
    setBusy(row.id);
    const { error } = await supabase.rpc(fn, { p_request_id: row.request_id });
    setBusy(null);
    if (error) return toast({ title: "Couldn't do that", description: errMsg(error), variant: "destructive" });
    toast({ title: okTitle });
    load();
  };

  const pending = rows.filter((r) => r.status === "pending");
  const held = rows.filter((r) => r.status === "held");

  const Card = ({ r, actions }: { r: PaymentRow; actions?: boolean }) => (
    <div className="p-5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="font-display text-sm font-bold text-foreground">
          {money(r.amount)}{Number(r.service_fee) > 0 ? ` (incl. ${money(r.service_fee)} Eban fee)` : ""} · {r.delivery_requests?.origin_city} → {r.delivery_requests?.destination_city}
        </p>
        <p className="font-body text-xs text-muted-foreground mt-1">
          From {r.profiles?.full_name ?? "sender"} ({r.profiles?.email ?? "-"}) · reference{" "}
          <span className="font-mono font-semibold text-foreground">{paymentReference(r.request_id)}</span> · {new Date(r.created_at).toLocaleString()}
        </p>
      </div>
      {actions && (
        <div className="flex gap-2">
          <button
            disabled={busy === r.id}
            onClick={() => act(r, "admin_confirm_payment", "Payment confirmed. The request is now paid.")}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-body font-semibold disabled:opacity-50"
          >
            Money received
          </button>
          <button
            disabled={busy === r.id}
            onClick={() => act(r, "admin_reject_payment", "Payment claim removed")}
            className="px-4 py-2 rounded-lg border border-border text-xs font-body font-semibold text-muted-foreground disabled:opacity-50"
          >
            Not received
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className={ADMIN_SIDEBAR_OFFSET_CLASS}>
        <div className="container mx-auto px-6 py-10 max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Payments</h1>
          <p className="font-body text-sm text-muted-foreground mb-8">
            Senders pay EBAN directly and tap "I've sent the payment". Check your mobile money or bank account for the reference and amount, then confirm.
          </p>

          {loading && <p className="font-body text-sm text-muted-foreground">Loading...</p>}

          <h2 className="font-display text-lg font-semibold mb-3">Waiting for you to confirm ({pending.length})</h2>
          <div className="grid gap-3 mb-10">
            {!loading && pending.length === 0 && (
              <p className="font-body text-sm text-muted-foreground bg-card p-6 rounded-2xl border border-border">Nothing to confirm.</p>
            )}
            {pending.map((r) => (
              <Card key={r.id} r={r} actions />
            ))}
          </div>

          <h2 className="font-display text-lg font-semibold mb-3">Held for travelers ({held.length})</h2>
          <p className="font-body text-xs text-muted-foreground mb-3">Money you are holding. After the sender confirms delivery, pay the traveler in the Payout Console.</p>
          <div className="grid gap-3">
            {held.map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;
