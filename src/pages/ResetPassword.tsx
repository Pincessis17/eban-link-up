import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, authInput, authLabel } from "@/components/AuthShell";
import { friendlyAuthError } from "@/lib/authEmails";

/** Opened from the "reset your password" email. The link signs the person in for this one purpose. */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "yes" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // An error in the link (expired / already used) comes back in the address.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error")) {
      setReady("expired");
      return;
    }
    try { sessionStorage.removeItem("eban-recovery"); } catch { /* ignore */ }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) setReady("yes");
    });
    // Give the link a moment to be processed, then decide.
    const t = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady((r) => (r === "checking" ? (data.session ? "yes" : "expired") : r));
    }, 1500);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError(friendlyAuthError(error.message));
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = u.user ? await supabase.from("profiles").select("role").eq("id", u.user.id).maybeSingle() : { data: null };
    setLoading(false);
    navigate(p?.role === "Admin" ? "/admin/bookings" : p?.role === "Traveller" ? "/traveler" : "/sender/requests", { replace: true });
  };

  return (
    <AuthShell headline="Send it with someone already going.">
      {ready === "checking" && <p className="font-body text-sm text-slate">Checking your link...</p>}

      {ready === "expired" && (
        <>
          <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink">This link has expired.</h1>
          <p className="font-body text-sm text-slate mt-3 mb-8">Reset links work once, for one hour. Ask for a new one.</p>
          <Link to="/forgot-password" className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] flex items-center justify-center gap-2">
            Send a new link <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}

      {ready === "yes" && (
        <>
          <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink">Choose a new password.</h1>
          <p className="font-body text-sm text-slate mt-2 mb-8">At least 8 characters, with letters and numbers.</p>
          {error && <div className="bg-kente/10 border border-kente/30 text-kente rounded-lg p-3 mb-5 text-sm font-body">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={authLabel} htmlFor="password">New password</label>
              <input id="password" type="password" required minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,}" title="At least 8 characters, with letters and numbers" autoComplete="new-password" className={authInput} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className={authLabel} htmlFor="confirm">Type it again</label>
              <input id="confirm" type="password" required autoComplete="new-password" className={authInput} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? "Saving..." : "Save new password"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
