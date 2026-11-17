import { supabase } from "@/integrations/supabase/client";

export type EvidenceKind = "payment_proof" | "handover_photo" | "delivery_photo";

export type Evidence = {
  id: string;
  request_id: string;
  kind: EvidenceKind;
  file_path: string;
  uploaded_by: string;
  note: string | null;
  created_at: string;
};

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  payment_proof: "Proof of payment",
  handover_photo: "Collection photo",
  delivery_photo: "Delivery photo",
};

const BUCKET = "request-evidence";
const MAX_SIDE = 1600;

/** Phone photos are often 5-10 MB. Shrink images to at most 1600px on the long side (JPEG); leave PDFs alone. */
const shrink = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith("image/") || file.type === "image/heic" || file.type === "image/heif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
};

const extOf = (blob: Blob, file: File) => {
  if (blob.type === "image/jpeg") return "jpg";
  if (blob.type === "application/pdf") return "pdf";
  const fromName = file.name.split(".").pop()?.toLowerCase();
  return fromName && fromName.length <= 5 ? fromName : "bin";
};

/** Uploads the file and records it against the request. Throws a readable error. */
export const uploadEvidence = async (
  userId: string,
  requestId: string,
  kind: EvidenceKind,
  file: File,
  note?: string,
): Promise<void> => {
  if (file.size > 25 * 1024 * 1024) throw new Error("That file is too big. Please use a photo or PDF under 10 MB.");
  const blob = await shrink(file);
  if (blob.size > 10 * 1024 * 1024) throw new Error("That file is too big. Please use a photo or PDF under 10 MB.");
  const path = `${userId}/${requestId}/${kind}-${Date.now()}.${extOf(blob, file)}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) throw new Error(upErr.message || "Couldn't upload the file. Try again.");
  const { error } = await (supabase as any).rpc("add_request_evidence", {
    p_request: requestId,
    p_kind: kind,
    p_path: path,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message || "Couldn't save the file. Try again.");
};

/** Evidence for one request (only what this person is allowed to see), each with a link that works for 1 hour. */
export const loadEvidence = async (requestId: string): Promise<(Evidence & { url: string | null })[]> => {
  const { data } = await (supabase as any)
    .from("request_evidence")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Evidence[];
  if (!rows.length) return [];
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.file_path), 3600);
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, url: byPath.get(r.file_path) ?? null }));
};

export const hasKind = (rows: Evidence[], kind: EvidenceKind) => rows.some((r) => r.kind === kind);
