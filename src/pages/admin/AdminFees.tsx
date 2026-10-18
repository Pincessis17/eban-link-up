import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { calcServiceFee, DEFAULT_FEE } from "@/lib/fees";
import { errMsg, money } from "@/lib/marketplace";

const EXAMPLES = [10, 25, 60, 120];

const AdminFees = () => {
  const [percent, setPercent] = useState(String(DEFAULT_FEE.percent));
  const [minimum, setMinimum] = useState(String(DEFAULT_FEE.minimum));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("fee_percent, fee_minimum")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPercent(String(data.fee_percent));
          setMinimum(String(data.fee_minimum));
        }
        setLoading(false);
      });
  }, []);

  const p = parseFloat(percent);
  const m = parseFloat(minimum);
  const valid = Number.isFinite(p) && p >= 0 && p <= 50 && Number.isFinite(m) && m >= 0 && m <= 1000;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ fee_percent: p, fee_minimum: m, updated_at: new Date().toISOString() })
      .eq("id", true);
    setSaving(false);
    if (error) return toast({ title: "Couldn't save", description: errMsg(error), variant: "destructive" });
    toast({ title: "Fee saved", description: "New payments will use it. Payments already reported keep their fee." });
  };

  const input =
    "w-full bg-background border border-border rounded-xl px-4 py-3 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className={ADMIN_SIDEBAR_OFFSET_CLASS}>
        <div className="container mx-auto px-6 py-10 max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Eban service fee</h1>
          <p className="font-body text-sm text-muted-foreground mb-8">
            Added on top of the traveler's price and paid by the sender. The traveler always receives their full price.
            The fee is the larger of the percentage and the minimum.
          </p>

          {loading ? (
            <p className="font-body text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4 bg-card border border-border rounded-2xl p-6">
                <div>
                  <label className="font-body text-sm font-semibold text-foreground mb-2 block">Percentage of the price</label>
                  <div className="relative">
                    <input type="number" min="0" max="50" step="0.5" className={input} value={percent} onChange={(e) => setPercent(e.target.value)} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="font-body text-sm font-semibold text-foreground mb-2 block">Minimum fee (USD)</label>
                  <input type="number" min="0" max="1000" step="0.5" className={input} value={minimum} onChange={(e) => setMinimum(e.target.value)} />
                </div>
                {!valid && (
                  <p className="sm:col-span-2 font-body text-xs text-destructive">Percentage must be 0 to 50, and the minimum 0 to 1000.</p>
                )}
                <div className="sm:col-span-2">
                  <button
                    onClick={save}
                    disabled={!valid || saving}
                    className="bg-gradient-gold text-accent-foreground font-body text-sm font-bold px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save fee"}
                  </button>
                </div>
              </div>

              {valid && (
                <div className="mt-8">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-3">What senders would pay</h2>
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <table className="w-full font-body text-sm">
                      <thead className="bg-secondary/50 text-muted-foreground text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium">Traveler's price</th>
                          <th className="px-4 py-3 font-medium">Eban fee</th>
                          <th className="px-4 py-3 font-medium">Sender pays</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EXAMPLES.map((price) => {
                          const fee = calcServiceFee(price, { percent: p, minimum: m });
                          return (
                            <tr key={price} className="border-t border-border">
                              <td className="px-4 py-3">{money(price)}</td>
                              <td className="px-4 py-3">{money(fee)}</td>
                              <td className="px-4 py-3 font-semibold">{money(price + fee)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFees;
