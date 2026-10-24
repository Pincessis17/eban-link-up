import { useState } from "react";
import { PackageX } from "lucide-react";
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

/** Sender says the traveler marked it delivered but the item never arrived. Freezes the payment in escrow. */
export const ReportNotReceivedButton = ({ requestId, onDone }: { requestId: string; onDone: () => void }) => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("report_not_received", { p_request_id: requestId, p_details: details.trim() || undefined });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't send the report", description: errMsg(error), variant: "destructive" });
      return;
    }
    toast({ title: "Report sent", description: "Your payment stays in escrow while EBAN looks into it." });
    setOpen(false);
    setDetails("");
    onDone();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 border border-destructive/40 text-destructive font-body font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl hover:bg-destructive/10 transition-all whitespace-nowrap"
        >
          <PackageX className="w-4 h-4" /> I haven't received it
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You haven't received the item?</AlertDialogTitle>
          <AlertDialogDescription>
            Your payment stays in escrow and the traveler is not paid. EBAN reviews what happened and either refunds you or releases the payment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <textarea
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Tell us what you know: where you expected it, when, anything the traveler said (optional)"
          className="w-full bg-background border border-border rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <button
            onClick={submit}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Sending..." : "Report not received"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
