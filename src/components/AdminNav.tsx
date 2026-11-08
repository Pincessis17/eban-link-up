import { Link, useLocation } from "react-router-dom";
import { LogOut, Package, Users, GitMerge, ShieldCheck, DollarSign, Globe, Eye, Plane, MessageSquare, Percent, AlertTriangle, Luggage, Video } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/admin/bookings", label: "Requests Desk", icon: Package },
  { to: "/admin/travelers", label: "Traveler Directory", icon: Users },
  { to: "/admin/match", label: "Smart Matcher", icon: GitMerge },
  { to: "/admin/verifications", label: "ID Verifications", icon: ShieldCheck },
  { to: "/admin/identity", label: "Face Checks", icon: Video },
  { to: "/admin/payments", label: "Payments In", icon: DollarSign },
  { to: "/admin/payouts", label: "Payout Console", icon: DollarSign },
  { to: "/admin/extra-bags", label: "Extra Bags", icon: Luggage },
  { to: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { to: "/admin/fees", label: "Fees", icon: Percent },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
];

export const ADMIN_SIDEBAR_OFFSET_CLASS = "md:pl-64";

export const AdminNav = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  const linkClasses = (path: string) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-body font-medium transition-all ${
      pathname === path
        ? "bg-ink-2 text-paper border border-white/5"
        : "text-paper/60 hover:text-paper hover:bg-white/5"
    }`;

  return (
    <>
      {/* Desktop: fixed vertical sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:flex w-64 flex-col bg-ink border-r border-white/5 px-5 pb-6 pt-0 text-paper overflow-y-auto">
        <div className="kente-rail -mx-5 mb-6" />
        <Link to="/admin/bookings" className="flex items-center gap-3 px-2 mb-8 group">
          <img src={ebanSymbol} alt="EBAN" className="w-8 h-8 object-contain" />
          <div>
            <span className="font-display text-xl tracking-[0.04em] text-paper block leading-tight">EBAN</span>
            <span className="text-[10px] font-body font-semibold uppercase tracking-widest text-brass">Admin</span>
          </div>
        </Link>

        <nav className="flex flex-col gap-1.5 flex-1">
          <div className="px-3 text-[10px] font-body uppercase tracking-widest text-paper/40 font-semibold mb-1">Navigation</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={linkClasses(item.to)}>
                <Icon className="w-4 h-4 text-brass" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1.5 pt-4 border-t border-white/10">
          <div className="px-3 text-[10px] font-body uppercase tracking-widest text-paper/40 font-semibold mb-1">Preview as</div>
          <Link to="/sender/requests" className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-body font-medium text-paper/60 hover:text-paper hover:bg-white/5 transition-colors">
            <Eye className="w-4 h-4 text-brass" /><span>Sender view</span>
          </Link>
          <Link to="/traveler" className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-body font-medium text-paper/60 hover:text-paper hover:bg-white/5 transition-colors">
            <Plane className="w-4 h-4 text-brass" /><span>Traveler view</span>
          </Link>
          <Link
            to="/?view=site"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-body font-medium text-paper/60 hover:text-paper hover:bg-white/5 transition-colors"
          >
            <Globe className="w-4 h-4 text-brass" />
            <span>Public Site</span>
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-body font-medium text-paper/60 hover:text-[#E07A6E] hover:bg-white/5 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile: compact top bar with horizontal navigation */}
      <nav className="md:hidden bg-ink border-b border-white/5 px-4 py-3 text-paper sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <Link to="/admin/bookings" className="flex items-center gap-2">
            <img src={ebanSymbol} alt="EBAN" className="w-7 h-7" />
            <span className="font-display text-lg font-bold text-paper">EBAN</span>
            <span className="text-brass font-body text-xs">Admin</span>
          </Link>
          <button onClick={signOut} className="flex items-center gap-1 text-xs font-body text-paper/60 hover:text-paper">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold transition-colors ${
                pathname === item.to ? "bg-ink-2 text-paper border border-white/5" : "text-paper/60 hover:text-paper"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/sender/requests" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-paper/60 hover:text-paper">
            Sender view
          </Link>
          <Link to="/traveler" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-paper/60 hover:text-paper">
            Traveler view
          </Link>
          <Link to="/?view=site" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-paper/60 hover:text-paper">
            Site
          </Link>
        </div>
      </nav>
    </>
  );
};

