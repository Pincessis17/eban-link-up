import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ebanSymbol from "@/assets/eban-symbol.png";
import { Lock, Mail, ArrowRight } from "lucide-react";

const inputClasses =
  "w-full bg-card border border-border/80 rounded-xl px-4 py-3.5 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all";

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
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6 relative overflow-hidden py-12">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-charcoal/90 backdrop-blur-2xl rounded-3xl p-8 md:p-10 border border-gold/20 shadow-2xl relative z-10 text-white">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center group">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold transition-colors">
            <img src={ebanSymbol} alt="EBAN" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-display text-2xl font-bold tracking-[0.18em] text-white block leading-tight">EBAN</span>
            <span className="font-body text-[9px] uppercase tracking-widest text-gold-light">Global Network Access</span>
          </div>
        </Link>

        <h1 className="font-display text-3xl font-light text-white mb-2 text-center">Welcome Back</h1>
        <p className="font-body text-xs text-gray-400 text-center mb-8">Sign in to manage your deliveries &amp; flight schedules</p>

        {error && (
          <div className="bg-destructive/20 border border-destructive/40 text-rose-300 rounded-xl p-3.5 mb-6 text-xs font-body text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 font-body text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-gold text-charcoal font-body font-bold text-xs uppercase tracking-widest py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg glow-gold mt-2"
          >
            {loading ? "Authenticating..." : "Sign In to Account"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="font-body text-xs text-gray-400 text-center mt-8">
          Don't have an account yet?{" "}
          <Link to="/signup" className="text-gold-light font-semibold hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

