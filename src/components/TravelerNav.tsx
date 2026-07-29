import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import { useAuth } from "@/hooks/useAuth";

export const TravelerNav = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  const linkClasses = (path: string) =>
    `text-sm font-display font-semibold transition-colors ${
      pathname === path ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav className="bg-card border-b border-border px-6 py-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/traveler" className="flex items-center gap-3">
            <img src={ebanSymbol} alt="EBAN" className="w-9 h-9" />
            <span className="font-display text-2xl font-bold text-foreground">EBAN</span>
            <span className="text-muted-foreground font-body text-sm">/ Traveler</span>
          </Link>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/traveler" className={linkClasses("/traveler")}>Trips</Link>
          <Link to="/traveler/requests" className={linkClasses("/traveler/requests")}>Requests</Link>
          <Link to="/traveler/earnings" className={linkClasses("/traveler/earnings")}>Earnings</Link>
          <Link to="/traveler/verification" className={linkClasses("/traveler/verification")}>Verification</Link>
          <Link to="/?view=site" className="text-sm font-display font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Site
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 text-sm font-display font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    </nav>
  );
};
