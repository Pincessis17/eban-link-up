import { Link, useLocation } from "react-router-dom";
import { Eye, ShieldCheck, Package, Plane } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Admin-only strip shown at the top of the Sender and Traveler portals so an
// admin can preview each side. Renders nothing for regular users.
export const AdminViewSwitcher = () => {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  if (profile?.role !== "Admin") return null;

  const current = pathname.startsWith("/sender") ? "sender" : pathname.startsWith("/traveler") ? "traveler" : "admin";
  const item = (key: string, to: string, label: string, Icon: typeof Eye) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-body font-semibold transition-colors ${
        current === key ? "bg-ink-2 text-paper border border-white/10" : "text-paper/70 hover:text-paper hover:bg-white/10"
      }`}
    >
      <Icon className="w-3 h-3" /> {label}
    </Link>
  );

  return (
    <div className="bg-ink text-paper px-4 py-1.5 flex flex-wrap items-center gap-2 text-[11px] font-body border-b border-white/10 z-50 relative">
      <span className="flex items-center gap-1.5 text-brass font-semibold uppercase tracking-widest">
        <Eye className="w-3 h-3" /> Admin preview
      </span>
      <div className="flex items-center gap-1.5">
        {item("admin", "/admin/bookings", "Admin", ShieldCheck)}
        {item("sender", "/sender/requests", "Sender view", Package)}
        {item("traveler", "/traveler", "Traveler view", Plane)}
      </div>
      <span className="text-paper/60 hidden md:inline">Showing the admin account's own data. Anything you create here belongs to the admin account.</span>
    </div>
  );
};
