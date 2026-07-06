<p align="center">
  <img src="src/assets/dynime-logo.png" alt="Dynime OS Logo" width="200" />
</p>

<h1 align="center">Dynime OS — All-in-One Business Operating System</h1>

<p align="center">
  <strong>ERP · CRM · HRMS · Finance · AI · Marketing · Helpdesk — unified in a single modern platform.</strong>
</p>

<p align="center">
  <a href="https://dynime.com">Live Demo</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#architecture">Architecture</a>
</p>

---

## Overview

Dynime is a comprehensive, multi-tenant SaaS platform that brings every business function under one roof. From CRM pipelines and HRMS to accounting, inventory, AI-powered analytics, and customer portals — Dynime replaces dozens of fragmented tools with a single, beautifully designed workspace.

## Features

### 🏢 Core Business Modules

| Module | Description |
|--------|-------------|
| **CRM & Sales** | Contacts, deals pipeline, lead scoring, AI deal insights |
| **HRMS** | Employees, attendance, leave management, payroll, departments |
| **Accounting & Finance** | Invoices, expenses, budgets, treasury, tax compliance |
| **Projects & Tasks** | Kanban boards, Gantt charts, time tracking, milestones |
| **Inventory & Procurement** | Stock management, purchase orders, supplier portal |
| **Marketing** | Campaigns, email templates, audience segmentation, analytics |

### 🤖 AI-Powered Intelligence

- **AI Assistant** — Natural language chat for reports, drafts, and data queries
- **AI Copilot** — Command bar for instant actions across modules
- **Smart Features** — Auto-fill forms, natural language search, meeting summaries
- **Business Ops AI** — Churn detection, deal scoring, expense categorization
- **Threat Detection** — AI-driven security analysis of audit logs
- **Document Generation** — AI-powered contracts, policies, and reports
- **Configurable Provider** — Choose between OpenAI (ChatGPT), Anthropic (Claude), or Google (Gemini) from a single admin setting

### 💼 Additional Modules

- **Helpdesk & Ticketing** — Customer support with SLA tracking
- **Live Chat** — AI-powered chat widget with human escalation
- **Team Chat** — Internal messaging with channels and reactions
- **Knowledge Base** — Self-service documentation portal
- **Bookings & Appointments** — Public booking pages with calendar sync
- **E-Signatures** — Digital document signing workflows
- **Contracts Management** — Lifecycle tracking with renewals & alerts
- **Compliance & KYC/KYB** — Identity verification (AI, manual, or Sumsub)
- **Field Service Management** — Job scheduling, mobile dispatch, GPS tracking
- **Logistics & Delivery** — Route planning, fleet management, shipment tracking
- **Quality Control** — Inspection checklists, non-conformance reporting
- **OKR & Goal Tracking** — Objectives and key results management
- **Shift Planner** — Employee scheduling with availability management
- **Loyalty & Referrals** — Points system, referral programs, rewards
- **Revenue Analytics** — MRR/ARR tracking, cohort analysis, forecasting
- **API Platform** — REST API with key management, rate limiting, and docs

### 🌍 Multi-Tenant & Multi-Region

- Company-level isolation with Row-Level Security (RLS)
- Multi-currency support with live exchange rates
- Localized payment gateways (Stripe, Razorpay, SSLCommerz, bKash, 2Checkout)
- Country-specific pricing for subscription plans
- RTL language support (Arabic, Bangla, English)

### 🔒 Security & Compliance

- Role-based access control (Super Admin, Company Admin, Manager, Employee)
- Audit logging across all modules
- API key management with scoped permissions
- Two-factor authentication & WebAuthn passkeys
- GDPR-ready data handling with data processing agreements

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **Styling** | Tailwind CSS 3, shadcn/ui, Radix UI |
| **State & Data** | TanStack React Query, React Hook Form, Zod |
| **Routing** | React Router v6 |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **AI** | OpenAI / Anthropic / Google Gemini (configurable) |
| **Payments** | Stripe, Razorpay, SSLCommerz, bKash, 2Checkout |
| **Email/SMS** | Custom edge functions for transactional messaging |

