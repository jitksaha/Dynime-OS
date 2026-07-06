import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, ArrowRight, Plus, FileText, BarChart3, Mail,
  Calendar, Users, DollarSign, Briefcase, ClipboardList, Loader2,
  Command, CornerDownLeft, Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/db";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { getAIErrorMessage } from "@/lib/aiErrorMessage";

const ICON_MAP: Record<string, React.ElementType> = {
  "arrow-right": ArrowRight,
  plus: Plus,
  "file-text": FileText,
  "bar-chart": BarChart3,
  mail: Mail,
  calendar: Calendar,
  users: Users,
  "dollar-sign": DollarSign,
  briefcase: Briefcase,
  clipboard: ClipboardList,
};

const CATEGORY_COLORS: Record<string, string> = {
  navigation: "text-blue-500 bg-blue-500/10",
  data: "text-emerald-500 bg-emerald-500/10",
  content: "text-violet-500 bg-violet-500/10",
  action: "text-amber-500 bg-amber-500/10",
  insight: "text-pink-500 bg-pink-500/10",
};

const MODULE_SUGGESTIONS: Record<string, string[]> = {
  CRM: [
    "Show me this month's deal pipeline",
    "What's our deal win rate?",
    "List contacts added this week",
    "Draft a follow-up email for leads",
    "Which deals are closing this month?",
    "Show top sales reps by revenue",
  ],
  HRM: [
    "How many employees are on leave today?",
    "Show upcoming birthdays this month",
    "List pending leave requests",
    "Generate attendance report for this week",
    "Who are the new hires this quarter?",
    "Show department headcount summary",
  ],
  Projects: [
    "Show overdue tasks across all projects",
    "Which projects are at risk?",
    "List my assigned tasks",
    "Create a new project milestone",
    "Show team workload distribution",
    "What tasks are due this week?",
  ],
  Accounting: [
    "Show me this month's revenue",
    "List unpaid invoices",
    "What's our expense breakdown by category?",
    "Generate a P&L summary",
    "Show overdue payments",
    "Compare revenue vs last month",
  ],
  Marketing: [
    "Show active campaign performance",
    "What's our email open rate?",
    "List top performing campaigns",
    "Draft a campaign brief",
    "Show conversion rates by channel",
    "How many leads from marketing this month?",
  ],
  Helpdesk: [
    "How many open tickets do we have?",
    "Show average ticket resolution time",
    "List unassigned tickets",
    "What are the most common ticket categories?",
    "Show SLA compliance rate",
    "Draft a response to ticket backlog",
  ],
  Inventory: [
    "Show low stock items",
    "Which products are out of stock?",
    "List top selling products",
    "Show inventory value by category",
    "What items need reordering?",
    "Generate stock movement report",
  ],
  POS: [
    "Show today's sales total",
    "What's the average transaction value?",
    "List best selling items today",
    "Show hourly sales breakdown",
    "How many transactions today?",
    "Compare sales vs yesterday",
  ],
  Dashboard: [
    "Show me this month's revenue",
    "How many open tickets do we have?",
    "Draft a follow-up email for deal pipeline",
    "Navigate to employee directory",
    "What's our deal win rate?",
    "Create a new project",
    "Show team activity summary",
    "What are today's priorities?",
  ],
  Wallet: [
    "Show wallet balance",
    "List recent transactions",
    "What's our spending trend?",
    "Show pending payments",
  ],
};

const FOLLOW_UP_PROMPTS: Record<string, string[]> = {
  navigation: ["Take me there", "Show me more details"],
  data: ["Break it down by category", "Compare with last month", "Export this data"],
  content: ["Refine the draft", "Make it shorter", "Translate to another language"],
  action: ["Schedule this", "Assign to someone", "Set a reminder"],
  insight: ["Show the trend", "What caused this?", "Predict next month"],
};

interface CopilotAction {
  label: string;
  type: "navigate" | "create" | "draft" | "analyze";
  route?: string;
  data?: string;
  icon: string;
}

interface CopilotResult {
  answer: string;
  actions: CopilotAction[];
  category: string;
}

