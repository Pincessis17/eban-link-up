import { useCallback, useEffect, useState } from "react";
import { Upload, ShieldCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/marketplace";
import { SenderNav } from "@/components/SenderNav";
import { TravelerNav } from "@/components/TravelerNav";
import { AdminNav } from "@/components/AdminNav";

const DOCUMENT_TYPES = ["Passport", "National ID", "Driver's License", "Student ID"];
type Doc = { id: string; status: string; id_document_type: string; reviewer_note: string | null; created_at: string };

const VerifyId = () => {
  const { user, profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("id_documents")
      .select("id, status, id_document_type, reviewer_note, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const latest = docs[0];
  const blocked = latest && (latest.status === "pending" || latest.status === "approved");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too big", description: "Please use a file under 10MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/id-${Date.now()}-${safe}`;
      const up = await supabase.storage.from("verification-documents").upload(path, file);
      if (up.error) throw up.error;
      const { error } = await (supabase as any).rpc("submit_id_document", { p_path: path, p_type: docType });
      if (error) throw error;
      toast({ title: "ID submitted", description: "Our team will review it within 24 hours." });
      setFile(null);
      load();
    } catch (err) {
      toast({ title: "Could not submit", description: errMsg(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const Nav = profile?.role === "Admin" ? AdminNav : profile?.role === "Traveller" ? TravelerNav : SenderNav;
  const Icon = latest?.status === "approved" ? CheckCircle2 : latest?.status === "pending" ? Clock : latest?.status === "rejected" ? XCircle : ShieldCheck;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-md">
            <Icon className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-light text-foreground">Upload your ID</h1>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              Everyone on Eban, senders and travellers, shows an ID. Only the Eban team can see it.
            </p>
          </div>
        </div>

        {latest?.status === "approved" && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 font-body text-sm text-emerald-800">Your ID is verified. Nothing more to do here.</div>
        )}
        {latest?.status === "pending" && (
          <div className="mb-6 rounded-2xl border border-gold/30 bg-gold/10 p-5 font-body text-sm text-foreground">Your ID is with our team for review.</div>
        )}
        {latest?.status === "rejected" && (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 font-body text-sm text-destructive">
            Your last ID was not accepted{latest.reviewer_note ? `: ${latest.reviewer_note}` : "."} Please upload a clearer one.
          </div>
        )}

        {!blocked && (
          <form onSubmit={submit} className="bg-card rounded-3xl p-6 sm:p-8 border border-border/80 shadow-[var(--shadow-card)] space-y-6">
            <div>
              <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Document type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20">
                {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Photo or scan</label>
              <div className="border-2 border-dashed border-border/80 rounded-2xl p-8 text-center bg-secondary/30 relative">
                <input type="file" accept="image/*,.pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Upload className="w-9 h-9 text-gold-dark/60 mx-auto mb-3" />
                <p className="font-body text-sm font-semibold text-foreground break-all">{file ? file.name : "Tap to choose a photo or PDF"}</p>
                <p className="font-body text-xs text-muted-foreground mt-1">PNG, JPG or PDF, up to 10MB. All four corners visible.</p>
              </div>
            </div>
            <button type="submit" disabled={uploading || !file}
              className="w-full bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-widest py-4 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
              <Upload className="w-4 h-4" /> {uploading ? "Submitting..." : "Submit ID for review"}
            </button>
          </form>
        )}

        {docs.length > 1 && (
          <div className="mt-8">
            <h3 className="font-display text-xl font-light mb-3">History</h3>
            <div className="grid gap-2">
              {docs.map((d) => (
                <div key={d.id} className="flex justify-between p-4 rounded-xl border border-border/80 bg-card font-body text-sm">
                  <span>{d.id_document_type} · {new Date(d.created_at).toLocaleDateString()}</span>
                  <span className="uppercase text-xs font-semibold tracking-wider">{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyId;
