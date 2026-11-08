export type ReviewFilter = "pending" | "approved" | "rejected" | "all";

export const ReviewBadge = ({ status }: { status: string }) => {
  const s =
    status === "approved" ? { t: "Approved", c: "bg-forest/10 text-forest" }
    : status === "rejected" ? { t: "Declined", c: "bg-kente/10 text-kente" }
    : { t: "Waiting", c: "bg-brass/15 text-brass-deep" };
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-xs font-semibold ${s.c}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{s.t}</span>;
};

export const ReviewTabs = ({ value, onChange, counts }: { value: ReviewFilter; onChange: (f: ReviewFilter) => void; counts: Record<ReviewFilter, number> }) => (
  <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-paper-2 border border-line w-fit mb-6" role="tablist">
    {([["pending", "Waiting"], ["approved", "Approved"], ["rejected", "Declined"], ["all", "All"]] as const).map(([k, label]) => (
      <button
        key={k}
        role="tab"
        aria-selected={value === k}
        onClick={() => onChange(k)}
        className={`px-3.5 py-1.5 rounded-md font-body text-sm font-semibold transition-colors ${value === k ? "bg-ink text-paper" : "text-slate hover:text-ink"}`}
      >
        {label} <span className="opacity-60">{counts[k]}</span>
      </button>
    ))}
  </div>
);
