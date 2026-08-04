import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ebanSymbol from "@/assets/eban-symbol.png";

const inputClasses =
  "w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

const Signup = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // If they arrived here from an "Available Trips" card, carry the route
  // through to the pre-filled request form after signup instead of losing it.
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
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-card rounded-2xl p-8 border border-border shadow-[var(--shadow-card)] text-center">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <img src={ebanSymbol} alt="EBAN" className="w-9 h-9" />
            <span className="font-display text-2xl font-bold text-foreground">EBAN</span>
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-3">Check your email</h1>
          <p className="font-body text-sm text-muted-foreground mb-6">
            We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>. Click it, then come back and log in.
          </p>
          <Link to="/login" className="inline-block bg-gradient-gold text-accent-foreground font-display font-semibold px-6 py-3 rounded-lg text-sm hover:opacity-90 transition-opacity">
            Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card rounded-2xl p-8 border border-border shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={ebanSymbol} alt="EBAN" className="w-9 h-9" />
          <span className="font-display text-2xl font-bold text-foreground">EBAN</span>
        </div>
        <h1 className="font-display text-xl font-bold text-foreground mb-2 text-center">Create an account</h1>

        {routeOrigin && routeDestination && (
          <p className="font-body text-xs text-center text-gold-dark mb-6">
            Sending from {routeOrigin} to {routeDestination} &mdash; we'll pick this back up right after you sign up.
          </p>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-4 text-sm font-body text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">I am a</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole("Sender")}
                className={`flex-1 py-3 rounded-lg font-display text-sm font-semibold border transition-colors ${
                  role === "Sender"
                    ? "bg-gradient-gold text-accent-foreground border-transparent"
                    : "bg-background border-border text-muted-foreground hover:border-gold/50"
                }`}
              >
                Sender
              </button>
              <button
                type="button"
                onClick={() => setRole("Traveller")}
                className={`flex-1 py-3 rounded-lg font-display text-sm font-semibold border transition-colors ${
                  role === "Traveller"
                    ? "bg-gradient-gold text-accent-foreground border-transparent"
                    : "bg-background border-border text-muted-foreground hover:border-gold/50"
                }`}
              >
                Traveller
              </button>
            </div>
          </div>
          <div>
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Full name</label>
            <input type="text" required className={inputClasses} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Email</label>
            <input type="email" required className={inputClasses} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className={inputClasses}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-gold text-accent-foreground font-display font-bold py-3 rounded-lg text-base hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="font-body text-sm text-muted-foreground text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-gold-dark font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
