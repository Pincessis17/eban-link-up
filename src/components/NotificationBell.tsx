import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { emitLiveChange } from "@/lib/liveRefresh";
import { toast as popup } from "sonner";
import { playSound } from "@/lib/sounds";
import ebanSymbol from "@/assets/eban-symbol.png";
import { pushState, refreshPushRegistration, turnPushOn, PUSH_HELP, type PushState } from "@/lib/push";
import { toast } from "@/hooks/use-toast";

type Note = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  link: string | null;
  read_status: boolean;
  created_at: string;
};

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

// A page can show two bells (admin sidebar and mobile bar); each notification pops up only once.
const shown = new Set<string>();

/** The popup shown at the top of the screen when a notification arrives while the app is open. */
const NotePopup = ({ note, onOpen, onClose }: { note: Note; onOpen: () => void; onClose: () => void }) => (
  <div className="w-[356px] max-w-[calc(100vw-24px)] rounded-2xl border border-line bg-paper shadow-[0_18px_50px_-18px_rgba(12,17,25,0.4)] overflow-hidden">
    <div className="kente-rail" />
    <div className="flex items-start gap-3 p-4">
      <img src={ebanSymbol} alt="" className="w-9 h-9 shrink-0 object-contain" />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-deep">Eban · now</span>
        <span className="block font-body text-[14px] font-semibold text-ink mt-0.5">{note.title ?? "Update"}</span>
        <span className="block font-body text-[13px] leading-snug text-slate mt-0.5 line-clamp-3">{note.message}</span>
      </button>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 rounded-md p-1 text-slate hover:text-ink">
        <X className="w-4 h-4" />
      </button>
    </div>
    {note.link && (
      <div className="px-4 pb-3 -mt-1 flex justify-end">
        <button type="button" onClick={onOpen} className="h-9 px-4 rounded-full bg-ink font-body text-[13px] font-semibold text-paper hover:bg-ink-2">View</button>
      </div>
    )}
  </div>
);

/** Bell with unread count. Live: new notifications appear without a refresh, with a popup and a soft chime. */
export const NotificationBell = ({ dark = false }: { dark?: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [push, setPush] = useState<PushState | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, message, link, read_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read_status", false),
    ]);
    setNotes((data as Note[]) ?? []);
    setUnread(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    // Each bell gets its own channel: a page can show more than one bell (e.g. the admin sidebar and mobile bar),
    // and reusing one channel name makes the second bell crash the page.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`notifications-${user.id}-${Math.random().toString(36).slice(2, 10)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload: { eventType: string; new: Partial<Note> }) => {
            load();
            emitLiveChange();
            const n = payload.new as Note;
            if (payload.eventType !== "INSERT" || !n?.id || shown.has(n.id)) return;
            shown.add(n.id);
            // When the app isn't on screen, the phone or computer notification plays its own sound.
            if (document.visibilityState === "visible") playSound("notify");
            popup.custom(
              (id) => (
                <NotePopup
                  note={n}
                  onClose={() => popup.dismiss(id)}
                  onOpen={() => {
                    popup.dismiss(id);
                    supabase.from("notifications").update({ read_status: true }).eq("id", n.id).then(() => load());
                    if (n.link) navigate(n.link);
                  }}
                />
              ),
              { duration: 7000 },
            );
          },
        )
        .subscribe();
    } catch (e) {
      console.warn("Live notifications unavailable; falling back to polling", e);
    }
    // Fallback for networks that block live updates
    const t = window.setInterval(load, 60_000);
    return () => {
      window.clearInterval(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, load, navigate]);

  // Keep this device registered for notifications, and know whether to offer turning them on.
  useEffect(() => {
    if (!user) return;
    refreshPushRegistration();
    pushState().then(setPush).catch(() => setPush("unsupported"));
  }, [user]);

  const enablePush = async () => {
    try {
      const next = await turnPushOn();
      setPush(next);
      if (next === "on") toast({ title: "Notifications on", description: "You'll get a notification on this device when something happens." });
      else toast({ title: "Notifications not turned on", description: PUSH_HELP[next], variant: "destructive" });
    } catch {
      toast({ title: "Couldn't turn on notifications", description: "Please try again from your profile.", variant: "destructive" });
    }
  };

  if (!user) return null;

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setNotes((n) => n.map((x) => (ids.includes(x.id) ? { ...x, read_status: true } : x)));
    setUnread((u) => Math.max(0, u - ids.length));
    await supabase.from("notifications").update({ read_status: true }).in("id", ids);
  };

  const openNote = async (n: Note) => {
    if (!n.read_status) await markRead([n.id]);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const unreadIds = notes.filter((n) => !n.read_status).map((n) => n.id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative p-2 rounded-full transition-colors ${dark ? "text-paper/70 hover:text-paper hover:bg-white/5" : "text-slate hover:text-ink"}`}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-kente text-[10px] font-body font-bold text-paper flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] max-w-[calc(100vw-24px)] p-0 bg-paper border-line text-ink">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="font-display text-base">Notifications</span>
          {unreadIds.length > 0 && (
            <button onClick={() => markRead(unreadIds)} className="flex items-center gap-1 text-[12px] font-body text-brass-deep hover:text-ink">
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
        {(push === "off" || push === "install-first") && (
          <div className="px-4 py-3 border-b border-line bg-brass/5">
            <p className="font-body text-[13px] font-semibold text-ink">Never miss an update</p>
            <p className="font-body text-[12px] text-slate leading-snug mt-0.5">
              {push === "off" ? "Get a notification on this device, even when Eban is closed." : PUSH_HELP["install-first"]}
            </p>
            {push === "off" && (
              <button onClick={enablePush} className="mt-2 h-8 px-3.5 rounded-full bg-ink font-body text-[12px] font-semibold text-paper hover:bg-ink-2">
                Turn on notifications
              </button>
            )}
          </div>
        )}
        <div className="max-h-[420px] overflow-y-auto">
          {notes.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] font-body text-slate">Nothing yet. Updates on your deliveries will show here.</p>
          ) : (
            notes.map((n) => (
              <button
                key={n.id}
                onClick={() => openNote(n)}
                className={`w-full text-left px-4 py-3 border-b border-line last:border-0 flex gap-3 hover:bg-paper-2 transition-colors ${n.read_status ? "" : "bg-brass/5"}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read_status ? "bg-transparent" : "bg-brass"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-body ${n.read_status ? "text-ink" : "text-ink font-semibold"}`}>{n.title ?? "Update"}</span>
                  <span className="block text-[12.5px] font-body text-slate leading-snug mt-0.5">{n.message}</span>
                  <span className="block text-[11px] font-body text-slate/80 mt-1">{ago(n.created_at)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
