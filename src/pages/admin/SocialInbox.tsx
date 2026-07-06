import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Search, Send, Bot, User, CheckCircle2, MessageSquare, Inbox } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface Conversation {
  id: string;
  status: string;
  ai_mode: string;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  message_count: number;
  is_read: boolean;
  contact?: { display_name: string; platform: string; lead_score: string };
}

interface Message {
  id: string;
  sender_type: string;
  content: string;
  ai_confidence: number | null;
  ai_draft: string | null;
  is_approved: boolean | null;
  cta_type: string | null;
  created_at: string;
}

export default function SocialInbox() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadConversations();
  }, [tenantId]);

  useEffect(() => {
    if (selected) loadMessages(selected);
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("social_conversations")
      .select("*, contact:social_contacts(display_name, platform, lead_score)")
      .eq("tenant_id", tenantId)
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data);
    setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("social_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);

    // Mark as read
    await supabase.from("social_conversations").update({ is_read: true }).eq("id", convId);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected || !tenantId) return;
    setSending(true);

    const conv = conversations.find((c) => c.id === selected);
    const mode = conv?.ai_mode || "auto";

    if (mode === "auto" || mode === "assist") {
      // Get AI response
      try {
        const { data, error } = await supabase.functions.invoke("social-ai-respond", {
          body: { conversation_id: selected, message: reply, tenant_id: tenantId },
        });

        if (error) throw error;

        // Save customer message
        await supabase.from("social_messages").insert({
          tenant_id: tenantId,
          conversation_id: selected,
          sender_type: "customer",
          content: reply,
        });

        if (mode === "auto") {
          // Save AI response directly
          await supabase.from("social_messages").insert({
            tenant_id: tenantId,
            conversation_id: selected,
            sender_type: "ai",
            content: data.response,
            ai_confidence: data.confidence,
            is_approved: !data.escalated,
          });
        } else {
          // Assist mode: save as draft
          await supabase.from("social_messages").insert({
            tenant_id: tenantId,
            conversation_id: selected,
            sender_type: "ai",
            content: data.response,
            ai_confidence: data.confidence,
            ai_draft: data.response,
            is_approved: false,
          });
        }

        // Update conversation
        await supabase.from("social_conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: data.response.substring(0, 100),
          message_count: (conv?.message_count || 0) + 2,
          status: data.escalated ? "escalated" : "active",
        }).eq("id", selected);
      } catch (e: any) {
        toast.error(e.message || "AI response failed");
      }
    } else {
      // Human mode: save message directly
      await supabase.from("social_messages").insert({
        tenant_id: tenantId,
        conversation_id: selected,
        sender_type: "human_agent",
        content: reply,
        sender_id: user?.id,
      });

      await supabase.from("social_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: reply.substring(0, 100),
        message_count: (conv?.message_count || 0) + 1,
      }).eq("id", selected);
    }

    setReply("");
    setSending(false);
    loadMessages(selected);
    loadConversations();
  };

  const approveMessage = async (msgId: string) => {
    await supabase.from("social_messages").update({ is_approved: true, approved_by: user?.id }).eq("id", msgId);
    toast.success("Message approved & sent");
    loadMessages(selected!);
  };

  const updateConvMode = async (convId: string, mode: string) => {
    await supabase.from("social_conversations").update({ ai_mode: mode }).eq("id", convId);
    loadConversations();
  };

  const filteredConvs = conversations.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchTerm && !c.contact?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) && !c.last_message_preview?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const selectedConv = conversations.find((c) => c.id === selected);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-600";
      case "escalated": return "bg-amber-500/10 text-amber-600";
      case "resolved": return "bg-blue-500/10 text-blue-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getLeadColor = (score: string) => {
    switch (score) {
      case "hot": return "bg-red-500/10 text-red-600";
      case "warm": return "bg-amber-500/10 text-amber-600";
      default: return "bg-blue-500/10 text-blue-600";
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Inbox</h1>
          <p className="text-sm text-muted-foreground">Unified inbox for all social media conversations</p>
        </div>
      </div>

      <div className="flex-1 flex border border-border rounded-xl overflow-hidden min-h-0">
        {/* Conversation List */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1">
            {filteredConvs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No conversations
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv.id)}
                  className={`w-full p-3 text-left border-b border-border hover:bg-muted/50 transition-colors ${selected === conv.id ? "bg-muted" : ""} ${!conv.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground truncate">
                      {conv.contact?.display_name || "Unknown"}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(conv.status)}`}>
                      {conv.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview || "No messages"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {conv.last_message_at ? format(new Date(conv.last_message_at), "MMM d, HH:mm") : ""}
                    </span>
                    {conv.contact?.lead_score && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getLeadColor(conv.contact.lead_score)}`}>
                        {conv.contact.lead_score}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{selectedConv?.contact?.display_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{selectedConv?.contact?.platform || "internal"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedConv?.ai_mode || "auto"} onValueChange={(v) => updateConvMode(selected, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">🤖 Auto</SelectItem>
                      <SelectItem value="approval">✅ Approval</SelectItem>
                      <SelectItem value="assist">💡 Assist</SelectItem>
                      <SelectItem value="off">👤 Human</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "customer" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-xl p-3 ${
                        msg.sender_type === "customer"
                          ? "bg-muted text-foreground"
                          : msg.sender_type === "ai"
                          ? "bg-primary/10 text-foreground border border-primary/20"
                          : "bg-primary text-primary-foreground"
                      }`}>
                        <div className="flex items-center gap-1 mb-1">
                          {msg.sender_type === "ai" ? <Bot className="h-3 w-3" /> : msg.sender_type === "customer" ? <User className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          <span className="text-[10px] font-medium uppercase">
                            {msg.sender_type === "ai" ? "AI Agent" : msg.sender_type === "customer" ? "Customer" : "Agent"}
                          </span>
                          {msg.ai_confidence !== null && (
                            <span className={`text-[10px] ml-1 ${msg.ai_confidence >= 0.75 ? "text-green-600" : msg.ai_confidence >= 0.5 ? "text-amber-600" : "text-red-600"}`}>
                              {(msg.ai_confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.is_approved === false && msg.sender_type === "ai" && (
                          <Button size="sm" variant="outline" className="mt-2 h-6 text-xs" onClick={() => approveMessage(msg.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve & Send
                          </Button>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={selectedConv?.ai_mode === "off" ? "Type your reply..." : "Simulate customer message..."}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                    disabled={sending}
                  />
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
