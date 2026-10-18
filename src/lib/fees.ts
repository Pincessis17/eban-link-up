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

/** The per-kg rate a sender sees: the traveler's rate with the percentage included. */
export const allInRate = (rate: number | string | null | undefined, fee: FeeSettings): number =>
  Math.round(Number(rate) * (100 + fee.percent)) / 100;

export interface ParcelQuote {
  price: number; // what the traveler receives
  fee: number; // Eban's fee
  total: number; // what the sender pays
  subtotal: number; // weight x all-in per-kg rate
  minimumTopUp: number; // extra charged only when the minimum fee applies
}

/** Quote for a parcel of `weight` kg on a trip priced at `rate` per kg (the traveler's own rate). */
export const parcelQuote = (weight: number, rate: number, fee: FeeSettings): ParcelQuote => {
  const price = Math.round(weight * rate * 100) / 100;
  const feeAmount = calcServiceFee(price, fee);
  const total = Math.round((price + feeAmount) * 100) / 100;
  const percentFee = Math.round(price * fee.percent) / 100;
  const minimumApplies = feeAmount > percentFee;
  const subtotal = minimumApplies ? Math.round((price + percentFee) * 100) / 100 : total;
  return { price, fee: feeAmount, total, subtotal, minimumTopUp: Math.round((total - subtotal) * 100) / 100 };
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
