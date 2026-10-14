import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/marketplace";

interface Message {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

/** Simple chat between the sender and the matched traveler of one request. */
export const RequestMessages = ({ requestId, otherName }: { requestId: string; otherName?: string }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("id, author_id, body, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }, [requestId]);

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

  return (
    <div className="bg-card rounded-3xl border border-border/80 p-6 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-xl font-medium text-foreground mb-1 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-gold-dark" /> Messages
      </h3>
      <p className="font-body text-xs text-muted-foreground mb-4">
        Agree on the handover place and time here{otherName ? ` with ${otherName}` : ""}. Keep payments and personal
        details on EBAN so both of you stay protected.
      </p>

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
