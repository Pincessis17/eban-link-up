import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { EVIDENCE_LABEL, Evidence, loadEvidence } from "@/lib/evidence";

type Row = Evidence & { url: string | null };

/** Shows the photos and receipts on a request that the viewer is allowed to see. Renders nothing if there are none. */
export const EvidenceGallery = ({
  requestId,
  refreshKey,
  title = "Photos and receipts",
  compact = false,
}: {
  requestId: string;
  refreshKey?: unknown;
  title?: string;
  compact?: boolean;
}) => {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => setRows(await loadEvidence(requestId)), [requestId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!rows.length) return null;

  return (
    <div className={compact ? "" : "bg-card rounded-2xl border border-line p-5"}>
      {!compact && <p className="font-display text-lg text-ink mb-3">{title}</p>}
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
        {rows.map((r) => {
          const isPdf = r.file_path.toLowerCase().endsWith(".pdf");
          return (
            <a
              key={r.id}
              href={r.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-lg border border-line overflow-hidden bg-paper hover:border-brass transition-colors"
              title="Open full size"
            >
              {r.url && !isPdf ? (
                <img src={r.url} alt={EVIDENCE_LABEL[r.kind]} className={`w-full object-cover ${compact ? "h-20" : "h-32"}`} loading="lazy" />
              ) : (
                <div className={`flex items-center justify-center ${compact ? "h-20" : "h-32"} text-brass-deep`}>
                  <FileText className="w-7 h-7" />
                </div>
              )}
              <div className="px-2 py-1.5">
                <p className="font-body text-[11px] font-semibold text-ink leading-tight">{EVIDENCE_LABEL[r.kind]}</p>
                <p className="font-body text-[10px] text-slate">
                  {new Date(r.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                {r.note && <p className="font-body text-[10px] text-slate truncate">Ref: {r.note}</p>}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
