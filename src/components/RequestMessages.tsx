import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Lock, Phone, ShieldAlert, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { errMsg, CHAT_OPEN_STATUSES, PAYMENT_WINDOW_HOURS } from "@/lib/marketplace";

// Phone numbers, emails and chat apps: a nudge to keep the deal on Eban.
const CONTACT_PATTERN = /(\+?\d[\d\s().-]{7,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|whats\s?app|telegram|signal|paypal|western\s?union|cash\s+app|momo|mobile\s+money|outside/i;

interface Message {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

const seenKey = (requestId: string) => `eban-chat-seen-${requestId}`;
const readSeen = (requestId: string) => {
  try {
    return localStorage.getItem(seenKey(requestId)) ?? "";
  } catch {
    return "";
  }
};

/**
 * Chat between the sender and the matched traveler of one request.
 * Sits in the corner as a button, opens into a small panel and folds away again,
 * so it never makes the page longer.
 */
export const RequestMessages = ({ requestId, status, otherName }: { requestId: string; status: string; otherName?: string }) => {
  const { user } = useAuth();
  const chatOpen = CHAT_OPEN_STATUSES.includes(status);
  const [expanded, setExpanded] = useState(false);
  const [contact, setContact] = useState<{ first_name: string; phone: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [seenAt, setSeenAt] = useState(() => readSeen(requestId));
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!chatOpen) return;
    const { data } = await supabase
      .from("messages")
      .select("id, author_id, body, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }, [requestId, chatOpen]);

  useEffect(() => {
    if (!chatOpen) return;
    supabase.rpc("get_handover_contact", { p_request_id: requestId }).then(({ data }) => setContact(data?.[0] ?? null));
  }, [requestId, chatOpen]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const lastTime = messages.length ? messages[messages.length - 1].created_at : "";

  // Opening the chat marks everything as read.
  useEffect(() => {
    if (!expanded || !lastTime) return;
    setSeenAt(lastTime);
    try {
      localStorage.setItem(seenKey(requestId), lastTime);
    } catch {
      /* ignore */
    }
  }, [expanded, lastTime, requestId]);

  useEffect(() => {
    if (expanded) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, expanded]);

  const unread = messages.filter((m) => m.author_id !== user?.id && m.created_at > seenAt).length;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ request_id: requestId, author_id: user.id, body: text });
    setSending(false);
    if (error) {
      toast({ title: "Couldn't send", description: errMsg(error), variant: "destructive" });
      return;
    }
    setBody("");
    load();
  };

  const wrap = "fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3";
  const wrapStyle = { paddingRight: "env(safe-area-inset-right, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" };

  const bubble = (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      aria-label={expanded ? "Close chat" : chatOpen ? "Open chat" : "Chat locked until payment"}
      className="relative h-14 w-14 rounded-full bg-gradient-gold text-accent-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {expanded ? <ChevronDown className="w-6 h-6" /> : chatOpen ? <MessageCircle className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
      {!expanded && unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );

  const panel = "w-[min(92vw,380px)] bg-card rounded-2xl border border-border shadow-2xl p-4";

  if (!chatOpen) {
    return (
      <div className={wrap} style={wrapStyle}>
        {expanded && (
          <div className={panel} role="dialog" aria-label="Chat locked">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-display text-base font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold-dark" /> Messages unlock after payment
              </h3>
              <button onClick={() => setExpanded(false)} aria-label="Close" className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="font-body text-xs text-muted-foreground">
              Once the sender's payment is confirmed, EBAN holds the money and you can chat with {otherName ?? "each other"} and
              get the handover contact. Unpaid matches are released after {PAYMENT_WINDOW_HOURS} hours so the space goes back on offer.
            </p>
          </div>
        )}
        {bubble}
      </div>
    );
  }

  return (
    <div className={wrap} style={wrapStyle}>
      {expanded && (
        <div className={panel} role="dialog" aria-label="Chat">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="font-display text-base font-medium text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gold-dark" /> {otherName ? `Chat with ${otherName}` : "Messages"}
            </h3>
            <button onClick={() => setExpanded(false)} aria-label="Minimise chat" className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="font-body text-[11px] text-muted-foreground mb-3">
            Agree on the handover place and time here. Keep payments and personal details on EBAN so both of you stay protected.
          </p>
          {contact && (
            <p className="font-body text-xs text-foreground bg-secondary/60 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gold-dark shrink-0" />
              <span>
                Handover contact: <strong>{contact.first_name}</strong>
                {contact.phone ? <> · <span className="font-mono">{contact.phone}</span></> : " (no phone number added yet, use the chat)"}
              </span>
            </p>
          )}

          <div className="h-64 max-h-[45vh] overflow-y-auto space-y-2 mb-3 pr-1">
            {messages.length === 0 && (
              <p className="font-body text-sm text-muted-foreground text-center py-6">No messages yet. Say hello.</p>
            )}
            {messages.map((m) => {
              const mine = m.author_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 font-body text-sm whitespace-pre-wrap break-words ${
                      mine ? "bg-gradient-gold text-accent-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    {m.body}
                    <span className="block text-[10px] opacity-60 mt-1">
                      {new Date(m.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {CONTACT_PATTERN.test(body) && (
            <p className="font-body text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              Paying or arranging anything outside EBAN removes your protection: escrow, dispute help and your ratings only
              work for deliveries paid through EBAN.
            </p>
          )}
          <form onSubmit={send} className="flex gap-2">
            <input
              id={`chat-input-${requestId}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="Write a message..."
              className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3.5 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="bg-gradient-gold text-accent-foreground rounded-xl px-3.5 hover:opacity-90 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
      {bubble}
    </div>
  );
};
