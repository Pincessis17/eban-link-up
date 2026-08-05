import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/admin/bookings", label: "Requests" },
  { to: "/admin/travelers", label: "Travelers" },
  { to: "/admin/match", label: "Match" },
  { to: "/admin/intake", label: "Intake / handoff" },
  { to: "/admin/verifications", label: "Verifications" },
  { to: "/admin/payouts", label: "Payouts" },
];

/**
 * Fixed left sidebar for the admin/staff area. Pages that render this should
 * add matching left padding (see ADMIN_SIDEBAR_OFFSET_CLASS) to their outer
 * wrapper so content doesn't sit underneath it.
 */
export const ADMIN_SIDEBAR_OFFSET_CLASS = "md:pl-60";

export const AdminNav = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  const linkClasses = (path: string) =>
    `block px-3 py-2 rounded-lg text-sm font-display font-semibold transition-colors ${
      pathname === path ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
    }`;

  return (
    <>
      {/* Desktop: fixed vertical sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden md:flex w-60 flex-col bg-card border-r border-border px-4 py-6">
        <Link to="/admin/bookings" className="flex items-center gap-2 px-2 mb-8">
          <img src={ebanSymbol} alt="EBAN" className="w-8 h-8" />
          <div>
            <span className="font-display text-lg font-bold text-foreground block leading-tight">EBAN</span>
            <span className="text-muted-foreground font-body text-xs">Staff</span>
          </div>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className={linkClasses(item.to)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-1 pt-4 border-t border-border">
          <Link to="/?view=site" className="block px-3 py-2 rounded-lg text-sm font-display font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            Site
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-display font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile: compact top bar with a horizontally scrollable link row */}
      <nav className="md:hidden bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <Link to="/admin/bookings" className="flex items-center gap-2">
            <img src={ebanSymbol} alt="EBAN" className="w-7 h-7" />
            <span className="font-display text-lg font-bold text-foreground">EBAN</span>
            <span className="text-muted-foreground font-body text-xs">Staff</span>
          </Link>
          <button onClick={signOut} className="flex items-center gap-1 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors ${
                pathname === item.to ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/?view=site" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Site
          </Link>
        </div>
      </nav>
    </>
  );
};
