// Shared marketplace constants and helpers.
//
// Request lifecycle (delivery_requests.status):
//   submitted -> matched -> accepted_by_traveller -> paid (escrow funded)
//   -> handed_to_traveller -> in_transit -> delivered -> completed (escrow released)
//   with disputed / cancelled as side exits.

export const REQUEST_STEPS = [
  { key: "submitted", label: "Posted" },
  { key: "matched", label: "Matched" },
  { key: "paid", label: "In escrow" },
  { key: "handed_to_traveller", label: "With traveler" },
  { key: "in_transit", label: "In transit" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Released" },
] as const;

/** Maps any DB status onto a step index of REQUEST_STEPS (or -1 for cancelled/disputed). */
export const stepIndex = (status: string): number => {
  switch (status) {
    case "draft":
    case "submitted":
      return 0;
    case "matched":
    case "accepted_by_traveller":
      return 1;
    case "paid":
    case "dropped_off":
      return 2;
    case "handed_to_traveller":
      return 3;
    case "in_transit":
      return 4;
    case "delivered":
      return 5;
    case "completed":
      return 6;
    default:
      return -1;
  }
};

export const SENDER_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Open: waiting for a traveler",
  matched: "Waiting for traveler to accept",
  accepted_by_traveller: "Accepted: pay to confirm",
  paid: "Payment held in escrow",
  dropped_off: "Payment held in escrow",
  handed_to_traveller: "With traveler",
  in_transit: "In transit",
  delivered: "Delivered: confirm receipt",
  completed: "Completed",
  disputed: "Dispute open",
  cancelled: "Cancelled",
};

export const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-gold/15 text-gold-dark border-gold/30",
  matched: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  accepted_by_traveller: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  dropped_off: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  handed_to_traveller: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  in_transit: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  disputed: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

/** Statuses in which a sender may delete their own request (mirrors the DB guard policy). */
export const SENDER_DELETABLE = ["draft", "submitted", "matched", "accepted_by_traveller", "cancelled"];

/** Statuses in which funds are held and the delivery is underway. */
export const IN_FLIGHT = ["paid", "dropped_off", "handed_to_traveller", "in_transit", "delivered"];

export const money = (n: number | string | null | undefined) =>
  n == null || n === "" ? "-" : `$${Number(n).toFixed(2)}`;

/** Supabase errors are plain objects, not Error instances. */
export const errMsg = (e: unknown, fallback = "Something went wrong. Please try again."): string => {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return fallback;
};

export const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Flexible";

/** Statuses where Eban holds the sender's money. Chat and handover contact unlock here, not before. */
export const CHAT_OPEN_STATUSES = [
  "paid", "dropped_off", "handed_to_traveller", "in_transit", "delivered", "completed", "disputed",
];

/** Hours a match can wait for payment before it is released. */
export const PAYMENT_WINDOW_HOURS = 48;
