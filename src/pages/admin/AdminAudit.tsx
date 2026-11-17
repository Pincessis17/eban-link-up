import { useCallback, useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";

type Entry = {
  id: number;
  at: string;
  actor_email: string | null;
  actor_kind: "admin" | "system";
  action: "insert" | "update" | "delete";
  table_name: string;
  row_id: string | null;
  changes: Record<string, unknown> | null;
};

const TABLE_LABEL: Record<string, string> = {
  delivery_requests: "Delivery request",
  payments: "Payment",
  payouts: "Payout",
  disputes: "Dispute",
  extra_bags: "Extra bag",
  matches: "Booking",
  trips: "Trip",
  id_documents: "ID document",
  identity_checks: "Face check",
  verifications: "Old verification",
  profiles: "Profile",
  sender_profiles: "Sender profile",
  traveller_profiles: "Traveller profile",
  platform_settings: "Fees / settings",
  pricing_breakdowns: "Price breakdown",
  routes: "Route",
  feedback: "Feedback",
  handoff_preferences: "Handover plan",
  ratings: "Rating",
  request_evidence: "Photo / receipt",
};

const ACTION_LABEL = { insert: "created", update: "changed", delete: "deleted" } as const;

const show = (v: unknown): string => {
  if (v === null || v === undefined) return "empty";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 57) + "..." : v;
  return JSON.stringify(v).slice(0, 60);
};

// Columns that change automatically and add noise.
const QUIET = new Set(["updated_at"]);

const Changes = ({ e }: { e: Entry }) => {
  if (!e.changes) return null;
  if (e.action === "update") {
    const rows = Object.entries(e.changes as Record<string, [unknown, unknown]>).filter(([k]) => !QUIET.has(k));
    return (
      <ul className="mt-1 space-y-0.5">
        {rows.map(([k, [a, b]]) => (
          <li key={k} className="font-body text-xs text-slate">
            <span className="font-semibold text-ink">{k.replace(/_/g, " ")}</span>: {show(a)} <span className="text-brass-deep">→</span> {show(b)}
          </li>
        ))}
      </ul>
    );
  }
  const keys = ["status", "amount", "email", "full_name", "name", "kind", "role", "reason"].filter((k) => k in (e.changes ?? {}));
  return (
    <p className="font-body text-xs text-slate mt-1">
      {keys.map((k) => `${k.replace(/_/g, " ")}: ${show((e.changes as Record<string, unknown>)[k])}`).join(" · ") || "details recorded"}
    </p>
  );
};

/** Read-only history of everything admins (and Eban's automatic money jobs) changed. */
const AdminAudit = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState("all");
  const [who, setWho] = useState("all");
  const [limit, setLimit] = useState(100);

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from("admin_audit_log").select("*").order("at", { ascending: false }).limit(limit);
    if (table !== "all") q = q.eq("table_name", table);
    if (who !== "all") q = q.eq("actor_kind", who);
    const { data } = await q;
    setEntries((data ?? []) as Entry[]);
    setLoading(false);
  }, [table, who, limit]);
  useEffect(() => { load(); }, [load]);

  const tables = useMemo(() => Object.keys(TABLE_LABEL).sort((a, b) => TABLE_LABEL[a].localeCompare(TABLE_LABEL[b])), []);
  const select = "bg-paper border border-line rounded-lg px-3 py-2 font-body text-sm text-ink";

  return (
    <div className="min-h-screen bg-paper">
      <AdminNav />
      <main className={`${ADMIN_SIDEBAR_OFFSET_CLASS} px-4 sm:px-8 py-10`}>
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-7 h-7 text-brass-deep" />
            <h1 className="font-display text-3xl text-ink">Audit log</h1>
          </div>
          <p className="font-body text-sm text-slate mb-6">
            Every change made by an admin, and every automatic money action (payment auto-release, expired bookings). Entries can't be edited or deleted, by anyone.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <select className={select} value={table} onChange={(e) => setTable(e.target.value)} aria-label="What changed">
              <option value="all">Everything</option>
              {tables.map((t) => <option key={t} value={t}>{TABLE_LABEL[t]}</option>)}
            </select>
            <select className={select} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Who">
              <option value="all">Admins and automatic</option>
              <option value="admin">Admins only</option>
              <option value="system">Automatic only</option>
            </select>
          </div>

          {loading ? (
            <p className="font-body text-sm text-slate">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="font-body text-sm text-slate bg-card border border-line rounded-2xl p-6">Nothing recorded yet.</p>
          ) : (
            <ol className="bg-card border border-line rounded-2xl divide-y divide-line">
              {entries.map((e) => (
                <li key={e.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-body text-sm text-ink">
                      <span className="font-semibold">{e.actor_kind === "admin" ? e.actor_email ?? "An admin" : "Automatic"}</span>{" "}
                      {ACTION_LABEL[e.action]} a {(TABLE_LABEL[e.table_name] ?? e.table_name).toLowerCase()}
                      {e.row_id && <span className="font-mono text-[11px] text-slate"> #{e.row_id.slice(0, 8)}</span>}
                    </p>
                    <time className="font-body text-xs text-slate">{new Date(e.at).toLocaleString()}</time>
                  </div>
                  <Changes e={e} />
                </li>
              ))}
            </ol>
          )}
          {entries.length === limit && (
            <button onClick={() => setLimit((l) => l + 100)} className="mt-4 font-body text-sm text-brass-deep hover:text-ink">
              Show older entries
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminAudit;
