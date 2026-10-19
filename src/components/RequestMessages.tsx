import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Lock, Phone, ShieldAlert } from "lucide-react";
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

/** Simple chat between the sender and the matched traveler of one request. */
export const RequestMessages = ({ requestId, status, otherName }: { requestId: string; status: string; otherName?: string }) => {
  const { user } = useAuth();
  const open = CHAT_OPEN_STATUSES.includes(status);
  const [contact, setContact] = useState<{ first_name: string; phone: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!open) return;
    const { data } = await supabase
      .from("messages")
      .select("id, author_id, body, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }, [requestId, open]);

  useEffect(() => {
    if (!open) return;
    supabase.rpc("get_handover_contact", { p_request_id: requestId }).then(({ data }) => setContact(data?.[0] ?? null));
  }, [requestId, open]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

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

  if (!open) {
    return (
      <div className="bg-card rounded-3xl border border-border/80 p-6 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-xl font-medium text-foreground mb-1 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gold-dark" /> Messages unlock after payment
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Once the sender's payment is confirmed, EBAN holds the money and you can chat with {otherName ?? "each other"} and
          get the handover contact. Until then, everything is agreed here in the app. Unpaid matches are released after{" "}
          {PAYMENT_WINDOW_HOURS} hours so the space goes back on offer.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl border border-border/80 p-6 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-xl font-medium text-foreground mb-1 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-gold-dark" /> Messages
      </h3>
      <p className="font-body text-xs text-muted-foreground mb-4">
        Agree on the handover place and time here{otherName ? ` with ${otherName}` : ""}. Keep payments and personal
        details on EBAN so both of you stay protected.
      </p>
      {contact && (
        <p className="font-body text-sm text-foreground bg-secondary/60 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-gold-dark" />
          <span>
            Handover contact: <strong>{contact.first_name}</strong>
            {contact.phone ? <> · <span className="font-mono">{contact.phone}</span></> : " (no phone number added yet, use the chat)"}
          </span>
        </p>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2 mb-4 pr-1">
        {messages.length === 0 && (
          <p className="font-body text-sm text-muted-foreground text-center py-6">No messages yet. Say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.author_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 font-body text-sm whitespace-pre-wrap break-words ${
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
        <p className="font-body text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          Paying or arranging anything outside EBAN removes your protection: escrow, dispute help and your ratings only
          work for deliveries paid through EBAN.
        </p>
      )}
      <form onSubmit={send} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="Write a message..."
          className="flex-1 bg-background border border-border rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="bg-gradient-gold text-accent-foreground rounded-xl px-4 hover:opacity-90 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