## Architecture

```
┌─────────────────────────────────────────────┐
│                 React SPA                    │
│  (Vite + TypeScript + Tailwind + shadcn/ui) │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│              Supabase Backend               │
│  ┌─────────┐ ┌──────┐ ┌────────┐ ┌───────┐ │
│  │PostgreSQL│ │ Auth │ │Storage │ │Edge Fn│ │
│  │  + RLS   │ │      │ │Buckets │ │  (60+)│ │
│  └─────────┘ └──────┘ └────────┘ └───┬───┘ │
└──────────────────────────────────────┼──────┘
                                       │
              ┌────────────────────────┼────────┐
              │       AI Proxy Layer            │
              │  ┌────────┐ ┌────────┐ ┌──────┐ │
              │  │ OpenAI │ │ Claude │ │Gemini│ │
              │  └────────┘ └────────┘ └──────┘ │
              └─────────────────────────────────┘
```

### Edge Functions (60+)

All serverless business logic runs on Supabase Edge Functions (Deno runtime):

- **AI Functions** — `ai-proxy`, `ai-chat`, `ai-assistant`, `ai-copilot`, `ai-deal-scoring`, `ai-document-gen`, `ai-expense-categorize`, `ai-invoice-summary`, `ai-threat-detection`, `ai-workflow-nlp`, `ai-smart-features`, `ai-business-insights`, `ai-business-ops`, `ai-churn-detection`
- **Payments** — `stripe-checkout`, `razorpay-payment-callback`, `sslcommerz-initiate`, `bkash-tokenize`, `payment-initiate`, `payment-verify`, `wallet-topup-*`, `recurring-charge`
- **Communications** — `send-auth-email`, `send-custom-email`, `sms-send`, `whatsapp-send`, `live-chat`, `webhook-dispatch`
- **Verification** — `kyc-ai-verify`, `kyb-verify`, `sumsub-access-token`, `phone-verify`
- **Admin** — `admin-create-user`, `admin-delete`, `invite-user`, `company-self-delete`

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project ([supabase.com](https://supabase.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/dynime.git
cd dynime

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase project URL and anon key
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

### AI Provider Setup

Add one of these secrets in your Supabase Edge Functions settings:

| Provider | Secret Name | Get Key |
|----------|------------|---------|
| OpenAI (ChatGPT) | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| Google (Gemini) | `GOOGLE_AI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

Then configure your provider in **Super Admin → AI Configuration**.

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── landing/         # Public website sections
│   │   ├── ui/              # shadcn/ui primitives
│   │   └── ...              # Module-specific components
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client & types
│   ├── pages/               # Route pages
│   │   ├── admin/           # Super admin pages
│   │   ├── company-admin/   # Company admin pages
│   │   ├── crm/             # CRM module
│   │   ├── hrms/            # HR module
│   │   ├── accounting/      # Finance module
│   │   ├── ai/              # AI assistant pages
│   │   └── ...              # 40+ module directories
│   ├── lib/                 # Utilities
│   └── assets/              # Static assets
├── supabase/
│   ├── functions/           # 60+ Edge Functions
│   ├── migrations/          # Database migrations
│   └── config.toml          # Supabase configuration
└── public/                  # Static public files
```

## Deployment

Dynime runs on Cloudflare with automatic CI/CD:

1. Connect your GitHub repository to Cloudflare Pages
2. Deploy the frontend to Cloudflare Pages (static host + CDN)
3. Point to your Postgres backend via Cloudflare Hyperdrive; run server logic on Cloudflare Workers
4. Configure Worker secrets / DB-driven settings for AI and payment providers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ by the <a href="https://dynime.com">Dynime LLC</a> team
</p>
