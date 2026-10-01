import { useEffect, useState, useCallback } from "react";
import { Eye, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";

interface VerificationRow {
  id: string;
  document_url: string;
  status: string;
  id_document_type: string | null;
  created_at: string;
  traveller_id: string;
  traveller_profiles: { name: string | null; school_affiliation: string | null } | null;
}

const AdminVerifications = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("verifications")
      .select("id, document_url, status, id_document_type, created_at, traveller_id, traveller_profiles(name, school_affiliation)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRows((data as unknown as VerificationRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleView = async (documentUrl: string) => {
    const { data, error } = await supabase.storage.from("verification-documents").createSignedUrl(documentUrl, 600);
    if (error || !data) {
      toast({ title: "Error", description: "Couldn't load the document.", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDecision = async (row: VerificationRow, decision: "approved" | "rejected") => {
    setBusy(row.id);
    const { error: verificationError } = await supabase
      .from("verifications")
      .update({ status: decision, reviewed_by: user?.id })
      .eq("id", row.id);
    const { error: profileError } = await supabase
      .from("traveller_profiles")
      .update({ verification_status: decision })
      .eq("id", row.traveller_id);
    setBusy(null);
    if (verificationError || profileError) {
      toast({ title: "Error", description: "Couldn't save the decision. Try again.", variant: "destructive" });
      return;
    }
    load();
  };

  const handleDelete = async (row: VerificationRow): Promise<string | null> => {
    const { data, error } = await supabase.from("verifications").delete().eq("id", row.id).select("id");
    if (error) return error.message;
    if (!data || data.length === 0) return "Nothing was deleted. You may not have permission.";
    // Best effort: also remove the uploaded document from storage.
    await supabase.storage.from("verification-documents").remove([row.document_url]);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    return null;
  };

  return (
    <div className={`min-h-screen bg-background ${ADMIN_SIDEBAR_OFFSET_CLASS}`}>
      <AdminNav />
      <div className="container mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold text-foreground mb-8">Traveler verifications</h1>

        {loading && <div className="font-body text-sm text-muted-foreground">Loading...</div>}
        {!loading && rows.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border font-body text-sm text-muted-foreground">
            No pending verifications.
          </div>
        )}

        <div className="grid gap-3 max-w-2xl">
          {rows.map((r) => (
            <div key={r.id} className="p-5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-sm font-bold text-foreground">{r.traveller_profiles?.name ?? "Traveler"}</p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {r.id_document_type} &middot; {r.traveller_profiles?.school_affiliation ?? "-"} &middot; {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleView(r.document_url)} className="p-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors" title="View document">
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDecision(r, "approved")}
                  disabled={busy === r.id}
                  className="p-2 rounded-lg bg-green-100 text-green-800 hover:opacity-80 transition-opacity disabled:opacity-50"
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDecision(r, "rejected")}
                  disabled={busy === r.id}
                  className="p-2 rounded-lg bg-red-100 text-red-800 hover:opacity-80 transition-opacity disabled:opacity-50"
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </button>
                <AdminDeleteButton
                  title="Delete this verification?"
                  description={`The ${r.id_document_type ?? "ID"} submission from ${r.traveller_profiles?.name ?? "this traveler"} will be permanently removed. This can't be undone.`}
                  onConfirm={() => handleDelete(r)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminVerifications;
