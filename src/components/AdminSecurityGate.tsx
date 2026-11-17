import { ReactNode, useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SIM_STORAGE_KEY } from "@/lib/env";

type State = "checking" | "setup" | "code" | "ok";

/** Asks for the 6-digit authenticator code and upgrades the session. Used by the gate and the security page. */
export const MfaCodeForm = ({ onDone }: { onDone: () => void }) => {
  const { signOut } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (listErr || !factor) {
      setBusy(false);
      setError("No authenticator found on this account. Contact another Eban admin.");
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (vErr) {
      setError("That code didn't work. Codes change every 30 seconds; try the current one.");
      setCode("");
      return;
    }
    onDone();
  };

  return (
    <form onSubmit={verify} className="space-y-4">
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="123456"
        className="w-full text-center tracking-[0.5em] font-mono text-2xl bg-paper border border-line rounded-lg px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-brass/40"
      />
      {error && <p className="font-body text-sm text-kente">{error}</p>}
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full bg-gradient-gold text-accent-foreground font-display font-semibold py-3 rounded-lg text-sm disabled:opacity-50"
      >
        {busy ? "Checking..." : "Continue"}
      </button>
      <button type="button" onClick={signOut} className="w-full font-body text-xs text-slate hover:text-ink">
        Sign out instead
      </button>
    </form>
  );
};

/**
 * Wraps every admin page. Admins must have an authenticator app set up, and must enter its code once per sign-in.
 * The database enforces the same rule, so skipping this screen gives no admin powers.
 */
export const AdminSecurityGate = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const [state, setState] = useState<State>("checking");

  const check = useCallback(async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasFactor = (factors?.totp ?? []).length > 0;
    if (!hasFactor) setState("setup");
    else if (aal?.currentLevel !== "aal2") setState("code");
    else setState("ok");
  }, []);

  useEffect(() => {
    if (SIM_STORAGE_KEY) {
      setState("ok"); // simulator screens on the test site sign in automatically
      return;
    }
    check();
  }, [check]);

  if (state === "checking") {
    return <div className="min-h-screen flex items-center justify-center font-body text-slate">Checking security...</div>;
  }
  if (state === "setup") {
    return <Navigate to={`/admin/security?next=${encodeURIComponent(pathname)}`} replace />;
  }
  if (state === "code") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-line rounded-2xl p-8">
          <ShieldCheck className="w-8 h-8 text-brass-deep mb-4" />
          <h1 className="font-display text-2xl text-ink">Enter your code</h1>
          <p className="font-body text-sm text-slate mt-2 mb-6">
            Open your authenticator app and type the 6-digit code for Eban.
          </p>
          <MfaCodeForm onDone={check} />
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
