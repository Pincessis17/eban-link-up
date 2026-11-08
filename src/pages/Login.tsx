import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight } from "lucide-react";
import { AuthShell, authInput, authLabel } from "@/components/AuthShell";

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error, role } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    if (role === "Admin") navigate("/admin/bookings");
    else if (role === "Traveller") navigate("/traveler");
    else navigate("/sender/requests");
  };

  return (
    <AuthShell headline="Send it with someone already going.">
      <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink">Welcome back.</h1>
      <p className="font-body text-sm text-slate mt-2 mb-8">Sign in to manage requests, trips and payouts.</p>

      {error && (
        <div className="bg-kente/10 border border-kente/30 text-kente rounded-lg p-3 mb-5 text-sm font-body">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={authLabel} htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" className={authInput} placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={authLabel} htmlFor="password">Password</label>
          <input id="password" type="password" required autoComplete="current-password" className={authInput} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
          {loading ? "Signing in..." : "Sign in"} <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="flex items-center gap-3 my-6"><span className="h-px flex-1 bg-line" /><span className="font-body text-xs text-slate">or</span><span className="h-px flex-1 bg-line" /></div>
      <Link to="/signup" className="w-full h-11 border border-line bg-white text-ink font-body font-semibold text-sm rounded-lg hover:bg-paper-2 flex items-center justify-center">
        Create an account
      </Link>
      <p className="font-body text-xs text-slate mt-6">No account? It takes about two minutes.</p>
    </AuthShell>
  );
};

export default Login;

