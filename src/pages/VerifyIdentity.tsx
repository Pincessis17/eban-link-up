import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Video, CheckCircle2, Clock, XCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/marketplace";
import { SenderNav } from "@/components/SenderNav";
import { TravelerNav } from "@/components/TravelerNav";
import { AdminNav } from "@/components/AdminNav";

const SECONDS = 12;
const MIME_CHOICES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
const pickMime = () => (typeof MediaRecorder === "undefined" ? "" : MIME_CHOICES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "");
const randomCode = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");

type Check = { id: string; status: string; reviewer_note: string | null; created_at: string };

const VerifyIdentity = () => {
  const { user, profile } = useAuth();
  const [latest, setLatest] = useState<Check | null>(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"idle" | "ready" | "recording" | "review" | "uploading" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [code] = useState(randomCode);
  const [turnLeftFirst] = useState(() => Math.random() < 0.5);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);

  const loadLatest = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("identity_checks").select("id, status, reviewer_note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setLatest((data as Check) ?? null);
  }, [user]);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => () => {
    stopStream();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const openCamera = async () => {
    setError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      }
      streamRef.current = stream;
      setPhase("ready");
      requestAnimationFrame(() => {
        if (liveRef.current) {
          liveRef.current.srcObject = stream;
          liveRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("We couldn't open your camera. Allow camera access in your browser settings and try again.");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = pickMime();
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime, videoBitsPerSecond: 1_000_000 } : { videoBitsPerSecond: 1_000_000 });
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || "video/webm" });
      blobRef.current = blob;
      setClipUrl(URL.createObjectURL(blob));
      stopStream();
      setPhase("review");
    };
    recRef.current = rec;
    rec.start(500);
    setElapsed(0);
    setPhase("recording");
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setElapsed(s);
      if (s >= SECONDS) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        rec.state !== "inactive" && rec.stop();
      }
    }, 250);
  };

  const retake = () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    setClipUrl(null);
    blobRef.current = null;
    setPhase("idle");
  };

  const submit = async () => {
    if (!user || !blobRef.current) return;
    setPhase("uploading");
    const blob = blobRef.current;
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("kyc-videos").upload(path, blob, { contentType: blob.type, upsert: false });
    if (upErr) {
      setPhase("review");
      return toast({ title: "Upload failed", description: errMsg(upErr), variant: "destructive" });
    }
    const { error } = await (supabase as any).rpc("submit_identity_video", { p_path: path, p_mime: blob.type, p_seconds: Math.min(elapsed, SECONDS), p_challenge: code });
    if (error) {
      setPhase("review");
      return toast({ title: "Couldn't submit", description: errMsg(error), variant: "destructive" });
    }
    setPhase("done");
    loadLatest();
  };

  const step = elapsed < 3 ? "Look straight at the camera" : elapsed < 6 ? `Slowly turn your head ${turnLeftFirst ? "left" : "right"}` : elapsed < 9 ? `Now turn ${turnLeftFirst ? "right" : "left"}` : `Say your full name and the numbers ${code.split("").join(" ")}`;

  const Nav = profile?.role === "Admin" ? AdminNav : profile?.role === "Traveller" ? TravelerNav : SenderNav;
  const canStart = !latest || latest.status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-6 py-10 max-w-xl">
        <h1 className="font-display text-3xl md:text-[34px] leading-tight text-ink flex items-center gap-3">
          <Video className="w-7 h-7 text-gold-dark" /> Face check
        </h1>
        <p className="font-body text-sm text-muted-foreground mt-2">
          A short video so the EBAN team can confirm you are a real person. Senders and travelers both do this. A member of the team reviews every video by hand.
        </p>

        {latest && (
          <div className={`mt-6 rounded-2xl border p-5 font-body text-sm flex items-start gap-3 ${latest.status === "approved" ? "border-emerald-500/40 bg-emerald-500/10" : latest.status === "rejected" ? "border-destructive/40 bg-destructive/10" : "border-gold/40 bg-gold/10"}`}>
            {latest.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : latest.status === "rejected" ? <XCircle className="w-5 h-5 text-destructive shrink-0" /> : <Clock className="w-5 h-5 text-gold-dark shrink-0" />}
            <div>
              <p className="font-semibold text-foreground">
                {latest.status === "approved" ? "Your face check is approved" : latest.status === "rejected" ? "Your last video was not accepted" : "Your video is waiting for review"}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {latest.status === "pending" && "We usually review within a day. You will see a badge on your profile once it is approved."}
                {latest.status === "approved" && "A badge shows on your profile so other people know you are verified."}
                {latest.status === "rejected" && (latest.reviewer_note ? `Reason: ${latest.reviewer_note}. You can record a new one below.` : "You can record a new one below.")}
              </p>
            </div>
          </div>
        )}

        {canStart && phase !== "done" && (
          <div className="mt-6 bg-card rounded-2xl border border-border/80 p-6">
            {phase === "idle" && (
              <>
                <ol className="font-body text-sm text-foreground list-decimal pl-5 space-y-1.5 mb-5">
                  <li>Find good light and take off glasses or a hat.</li>
                  <li>Look at the camera, then slowly turn your head left and right.</li>
                  <li>Say your full name and the 4 numbers we show you.</li>
                </ol>
                <label className="flex items-start gap-3 font-body text-xs text-muted-foreground mb-5 cursor-pointer">
                  <input id="kyc-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                  <span>I agree to record a short video of my face. Only the EBAN team can watch it, and it is used only to check that I am a real person.</span>
                </label>
                <button disabled={!consent} onClick={openCamera} className="bg-gradient-gold text-accent-foreground font-body font-semibold text-xs px-6 py-3 rounded-xl disabled:opacity-50">
                  Open camera
                </button>
              </>
            )}

            {(phase === "ready" || phase === "recording") && (
              <>
                <div className="relative mx-auto w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-black">
                  <video ref={liveRef} muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 46% 38% at 50% 46%, transparent 98%, rgba(0,0,0,.55) 100%)" }} />
                  <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[72%] h-[60%] rounded-[50%] border-4 border-white/80 pointer-events-none" />
                  {phase === "recording" && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-center font-body text-sm py-3 px-3">{step}</div>
                  )}
                </div>
                {phase === "recording" ? (
                  <div className="mt-4">
                    <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-gradient-gold transition-all" style={{ width: `${Math.min(100, (elapsed / SECONDS) * 100)}%` }} /></div>
                    <p className="font-body text-xs text-muted-foreground mt-2 text-center">Recording {elapsed}s of {SECONDS}s</p>
                  </div>
                ) : (
                  <div className="mt-4 text-center">
                    <p className="font-body text-xs text-muted-foreground mb-3">Fit your face inside the oval, then start. Numbers to say: <strong className="text-foreground tracking-widest">{code.split("").join(" ")}</strong></p>
                    <button onClick={startRecording} className="bg-destructive text-destructive-foreground font-body font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl">Start recording</button>
                  </div>
                )}
              </>
            )}

            {(phase === "review" || phase === "uploading") && clipUrl && (
              <>
                <video src={clipUrl} controls playsInline className="mx-auto w-full max-w-sm rounded-2xl bg-black" style={{ aspectRatio: "3 / 4" }} />
                <p className="font-body text-xs text-muted-foreground mt-3 text-center">Check that your face is clear and you can hear yourself.</p>
                <div className="flex justify-center gap-3 mt-4">
                  <button disabled={phase === "uploading"} onClick={retake} className="inline-flex items-center gap-1.5 border border-border text-xs font-body font-semibold px-5 py-3 rounded-xl text-muted-foreground disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Retake</button>
                  <button disabled={phase === "uploading"} onClick={submit} className="bg-gradient-gold text-accent-foreground font-body font-semibold text-xs px-6 py-3 rounded-xl disabled:opacity-50">
                    {phase === "uploading" ? "Uploading..." : "Submit for review"}
                  </button>
                </div>
              </>
            )}
            {error && <p className="font-body text-sm text-destructive mt-4">{error}</p>}
          </div>
        )}

        {phase === "done" && (
          <div className="mt-6 bg-card rounded-2xl border border-border/80 p-6 text-center font-body text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-foreground">Video submitted</p>
            <p className="text-muted-foreground text-xs mt-1">The EBAN team will review it, usually within a day.</p>
            <Link to="/profile" className="inline-block mt-4 text-xs font-semibold text-gold-dark hover:underline">Back to your profile</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyIdentity;
