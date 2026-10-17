import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ebanSymbol from "@/assets/eban-symbol.png";
import { ArrowRight, CheckCircle2, User, Plane, Send } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6 py-12 text-white">
        <div className="w-full max-w-md bg-charcoal/90 backdrop-blur-2xl rounded-3xl p-10 border border-gold/20 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto mb-6 glow-gold">
            <CheckCircle2 className="w-8 h-8 text-charcoal" />
          </div>
          <h1 className="font-display text-3xl font-light text-white mb-3">Verification Sent</h1>
          <p className="font-body text-xs text-gray-300 mb-8 max-w-xs mx-auto leading-relaxed">
            We sent an activation link to <strong className="text-gold-light">{email}</strong>. Please confirm your email to sign in.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-gradient-gold text-charcoal font-body font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-xl hover:opacity-90 shadow-lg glow-gold transition-all"
          >
            Go to Login Portal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-charcoal/90 backdrop-blur-2xl rounded-3xl p-8 md:p-10 border border-gold/20 shadow-2xl relative z-10 text-white">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center group">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold transition-colors">
            <img src={ebanSymbol} alt="EBAN" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-display text-2xl font-bold tracking-[0.18em] text-white block leading-tight">EBAN</span>
            <span className="font-body text-[9px] uppercase tracking-widest text-gold-light">Join the Network</span>
          </div>
        </Link>

        <h1 className="font-display text-3xl font-light text-white mb-2 text-center">Create an Account</h1>

        {routeOrigin && routeDestination && (
          <p className="font-body text-xs text-center text-gold-light mb-6">
            Pre-filling request for: <strong>{routeOrigin}</strong> &rarr; <strong>{routeDestination}</strong>
          </p>
        )}

        {error && (
          <div className="bg-destructive/20 border border-destructive/40 text-rose-300 rounded-xl p-3.5 mb-6 text-xs font-body text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-body text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 block">I am joining as a</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("Sender")}
                className={`py-3.5 rounded-xl font-body text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                  role === "Sender"
                    ? "bg-gradient-gold text-charcoal border-transparent shadow-md"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-gold/40"
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Sender
              </button>
              <button
                type="button"
                onClick={() => setRole("Traveller")}
                className={`py-3.5 rounded-xl font-body text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                  role === "Traveller"
                    ? "bg-gradient-gold text-charcoal border-transparent shadow-md"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-gold/40"
                }`}
              >
                <Plane className="w-3.5 h-3.5" /> Traveler
              </button>
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 block">Full Legal Name</label>
            <input
              type="text"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 font-body text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
              placeholder="e.g. Kwame Mensah"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 block">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 font-body text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 block">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 font-body text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-gold text-charcoal font-body font-bold text-xs uppercase tracking-widest py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg glow-gold mt-2"
          >
            {loading ? "Creating Account..." : "Complete Registration"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="font-body text-xs text-gray-400 text-center mt-8">
          Already registered?{" "}
          <Link to="/login" className="text-gold-light font-semibold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;

