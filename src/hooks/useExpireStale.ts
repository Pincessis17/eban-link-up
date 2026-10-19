import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

let lastRun = 0;

/** Releases matches that were not paid in time. Runs when a portal opens, at most every 5 minutes. */
export function useExpireStale() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || Date.now() - lastRun < 5 * 60 * 1000) return;
    lastRun = Date.now();
    supabase.rpc("expire_stale_matches").then(() => {}, () => {});
  }, [user]);
}
