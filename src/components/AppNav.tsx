import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import ebanSymbol from "@/assets/eban-symbol.png";
import { useAuth } from "@/hooks/useAuth";
import { AdminViewSwitcher } from "@/components/AdminViewSwitcher";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { useExpireStale } from "@/hooks/useExpireStale";

export type NavItem = { to: string; label: string; match?: (path: string) => boolean };

const initials = (name?: string | null, email?: string | null) => {
  const src = (name || email || "").trim();
  if (!src) return "·";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src[0].toUpperCase();
};

export const EbanLogo = ({ to = "/", sub, dark = false }: { to?: string; sub?: string; dark?: boolean }) => (
  <Link to={to} className="flex items-center gap-2.5 shrink-0" aria-label="Eban home">
    <img src={ebanSymbol} alt="" className="w-9 h-9 object-contain scale-125" />
    <span className="leading-none">
      <span className={`block font-display text-[19px] tracking-[0.04em] ${dark ? "text-paper" : "text-ink"}`}>EBAN</span>
      {sub && <span className="block mt-1 text-[9px] font-body font-semibold uppercase tracking-[0.18em] text-brass-deep">{sub}</span>}
    </span>
  </Link>
);

/** Shared top bar for the sender and traveller portals: paper bar, centred links, kente rail underneath. */
export const AppNav = ({ home, sub, items }: { home: string; sub: string; items: NavItem[] }) => {
  useExpireStale();
  const { signOut, profile, user } = useAuth();
  const { pathname } = useLocation();
  const active = (i: NavItem) => (i.match ? i.match(pathname) : pathname === i.to);

  const link = (i: NavItem) => (
    <Link
      key={i.to}
      to={i.to}
      className={`whitespace-nowrap px-1 py-2 text-[13px] font-body transition-colors ${
        active(i) ? "text-ink font-semibold" : "text-slate hover:text-ink"
      }`}
      aria-current={active(i) ? "page" : undefined}
    >
      {i.label}
    </Link>
  );

  return (
    <>
      <AdminViewSwitcher />
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4">
          <EbanLogo to={home} sub={sub} />
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main">{items.map(link)}</nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ModeSwitcher />
            <Link
              to="/profile"
              title="Your profile"
              className="w-8 h-8 rounded-full bg-paper-2 border border-line flex items-center justify-center text-[11px] font-body font-bold text-brass-deep hover:border-brass transition-colors"
            >
              {initials(profile?.full_name, user?.email)}
            </Link>
            <button onClick={signOut} title="Sign out" className="p-2 text-slate hover:text-kente transition-colors" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="lg:hidden container mx-auto flex items-center gap-5 overflow-x-auto pb-2 -mt-1" aria-label="Main">
          {items.map(link)}
        </nav>
        <div className="kente-rail" />
      </header>
    </>
  );
};
