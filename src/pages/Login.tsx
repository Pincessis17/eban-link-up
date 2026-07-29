import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ebanSymbol from "@/assets/eban-symbol.png";

const inputClasses =
  "w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

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
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-card rounded-2xl p-8 border border-border shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={ebanSymbol} alt="EBAN" className="w-9 h-9" />
          <span className="font-display text-2xl font-bold text-foreground">EBAN</span>
        </div>
        <h1 className="font-display text-xl font-bold text-foreground mb-6 text-center">Log in</h1>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-4 text-sm font-body text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Email</label>
            <input type="email" required className={inputClasses} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Password</label>
            <input type="password" required className={inputClasses} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-gold text-accent-foreground font-display font-bold py-3 rounded-lg text-base hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="font-body text-sm text-muted-foreground text-center mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-gold-dark font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
