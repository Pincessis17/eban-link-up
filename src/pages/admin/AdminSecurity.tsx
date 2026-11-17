import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { MfaCodeForm } from "@/components/AdminSecurityGate";

type Factor = { id: string; friendly_name?: string | null; created_at: string };

/** Set up (or manage) the authenticator app that protects admin accounts. */
const AdminSecurity = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLevel(aal?.currentLevel ?? null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const start = async () => {
    setBusy(true);
    // Clear any half-finished set-up first.
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: en, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Eban admin ${new Date().toLocaleDateString()} ${Math.random().toString(36).slice(2, 6)}`,
    });
    setBusy(false);
    if (error || !en) {
      toast({ title: "Couldn't start set-up", description: error?.message, variant: "destructive" });
      return;
    }
    setEnroll({ id: en.id, qr: en.totp.qr_code, secret: en.totp.secret });
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) {
      toast({ title: "That code didn't work", description: "Use the current 6-digit code from the app.", variant: "destructive" });
      setCode("");
      return;
    }
    toast({ title: "Two-step login is on", description: "You'll be asked for a code each time you sign in as admin." });
    setEnroll(null);
    setCode("");
    await load();
    if (next) navigate(next, { replace: true });
  };

  const remove = async (f: Factor) => {
    if (factors.length <= 1) {
      toast({ title: "Add another device first", description: "Admins must always have at least one authenticator.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (error) toast({ title: "Couldn't remove it", description: error.message, variant: "destructive" });
    load();
  };

  // An admin who already has an authenticator but hasn't entered the code this session must do that first.
  const needsCode = factors.length > 0 && level !== "aal2";

  return (
    <div className="min-h-screen bg-paper">
      {!(factors.length === 0 || needsCode) && <AdminNav />}
      <main className={`${!(factors.length === 0 || needsCode) ? ADMIN_SIDEBAR_OFFSET_CLASS : ""} px-4 sm:px-8 py-10`}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-7 h-7 text-brass-deep" />
            <h1 className="font-display text-3xl text-ink">Admin security</h1>
          </div>
          <p className="font-body text-sm text-slate mb-8">
            Admin accounts can move money and see people's IDs, so they need a second step at sign-in: a 6-digit code from an
            authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy or 1Password).
          </p>

          {needsCode ? (
            <div className="bg-card border border-line rounded-2xl p-6">
              <p className="font-display text-lg text-ink mb-4">Enter your current code to manage devices</p>
              <MfaCodeForm onDone={load} />
            </div>
          ) : (
            <>
              {factors.length > 0 && (
                <div className="bg-card border border-line rounded-2xl p-6 mb-6">
                  <p className="font-display text-lg text-ink mb-3">Your authenticator devices</p>
                  <ul className="divide-y divide-line">
                    {factors.map((f) => (
                      <li key={f.id} className="flex items-center justify-between py-3">
                        <span className="flex items-center gap-3 font-body text-sm text-ink">
                          <Smartphone className="w-4 h-4 text-brass-deep" />
                          {f.friendly_name ?? "Authenticator"}
                          <span className="text-slate text-xs">added {new Date(f.created_at).toLocaleDateString()}</span>
                        </span>
                        <button onClick={() => remove(f)} className="p-2 text-slate hover:text-kente" title="Remove this device">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="font-body text-xs text-slate mt-3">
                    Tip: add a second device (for example a tablet or a password manager) so losing your phone doesn't lock you out.
                  </p>
                </div>
              )}

              {!enroll ? (
                <button
                  onClick={start}
                  disabled={busy}
                  className="w-full bg-gradient-gold text-accent-foreground font-display font-semibold py-3 rounded-lg text-sm disabled:opacity-50"
                >
                  {factors.length ? "Add another device" : "Set up two-step login"}
                </button>
              ) : (
                <div className="bg-card border border-line rounded-2xl p-6 space-y-5">
                  <div>
                    <p className="font-display text-lg text-ink">1. Scan this with your authenticator app</p>
                    <img src={enroll.qr} alt="QR code for your authenticator app" className="w-48 h-48 mt-3 bg-white p-2 rounded-lg border border-line" />
                    <p className="font-body text-xs text-slate mt-3">
                      Can't scan? Type this key into the app instead:
                      <span className="block font-mono text-sm text-ink break-all mt-1 select-all">{enroll.secret}</span>
                    </p>
                  </div>
                  <form onSubmit={confirm} className="space-y-3">
                    <p className="font-display text-lg text-ink">2. Type the 6-digit code it shows</p>
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.5em] font-mono text-2xl bg-paper border border-line rounded-lg px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-brass/40"
                    />
                    <button
                      type="submit"
                      disabled={busy || code.length !== 6}
                      className="w-full bg-gradient-gold text-accent-foreground font-display font-semibold py-3 rounded-lg text-sm disabled:opacity-50"
                    >
                      {busy ? "Checking..." : "Turn on two-step login"}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminSecurity;
