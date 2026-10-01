import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminDeleteButtonProps {
  title: string;
  description: string;
  /** Return an error message to show, or null on success. */
  onConfirm: () => Promise<string | null>;
  label?: string;
}

export const AdminDeleteButton = ({ title, description, onConfirm, label }: AdminDeleteButtonProps) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onConfirm();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setOpen(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          title={label ?? "Delete"}
          className="flex items-center gap-1.5 p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors font-body text-xs font-semibold"
        >
          <Trash2 className="w-4 h-4" />
          {label && <span>{label}</span>}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="font-body text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
