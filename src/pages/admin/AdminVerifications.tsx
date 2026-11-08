import { useEffect, useState, useCallback } from "react";
import { Eye, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { AdminNav, ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/AdminNav";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";
import { ReviewBadge, ReviewTabs, type ReviewFilter } from "@/components/ReviewStatus";

/** One row on the page, from either the shared ID table (everyone) or the older traveller-only table. */
type Item = {
  key: string;
  source: "id" | "legacy";
  id: string;
  name: string;
  detail: string;
  docType: string;
  documentUrl: string;
  status: string;
  note: string | null;
  createdAt: string;
  travellerId?: string;
};

const AdminVerifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: idData }, { data: legacy }] = await Promise.all([
      (supabase as any)
        .from("id_documents")
        .select("id, user_id, document_url, id_document_type, status, reviewer_note, created_at, profiles:user_id(full_name, email, role)")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("verifications")
        .select("id, document_url, status, id_document_type, created_at, traveller_id, traveller_profiles(name, user_id)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    const a: Item[] = ((idData as any[]) ?? []).map((r) => ({
      key: `id-${r.id}`,
      source: "id",
      id: r.id,
      name: r.profiles?.full_name ?? r.profiles?.email ?? "User",
      detail: [r.profiles?.role, r.profiles?.email].filter(Boolean).join(" · "),
      docType: r.id_document_type,
      documentUrl: r.document_url,
      status: r.status,
      note: r.reviewer_note,
      createdAt: r.created_at,
    }));
    const b: Item[] = ((legacy as any[]) ?? []).map((r) => ({
      key: `legacy-${r.id}`,
      source: "legacy",
      id: r.id,
      name: r.traveller_profiles?.name ?? "Traveller",
      detail: "Traveller (older upload)",
      docType: r.id_document_type ?? "ID",
      documentUrl: r.document_url,
      status: r.status,
      note: null,
      createdAt: r.created_at,
      travellerId: r.traveller_id,
    }));
    // Waiting first, newest first. Order is kept after a decision so the row stays put and just changes label.
    const rank = (st: string) => (st === "pending" ? 0 : 1);
    setItems([...a, ...b].sort((x, y) => rank(x.status) - rank(y.status) || y.createdAt.localeCompare(x.createdAt)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from("verification-documents").createSignedUrl(path, 600);
    if (error || !data) return toast({ title: "Couldn't open the document", variant: "destructive" });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const decide = async (it: Item, approve: boolean) => {
    let note: string | null = null;
    if (!approve) {
      note = window.prompt("Reason for declining (the person will see this):");
      if (note === null) return;
    }
    setBusy(it.key);
    let error: { message: string } | null = null;
    if (it.source === "id") {
      ({ error } = await (supabase as any).rpc("admin_review_id_document", { p_id: it.id, p_approve: approve, p_note: note }));
    } else {
      const status = approve ? "approved" : "rejected";
      const r1 = await supabase.from("verifications").update({ status, reviewed_by: user?.id }).eq("id", it.id);
      const r2 = await supabase.from("traveller_profiles").update({ verification_status: status }).eq("id", it.travellerId!);
      error = r1.error ?? r2.error;
    }
    setBusy(null);
    if (error) return toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    // Keep the row on screen with its new label.
    setItems((prev) => prev.map((p) => (p.key === it.key ? { ...p, status: approve ? "approved" : "rejected", note } : p)));
    toast({ title: approve ? "Approved" : "Declined", description: approve ? `${it.name} is now ID verified.` : `${it.name} can upload again.` });
  };

  const remove = async (it: Item): Promise<string | null> => {
    if (it.source === "id") {
      const { data: path, error } = await (supabase as any).rpc("admin_delete_id_document", { p_id: it.id });
      if (error) return error.message;
      if (path) await supabase.storage.from("verification-documents").remove([path as string]);
    } else {
      const { data, error } = await supabase.from("verifications").delete().eq("id", it.id).select("id");
      if (error) return error.message;
      if (!data || data.length === 0) return "Nothing was deleted. You may not have permission.";
      await supabase.storage.from("verification-documents").remove([it.documentUrl]);
    }
    setItems((prev) => prev.filter((p) => p.key !== it.key));
    return null;
  };

  const counts = {
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    all: items.length,
  };
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div className={`min-h-screen bg-background ${ADMIN_SIDEBAR_OFFSET_CLASS}`}>
      <AdminNav />
      <div className="container mx-auto py-10 max-w-3xl">
        <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink mb-2">ID verifications</h1>
        <p className="font-body text-sm text-slate mb-6">Open each document, then approve or decline. Reviewed IDs stay here with their result, and you can delete any of them.</p>
        <ReviewTabs value={filter} onChange={setFilter} counts={counts} />

        {loading && <p className="font-body text-sm text-slate">Loading...</p>}
        {!loading && shown.length === 0 && (
          <div className="text-center py-14 bg-card rounded-xl border border-line font-body text-sm text-slate">
            {filter === "pending" ? "Nothing waiting for review." : "Nothing here yet."}
          </div>
        )}

        <div className="grid gap-3">
          {shown.map((it) => (
            <div key={it.key} className="p-5 rounded-xl border border-line bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-body text-[15px] font-semibold text-ink">{it.name}</p>
                  <ReviewBadge status={it.status} />
                </div>
                <p className="font-body text-sm text-slate mt-1">
                  {it.docType} · {it.detail} · {new Date(it.createdAt).toLocaleDateString()}
                </p>
                {it.status === "rejected" && it.note && <p className="font-body text-sm text-kente mt-1">Reason: {it.note}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => view(it.documentUrl)} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white font-body text-sm font-semibold text-ink hover:bg-paper-2">
                  <Eye className="w-4 h-4" /> View
                </button>
                {it.status === "pending" && (
                  <>
                    <button onClick={() => decide(it, true)} disabled={busy === it.key} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-forest text-white font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => decide(it, false)} disabled={busy === it.key} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-kente/30 text-kente font-body text-sm font-semibold hover:bg-kente/5 disabled:opacity-50">
                      <X className="w-4 h-4" /> Decline
                    </button>
                  </>
                )}
                <AdminDeleteButton
                  title="Delete this ID?"
                  description={`${it.name}'s ${it.docType} and its record will be permanently removed. If it was approved, they will need to upload an ID again. This can't be undone.`}
                  onConfirm={() => remove(it)}
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
