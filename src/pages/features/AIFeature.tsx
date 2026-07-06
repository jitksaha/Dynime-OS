// @ts-nocheck
import FeaturePageLayout from "@/components/FeaturePageLayout";
import {
  Bot, Sparkles, Brain, Zap, FileText, BarChart3,
  MessageSquare, Shield, Globe, Users, Briefcase, Target,
} from "lucide-react";

export default function AIFeature() {
  return (
    <FeaturePageLayout
      title="AI-Powered Business Intelligence"
      subtitle="Dynime AI Assistant"
      description="Supercharge your business operations with an AI assistant that understands your data, generates insights, and automates complex workflows — all in natural language."
      icon={Bot}
      gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600"
      features={[
        { title: "AI Chat Assistant", description: "Ask business questions in plain language and get instant, data-driven answers with markdown-formatted reports.", icon: MessageSquare },
        { title: "Smart Automation", description: "Create workflows from natural language descriptions. Describe what you want automated and AI builds the logic.", icon: Zap },
        { title: "Document Generation", description: "Generate professional contracts, policies, reports, and emails with AI-powered templates.", icon: FileText },
        { title: "Data Analysis", description: "Upload data or query your business modules — AI summarizes trends, anomalies, and actionable insights.", icon: BarChart3 },
        { title: "Meeting Summaries", description: "Paste meeting notes and get structured summaries with action items, decisions, and follow-ups.", icon: Brain },
        { title: "Prompt Library", description: "Pre-built business prompt templates for sales, HR, finance, marketing, and operations teams.", icon: Sparkles },
      ]}
      detailSections={[
        {
          id: "chat",
          label: "AI Chat",
          icon: MessageSquare,
          color: "hsl(260,80%,60%)",
          title: "Your intelligent business co-pilot",
          description: "Dynime AI understands your business context. Ask it to summarize sales data, draft emails, analyze expenses, or create project plans — all through natural conversation.",
          points: [
            "Multi-turn conversations with context memory",
            "Markdown-formatted responses with tables & charts",
            "Conversation history with search & pinning",
            "Support for English, Bangla, and Arabic",
            "Real-time streaming responses",
          ],
        },
        {
          id: "automation",
          label: "Smart Automation",
          icon: Zap,
          color: "hsl(38,92%,50%)",
          title: "Automate workflows with natural language",
          description: "Describe what you want in plain English and AI translates it into automated workflows. From email sequences to approval chains, let AI handle the complexity.",
          points: [
            "Natural language to workflow conversion",
            "Predictive churn detection for CRM",
            "Smart email drafting with context",
            "Invoice & expense anomaly detection",
            "HR smart assist for policy & compliance",
          ],
        },
        {
          id: "insights",
          label: "Data Insights",
          icon: BarChart3,
          color: "hsl(142,71%,45%)",
          title: "Turn raw data into actionable intelligence",
          description: "AI analyzes your business data across all modules — sales, HR, finance, marketing — and surfaces trends, risks, and opportunities you might miss.",
          points: [
            "Cross-module data analysis",
            "Trend detection & forecasting",
            "Natural language query interface",
            "Automated report generation",
            "Competitor & market insights",
          ],
        },
      ]}
      stats={[
        { value: "10x", label: "Faster report generation" },
        { value: "85%", label: "Time saved on document drafting" },
        { value: "60%", label: "Reduction in manual data analysis" },
        { value: "3x", label: "More actionable insights discovered" },
      ]}
      useCases={[
        { title: "Sales Teams", description: "Get AI-generated deal summaries, pipeline analysis, and automated follow-up drafts for every opportunity.", icon: Target },
        { title: "HR Departments", description: "Draft policies, analyze attendance patterns, and get smart recommendations for workforce planning.", icon: Users },
        { title: "Finance Teams", description: "Automated expense analysis, cash flow forecasting, and intelligent budget recommendations.", icon: BarChart3 },
        { title: "Operations", description: "Process optimization suggestions, resource allocation insights, and workflow automation.", icon: Briefcase },
        { title: "Customer Support", description: "AI-powered response drafts, ticket categorization, and sentiment analysis for customer interactions.", icon: MessageSquare },
        { title: "Executive Leadership", description: "Real-time business summaries, KPI dashboards, and strategic recommendations in natural language.", icon: Globe },
      ]}
      benefits={[
        "Generate reports in seconds, not hours",
        "Draft professional documents with AI",
        "Analyze business data with natural language",
        "Automate complex multi-step workflows",
        "Get proactive business recommendations",
        "Multi-language support (EN, BN, AR)",
        "Pre-built prompt library for every team",
        "Context-aware conversation memory",
        "Enterprise-grade data security",
        "Usage tracking & cost management",
      ]}
      faqs={[
        { q: "What AI models power Dynime AI?", a: "Dynime AI supports multiple providers — OpenAI (ChatGPT), Anthropic (Claude), and Google (Gemini). Your super admin configures which provider powers all AI features from a single setting." },
        { q: "Is my business data secure with AI?", a: "Absolutely. All AI processing is done through secure, encrypted channels. Your data is never used to train AI models and is processed in compliance with enterprise security standards." },
        { q: "Can AI access my business modules?", a: "AI can analyze data you provide in conversation. It can help you interpret sales, HR, finance, and other module data when you share it in the chat." },
        { q: "How does the Prompt Library work?", a: "The Prompt Library contains pre-built templates for common business tasks — sales reports, email drafts, meeting summaries, etc. Click any prompt to start a conversation with pre-filled context." },
        { q: "Is there a usage limit?", a: "AI usage is tracked per workspace with generous included usage. You can monitor consumption in the AI Usage dashboard and add credits as needed." },
      ]}
    />
  );
}
