import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plane } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/** One account for both sides: flip between sending packages and travelling. Hidden for admins. */
export const ModeSwitcher = () => {
  const { profile, switchRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (profile?.role !== "Sender" && profile?.role !== "Traveller") return null;

  const go = async (role: "Sender" | "Traveller") => {
    if (busy || profile.role === role) return;
    setBusy(true);
    const { error } = await switchRole(role);
    setBusy(false);
    if (error) {
      toast({ title: "Could not switch", description: error, variant: "destructive" });
      return;
    }
    navigate(role === "Traveller" ? "/traveler" : "/sender/requests");
  };

  const pill = (role: "Sender" | "Traveller", label: string, Icon: typeof Package) => (
    <button
      type="button"
      onClick={() => go(role)}
      disabled={busy}
      aria-pressed={profile.role === role}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body font-bold uppercase tracking-wider transition-all ${
        profile.role === role ? "bg-gradient-gold text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-border bg-secondary/50 p-0.5" role="group" aria-label="Switch between sending and travelling">
      {pill("Sender", "Sending", Package)}
      {pill("Traveller", "Travelling", Plane)}
    </div>
  );
};
