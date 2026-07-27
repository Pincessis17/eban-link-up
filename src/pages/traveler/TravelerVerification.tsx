import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTravellerProfile } from "@/hooks/useTravellerProfile";
import { toast } from "@/hooks/use-toast";
import { TravelerNav } from "@/components/TravelerNav";

const DOCUMENT_TYPES = ["Passport", "National ID", "Driver's License", "Student ID"];

interface VerificationRow {
  id: string;
  status: string;
  id_document_type: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-accent/20 text-accent-foreground",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const TravelerVerification = () => {
  const { user } = useAuth();
  const { travellerProfile } = useTravellerProfile();
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!travellerProfile) return;
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
    if (!user || !travellerProfile || !file) return;
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
      status: "pending",
    });

    setUploading(false);

    if (insertError) {
      toast({ title: "Error", description: "Upload succeeded but saving the record failed.", variant: "destructive" });
      return;
    }

    toast({ title: "Document submitted", description: "EBAN staff will review it shortly." });
    setFile(null);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <TravelerNav />
      <div className="container mx-auto px-6 py-10 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">ID verification</h1>
            <p className="font-body text-sm text-muted-foreground">
              Current status: <span className="font-semibold capitalize">{travellerProfile?.verification_status ?? "pending"}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 border border-border shadow-[var(--shadow-card)] mb-8">
          <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Document type</label>
          <select
            className="w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="font-display text-sm font-semibold text-foreground mb-1.5 block">Upload photo or scan</label>
          <input
            type="file"
            accept="image/*,.pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-sm text-foreground mb-4"
          />

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full bg-gradient-gold text-accent-foreground font-display font-bold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Submit for review"}
          </button>
        </form>

        <p className="font-display text-sm font-semibold text-foreground mb-3">Submission history</p>
        {loading && <div className="font-body text-sm text-muted-foreground">Loading...</div>}
        {!loading && rows.length === 0 && (
          <p className="font-body text-sm text-muted-foreground">No documents submitted yet.</p>
        )}
        <div className="grid gap-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="font-display text-sm font-semibold text-foreground">{r.id_document_type ?? "Document"}</p>
                <p className="font-body text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-display font-semibold capitalize ${statusColors[r.status] ?? statusColors.pending}`}>
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
