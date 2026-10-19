import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Opens the profile (ratings and history) of the other person on a request. */
export const ProfileLink = ({ requestId, name }: { requestId: string; name?: string }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const { data } = await supabase.rpc("counterparty_user_id", { p_request_id: requestId });
    setBusy(false);
    if (!data) return toast({ title: "Profile not available yet", variant: "destructive" });
    navigate(`/profile/${data}`);
  };
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-gold-dark hover:underline disabled:opacity-50"
    >
      <UserRound className="w-3.5 h-3.5" /> View {name ? `${name}'s` : "their"} profile and reviews
    </button>
  );
};
