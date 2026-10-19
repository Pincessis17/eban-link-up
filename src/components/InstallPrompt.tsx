import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "eban-install-dismissed";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Small bottom banner on phones: one-tap install on Android, "Add to Home Screen" steps on iPhone. */
const InstallPrompt = () => {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      if (isStandalone()) return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setHidden(true);
    window.addEventListener("appinstalled", onInstalled);
    if (isIos()) setHidden(false);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (event) {
      await event.prompt();
      await event.userChoice;
      setEvent(null);
      setHidden(true);
    } else {
      setShowIos((v) => !v);
    }
  };

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Install Eban</p>
            <p className="text-xs text-muted-foreground">Add it to your home screen for quick access.</p>
          </div>
          <Button size="sm" onClick={install}>
            <Download className="mr-1 h-4 w-4" /> Install
          </Button>
          <button onClick={dismiss} aria-label="Dismiss" className="p-1 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {showIos && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            In Safari, tap the <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share button, then choose{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;
