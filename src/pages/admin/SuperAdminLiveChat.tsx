// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Bot, User, CheckCircle2, AlertTriangle, Search, RefreshCw, Trash2, StickyNote, Clock, Building2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";

interface Conversation {
  id: string;
  visitor_name: string;
  visitor_email: string;
  status: string;
  is_escalated: boolean;
  tenant_id: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

const CANNED_RESPONSES = [
  "Thank you for reaching out! Let me look into this for you.",
  "I understand your concern. Let me check our system and get back to you shortly.",
  "This has been escalated to the relevant team. You'll hear back within 24 hours.",
  "Could you provide more details so I can assist you better?",
  "Your issue has been resolved. Is there anything else I can help with?",
];

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

export default function SuperAdminLiveChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "escalated" | "active" | "closed">("all");
  const [showCanned, setShowCanned] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    // Super admin sees ALL conversations across tenants
    const { data, error } = await supabase
      .from("live_chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data) setConversations(data as Conversation[]);
    setLoading(false);
  };

  const fetchTenants = async () => {
    const { data } = await supabase.from("tenants").select("id, name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((t: any) => { map[t.id] = t.name; });
      setTenants(map);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("live_chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  };

  useEffect(() => { fetchConversations(); fetchTenants(); }, []);
  useEffect(() => { if (selectedId) fetchMessages(selectedId); }, [selectedId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("sa-live-chat-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages" }, (payload: any) => {
        const msg = payload.new as ChatMessage;
        if (msg.conversation_id === selectedId) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        }
        fetchConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_chat_conversations" }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  const sendReply = async () => {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action: "agent_reply", conversation_id: selectedId, message: input.trim() }),
      });
      if (resp.ok) { setInput(""); setShowCanned(false); }
      else toast.error("Failed to send reply");
    } catch { toast.error("Connection error"); }
    finally { setSending(false); }
  };

  const closeConversation = async (convId: string) => {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ action: "close", conversation_id: convId }),
    });
    toast.success("Conversation closed");
    fetchConversations();
    if (selectedId === convId) { setSelectedId(null); setMessages([]); }
  };

  const deleteConversation = async (convId: string) => {
    // Delete messages first, then conversation
    await supabase.from("live_chat_messages").delete().eq("conversation_id", convId);
    await supabase.from("live_chat_conversations").delete().eq("id", convId);
    toast.success("Conversation deleted");
    fetchConversations();
    if (selectedId === convId) { setSelectedId(null); setMessages([]); }
  };

  const saveInternalNote = async () => {
    if (!internalNote.trim() || !selectedId) return;
    await supabase.from("live_chat_messages").insert({
      conversation_id: selectedId,
      sender_type: "system",
      content: `📝 Internal Note: ${internalNote.trim()}`,
    });
    setInternalNote("");
    setShowNoteInput(false);
    fetchMessages(selectedId);
    toast.success("Note saved");
  };

  const filtered = conversations.filter((c) => {
    if (search && !c.visitor_name.toLowerCase().includes(search.toLowerCase()) && !c.visitor_email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "escalated" && !c.is_escalated) return false;
    if (filter === "active" && c.status !== "active") return false;
    if (filter === "closed" && c.status !== "closed") return false;
    return true;
  });

  const selectedConvo = conversations.find((c) => c.id === selectedId);
  const activeCount = conversations.filter((c) => c.status === "active").length;
  const escalatedCount = conversations.filter((c) => c.is_escalated && c.status === "active").length;
  const aiHandledCount = conversations.filter((c) => !c.is_escalated && c.status === "active").length;
  const closedCount = conversations.filter((c) => c.status === "closed").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Live Chat Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and manage all live chat conversations across all companies</p>
        </div>
        <button onClick={fetchConversations} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium hover:bg-accent transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Chats", count: activeCount, icon: MessageCircle, color: "text-primary" },
          { label: "Escalated", count: escalatedCount, icon: AlertTriangle, color: "text-warning" },
          { label: "AI Handled", count: aiHandledCount, icon: Bot, color: "text-info" },
          { label: "Closed", count: closedCount, icon: CheckCircle2, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className="text-xl font-bold text-foreground">{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chat Layout */}
      <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[400px]">
        {/* Conversation List */}
        <div className={cn("w-full lg:w-80 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden", selectedId && "hidden lg:flex")}>
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..." className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex gap-1">
              {(["all", "escalated", "active", "closed"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("px-2 py-1 rounded-md text-xs font-medium transition-colors capitalize", filter === f ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-accent")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 border-2 border-destructive border-t-transparent rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
            ) : (
              filtered.map((c) => (
                <button key={c.id} onClick={() => setSelectedId(c.id)} className={cn("w-full text-left p-3 border-b border-border hover:bg-accent/50 transition-colors", selectedId === c.id && "bg-destructive/5 border-l-2 border-l-destructive")}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{c.visitor_name}</span>
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", statusColors[c.status])}>{c.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.visitor_email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {c.is_escalated && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">Escalated</span>}
                    {c.tenant_id && tenants[c.tenant_id] && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary flex items-center gap-0.5">
                        <Building2 className="h-2.5 w-2.5" /> {tenants[c.tenant_id]}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={cn("flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden", !selectedId && "hidden lg:flex")}>
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <MessageCircle className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm">Select a conversation to view and reply</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedConvo?.visitor_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedConvo?.visitor_email}
                    {selectedConvo?.tenant_id && tenants[selectedConvo.tenant_id] && ` · ${tenants[selectedConvo.tenant_id]}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowNoteInput(!showNoteInput)} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors" title="Add internal note">
                    <StickyNote className="h-4 w-4" />
                  </button>
                  {selectedConvo?.status === "active" && (
                    <button onClick={() => closeConversation(selectedId!)} className="px-3 py-1.5 rounded-md text-xs font-medium border border-input hover:bg-accent transition-colors">Close</button>
                  )}
                  <button onClick={() => deleteConversation(selectedId!)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors" title="Delete conversation">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setSelectedId(null); setMessages([]); }} className="lg:hidden p-1 rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Internal note input */}
              {showNoteInput && (
                <div className="px-4 py-2 border-b border-border bg-warning/5 flex gap-2">
                  <input value={internalNote} onChange={(e) => setInternalNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveInternalNote()} placeholder="Add internal note (only visible to admins)..." className="flex-1 h-8 px-3 rounded-md border border-warning/30 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-warning" />
                  <button onClick={saveInternalNote} disabled={!internalNote.trim()} className="px-3 h-8 rounded-md bg-warning text-warning-foreground text-xs font-medium disabled:opacity-50">Save</button>
                </div>
              )}

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isSystem = msg.sender_type === "system";
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="max-w-md rounded-lg px-3 py-1.5 text-xs bg-warning/10 text-warning border border-warning/20 italic">
                          {msg.content}
                          <span className="ml-2 text-[10px] opacity-60">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className={cn("flex gap-2", msg.sender_type === "visitor" ? "justify-end" : "justify-start")}>
                      {msg.sender_type !== "visitor" && (
                        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", msg.sender_type === "ai" ? "bg-primary/10" : "bg-destructive/10")}>
                          {msg.sender_type === "ai" ? <Bot className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-destructive" />}
                        </div>
                      )}
                      <div>
                        <div className={cn("max-w-md rounded-xl px-3 py-2 text-sm", msg.sender_type === "visitor" ? "bg-muted text-foreground rounded-br-sm" : msg.sender_type === "agent" ? "bg-destructive text-destructive-foreground rounded-bl-sm" : "bg-secondary text-foreground rounded-bl-sm")}>
                          {msg.sender_type === "visitor" ? msg.content : (
                            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-0.5">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground capitalize">{msg.sender_type}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Canned responses */}
              {showCanned && selectedConvo?.status === "active" && (
                <div className="px-4 py-2 border-t border-border bg-accent/30 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Quick Replies</p>
                  {CANNED_RESPONSES.map((r, i) => (
                    <button key={i} onClick={() => { setInput(r); setShowCanned(false); }} className="w-full text-left px-3 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors border border-transparent hover:border-border">
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              {selectedConvo?.status === "active" && (
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <button onClick={() => setShowCanned(!showCanned)} className="h-9 px-2.5 rounded-lg border border-input text-muted-foreground hover:bg-accent transition-colors text-xs font-medium shrink-0" title="Canned responses">
                      ⚡
                    </button>
                    <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()} placeholder="Type your reply as Super Admin..." className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                    <button onClick={sendReply} disabled={sending || !input.trim()} className="h-9 w-9 flex items-center justify-center rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
