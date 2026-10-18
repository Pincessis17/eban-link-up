import { Link, useLocation } from "react-router-dom";
import { LogOut, Package, Users, GitMerge, ShieldCheck, DollarSign, Globe, Eye, Plane, MessageSquare, Percent } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/admin/bookings", label: "Requests Desk", icon: Package },
  { to: "/admin/travelers", label: "Traveler Directory", icon: Users },
  { to: "/admin/match", label: "Smart Matcher", icon: GitMerge },
  { to: "/admin/verifications", label: "ID Verifications", icon: ShieldCheck },
  { to: "/admin/payments", label: "Payments In", icon: DollarSign },
  { to: "/admin/payouts", label: "Payout Console", icon: DollarSign },
  { to: "/admin/fees", label: "Fees", icon: Percent },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
];

export const ADMIN_SIDEBAR_OFFSET_CLASS = "md:pl-64";

export const AdminNav = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  const linkClasses = (path: string) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-body font-semibold transition-all ${
      pathname === path
        ? "bg-gold/15 text-gold-light border border-gold/30 shadow-sm"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`;

  return (
    <>
      {/* Desktop: fixed vertical sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:flex w-64 flex-col bg-charcoal border-r border-gold/15 px-5 py-6 text-white shadow-2xl">
        <Link to="/admin/bookings" className="flex items-center gap-3 px-2 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold transition-colors">
            <img src={ebanSymbol} alt="EBAN" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-[0.18em] text-white block leading-tight">EBAN</span>
            <span className="text-[10px] font-body font-semibold uppercase tracking-widest text-gold-light">Admin Command Suite</span>
          </div>
        </Link>

        <nav className="flex flex-col gap-1.5 flex-1">
          <div className="px-3 text-[10px] font-body uppercase tracking-widest text-gray-500 font-semibold mb-1">Navigation</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={linkClasses(item.to)}>
                <Icon className="w-4 h-4 text-gold-light" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1.5 pt-4 border-t border-white/10">
          <div className="px-3 text-[10px] font-body uppercase tracking-widest text-gray-500 font-semibold mb-1">Preview as</div>
          <Link to="/sender/requests" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-body font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Eye className="w-4 h-4 text-gold-light" /><span>Sender view</span>
          </Link>
          <Link to="/traveler" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-body font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Plane className="w-4 h-4 text-gold-light" /><span>Traveler view</span>
          </Link>
          <Link
            to="/?view=site"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-body font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Globe className="w-4 h-4 text-gold-light" />
            <span>Public Site</span>
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-body font-semibold text-gray-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile: compact top bar with horizontal navigation */}
      <nav className="md:hidden bg-charcoal border-b border-gold/15 px-4 py-3 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <Link to="/admin/bookings" className="flex items-center gap-2">
            <img src={ebanSymbol} alt="EBAN" className="w-7 h-7" />
            <span className="font-display text-lg font-bold text-white">EBAN</span>
            <span className="text-gold-light font-body text-xs">Admin</span>
          </Link>
          <button onClick={signOut} className="flex items-center gap-1 text-xs font-body text-gray-400 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold transition-colors ${
                pathname === item.to ? "bg-gold/20 text-gold-light border border-gold/30" : "text-gray-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/sender/requests" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-gray-400 hover:text-white">
            Sender view
          </Link>
          <Link to="/traveler" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-gray-400 hover:text-white">
            Traveler view
          </Link>
          <Link to="/?view=site" className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-gray-400 hover:text-white">
            Site
          </Link>
        </div>
      </nav>
    </>
  );
};

