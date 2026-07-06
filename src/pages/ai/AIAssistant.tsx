import { useState, useEffect, useRef } from "react";
import {
  Plus, Pin, Trash2, Edit2, Search, Loader2, Sparkles,
  MoreHorizontal, Check, X,
  BookOpen, BarChart3, Clock, ArrowUp, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  is_pinned: boolean;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  model_used?: string;
}

const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIAssistant() {
  const { tenantId } = useTenant();
  const { user: _user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadConversations();
  }, [tenantId]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("tenant_id", tenantId!)
      .eq("is_archived", false)
      .order("is_pinned", { ascending: false })
      .order("last_message_at", { ascending: false })
      .limit(50);
    setConversations((data as any[]) || []);
    setLoadingConvs(false);
  };

  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    loadMessages(activeConvId);
  }, [activeConvId]);

  const loadMessages = async (convId: string) => {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as any[]) || []);
    setLoadingMsgs(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !tenantId) return;
    const userContent = input.trim();
    setInput("");
    setIsStreaming(true);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`, role: "user", content: userContent, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    const contextMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const resp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversation_id: activeConvId, messages: contextMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service error" }));
        toast.error(err.error || "Failed to get AI response");
        setIsStreaming(false);
        return;
      }

      const newConvId = resp.headers.get("X-Conversation-Id");
      if (newConvId && !activeConvId) setActiveConvId(newConvId);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id.startsWith("stream-")) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: `stream-${Date.now()}`, role: "assistant" as const, content: assistantContent, created_at: new Date().toISOString() }];
              });
            }
          } catch {}
        }
      }
      loadConversations();
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("Failed to send message");
    }
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePin = async (convId: string, pinned: boolean) => {
    await supabase.from("ai_conversations").update({ is_pinned: !pinned } as any).eq("id", convId);
    loadConversations();
  };

  const handleDelete = async (convId: string) => {
    await supabase.from("ai_conversations").delete().eq("id", convId);
    if (activeConvId === convId) handleNewChat();
    loadConversations();
    toast.success("Conversation deleted");
  };

  const handleRename = async (convId: string) => {
    if (!editTitle.trim()) return;
    await supabase.from("ai_conversations").update({ title: editTitle.trim() } as any).eq("id", convId);
    setEditingTitle(null);
    loadConversations();
  };

  const filteredConversations = searchQuery
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;
  const pinnedConvs = filteredConversations.filter(c => c.is_pinned);
  const recentConvs = filteredConversations.filter(c => !c.is_pinned);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden -m-4 sm:-m-6 bg-background">
      {/* ──── Sidebar ──── */}
      <div className={cn(
        "flex flex-col border-r border-border bg-muted/30 transition-all duration-300 overflow-hidden",
        sidebarOpen ? "w-[280px]" : "w-0"
      )}>
        <div className="p-3 flex items-center gap-2">
          <Button onClick={handleNewChat} variant="outline" className="flex-1 justify-start gap-2 h-9 text-xs font-medium border-border/60 bg-background hover:bg-accent">
            <Plus className="h-4 w-4" /> New conversation
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSidebarOpen(false)}>
            <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background border-border/60"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          {loadingConvs ? (
            <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-1 pb-4">
              {pinnedConvs.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 pt-2 pb-1 flex items-center gap-1">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </p>
                  {pinnedConvs.map(conv => (
                    <ConvItem key={conv.id} conv={conv} isActive={activeConvId === conv.id}
                      editingTitle={editingTitle} editTitle={editTitle}
                      onSelect={() => setActiveConvId(conv.id)}
                      onPin={() => handlePin(conv.id, conv.is_pinned)}
                      onDelete={() => handleDelete(conv.id)}
                      onStartRename={() => { setEditingTitle(conv.id); setEditTitle(conv.title); }}
                      onRename={() => handleRename(conv.id)}
                      onCancelRename={() => setEditingTitle(null)}
                      onEditTitleChange={setEditTitle}
                    />
                  ))}
                </>
              )}
              {recentConvs.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 pt-3 pb-1 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Recent
                  </p>
                  {recentConvs.map(conv => (
                    <ConvItem key={conv.id} conv={conv} isActive={activeConvId === conv.id}
                      editingTitle={editingTitle} editTitle={editTitle}
                      onSelect={() => setActiveConvId(conv.id)}
                      onPin={() => handlePin(conv.id, conv.is_pinned)}
                      onDelete={() => handleDelete(conv.id)}
                      onStartRename={() => { setEditingTitle(conv.id); setEditTitle(conv.title); }}
                      onRename={() => handleRename(conv.id)}
                      onCancelRename={() => setEditingTitle(null)}
                      onEditTitleChange={setEditTitle}
                    />
                  ))}
                </>
              )}
              {filteredConversations.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-12">
                  {searchQuery ? "No results" : "No conversations yet"}
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t border-border/60 space-y-0.5">
          <Link to="/dynime-ai/prompts">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 gap-2 text-muted-foreground hover:text-foreground">
              <BookOpen className="h-3.5 w-3.5" /> Prompt Library
            </Button>
          </Link>
          <Link to="/dynime-ai/usage">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 gap-2 text-muted-foreground hover:text-foreground">
              <BarChart3 className="h-3.5 w-3.5" /> Usage
            </Button>
          </Link>
        </div>
      </div>

      {/* ──── Main Chat ──── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        {!sidebarOpen && (
          <Button variant="ghost" size="icon" className="absolute top-3 left-3 z-10 h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <PanelLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-[720px] mx-auto w-full px-4 sm:px-6 py-8">
            {messages.length === 0 && !loadingMsgs ? (
              <WelcomeScreen onPromptClick={p => { setInput(p); inputRef.current?.focus(); }} />
            ) : loadingMsgs ? (
              <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-2">
                {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-3 py-4">
                    <AIAvatar />
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* ──── Input Area ──── */}
        <div className="px-4 sm:px-6 pb-6 pt-2">
          <div className="max-w-[720px] mx-auto w-full">
            <div className="relative rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Dynime AI..."
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[52px] max-h-[200px]"
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 200) + "px";
                }}
                disabled={isStreaming}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  "absolute right-2.5 bottom-2.5 h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                  input.trim() && !isStreaming
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2.5">
              Dynime AI can make mistakes. Please verify important business decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Sub Components ─────────────── */

function AIAvatar() {
  return (
    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 mt-1">
      <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end py-2">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-4">
      <AIAvatar />
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed
          [&>p]:mb-3 [&>p:last-child]:mb-0
          [&>ul]:my-2 [&>ol]:my-2
          [&>pre]:rounded-xl [&>pre]:bg-muted [&>pre]:border [&>pre]:border-border
          [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md
          [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm
          [&>blockquote]:border-l-primary/40 [&>blockquote]:bg-muted/30 [&>blockquote]:rounded-r-lg [&>blockquote]:py-1
          [&_table]:text-xs [&_th]:px-3 [&_td]:px-3
        ">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ConvItem({
  conv, isActive, editingTitle, editTitle, onSelect, onPin, onDelete,
  onStartRename, onRename, onCancelRename, onEditTitleChange,
}: {
  conv: Conversation; isActive: boolean; editingTitle: string | null; editTitle: string;
  onSelect: () => void; onPin: () => void; onDelete: () => void;
  onStartRename: () => void; onRename: () => void; onCancelRename: () => void;
  onEditTitleChange: (v: string) => void;
}) {
  const isEditing = editingTitle === conv.id;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-sm",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
      onClick={() => !isEditing && onSelect()}
    >
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input value={editTitle} onChange={e => onEditTitleChange(e.target.value)}
            className="h-6 text-xs px-1.5" autoFocus
            onKeyDown={e => { if (e.key === "Enter") onRename(); if (e.key === "Escape") onCancelRename(); }}
          />
          <button onClick={onRename}><Check className="h-3.5 w-3.5 text-emerald-500" /></button>
          <button onClick={onCancelRename}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
        </div>
      ) : (
        <>
          <span className="text-xs truncate flex-1">{conv.title}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-background/60" onClick={e => e.stopPropagation()}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 z-[60]">
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onStartRename(); }}>
                <Edit2 className="h-3 w-3 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onPin(); }}>
                <Pin className="h-3 w-3 mr-2" /> {conv.is_pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-3 w-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

function WelcomeScreen({ onPromptClick }: { onPromptClick: (p: string) => void }) {
  const prompts = [
    { icon: "📊", label: "Sales Summary", text: "Give me a summary of our sales performance this month with key insights." },
    { icon: "📧", label: "Draft Email", text: "Draft a professional follow-up email to a potential client after our initial meeting." },
    { icon: "📋", label: "Meeting Notes", text: "Help me summarize meeting notes and create action items from the following discussion:" },
    { icon: "💰", label: "Financial Insight", text: "Analyze our expense categories and suggest areas where we can optimize costs." },
    { icon: "👥", label: "HR Policy", text: "Create a comprehensive remote work policy covering expectations, communication, and performance." },
    { icon: "🎯", label: "Marketing Plan", text: "Suggest a marketing campaign strategy for launching a new product to existing customers." },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh]">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-5">
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-1.5">How can I help you today?</h1>
      <p className="text-sm text-muted-foreground mb-10 max-w-sm text-center">
        Your intelligent assistant for sales, finance, HR, operations and more.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {prompts.map(p => (
          <button
            key={p.label}
            onClick={() => onPromptClick(p.text)}
            className="text-left p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{p.icon}</span>
              <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{p.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{p.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
