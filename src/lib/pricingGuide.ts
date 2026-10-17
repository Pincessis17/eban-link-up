// Suggested price per kg (USD) shown to travelers when they post a trip.
// These are only a guide: travelers can charge whatever they like.
// NOTE: starting values. Edit them here to change what travelers see.
export const PRICE_SUGGESTIONS: { label: string; perKg: number }[] = [
  { label: "Small parcel (under 2 kg)", perKg: 15 },
  { label: "Medium (2 to 5 kg)", perKg: 12 },
  { label: "Large (5 to 10 kg)", perKg: 10 },
  { label: "Heavy (over 10 kg)", perKg: 8 },
];
