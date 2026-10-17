import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TravellerProfile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  rating: number;
  school_affiliation: string | null;
  total_deliveries: number;
  verification_status: string;
}

export function useTravellerProfile() {
  const { user, profile } = useAuth();
  const [travellerProfile, setTravellerProfile] = useState<TravellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setTravellerProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("traveller_profiles").select("*").eq("user_id", user.id).maybeSingle();
    let row = data;
    // Self-heal: a traveler account whose profile row is missing (for example it was
    // deleted by an admin) gets a fresh one, so verification and trips keep working.
    if (!row && profile?.role === "Traveller") {
      const { data: created } = await supabase
        .from("traveller_profiles")
        .insert({ user_id: user.id, name: profile.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null })
        .select("*")
        .maybeSingle();
      row = created;
    }
    setTravellerProfile(row);
    setLoading(false);
  }, [user, profile?.role, profile?.full_name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { travellerProfile, loading, refresh };
}
