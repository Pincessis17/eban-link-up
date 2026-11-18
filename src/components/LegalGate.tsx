import { ReactNode, useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SIM_STORAGE_KEY } from "@/lib/env";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { COUNTRIES_FIRST, COUNTRIES_REST } from "@/lib/countries";

// Pages someone must be able to open without agreeing first.
const OPEN_PATHS = ["/terms", "/privacy", "/login", "/signup", "/forgot-password", "/reset-password"];

export const CountrySelect = ({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) => (
  <select
    id={id}
    required
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full h-11 bg-white border border-line rounded-lg px-3 font-body text-sm text-ink focus:outline-none focus:border-brass focus:ring-2 focus:ring-brass/25"
  >
    <option value="" disabled>Choose your country</option>
    <optgroup label="Most used">
      {COUNTRIES_FIRST.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
    </optgroup>
    <optgroup label="All countries">
      {COUNTRIES_REST.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
    </optgroup>
  </select>
);

export const AgreeLabel = () => (
  <>
    I'm 18 or over and I agree to Eban's{" "}
    <Link to="/terms" target="_blank" className="text-brass-deep underline hover:text-ink">Terms of Service</Link> and{" "}
    <Link to="/privacy" target="_blank" className="text-brass-deep underline hover:text-ink">Privacy Policy</Link>.
  </>
);

/**
 * Signed-in people who haven't agreed to the current Terms and Privacy Policy (existing accounts, or after an update)
 * see one screen asking them to agree before using Eban.
 */
export const LegalGate = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const [needs, setNeeds] = useState(false);
  const [country, setCountry] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!user || SIM_STORAGE_KEY) return setNeeds(false);
    const { data } = await (supabase as any)
      .from("legal_acceptances")
      .select("document, version")
      .eq("user_id", user.id)
      .in("version", [TERMS_VERSION, PRIVACY_VERSION]);
    const rows = (data ?? []) as { document: string; version: string }[];
    const ok =
      rows.some((r) => r.document === "terms" && r.version === TERMS_VERSION) &&
      rows.some((r) => r.document === "privacy" && r.version === PRIVACY_VERSION);
    setNeeds(!ok);
  }, [user]);

  useEffect(() => { check(); }, [check]);

  const missingCountry = !(profile as { country?: string | null } | null)?.country;

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await (supabase as any).rpc("accept_legal", {
      p_terms_version: TERMS_VERSION,
      p_privacy_version: PRIVACY_VERSION,
      p_country: country || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setNeeds(false);
  };

  if (!needs || OPEN_PATHS.includes(pathname)) return <>{children}</>;

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <form onSubmit={accept} className="w-full max-w-md bg-card border border-line rounded-2xl p-8 space-y-5">
        <div>
          <h1 className="font-display text-3xl text-ink">Before you continue</h1>
          <p className="font-body text-sm text-slate mt-2">
            Eban now has a Terms of Service and a Privacy Policy that explain how the service works, what we keep about you and
            your rights. Please read them and agree to keep using Eban.
          </p>
        </div>
        {missingCountry && (
          <div>
            <label htmlFor="gate-country" className="font-body text-[13px] font-semibold text-ink mb-1.5 block">Country you live in</label>
            <CountrySelect id="gate-country" value={country} onChange={setCountry} />
          </div>
        )}
        <label className="flex items-start gap-3 font-body text-sm text-ink">
          <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[#B07D22]" />
          <span><AgreeLabel /></span>
        </label>
        {error && <p className="font-body text-sm text-kente">{error}</p>}
        <button type="submit" disabled={busy || !agree || (missingCountry && !country)} className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] disabled:opacity-60">
          {busy ? "Saving..." : "Agree and continue"}
        </button>
      </form>
    </div>
  );
};
