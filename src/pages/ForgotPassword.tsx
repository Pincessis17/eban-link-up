import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, authInput, authLabel } from "@/components/AuthShell";
import { friendlyAuthError, resetRedirect } from "@/lib/authEmails";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetRedirect() });
    setLoading(false);
    // Don't reveal whether an account exists: only show real problems like rate limits.
    if (error && /rate|too many/i.test(error.message)) {
      setError(friendlyAuthError(error.message));
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell headline="Send it with someone already going.">
        <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mb-6">
          <MailCheck className="w-6 h-6 text-forest" />
        </div>
        <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink">Check your email.</h1>
        <p className="font-body text-sm text-slate mt-3 mb-8 leading-relaxed">
          If there's an Eban account for <strong className="text-ink">{email}</strong>, we've sent a link to choose a new password.
          It works for one hour. Not there after a few minutes? Check your spam folder.
        </p>
        <Link to="/login" className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] flex items-center justify-center gap-2">
          Back to sign in <ArrowRight className="w-4 h-4" />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell headline="Send it with someone already going.">
      <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink">Forgot your password?</h1>
      <p className="font-body text-sm text-slate mt-2 mb-8">Enter your email and we'll send you a link to choose a new one.</p>
      {error && <div className="bg-kente/10 border border-kente/30 text-kente rounded-lg p-3 mb-5 text-sm font-body">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={authLabel} htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" className={authInput} placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? "Sending..." : "Send reset link"} <ArrowRight className="w-4 h-4" />
        </button>
      </form>
      <Link to="/login" className="block font-body text-sm text-slate hover:text-ink mt-6">Back to sign in</Link>
    </AuthShell>
  );
};

export default ForgotPassword;
