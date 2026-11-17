import { useEffect, useRef, useState } from "react";
import { Camera, FileText, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { EvidenceKind, uploadEvidence } from "@/lib/evidence";

/**
 * Pick a photo (or, for payment proof, a PDF), preview it, then upload it against the request.
 * Calls onUploaded once the file is saved, so the page can move on to the next step.
 */
export const EvidencePicker = ({
  requestId,
  kind,
  title,
  hint,
  buttonLabel,
  onUploaded,
  withNote = false,
}: {
  requestId: string;
  kind: EvidenceKind;
  title: string;
  hint: string;
  buttonLabel: string;
  onUploaded: () => void | Promise<void>;
  withNote?: boolean;
}) => {
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isPhoto = kind !== "payment_proof";

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const send = async () => {
    if (!file || !user) return;
    setBusy(true);
    try {
      await uploadEvidence(user.id, requestId, kind, file, withNote ? note : undefined);
      await onUploaded();
    } catch (e) {
      toast({ title: "Couldn't upload", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-paper-2/50 p-4 space-y-3">
      <div>
        <p className="font-display text-base text-ink">{title}</p>
        <p className="font-body text-xs text-slate mt-1">{hint}</p>
      </div>

      <input
        ref={input}
        type="file"
        className="hidden"
        accept={isPhoto ? "image/*" : "image/*,application/pdf"}
        {...(isPhoto ? { capture: "environment" as const } : {})}
        onChange={(e) => choose(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="w-full border border-dashed border-brass/60 rounded-lg py-6 flex flex-col items-center gap-2 text-brass-deep hover:bg-brass/5 transition-colors"
        >
          {isPhoto ? <Camera className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          <span className="font-body text-sm font-semibold">{isPhoto ? "Take or choose a photo" : "Choose a screenshot or PDF"}</span>
        </button>
      ) : (
        <div className="space-y-3">
          {preview ? (
            <img src={preview} alt="" className="w-full max-h-72 object-contain rounded-lg border border-line bg-paper" />
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-line bg-paper p-3 font-body text-sm text-ink">
              <FileText className="w-4 h-4 text-brass-deep" /> {file.name}
            </div>
          )}
          <button type="button" onClick={() => choose(null)} className="flex items-center gap-1 font-body text-xs text-slate hover:text-ink">
            <RotateCcw className="w-3.5 h-3.5" /> Choose a different file
          </button>
        </div>
      )}

      {withNote && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          placeholder="Transaction reference (optional)"
          className="w-full bg-paper border border-line rounded-lg px-3 py-2 font-body text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-brass/40"
        />
      )}

      <button
        type="button"
        onClick={send}
        disabled={!file || busy}
        className="w-full bg-gradient-gold text-accent-foreground font-display font-semibold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {busy ? "Uploading..." : buttonLabel}
      </button>
    </div>
  );
};
