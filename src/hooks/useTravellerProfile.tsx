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
  const { user } = useAuth();
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
    setTravellerProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { travellerProfile, loading, refresh };
}