export function CopilotCommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [history, setHistory] = useState<{ query: string; result: CopilotResult }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId } = useTenant();

  // Keyboard shortcut: ⌘J (using J to avoid conflict with existing ⌘K search)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setResult(null);
      setQuery("");
    }
  }, [open]);

  const currentModule = useCallback(() => {
    const path = location.pathname;
    if (path.includes("/crm")) return "CRM";
    if (path.includes("/hrm") || path.includes("/employees")) return "HRM";
    if (path.includes("/projects")) return "Projects";
    if (path.includes("/accounting") || path.includes("/invoices")) return "Accounting";
    if (path.includes("/marketing") || path.includes("/campaigns")) return "Marketing";
    if (path.includes("/helpdesk") || path.includes("/tickets")) return "Helpdesk";
    if (path.includes("/inventory")) return "Inventory";
    if (path.includes("/pos")) return "POS";
    if (path.includes("/wallet")) return "Wallet";
    return "Dashboard";
  }, [location.pathname]);

  const handleSubmit = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-copilot", {
        body: {
          query: q,
          currentModule: currentModule(),
          tenantId,
        },
      });

      if (error) throw error;

      const copilotResult = data as CopilotResult;
      setResult(copilotResult);
      setHistory((prev) => [{ query: q, result: copilotResult }, ...prev].slice(0, 10));
    } catch (err: any) {
      console.error("Copilot error:", err);
      toast.error(getAIErrorMessage(err, "Copilot couldn't process your request."));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: CopilotAction) => {
    if (action.type === "navigate" && action.route) {
      navigate(action.route);
      setOpen(false);
    } else if (action.type === "draft" && action.data) {
      navigator.clipboard.writeText(action.data);
      toast.success("Draft copied to clipboard!");
    } else if (action.type === "create" && action.route) {
      navigate(action.route);
      setOpen(false);
    } else if (action.type === "analyze") {
      toast.info("Opening analysis...");
      if (action.route) {
        navigate(action.route);
        setOpen(false);
      }
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-semibold hidden sm:inline">AI Copilot</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">
          <Command className="h-2.5 w-2.5" />J
        </kbd>
      </button>

      {/* Overlay — centered modal (live-chat style) */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-label="AI Copilot"
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-[640px] max-h-[min(85vh,720px)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-border min-w-0">
                <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Ask anything…"
                    className="w-full bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {query && (
                    <button
                      onClick={() => handleSubmit()}
                      disabled={loading}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      aria-label="Send"
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CornerDownLeft className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
                {/* Loading state */}
                {loading && (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="h-3 w-3 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                )}

                {/* Result */}
                {result && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Category badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[result.category] || "text-muted-foreground bg-muted"}`}>
                        <Zap className="h-2.5 w-2.5" />
                        {result.category}
                      </span>
                    </div>

                    {/* Answer */}
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground leading-relaxed">
                      <ReactMarkdown>{result.answer}</ReactMarkdown>
                    </div>

                    {/* Actions */}
                    {result.actions.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Actions</p>
                        <div className="grid gap-1.5">
                          {result.actions.map((action, i) => {
                            const Icon = ICON_MAP[action.icon] || ArrowRight;
                            return (
                              <button
                                key={i}
                                onClick={() => handleAction(action)}
                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border hover:bg-primary/5 hover:border-primary/20 transition-all text-left group"
                              >
                                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                                  <Icon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-foreground flex-1">{action.label}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Follow-up prompts */}
                    {FOLLOW_UP_PROMPTS[result.category] && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Follow up</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FOLLOW_UP_PROMPTS[result.category].map((fp, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setQuery(fp);
                                handleSubmit(fp);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                            >
                              {fp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Suggestions (when no result and not loading) */}
                {!result && !loading && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Suggestions for {currentModule()}
                    </p>
                    <div className="grid gap-1.5">
                      {(MODULE_SUGGESTIONS[currentModule()] || MODULE_SUGGESTIONS.Dashboard).slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setQuery(s);
                            handleSubmit(s);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border hover:bg-primary/5 hover:border-primary/20 transition-all text-left group"
                        >
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                            <Sparkles className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{s}</span>
                        </button>
                      ))}
                    </div>

                    {/* Recent history */}
                    {history.length > 0 && (
                      <div className="pt-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
                        {history.slice(0, 3).map((h, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setQuery(h.query);
                              setResult(h.result);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_COLORS[h.result.category]?.split(" ")[0] || "bg-muted-foreground"}`} />
                            <span className="text-xs text-muted-foreground truncate">{h.query}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-t border-border bg-muted/30">
                <span className="text-[10px] text-muted-foreground truncate min-w-0">
                  Module: <span className="font-medium text-foreground">{currentModule()}</span>
                </span>
                <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd>
                  <span>to ask</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono">Esc</kbd>
                  <span>to close</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
