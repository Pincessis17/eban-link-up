// Where senders send their money while EBAN holds payments manually.
// Fill in the details below; anything left empty is hidden from users.
// Example details: ["MTN MoMo: 024 000 0000", "Account name: EBAN Trading Company"]
export const PAYMENT_METHODS: { label: string; details: string[] }[] = [
  { label: "Mobile money", details: [] },
  { label: "Bank transfer", details: [] },
];

export const paymentReference = (requestId: string) => `EBAN-${requestId.slice(0, 8).toUpperCase()}`;
