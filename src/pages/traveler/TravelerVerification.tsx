import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Upload, FileText, CheckCircle2, Clock, XCircle, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { toast } from "@/hooks/use-toast";
import { TravelerNav } from "@/components/TravelerNav";

// TESTING MODE: when true, uploading an ID verifies the traveler immediately, with no admin review.
// Set to false before launch so every ID goes through Admin > ID Verifications.
const AUTO_APPROVE_ON_UPLOAD = true;

const DOCUMENT_TYPES = ["Passport", "National ID", "Driver's License", "Student ID"];

interface VerificationRow {
  id: string;
  status: string;
  id_document_type: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-gold/15 text-gold-dark border-gold/30",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const TravelerVerification = () => {
  const { user } = useAuth();
  const { travellerProfile, refresh } = useTravellerProfile();
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!travellerProfile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("verifications")
      .select("id, status, id_document_type, created_at")
      .eq("traveller_id", travellerProfile.id)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, [travellerProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    if (!travellerProfile) {
      toast({ title: "Profile not ready", description: "Please refresh the page and try again.", variant: "destructive" });
      return;
    }
    setUploading(true);

    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("verification-documents").upload(path, file);

    if (uploadError) {
      setUploading(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { error: insertError } = await supabase.from("verifications").insert({
      traveller_id: travellerProfile.id,
      document_url: path,
      id_document_type: docType,
      status: AUTO_APPROVE_ON_UPLOAD ? "approved" : "pending",
    });

    setUploading(false);

    if (insertError) {
      toast({ title: "Error", description: "Upload succeeded but saving the record failed.", variant: "destructive" });
      return;
    }

    if (AUTO_APPROVE_ON_UPLOAD) {
      const { error: approveError } = await supabase
        .from("traveller_profiles")
        .update({ verification_status: "approved" })
        .eq("id", travellerProfile.id);
      if (approveError) {
        toast({ title: "Error", description: approveError.message, variant: "destructive" });
        return;
      }
      toast({ title: "Verified!", description: "Your ID was received. You can now be booked and claim requests." });
    } else {
      toast({ title: "Document submitted", description: "Our team will review your ID within 24 hours." });
    }
    setFile(null);
    await refresh();
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />

      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-light text-foreground">Identity Verification</h1>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              Verification Status: <span className="font-semibold text-gold-dark uppercase tracking-wider">{travellerProfile?.verification_status === "pending" && !loading && rows.length === 0 ? "not submitted" : travellerProfile?.verification_status ?? "loading"}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-3xl p-8 border border-border/80 shadow-[var(--shadow-card)] mb-10">
          <div className="space-y-6">
            <div>
              <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Document Type</label>
              <select
                className="w-full bg-card border border-border/80 rounded-xl px-4 py-3 font-body text-sm text-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-body text-xs font-semibold uppercase tracking-wider text-foreground mb-2 block">Passport / ID Upload</label>
              <div className="border-2 border-dashed border-border/80 rounded-2xl p-8 text-center hover:border-gold/50 transition-colors bg-secondary/30 relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <Upload className="w-10 h-10 text-gold-dark/60 mb-3" />
                  <p className="font-body text-sm font-semibold text-foreground">
                    {file ? file.name : "Click or drag & drop photo/scan here"}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Supports PNG, JPG, or PDF (Max 10MB)</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-gradient-gold text-accent-foreground font-body font-bold text-xs uppercase tracking-widest py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md glow-gold"
            >
              <Upload className="w-4 h-4" /> {uploading ? "Submitting Document..." : "Submit for Verification Review"}
            </button>
          </div>
        </form>

        <h3 className="font-display text-2xl font-light text-foreground mb-4">Submission History</h3>
        {loading && <div className="font-body text-sm text-muted-foreground">Loading submissions...</div>}
        {!loading && rows.length === 0 && (
          <p className="font-body text-sm text-muted-foreground bg-card p-6 rounded-2xl border border-border">No documents submitted yet.</p>
        )}

        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-gold-dark" />
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">{r.id_document_type ?? "Document"}</p>
                  <p className="font-body text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <span className={`px-3.5 py-1 rounded-full text-xs font-body font-semibold uppercase tracking-wider border ${statusColors[r.status] ?? statusColors.pending}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TravelerVerification;

