import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/marketplace";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Opens a dispute. The request freezes and funds stay in escrow until EBAN reviews it. */
export const ReportIssueButton = ({ requestId, onDone }: { requestId: string; onDone: () => void }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      toast({ title: "Tell us what went wrong", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("raise_dispute", { p_request_id: requestId, p_reason: reason.trim() });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't report the issue", description: errMsg(error), variant: "destructive" });
      return;
    }
    toast({ title: "Issue reported", description: "Payment stays in escrow while we review." });
    setOpen(false);
    setReason("");
    onDone();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-destructive hover:underline"
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Report an issue
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report an issue</AlertDialogTitle>
          <AlertDialogDescription>
            This freezes the delivery and keeps the payment in escrow until EBAN reviews what happened.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What went wrong?"
          className="w-full bg-background border border-border rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <button
            onClick={submit}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Sending..." : "Report issue"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
