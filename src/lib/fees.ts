import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeeSettings {
  percent: number;
  minimum: number;
}

// Used until the real numbers load (or if they can't be read). Matches the database defaults.
export const DEFAULT_FEE: FeeSettings = { percent: 15, minimum: 5 };

/** Eban's service fee on a traveler price: the larger of percent% and the minimum. */
export const calcServiceFee = (price: number | null | undefined, fee: FeeSettings): number => {
  const p = Number(price);
  if (!p || p <= 0) return 0;
  return Math.max(Math.round(p * fee.percent) / 100, fee.minimum);
};

export function usePlatformFee() {
  const [fee, setFee] = useState<FeeSettings>(DEFAULT_FEE);
  useEffect(() => {
    let alive = true;
    supabase
      .from("platform_settings")
      .select("fee_percent, fee_minimum")
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) setFee({ percent: Number(data.fee_percent), minimum: Number(data.fee_minimum) });
      });
    return () => {
      alive = false;
    };
  }, []);
  return fee;
}
