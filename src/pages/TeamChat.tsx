import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Hash, Plus, Send, X, Search, Smile, MessageSquare, Circle,
  Trash2, User, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";

/* ── Types ── */
interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  member_count?: number;
  last_message_at?: string;
}

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  reactions?: Record<string, string[]>;
}

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  department?: string | null;
}

interface OnlineUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  status: string;
}

type SidebarTab = "channels" | "people";

/* ── Helpers ── */
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"];
const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-accent/20 text-accent-foreground",
  "bg-destructive/10 text-destructive",
  "bg-chart-1/20 text-chart-1",
  "bg-chart-2/20 text-chart-2",
  "bg-chart-3/20 text-chart-3",
];

function getAvatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  const dt = new Date(d), today = new Date(), yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (dt.toDateString() === today.toDateString()) return "Today";
  if (dt.toDateString() === yest.toDateString()) return "Yesterday";
  return dt.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}
function showDateSep(cur: string, prev?: string) {
  if (!prev) return true;
  return new Date(cur).toDateString() !== new Date(prev).toDateString();
}
function isConsec(cur: Message, prev?: Message) {
  if (!prev || cur.user_id !== prev.user_id) return false;
  return new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime() < 3 * 60 * 1000;
}

/* ══════════════════════════════════════════════════════════════ */
export default function TeamChat() {
  const { tenantId, supabase, buildInsert } = useTenant();
  const { user, profile } = useAuth();

  /* ── State ── */
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("channels");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [dmPartnerNames, setDmPartnerNames] = useState<Record<string, string>>({});
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [dmSearch, setDmSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileCacheRef = useRef<Map<string, { full_name: string; avatar_url?: string }>>(new Map());

  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), []);

  /* ── Profile cache ── */
  const getProfile = useCallback(async (uid: string) => {
    if (profileCacheRef.current.has(uid)) return profileCacheRef.current.get(uid)!;
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", uid).maybeSingle();
    const r = { full_name: data?.full_name || "Unknown", avatar_url: data?.avatar_url };
    profileCacheRef.current.set(uid, r);
    return r;
  }, [supabase]);

  /* ── Fetch team members ── */
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, department")
        .eq("tenant_id", tenantId);
      if (data) setTeamMembers(data.filter((p) => p.user_id !== user?.id));
    })();
  }, [tenantId, user?.id]);

  /* ── Fetch channels (group + DM) ── */
  useEffect(() => {
    if (!tenantId || !user) return;
    const fetchAll = async () => {
      // Group channels
      const { data: groupCh } = await supabase
        .from("chat_channels")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("channel_type", "group")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      setChannels(groupCh || []);

      // DM channels where user is a member
      const { data: memberRows } = await supabase
        .from("chat_channel_members")
        .select("channel_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId);

      if (memberRows && memberRows.length > 0) {
        const ids = memberRows.map((r) => r.channel_id);
        const { data: dmCh } = await supabase
          .from("chat_channels")
          .select("*")
          .in("id", ids)
          .eq("channel_type", "direct")
          .order("last_message_at", { ascending: false, nullsFirst: false });

        if (dmCh && dmCh.length > 0) {
          setDmChannels(dmCh);
          // Resolve partner names
          const nameMap: Record<string, string> = {};
          for (const ch of dmCh) {
            const { data: members } = await supabase
              .from("chat_channel_members")
              .select("user_id")
              .eq("channel_id", ch.id)
              .neq("user_id", user.id);
            if (members && members[0]) {
              const p = await getProfile(members[0].user_id);
              nameMap[ch.id] = p.full_name;
            } else {
              nameMap[ch.id] = ch.name;
            }
          }
          setDmPartnerNames(nameMap);
        }
      }

      // Auto-select first channel
      if (!activeChannel) {
        const first = (groupCh || [])[0];
        if (first) setActiveChannel(first);
      }
      setLoading(false);
    };
    fetchAll();
  }, [tenantId, user?.id]);

  /* ── Fetch messages ── */
  useEffect(() => {
    if (!activeChannel) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", activeChannel.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) {
        const uids = [...new Set(data.map((m: any) => m.user_id))];
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", uids);
        const nm = new Map((profs || []).map((p: any) => [p.user_id, p]));
        profs?.forEach((p: any) => profileCacheRef.current.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }));

        const msgIds = data.map((m: any) => m.id);
        const { data: reactions } = await supabase.from("chat_reactions").select("*").in("message_id", msgIds);
        const rm: Record<string, Record<string, string[]>> = {};
        (reactions || []).forEach((r: any) => {
          if (!rm[r.message_id]) rm[r.message_id] = {};
          if (!rm[r.message_id][r.emoji]) rm[r.message_id][r.emoji] = [];
          rm[r.message_id][r.emoji].push(r.user_id);
        });

        setMessages(
          data.map((m: any) => ({
            ...m,
            sender_name: (nm.get(m.user_id) as any)?.full_name || "Unknown",
            sender_avatar: (nm.get(m.user_id) as any)?.avatar_url,
            reactions: rm[m.id] || {},
          }))
        );
      }
    };
    fetchMessages();

    // Realtime
    const ch = supabase
      .channel(`chat-${activeChannel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannel.id}` }, async (payload) => {
        const msg = payload.new as any;
        const p = await getProfile(msg.user_id);
        setMessages((prev) => [...prev, { ...msg, sender_name: p.full_name, sender_avatar: p.avatar_url, reactions: {} }]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, async (payload) => {
        const r = (payload.new || payload.old) as any;
        if (!r?.message_id) return;
        const { data: rxns } = await supabase.from("chat_reactions").select("*").eq("message_id", r.message_id);
        const em: Record<string, string[]> = {};
        (rxns || []).forEach((x: any) => { if (!em[x.emoji]) em[x.emoji] = []; em[x.emoji].push(x.user_id); });
        setMessages((prev) => prev.map((m) => (m.id === r.message_id ? { ...m, reactions: em } : m)));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [activeChannel?.id]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  /* ── Online presence ── */
  useEffect(() => {
    if (!user || !tenantId) return;
    const upsert = async () => {
      await supabase.from("user_presence").upsert(
        { user_id: user.id, tenant_id: tenantId, status: "online", last_seen: new Date().toISOString() },
        { onConflict: "user_id,tenant_id" }
      );
    };
    upsert();
    const iv = setInterval(upsert, 30000);
    const fetchOnline = async () => {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase.from("user_presence").select("user_id, status, last_seen").eq("tenant_id", tenantId).gte("last_seen", cutoff);
      if (data) {
        const uids = data.map((d: any) => d.user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", uids);
        setOnlineUsers((profs || []).map((p: any) => ({ user_id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url, status: "online" })));
      }
    };
    fetchOnline();
    const iv2 = setInterval(fetchOnline, 15000);
    return () => { clearInterval(iv); clearInterval(iv2); };
  }, [user?.id, tenantId]);

  /* ── Typing indicator ── */
  useEffect(() => {
    if (!activeChannel || !user) return;
    const bc = supabase.channel(`typing-${activeChannel.id}`);
    bc.on("broadcast", { event: "typing" }, (payload) => {
      const name = payload.payload?.user_name;
      if (payload.payload?.user_id === user.id) return;
      setTypingUsers((p) => (p.includes(name) ? p : [...p, name]));
      setTimeout(() => setTypingUsers((p) => p.filter((n) => n !== name)), 3000);
    }).subscribe();
    return () => { supabase.removeChannel(bc); };
  }, [activeChannel?.id, user?.id]);

  const broadcastTyping = useCallback(() => {
    if (!activeChannel || !user || !profile) return;
    supabase.channel(`typing-${activeChannel.id}`).send({ type: "broadcast", event: "typing", payload: { user_id: user.id, user_name: profile.full_name } });
  }, [activeChannel?.id, user?.id, profile?.full_name]);

  /* ── Handlers ── */
  const handleSend = async () => {
    if (!newMessage.trim() || !activeChannel || !user || !tenantId) return;
    const content = newMessage.trim();
    setNewMessage("");
    inputRef.current?.focus();
    await supabase.from("chat_messages").insert({ channel_id: activeChannel.id, tenant_id: tenantId, user_id: user.id, content });
    await supabase.from("chat_channels").update({ last_message_at: new Date().toISOString() }).eq("id", activeChannel.id);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === msgId);
    if (msg?.reactions?.[emoji]?.includes(user.id)) {
      await supabase.from("chat_reactions").delete().match({ message_id: msgId, user_id: user.id, emoji });
    } else {
      await supabase.from("chat_reactions").insert({ message_id: msgId, user_id: user.id, emoji });
    }
    setShowEmojiPicker(null);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !tenantId || !user) return;
    const { error } = await supabase.from("chat_channels").insert(buildInsert({ name: newChannelName.trim(), description: newChannelDesc.trim() || null, channel_type: "group" }));
    if (error) { toast.error(error.message); return; }
    toast.success("Channel created!");
    setNewChannelName(""); setNewChannelDesc(""); setShowCreateChannel(false);
    const { data } = await supabase.from("chat_channels").select("*").eq("tenant_id", tenantId).eq("channel_type", "group").order("created_at");
    if (data) { setChannels(data); setActiveChannel(data[data.length - 1]); }
  };

  const handleDeleteChannel = async (chId: string) => {
    if (!confirm("Delete this channel and all its messages?")) return;
    await supabase.from("chat_messages").delete().eq("channel_id", chId);
    await supabase.from("chat_channels").delete().eq("id", chId);
    toast.success("Channel deleted");
    const rem = channels.filter((c) => c.id !== chId);
    setChannels(rem);
    if (activeChannel?.id === chId) setActiveChannel(rem[0] || null);
  };

  const startDirectMessage = async (targetUser: TeamMember) => {
    if (!user || !tenantId) return;

    // Check if DM already exists between these two users
    const { data: myMemberships } = await supabase
      .from("chat_channel_members")
      .select("channel_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId);

    if (myMemberships && myMemberships.length > 0) {
      const chIds = myMemberships.map((m) => m.channel_id);
      const { data: theirMemberships } = await supabase
        .from("chat_channel_members")
        .select("channel_id")
        .eq("user_id", targetUser.user_id)
        .in("channel_id", chIds);

      if (theirMemberships && theirMemberships.length > 0) {
        // Check if any of these shared channels are DM type
        const sharedIds = theirMemberships.map((m) => m.channel_id);
        const { data: existingDms } = await supabase
          .from("chat_channels")
          .select("*")
          .in("id", sharedIds)
          .eq("channel_type", "direct");

        if (existingDms && existingDms.length > 0) {
          setActiveChannel(existingDms[0]);
          setDmPartnerNames((prev) => ({ ...prev, [existingDms[0].id]: targetUser.full_name }));
          setShowNewDmModal(false);
          setShowMobileSidebar(false);
          setSidebarTab("people");
          return;
        }
      }
    }

    // Create new DM channel
    const dmName = `dm-${user.id.slice(0, 8)}-${targetUser.user_id.slice(0, 8)}`;
    const { data: newCh, error } = await supabase
      .from("chat_channels")
      .insert(buildInsert({ name: dmName, description: null, channel_type: "direct" }))
      .select()
      .single();

    if (error || !newCh) { toast.error("Failed to create conversation"); return; }

    // Add both users as members
    await supabase.from("chat_channel_members").insert([
      { channel_id: newCh.id, user_id: user.id, tenant_id: tenantId },
      { channel_id: newCh.id, user_id: targetUser.user_id, tenant_id: tenantId },
    ]);

    setDmChannels((prev) => [newCh, ...prev]);
    setDmPartnerNames((prev) => ({ ...prev, [newCh.id]: targetUser.full_name }));
    setActiveChannel(newCh);
    setShowNewDmModal(false);
    setShowMobileSidebar(false);
    setSidebarTab("people");
    toast.success(`Started conversation with ${targetUser.full_name}`);
  };

  const onlineUserIds = useMemo(() => new Set(onlineUsers.map((u) => u.user_id)), [onlineUsers]);

  const filteredChannels = channels.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDms = dmChannels.filter((c) => (dmPartnerNames[c.id] || "").toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMembers = teamMembers.filter((m) =>
    m.full_name.toLowerCase().includes(dmSearch.toLowerCase()) ||
    (m.department || "").toLowerCase().includes(dmSearch.toLowerCase())
  );

  const isDm = activeChannel?.channel_type === "direct";
  const activeName = isDm ? (dmPartnerNames[activeChannel?.id || ""] || "Direct Message") : activeChannel?.name || "";

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl overflow-hidden animate-fade-in shadow-sm">
      {/* ═══ Sidebar ═══ */}
      <div className={`w-80 border-r border-border flex flex-col shrink-0 bg-secondary/20 ${showMobileSidebar ? "fixed inset-0 z-50 w-full md:relative md:w-80" : "hidden md:flex"}`}>
        {/* Tab Switcher */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Team Chat
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowMobileSidebar(false)} className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex rounded-xl bg-secondary/60 p-1 gap-1">
            <button
              onClick={() => setSidebarTab("channels")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${sidebarTab === "channels" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Hash className="h-3.5 w-3.5" /> Channels
            </button>
            <button
              onClick={() => setSidebarTab("people")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${sidebarTab === "people" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <User className="h-3.5 w-3.5" /> Direct Messages
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={sidebarTab === "channels" ? "Search channels..." : "Search conversations..."}
              className="w-full h-9 rounded-lg bg-background border border-input pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {sidebarTab === "channels" && (
            <>
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
                <button onClick={() => setShowCreateChannel(true)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="New channel">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {filteredChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => { setActiveChannel(ch); setShowMobileSidebar(false); }}
                  className={`group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-all ${activeChannel?.id === ch.id ? "bg-primary/10 text-primary font-semibold shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <div className={`p-1.5 rounded-lg ${activeChannel?.id === ch.id ? "bg-primary/20" : "bg-secondary"}`}>
                    <Hash className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate flex-1 text-left">{ch.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
              {filteredChannels.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No channels found</p>}
            </>
          )}

          {sidebarTab === "people" && (
            <>
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conversations</span>
                <button onClick={() => setShowNewDmModal(true)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="New conversation">
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              </div>
              {filteredDms.map((ch) => {
                const partnerName = dmPartnerNames[ch.id] || "Unknown";
                return (
                  <button
                    key={ch.id}
                    onClick={() => { setActiveChannel(ch); setShowMobileSidebar(false); }}
                    className={`group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-all ${activeChannel?.id === ch.id ? "bg-primary/10 text-primary font-semibold shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(ch.id)}`}>
                      {getInitials(partnerName)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="block truncate">{partnerName}</span>
                    </div>
                    {onlineUserIds.has(ch.id) && <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
              {filteredDms.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-muted-foreground">No conversations yet</p>
                  <button onClick={() => setShowNewDmModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                    <UserPlus className="h-3.5 w-3.5" /> Start a Conversation
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Online Users Footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Online — {onlineUsers.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {onlineUsers.slice(0, 8).map((u) => (
              <div key={u.user_id} title={u.user_id === user?.id ? "You" : u.full_name} className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-default ${getAvatarColor(u.user_id)}`}>
                {getInitials(u.user_id === user?.id ? "You" : u.full_name)}
              </div>
            ))}
            {onlineUsers.length > 8 && <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-muted text-muted-foreground">+{onlineUsers.length - 8}</div>}
          </div>
        </div>
      </div>

      {/* ═══ Chat Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center gap-3 bg-background/60 backdrop-blur-sm">
              <button onClick={() => setShowMobileSidebar(true)} className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-secondary">
                <MessageSquare className="h-5 w-5" />
              </button>
              <div className={`p-2 rounded-lg ${isDm ? "bg-accent/10" : "bg-primary/10"}`}>
                {isDm ? <User className="h-4 w-4 text-accent-foreground" /> : <Hash className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-foreground">{activeName}</h2>
                {!isDm && activeChannel.description && <p className="text-xs text-muted-foreground truncate">{activeChannel.description}</p>}
                {isDm && <p className="text-xs text-muted-foreground">Direct Message</p>}
              </div>
              <div className="hidden sm:flex items-center -space-x-1.5 mr-2">
                {onlineUsers.slice(0, 3).map((u) => (
                  <div key={u.user_id} className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background ${getAvatarColor(u.user_id)}`}>
                    {getInitials(u.full_name)}
                  </div>
                ))}
                {onlineUsers.length > 3 && <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background bg-muted text-muted-foreground">+{onlineUsers.length - 3}</div>}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 rounded-2xl bg-primary/5 mb-4">
                    {isDm ? <User className="h-10 w-10 text-primary/40" /> : <MessageSquare className="h-10 w-10 text-primary/40" />}
                  </div>
                  <p className="text-sm font-medium text-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDm ? `Start your conversation with ${activeName}` : `Be the first to say something in #${activeName}`}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => {
                const prevMsg = messages[i - 1];
                const showDate = showDateSep(msg.created_at, prevMsg?.created_at);
                const consecutive = isConsec(msg, prevMsg);
                const isOwn = msg.user_id === user?.id;

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 py-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2">{fmtDate(msg.created_at)}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`group flex gap-2.5 ${consecutive ? "mt-0.5" : "mt-3"} ${isOwn ? "justify-end" : "justify-start"} hover:bg-secondary/20 -mx-2 px-2 py-1 rounded-xl transition-colors`}
                    >
                      {!isOwn && !consecutive && (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${getAvatarColor(msg.user_id)}`}>
                          {getInitials(msg.sender_name || "")}
                        </div>
                      )}
                      {!isOwn && consecutive && <div className="w-8 shrink-0" />}

                      <div className={`max-w-[70%] min-w-0`}>
                        {!consecutive && (
                          <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? "justify-end" : ""}`}>
                            <span className="text-xs font-semibold text-foreground">{isOwn ? "You" : msg.sender_name}</span>
                            <span className="text-[10px] text-muted-foreground">{fmtTime(msg.created_at)}</span>
                          </div>
                        )}
                        <p className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                          {msg.content}
                        </p>
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                            {Object.entries(msg.reactions).map(([emoji, uids]) => (
                              <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${uids.includes(user?.id || "") ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/20"}`}
                              >{emoji} <span className="font-medium">{uids.length}</span></button>
                            ))}
                          </div>
                        )}
                        <div className={`flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? "justify-end" : ""}`}>
                          <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                            <Smile className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <AnimatePresence>
                          {showEmojiPicker === msg.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                              className={`flex gap-0.5 p-1.5 mt-1 bg-card border border-border rounded-xl shadow-lg w-fit ${isOwn ? "ml-auto" : ""}`}
                            >
                              {QUICK_EMOJIS.map((e) => (
                                <button key={e} onClick={() => handleReaction(msg.id, e)} className="p-1.5 rounded-lg hover:bg-secondary text-base transition-colors">{e}</button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {isOwn && !consecutive && (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${getAvatarColor(msg.user_id)}`}>
                          {getInitials(msg.sender_name || "")}
                        </div>
                      )}
                      {isOwn && consecutive && <div className="w-8 shrink-0" />}
                    </motion.div>
                  </div>
                );
              })}
              <AnimatePresence>
                {typingUsers.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 pl-12 py-1">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground italic">{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 sm:px-6 py-4 border-t border-border bg-background/60 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); broadcastTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={isDm ? `Message ${activeName}...` : `Message #${activeName}...`}
                  className="flex-1 h-11 rounded-xl bg-secondary/50 border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-colors"
                />
                <button onClick={handleSend} disabled={!newMessage.trim()} className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <div className="p-5 rounded-2xl bg-primary/5 w-fit mx-auto"><MessageSquare className="h-12 w-12 text-primary/40" /></div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Welcome to Team Chat</h3>
                <p className="text-sm text-muted-foreground mt-1">Create a channel or start a direct message to begin</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => setShowCreateChannel(true)} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 shadow-sm">
                  <Plus className="h-4 w-4" /> Create Channel
                </button>
                <button onClick={() => { setSidebarTab("people"); setShowNewDmModal(true); }} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 shadow-sm border border-border">
                  <UserPlus className="h-4 w-4" /> Direct Message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Create Channel Modal ═══ */}
      <AnimatePresence>
        {showCreateChannel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowCreateChannel(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10"><Hash className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-lg font-bold text-foreground">Create Channel</h3>
                </div>
                <button onClick={() => setShowCreateChannel(false)} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Channel Name</label>
                  <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="e.g. general, engineering" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input value={newChannelDesc} onChange={(e) => setNewChannelDesc(e.target.value)} placeholder="What's this channel about?" className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <button onClick={handleCreateChannel} disabled={!newChannelName.trim()} className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm">Create Channel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ New Direct Message Modal ═══ */}
      <AnimatePresence>
        {showNewDmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowNewDmModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent/10"><UserPlus className="h-5 w-5 text-accent-foreground" /></div>
                  <h3 className="text-lg font-bold text-foreground">New Conversation</h3>
                </div>
                <button onClick={() => setShowNewDmModal(false)} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={dmSearch} onChange={(e) => setDmSearch(e.target.value)} placeholder="Search team members..." className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredMembers.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No team members found</p>}
                {filteredMembers.map((m) => (
                  <button
                    key={m.user_id}
                    onClick={() => startDirectMessage(m)}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                  >
                    <div className="relative">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(m.user_id)}`}>
                        {getInitials(m.full_name)}
                      </div>
                      {onlineUserIds.has(m.user_id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                      {m.department && <p className="text-xs text-muted-foreground truncate">{m.department}</p>}
                    </div>
                    <div className="text-xs text-muted-foreground">{onlineUserIds.has(m.user_id) ? "Online" : "Offline"}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
