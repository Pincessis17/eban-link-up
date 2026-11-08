import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, CheckCircle2, Plane, Send } from "lucide-react";
import { AuthShell, authInput, authLabel } from "@/components/AuthShell";

const Signup = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const routeOrigin = searchParams.get("originCity");
  const routeDestination = searchParams.get("destinationCity");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Sender" | "Traveller">("Sender");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error, needsConfirmation } = await signUp(email, password, fullName, role);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    if (needsConfirmation) {
      setNeedsConfirmation(true);
      return;
    }
    if (role === "Traveller") {
      navigate("/traveler");
      return;
    }
    if (routeOrigin && routeDestination) {
      navigate(`/sender/new-request?${searchParams.toString()}`);
    } else {
      navigate("/sender/requests");
    }
  };

  if (needsConfirmation) {
    return (
      <AuthShell headline="One account. Send or carry.">
        <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-6 h-6 text-forest" />
        </div>
        <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink">Check your email.</h1>
        <p className="font-body text-sm text-slate mt-3 mb-8 leading-relaxed">
          We sent an activation link to <strong className="text-ink">{email}</strong>. Confirm it, then sign in.
        </p>
        <Link to="/login" className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] flex items-center justify-center gap-2">
          Go to sign in <ArrowRight className="w-4 h-4" />
        </Link>
      </AuthShell>
    );
  }

  const roleBtn = (r: "Sender" | "Traveller", label: string, Icon: typeof Send) => (
    <button
      type="button"
      onClick={() => setRole(r)}
      aria-pressed={role === r}
      className={`h-10 rounded-md font-body text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors ${
        role === r ? "bg-ink text-paper" : "text-slate hover:text-ink"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <AuthShell headline="One account. Send or carry.">
      <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink">Create your account.</h1>
      <p className="font-body text-sm text-slate mt-2 mb-7">You can switch between sending and travelling any time.</p>

      {routeOrigin && routeDestination && (
        <p className="font-body text-sm text-brass-deep bg-brass/10 border border-brass/30 rounded-lg px-3 py-2 mb-5">
          Your request will start with <strong>{routeOrigin}</strong> → <strong>{routeDestination}</strong>.
        </p>
      )}

      {error && (
        <div className="bg-kente/10 border border-kente/30 text-kente rounded-lg p-3 mb-5 text-sm font-body">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className={authLabel}>Start as</span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-paper-2 border border-line">
            {roleBtn("Sender", "Sending", Send)}
            {roleBtn("Traveller", "Travelling", Plane)}
          </div>
        </div>
        <div>
          <label className={authLabel} htmlFor="name">Full legal name</label>
          <input id="name" type="text" required autoComplete="name" className={authInput} placeholder="As it appears on your ID" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className={authLabel} htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" className={authInput} placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={authLabel} htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} autoComplete="new-password" className={authInput} placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="w-full h-11 bg-brass text-ink font-body font-semibold text-sm rounded-lg hover:bg-[#CB9A22] disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
          {loading ? "Creating account..." : "Create account"} <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="font-body text-xs text-slate mt-5 leading-relaxed">
        By continuing you agree to the marketplace rules. Senders and travellers are responsible for what they send and carry.
      </p>
      <p className="font-body text-sm text-slate mt-4">
        Already have an account? <Link to="/login" className="font-semibold text-brass-deep hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
};

export default Signup;

