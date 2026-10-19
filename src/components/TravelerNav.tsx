import { Link, useLocation } from "react-router-dom";
import { LogOut, Plane, ShieldCheck, DollarSign, Plus, Globe, Search } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import { useAuth } from "@/hooks/useAuth";
import { AdminViewSwitcher } from "@/components/AdminViewSwitcher";
import { ModeSwitcher } from "@/components/ModeSwitcher";

export const TravelerNav = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  const linkClasses = (path: string) =>
    `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-body font-semibold tracking-wider uppercase transition-all ${
      pathname === path
        ? "bg-gold/15 text-gold-dark border border-gold/30 shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
    }`;

  return (
    <>
    <AdminViewSwitcher />
    <nav className="bg-card/90 backdrop-blur-xl border-b border-border/80 px-6 py-3.5 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/traveler" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold transition-colors">
              <img src={ebanSymbol} alt="EBAN" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <span className="font-display text-xl font-bold text-foreground block leading-tight">EBAN</span>
              <span className="text-[10px] font-body font-semibold uppercase tracking-widest text-gold-dark">Traveler Portal</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/traveler" className={linkClasses("/traveler")}>
            <Plane className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Trips</span>
          </Link>
          <Link to="/traveler/browse" className={linkClasses("/traveler/browse")}>
            <Search className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Browse</span>
          </Link>
          <Link to="/traveler/requests" className={linkClasses("/traveler/requests")}>
            <span className="hidden sm:inline">Bookings</span>
          </Link>
          <Link to="/traveler/earnings" className={linkClasses("/traveler/earnings")}>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> <span className="hidden sm:inline">Earnings</span>
          </Link>
          <Link to="/traveler/verification" className={linkClasses("/traveler/verification")}>
            <ShieldCheck className="w-3.5 h-3.5 text-gold-dark" /> <span className="hidden sm:inline">Verification</span>
          </Link>

          <Link
            to="/traveler/new-trip"
            className="flex items-center gap-1 bg-gradient-gold text-accent-foreground px-3.5 py-2 rounded-xl text-xs font-body font-bold tracking-wider uppercase hover:opacity-90 shadow-sm transition-all ml-1"
          >
            <Plus className="w-3.5 h-3.5" /> <span className="hidden md:inline">Post Trip</span>
          </Link>

          <ModeSwitcher />
          <div className="h-5 w-px bg-border mx-1" />
          <Link to="/?view=site" className="text-muted-foreground hover:text-foreground p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-body">
            <Globe className="w-4 h-4" />
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs font-body font-semibold text-muted-foreground hover:text-destructive transition-colors px-2 py-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
    </>
  );
};

