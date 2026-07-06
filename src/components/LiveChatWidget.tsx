// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";

type Msg = { sender_type: "visitor" | "ai" | "agent"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-chat`;

const realtimeClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export default function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "chat">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime for agent replies
  useEffect(() => {
    if (!conversationId) return;
    const channel = realtimeClient
      .channel(`live-chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const msg = payload.new;
          if (msg.sender_type === "agent") {
            setMessages((prev) => {
              if (prev.some((m) => m.content === msg.content && m.sender_type === "agent")) return prev;
              return [...prev, { sender_type: msg.sender_type, content: msg.content }];
            });
          }
        }
      )
      .subscribe();
    return () => { realtimeClient.removeChannel(channel); };
  }, [conversationId]);

  const startChat = async () => {
    if (!name.trim() || !email.trim()) return;
    setIsLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "start", visitor_name: name, visitor_email: email }),
      });
      const data = await resp.json();
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        setMessages([{ sender_type: "ai", content: data.greeting }]);
        setStep("chat");
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading || !conversationId) return;
    setInput("");
    setMessages((prev) => [...prev, { sender_type: "visitor", content: text }]);
    setIsLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "message", conversation_id: conversationId, message: text }),
      });
      const data = await resp.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { sender_type: "ai", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [...prev, { sender_type: "ai", content: "⚠️ Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-105 animate-fade-in"
        aria-label="Open live chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <span className="text-sm font-semibold block leading-tight">Live Support</span>
            <span className="text-[10px] opacity-80">We typically reply in minutes</span>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-primary-foreground/10 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {step === "form" ? (
        <div className="flex-1 flex flex-col justify-center p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Start a conversation</h3>
            <p className="text-sm text-muted-foreground">Our AI assistant will help you instantly. A human agent is available if needed.</p>
          </div>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={startChat} disabled={!name.trim() || !email.trim() || isLoading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Chat"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.sender_type === "visitor" ? "justify-end" : "justify-start")}>
                {msg.sender_type !== "visitor" && (
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", msg.sender_type === "ai" ? "bg-primary/10" : "bg-accent")}>
                    {msg.sender_type === "ai" ? <Bot className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-accent-foreground" />}
                  </div>
                )}
                <div className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm", msg.sender_type === "visitor" ? "bg-primary text-primary-foreground rounded-br-sm" : msg.sender_type === "agent" ? "bg-accent text-accent-foreground rounded-bl-sm" : "bg-secondary text-foreground rounded-bl-sm")}>
                  {msg.sender_type === "visitor" ? msg.content : (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-0.5 [&_ul]:my-0.5 [&_li]:my-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.sender_type === "visitor" && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="h-3.5 w-3.5 text-primary" /></div>
                <div className="bg-secondary rounded-xl px-3 py-2 rounded-bl-sm"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Type your message..." className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
