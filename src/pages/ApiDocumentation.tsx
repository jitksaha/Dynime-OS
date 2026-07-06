import { useState, useRef, useEffect } from "react";
import {
  Copy, Check, Key, Code, BookOpen, Zap, Globe, Shield, ChevronDown, ChevronRight,
  Play, Loader2, Terminal, Hash, ArrowRight, AlertTriangle, Clock, Database,
  Users, FileText, DollarSign, Megaphone, CalendarDays, Briefcase, BarChart3,
  Send, Search, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1`;

const LANGUAGES = [
  { id: "curl", label: "cURL" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
];

type Endpoint = {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; desc: string; required?: boolean }[];
  queryParams?: { name: string; type: string; desc: string }[];
  body?: Record<string, any>;
  responseExample?: any;
};

type EndpointGroup = { group: string; icon: React.ElementType; description: string; items: Endpoint[] };

const ENDPOINTS: EndpointGroup[] = [
  {
    group: "Deals",
    icon: DollarSign,
    description: "Manage CRM deals, pipeline stages, and sales tracking.",
    items: [
      { method: "GET", path: "/deals", description: "List all deals with pagination, filtering, and search", queryParams: [
        { name: "limit", type: "integer", desc: "Max results (1-100, default 25)" },
        { name: "offset", type: "integer", desc: "Pagination offset (default 0)" },
        { name: "status", type: "string", desc: "Filter by status" },
        { name: "stage", type: "string", desc: "Filter by pipeline stage (e.g., Lead, Proposal, Negotiation, Won, Lost)" },
        { name: "priority", type: "string", desc: "Filter by priority (low, medium, high)" },
        { name: "source", type: "string", desc: "Filter by lead source" },
        { name: "search", type: "string", desc: "Search by name, email, or contact name" },
        { name: "order_by", type: "string", desc: "Sort field (default: created_at)" },
        { name: "order", type: "string", desc: "asc or desc (default: desc)" },
        { name: "date_from", type: "ISO date", desc: "Filter created after this date" },
        { name: "date_to", type: "ISO date", desc: "Filter created before this date" },
        { name: "fields", type: "string", desc: "Comma-separated fields to return" },
      ], responseExample: { data: [{ id: "uuid", name: "Enterprise Contract", value: 50000, stage: "Proposal", contact_name: "John Doe", email: "john@example.com" }], meta: { total: 42, limit: 25, offset: 0, page: 1, total_pages: 2, has_more: true } } },
      { method: "GET", path: "/deals/{id}", description: "Get a single deal by ID", params: [{ name: "id", type: "uuid", desc: "Deal ID", required: true }] },
      { method: "POST", path: "/deals", description: "Create a new deal", body: { name: "Enterprise Contract", value: 50000, stage: "Proposal", contact_name: "John Doe", email: "john@example.com", phone: "+1234567890", priority: "high", source: "website" } },
      { method: "PUT", path: "/deals/{id}", description: "Update a deal", params: [{ name: "id", type: "uuid", desc: "Deal ID", required: true }], body: { stage: "Negotiation", value: 55000 } },
      { method: "DELETE", path: "/deals/{id}", description: "Delete a deal", params: [{ name: "id", type: "uuid", desc: "Deal ID", required: true }] },
      { method: "GET", path: "/deals/{id}/follow-ups", description: "List follow-ups for a deal", params: [{ name: "id", type: "uuid", desc: "Deal ID", required: true }] },
      { method: "POST", path: "/deals/{id}/follow-ups", description: "Create a follow-up for a deal", params: [{ name: "id", type: "uuid", desc: "Deal ID", required: true }], body: { type: "call", notes: "Schedule demo", follow_up_date: "2026-03-15" } },
    ],
  },
  {
    group: "Employees",
    icon: Users,
    description: "Employee records, departments, and HR data.",
    items: [
      { method: "GET", path: "/employees", description: "List all employees", queryParams: [
        { name: "department", type: "string", desc: "Filter by department" },
        { name: "status", type: "string", desc: "Filter by status (active, inactive)" },
        { name: "search", type: "string", desc: "Search by name or email" },
      ] },
      { method: "GET", path: "/employees/{id}", description: "Get employee details", params: [{ name: "id", type: "uuid", desc: "Employee ID", required: true }] },
      { method: "POST", path: "/employees", description: "Create employee record", body: { full_name: "Jane Smith", email: "jane@company.com", department: "Engineering", job_title: "Senior Developer", phone: "+1234567890", salary: 95000 } },
      { method: "PUT", path: "/employees/{id}", description: "Update employee", params: [{ name: "id", type: "uuid", desc: "Employee ID", required: true }], body: { job_title: "Lead Developer", salary: 110000 } },
      { method: "DELETE", path: "/employees/{id}", description: "Remove employee record", params: [{ name: "id", type: "uuid", desc: "Employee ID", required: true }] },
    ],
  },
  {
    group: "Invoices",
    icon: FileText,
    description: "Invoice management, line items, and billing.",
    items: [
      { method: "GET", path: "/invoices", description: "List all invoices", queryParams: [{ name: "status", type: "string", desc: "Filter: draft, sent, paid, overdue" }] },
      { method: "GET", path: "/invoices/{id}", description: "Get invoice details", params: [{ name: "id", type: "uuid", desc: "Invoice ID", required: true }] },
      { method: "POST", path: "/invoices", description: "Create invoice", body: { client: "Acme Corp", invoice_number: "INV-001", amount: 1500, subtotal: 1400, tax_amount: 100, status: "draft" } },
      { method: "PUT", path: "/invoices/{id}", description: "Update invoice", params: [{ name: "id", type: "uuid", desc: "Invoice ID", required: true }], body: { status: "sent" } },
      { method: "DELETE", path: "/invoices/{id}", description: "Delete invoice", params: [{ name: "id", type: "uuid", desc: "Invoice ID", required: true }] },
      { method: "GET", path: "/invoices/{id}/items", description: "List invoice line items", params: [{ name: "id", type: "uuid", desc: "Invoice ID", required: true }] },
      { method: "POST", path: "/invoices/{id}/items", description: "Add line item to invoice", params: [{ name: "id", type: "uuid", desc: "Invoice ID", required: true }], body: { description: "Consulting hours", quantity: 10, unit_price: 150 } },
    ],
  },
  {
    group: "Expenses",
    icon: DollarSign,
    description: "Track and manage business expenses.",
    items: [
      { method: "GET", path: "/expenses", description: "List expenses", queryParams: [
        { name: "category", type: "string", desc: "Filter by category" },
        { name: "status", type: "string", desc: "Filter: pending, approved, rejected" },
        { name: "date_from", type: "ISO date", desc: "Start date" },
        { name: "date_to", type: "ISO date", desc: "End date" },
      ] },
      { method: "POST", path: "/expenses", description: "Create expense", body: { description: "Office supplies", amount: 250, category: "Office", expense_date: "2026-02-20" } },
      { method: "PUT", path: "/expenses/{id}", description: "Update expense", params: [{ name: "id", type: "uuid", desc: "Expense ID", required: true }], body: { status: "approved" } },
      { method: "DELETE", path: "/expenses/{id}", description: "Delete expense", params: [{ name: "id", type: "uuid", desc: "Expense ID", required: true }] },
    ],
  },
  {
    group: "Campaigns",
    icon: Megaphone,
    description: "Marketing campaigns and analytics.",
    items: [
      { method: "GET", path: "/campaigns", description: "List campaigns", queryParams: [
        { name: "status", type: "string", desc: "Filter: draft, active, paused, completed" },
        { name: "channel", type: "string", desc: "Filter: email, sms, social" },
      ] },
      { method: "POST", path: "/campaigns", description: "Create campaign", body: { name: "Summer Sale", channel: "email", budget: 5000, status: "draft" } },
      { method: "PUT", path: "/campaigns/{id}", description: "Update campaign", params: [{ name: "id", type: "uuid", desc: "Campaign ID", required: true }], body: { status: "active" } },
      { method: "DELETE", path: "/campaigns/{id}", description: "Delete campaign", params: [{ name: "id", type: "uuid", desc: "Campaign ID", required: true }] },
    ],
  },
  {
    group: "Documents",
    icon: FileText,
    description: "Document management and sharing.",
    items: [
      { method: "GET", path: "/documents", description: "List all documents", queryParams: [{ name: "search", type: "string", desc: "Search by name" }] },
      { method: "POST", path: "/documents", description: "Create document record", body: { name: "Q4 Report", doc_type: "report", description: "Quarterly financial report" } },
      { method: "PUT", path: "/documents/{id}", description: "Update document", params: [{ name: "id", type: "uuid", desc: "Document ID", required: true }], body: { name: "Q4 Report (Final)" } },
      { method: "DELETE", path: "/documents/{id}", description: "Delete document", params: [{ name: "id", type: "uuid", desc: "Document ID", required: true }] },
    ],
  },
  {
    group: "Attendance",
    icon: CalendarDays,
    description: "Employee attendance tracking.",
    items: [
      { method: "GET", path: "/attendance", description: "List attendance records", queryParams: [
        { name: "status", type: "string", desc: "Filter: present, absent, late, half-day" },
        { name: "attendance_type", type: "string", desc: "Filter by type" },
        { name: "date_from", type: "ISO date", desc: "Start date" },
        { name: "date_to", type: "ISO date", desc: "End date" },
      ] },
      { method: "POST", path: "/attendance", description: "Record attendance", body: { employee_name: "Jane Smith", status: "present", check_in: "09:00", check_out: "17:00" } },
    ],
  },
  {
    group: "Leave Requests",
    icon: CalendarDays,
    description: "Employee leave management.",
    items: [
      { method: "GET", path: "/leave-requests", description: "List leave requests", queryParams: [
        { name: "status", type: "string", desc: "Filter: pending, approved, rejected" },
        { name: "leave_type", type: "string", desc: "Filter: annual, sick, personal, maternity" },
      ] },
      { method: "POST", path: "/leave-requests", description: "Submit leave request", body: { employee_name: "Jane Smith", leave_type: "annual", from_date: "2026-03-01", to_date: "2026-03-05", days: 5, reason: "Family vacation" } },
      { method: "PUT", path: "/leave-requests/{id}", description: "Update leave status", params: [{ name: "id", type: "uuid", desc: "Leave ID", required: true }], body: { status: "approved" } },
    ],
  },
  {
    group: "Job Postings",
    icon: Briefcase,
    description: "Recruitment and job listing management.",
    items: [
      { method: "GET", path: "/job-postings", description: "List job postings", queryParams: [
        { name: "status", type: "string", desc: "Filter: Open, Closed, Draft" },
        { name: "department", type: "string", desc: "Filter by department" },
      ] },
      { method: "POST", path: "/job-postings", description: "Create job posting", body: { title: "Full Stack Developer", department: "Engineering", location: "Remote", employment_type: "Full-time", description: "We are looking for..." } },
      { method: "GET", path: "/job-postings/{id}/applications", description: "List applications for a job", params: [{ name: "id", type: "uuid", desc: "Job ID", required: true }] },
    ],
  },
  {
    group: "Departments",
    icon: Database,
    description: "Organization department structure.",
    items: [
      { method: "GET", path: "/departments", description: "List all departments" },
      { method: "POST", path: "/departments", description: "Create department", body: { name: "Engineering", head_name: "Jane Smith", description: "Software development team" } },
    ],
  },
  {
    group: "Helpdesk Tickets",
    icon: Hash,
    description: "Support ticket management and resolution.",
    items: [
      { method: "GET", path: "/tickets", description: "List support tickets", queryParams: [
        { name: "status", type: "string", desc: "Filter: open, in_progress, resolved, closed" },
        { name: "priority", type: "string", desc: "Filter: low, medium, high, urgent" },
        { name: "assigned_to", type: "string", desc: "Filter by assignee" },
      ] },
      { method: "GET", path: "/tickets/{id}", description: "Get ticket details", params: [{ name: "id", type: "uuid", desc: "Ticket ID", required: true }] },
      { method: "POST", path: "/tickets", description: "Create a ticket", body: { subject: "Login issue", description: "User cannot login", priority: "high", category: "Bug" } },
      { method: "PUT", path: "/tickets/{id}", description: "Update ticket", params: [{ name: "id", type: "uuid", desc: "Ticket ID", required: true }], body: { status: "resolved", resolution: "Password reset" } },
    ],
  },
  {
    group: "Projects",
    icon: Briefcase,
    description: "Project and task management.",
    items: [
      { method: "GET", path: "/projects", description: "List projects", queryParams: [
        { name: "status", type: "string", desc: "Filter: active, completed, on_hold" },
      ] },
      { method: "POST", path: "/projects", description: "Create a project", body: { name: "Website Redesign", description: "Complete overhaul", status: "active", start_date: "2026-03-01", end_date: "2026-06-30" } },
      { method: "GET", path: "/projects/{id}/tasks", description: "List project tasks", params: [{ name: "id", type: "uuid", desc: "Project ID", required: true }] },
      { method: "POST", path: "/projects/{id}/tasks", description: "Add task to project", params: [{ name: "id", type: "uuid", desc: "Project ID", required: true }], body: { title: "Design mockups", assignee: "Jane", priority: "high" } },
    ],
  },
  {
    group: "Products",
    icon: Database,
    description: "Product Hub inventory and catalog.",
    items: [
      { method: "GET", path: "/products", description: "List products", queryParams: [
        { name: "search", type: "string", desc: "Search by name or SKU" },
        { name: "category", type: "string", desc: "Filter by category" },
        { name: "in_stock", type: "boolean", desc: "Filter in-stock items only" },
      ] },
      { method: "GET", path: "/products/{id}", description: "Get product details", params: [{ name: "id", type: "uuid", desc: "Product ID", required: true }] },
      { method: "POST", path: "/products", description: "Create product", body: { name: "Widget Pro", sku: "WDG-001", price: 29.99, stock: 150, category: "Electronics" } },
      { method: "PUT", path: "/products/{id}", description: "Update product", params: [{ name: "id", type: "uuid", desc: "Product ID", required: true }], body: { price: 34.99, stock: 200 } },
    ],
  },
  {
    group: "Orders",
    icon: Database,
    description: "Product Hub order management.",
    items: [
      { method: "GET", path: "/orders", description: "List orders", queryParams: [
        { name: "status", type: "string", desc: "Filter: pending, processing, shipped, delivered, cancelled" },
        { name: "date_from", type: "ISO date", desc: "Start date" },
        { name: "date_to", type: "ISO date", desc: "End date" },
      ] },
      { method: "GET", path: "/orders/{id}", description: "Get order details", params: [{ name: "id", type: "uuid", desc: "Order ID", required: true }] },
      { method: "POST", path: "/orders", description: "Create order", body: { customer_name: "John Doe", items: [{ product_id: "uuid", quantity: 2 }], shipping_address: "123 Main St" } },
      { method: "PUT", path: "/orders/{id}", description: "Update order status", params: [{ name: "id", type: "uuid", desc: "Order ID", required: true }], body: { status: "shipped", tracking_number: "TRK123" } },
    ],
  },
  {
    group: "Budgets",
    icon: DollarSign,
    description: "Budget tracking and allocation.",
    items: [
      { method: "GET", path: "/budgets", description: "List budgets", queryParams: [
        { name: "period", type: "string", desc: "Filter: monthly, quarterly, yearly" },
        { name: "status", type: "string", desc: "Filter: active, completed" },
      ] },
      { method: "POST", path: "/budgets", description: "Create budget", body: { name: "Q1 Marketing", category: "Marketing", allocated_amount: 50000, period: "quarterly", start_date: "2026-01-01" } },
    ],
  },
  {
    group: "Email Templates",
    icon: Send,
    description: "Marketing email template management.",
    items: [
      { method: "GET", path: "/email-templates", description: "List email templates", queryParams: [{ name: "search", type: "string", desc: "Search by name" }] },
      { method: "POST", path: "/email-templates", description: "Create template", body: { name: "Welcome Email", category: "onboarding", subject_line: "Welcome to {{company}}" } },
    ],
  },
  {
    group: "Notifications",
    icon: Hash,
    description: "System notifications management.",
    items: [
      { method: "GET", path: "/notifications", description: "List notifications", queryParams: [
        { name: "type", type: "string", desc: "Filter by type" },
        { name: "read", type: "boolean", desc: "Filter by read status" },
      ] },
    ],
  },
  {
    group: "Webhooks",
    icon: Globe,
    description: "Manage webhook configurations.",
    items: [
      { method: "GET", path: "/webhooks", description: "List configured webhooks" },
      { method: "POST", path: "/webhooks", description: "Create webhook", body: { name: "Slack Notifier", url: "https://hooks.slack.com/...", events: ["deal.won", "invoice.paid"] } },
      { method: "PUT", path: "/webhooks/{id}", description: "Update webhook", params: [{ name: "id", type: "uuid", desc: "Webhook ID", required: true }], body: { is_active: false } },
      { method: "DELETE", path: "/webhooks/{id}", description: "Delete webhook", params: [{ name: "id", type: "uuid", desc: "Webhook ID", required: true }] },
    ],
  },
  {
    group: "Meetings",
    icon: CalendarDays,
    description: "Schedule and manage Google Meet & Zoom meetings.",
    items: [
      { method: "GET", path: "/meetings", description: "List all meetings", queryParams: [
        { name: "status", type: "string", desc: "Filter: scheduled, live, ended, cancelled" },
        { name: "provider", type: "string", desc: "Filter: google_meet, zoom" },
        { name: "meeting_type", type: "string", desc: "Filter: one_time, recurring, instant" },
        { name: "date_from", type: "ISO date", desc: "Start date filter" },
        { name: "date_to", type: "ISO date", desc: "End date filter" },
        { name: "search", type: "string", desc: "Search by title or description" },
      ], responseExample: { data: [{ id: "uuid", title: "Team Standup", provider: "google_meet", meeting_url: "https://meet.google.com/abc-defg-hij", start_time: "2026-03-10T09:00:00Z", end_time: "2026-03-10T09:30:00Z", status: "scheduled", meeting_type: "recurring", attendees: ["john@example.com"], duration_minutes: 30 }], meta: { total: 15, limit: 25, offset: 0 } } },
      { method: "GET", path: "/meetings/{id}", description: "Get meeting details", params: [{ name: "id", type: "uuid", desc: "Meeting ID", required: true }] },
      { method: "POST", path: "/meetings", description: "Create / schedule a meeting", body: { title: "Sprint Planning", provider: "google_meet", meeting_url: "https://meet.google.com/abc-defg-hij", start_time: "2026-03-10T09:00:00Z", duration_minutes: 60, meeting_type: "recurring", recurrence_rule: "weekly", attendees: ["dev@company.com", "pm@company.com"], password: "" } },
      { method: "PUT", path: "/meetings/{id}", description: "Update a meeting", params: [{ name: "id", type: "uuid", desc: "Meeting ID", required: true }], body: { status: "cancelled" } },
      { method: "DELETE", path: "/meetings/{id}", description: "Delete a meeting", params: [{ name: "id", type: "uuid", desc: "Meeting ID", required: true }] },
    ],
  },
  {
    group: "Statistics",
    icon: BarChart3,
    description: "Aggregate counts across all modules.",
    items: [
      { method: "GET", path: "/stats", description: "Get record counts across all modules", responseExample: { data: { deals: 42, employees: 18, invoices: 156, expenses: 89, tickets: 34, products: 67, orders: 123, meetings: 15 }, generated_at: "2026-02-20T12:00:00Z" } },
    ],
  },
];

const ERROR_CODES = [
  { code: "AUTH_MISSING_KEY", status: 401, desc: "No X-API-Key header provided" },
  { code: "AUTH_INVALID_KEY", status: 401, desc: "API key not found or inactive" },
  { code: "AUTH_KEY_EXPIRED", status: 401, desc: "API key has passed its expiration date" },
  { code: "SCOPE_DENIED", status: 403, desc: "API key lacks the required scope for this operation" },
  { code: "RESOURCE_NOT_FOUND", status: 404, desc: "The requested resource endpoint does not exist" },
  { code: "NOT_FOUND", status: 404, desc: "The specific record was not found" },
  { code: "MISSING_ID", status: 400, desc: "A resource ID is required for this operation" },
  { code: "METHOD_NOT_ALLOWED", status: 405, desc: "HTTP method not supported for this endpoint" },
  { code: "INTERNAL_ERROR", status: 500, desc: "An unexpected server error occurred" },
];

const SCOPES = [
  { scope: "read", desc: "Read access to all resources" },
  { scope: "write", desc: "Write access to all resources" },
  { scope: "read:deals", desc: "Read only CRM deals" },
  { scope: "write:deals", desc: "Write only CRM deals" },
  { scope: "read:employees", desc: "Read only employee data" },
  { scope: "write:employees", desc: "Write only employees" },
  { scope: "read:invoices", desc: "Read only invoices" },
  { scope: "write:invoices", desc: "Write only invoices" },
  { scope: "read:expenses", desc: "Read only expenses" },
  { scope: "write:expenses", desc: "Write only expenses" },
  { scope: "read:documents", desc: "Read only documents" },
  { scope: "write:documents", desc: "Write only documents" },
  { scope: "read:campaigns", desc: "Read only campaigns" },
  { scope: "write:campaigns", desc: "Write only campaigns" },
  { scope: "read:attendance", desc: "Read only attendance" },
  { scope: "read:leave-requests", desc: "Read only leave requests" },
  { scope: "read:job-postings", desc: "Read only job postings" },
  { scope: "read:tickets", desc: "Read helpdesk tickets" },
  { scope: "write:tickets", desc: "Write helpdesk tickets" },
  { scope: "read:projects", desc: "Read projects & tasks" },
  { scope: "write:projects", desc: "Write projects & tasks" },
  { scope: "read:products", desc: "Read product catalog" },
  { scope: "write:products", desc: "Write product catalog" },
  { scope: "read:orders", desc: "Read orders" },
  { scope: "write:orders", desc: "Write orders" },
  { scope: "read:budgets", desc: "Read budgets" },
  { scope: "read:webhooks", desc: "Read webhook configs" },
  { scope: "write:webhooks", desc: "Manage webhooks" },
  { scope: "read:stats", desc: "Read aggregate statistics" },
];

// ---- Code Generation ----
function generateCode(lang: string, endpoint: Endpoint): string {
  const url = `${BASE_URL}${endpoint.path.replace("{id}", "RESOURCE_ID")}`;
  const hasBody = !!endpoint.body;
  const bodyStr = hasBody ? JSON.stringify(endpoint.body, null, 2) : "";

  switch (lang) {
    case "curl":
      return `curl -X ${endpoint.method} "${url}" \\
  -H "X-API-Key: bst_your_api_key_here" \\
  -H "Content-Type: application/json"${hasBody ? ` \\
  -d '${JSON.stringify(endpoint.body)}'` : ""}`;

    case "javascript":
      return `const response = await fetch("${url}", {
  method: "${endpoint.method}",
  headers: {
    "X-API-Key": "bst_your_api_key_here",
    "Content-Type": "application/json",
  },${hasBody ? `
  body: JSON.stringify(${bodyStr}),` : ""}
});

const data = await response.json();
console.log(data);`;

    case "python":
      return `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "${url}",
    headers={
        "X-API-Key": "bst_your_api_key_here",
        "Content-Type": "application/json",
    },${hasBody ? `
    json=${bodyStr},` : ""}
)

data = response.json()
print(data)`;

    case "php":
      return `<?php
$ch = curl_init("${url}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-API-Key: bst_your_api_key_here",
    "Content-Type: application/json",
]);${hasBody ? `
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${endpoint.method}");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(${bodyStr}));` : ""}

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);`;

    case "ruby":
      return `require "net/http"
require "json"

uri = URI("${url}")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::${endpoint.method === "GET" ? "Get" : endpoint.method === "POST" ? "Post" : endpoint.method === "PUT" ? "Put" : "Delete"}.new(uri)
request["X-API-Key"] = "bst_your_api_key_here"
request["Content-Type"] = "application/json"${hasBody ? `
request.body = (${bodyStr}).to_json` : ""}

response = http.request(request)
puts JSON.parse(response.body)`;

    case "go":
      return `package main

import (
    "fmt"
    "net/http"
    "io"${hasBody ? `
    "bytes"` : ""}
)

func main() {${hasBody ? `
    jsonBody := []byte(\`${JSON.stringify(endpoint.body)}\`)
    req, _ := http.NewRequest("${endpoint.method}", "${url}", bytes.NewBuffer(jsonBody))` : `
    req, _ := http.NewRequest("${endpoint.method}", "${url}", nil)`}
    req.Header.Set("X-API-Key", "bst_your_api_key_here")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;

    case "java":
      return `import java.net.http.*;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${url}"))
    .header("X-API-Key", "bst_your_api_key_here")
    .header("Content-Type", "application/json")${hasBody ? `
    .method("${endpoint.method}", HttpRequest.BodyPublishers.ofString("""
        ${JSON.stringify(endpoint.body, null, 8)}
        """))` : `
    .${endpoint.method === "GET" ? "GET" : `method("${endpoint.method}", HttpRequest.BodyPublishers.noBody())`}`}()
    .build();

HttpResponse<String> response = client.send(
    request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`;

    default: return "";
  }
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PATCH: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

// ---- Components ----
function CopyButton({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
    >
      {copied ? <Check className={size === "sm" ? "h-3.5 w-3.5" : "h-3 w-3"} /> : <Copy className={size === "sm" ? "h-3.5 w-3.5" : "h-3 w-3"} />}
    </button>
  );
}

function ApiTester() {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/deals");
  const [apiKey, setApiKey] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const sendRequest = async () => {
    if (!apiKey) { setResponse(JSON.stringify({ error: "Enter your API key" }, null, 2)); return; }
    setLoading(true);
    const start = Date.now();
    try {
      const opts: RequestInit = {
        method,
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      };
      if (["POST", "PUT", "PATCH"].includes(method) && requestBody) {
        opts.body = requestBody;
      }
      const resp = await fetch(`${BASE_URL}${path}`, opts);
      setStatusCode(resp.status);
      setResponseTime(Date.now() - start);
      const data = await resp.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setResponse(JSON.stringify({ error: e.message }, null, 2));
      setStatusCode(0);
      setResponseTime(Date.now() - start);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Terminal className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">API Playground</h3>
        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium ml-auto">Live</span>
      </div>
      <div className="p-3 sm:p-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="bst_your_api_key_here"
            className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1 min-w-0">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-8 px-2 rounded-md border border-input bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => <option key={m}>{m}</option>)}
            </select>
            <div className="flex-1 flex items-center gap-0 border border-input rounded-md bg-background overflow-hidden min-w-0">
              <span className="text-[10px] text-muted-foreground pl-2 shrink-0 font-mono hidden sm:inline">/api-v1</span>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 h-8 px-1 bg-transparent text-xs font-mono text-foreground focus:outline-none min-w-0"
              />
            </div>
          </div>
          <button
            onClick={sendRequest}
            disabled={loading}
            className="h-8 px-3 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Send
          </button>
        </div>

        {["POST", "PUT", "PATCH"].includes(method) && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Request Body (JSON)</label>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              placeholder='{"name": "Example"}'
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
          </div>
        )}

        {response && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Response</span>
              {statusCode !== null && (
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                  statusCode >= 200 && statusCode < 300 ? "bg-emerald-500/10 text-emerald-600" :
                  statusCode >= 400 ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-600"
                )}>{statusCode}</span>
              )}
              {responseTime !== null && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" /> {responseTime}ms
                </span>
              )}
              <div className="ml-auto"><CopyButton text={response} size="xs" /></div>
            </div>
            <pre className="text-[11px] bg-muted/30 border border-border rounded-lg p-3 overflow-auto max-h-64 font-mono text-foreground leading-relaxed">
              {response}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function EndpointCard({ endpoint, defaultLang }: { endpoint: Endpoint; defaultLang: string }) {
  const [expanded, setExpanded] = useState(false);
  const [lang, setLang] = useState(defaultLang);
  const code = generateCode(lang, endpoint);

  useEffect(() => { setLang(defaultLang); }, [defaultLang]);

  return (
    <div className="border border-border rounded-lg overflow-hidden group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
      >
        <span className={cn("px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border shrink-0 min-w-[42px] sm:min-w-[52px] text-center", methodColors[endpoint.method])}>
          {endpoint.method}
        </span>
        <code className="text-[12px] sm:text-[13px] font-mono text-foreground flex-1 truncate">{endpoint.path}</code>
        <span className="text-[11px] text-muted-foreground hidden lg:block max-w-[200px] truncate">{endpoint.description}</span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/10">
          <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-border">
            {/* Left: Info */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">{endpoint.description}</p>

              {endpoint.params && (
                <div>
                  <h4 className="text-[10px] font-bold text-foreground mb-2 uppercase tracking-widest">Path Parameters</h4>
                  {endpoint.params.map(p => (
                    <div key={p.name} className="flex items-baseline gap-2 text-xs mb-1">
                      <code className="text-primary font-mono bg-primary/5 px-1 py-0.5 rounded text-[11px]">{p.name}</code>
                      <span className="text-muted-foreground/60 text-[10px]">{p.type}</span>
                      {p.required && <span className="text-[9px] text-destructive font-semibold uppercase">required</span>}
                      <span className="text-muted-foreground text-[11px]">{p.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {endpoint.queryParams && (
                <div>
                  <h4 className="text-[10px] font-bold text-foreground mb-2 uppercase tracking-widest">Query Parameters</h4>
                  <div className="space-y-1">
                    {endpoint.queryParams.map(p => (
                      <div key={p.name} className="flex items-baseline gap-2 text-xs">
                        <code className="text-primary font-mono bg-primary/5 px-1 py-0.5 rounded text-[11px] shrink-0">{p.name}</code>
                        <span className="text-muted-foreground/60 text-[10px] shrink-0">{p.type}</span>
                        <span className="text-muted-foreground text-[11px]">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {endpoint.body && (
                <div>
                  <h4 className="text-[10px] font-bold text-foreground mb-2 uppercase tracking-widest">Request Body</h4>
                  <pre className="text-[11px] bg-card border border-border rounded-lg p-3 overflow-x-auto text-foreground font-mono">
                    {JSON.stringify(endpoint.body, null, 2)}
                  </pre>
                </div>
              )}

              {endpoint.responseExample && (
                <div>
                  <h4 className="text-[10px] font-bold text-foreground mb-2 uppercase tracking-widest">Response Example</h4>
                  <pre className="text-[11px] bg-card border border-border rounded-lg p-3 overflow-x-auto text-foreground font-mono">
                    {JSON.stringify(endpoint.responseExample, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Right: Code */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest">Code Example</h4>
                <CopyButton text={code} size="xs" />
              </div>
              <div className="flex gap-1 mb-3 flex-wrap">
                {LANGUAGES.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded font-medium transition-colors",
                      lang === l.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <pre className="text-[11px] bg-card border border-border rounded-lg p-3 overflow-auto max-h-[400px] text-foreground font-mono leading-relaxed">
                {code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sidebar Nav Section ----
type NavSection = "overview" | "auth" | "playground" | "endpoints" | "errors" | "sdks" | "rate-limits" | "pagination" | "webhooks" | "use-cases" | "postman";

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "auth", label: "Authentication", icon: Shield },
  { id: "playground", label: "API Playground", icon: Terminal },
  { id: "endpoints", label: "Endpoints", icon: Code },
  { id: "use-cases", label: "Use Case Guides", icon: Zap },
  { id: "pagination", label: "Pagination", icon: Hash },
  { id: "errors", label: "Error Codes", icon: AlertTriangle },
  { id: "rate-limits", label: "Rate Limits", icon: Clock },
  { id: "sdks", label: "SDKs & Libraries", icon: Zap },
  { id: "postman", label: "Postman Collection", icon: ArrowRight },
  { id: "webhooks", label: "Webhooks", icon: ArrowRight },
];

// ---- Main Component ----
export default function ApiDocumentation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [defaultLang, setDefaultLang] = useState("curl");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: NavSection) => {
    setActiveSection(id);
    setSidebarOpen(false);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredEndpoints = ENDPOINTS.map(group => ({
    ...group,
    items: group.items.filter(e =>
      !searchQuery ||
      e.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.group.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Header */}
      <div className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-primary/3">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0"><BookOpen className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">API Reference</h1>
              <p className="text-xs text-muted-foreground">v1.0.0</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl mb-5">
            Complete REST API for integrating Dynime's CRM, HRMS, Accounting, Marketing, and Recruitment modules into your applications.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-card border border-border rounded-lg text-[11px] sm:text-xs overflow-hidden">
              <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
              <code className="font-mono text-foreground truncate max-w-[180px] sm:max-w-none">{BASE_URL}</code>
              <CopyButton text={BASE_URL} size="xs" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-card border border-border rounded-lg text-[11px] sm:text-xs">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
              <code className="font-mono text-foreground">X-API-Key</code>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-card border border-border rounded-lg text-[11px] sm:text-xs">
              <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-foreground font-medium">{ENDPOINTS.reduce((a, g) => a + g.items.length, 0)} Endpoints</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-card border border-border rounded-lg text-[11px] sm:text-xs">
              <Database className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-foreground font-medium">{ENDPOINTS.length} Resources</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden border-b border-border px-4 py-2 flex items-center justify-between bg-card sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2 text-sm text-foreground">
          <Menu className="h-4 w-4" /> Navigation
        </button>
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-32 h-7 px-2 rounded border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Sidebar */}
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={cn(
          "fixed lg:sticky top-0 lg:top-0 left-0 z-50 lg:z-auto w-56 h-screen lg:h-auto bg-card lg:bg-transparent border-r border-border lg:border-0 transition-transform lg:translate-x-0 lg:pt-6 lg:pl-4 shrink-0 overflow-y-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-border">
            <span className="text-sm font-bold text-foreground">Navigation</span>
            <button onClick={() => setSidebarOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <nav className="p-3 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left",
                  activeSection === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-border">
              <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Resources</p>
              {ENDPOINTS.map(g => (
                <button
                  key={g.group}
                  onClick={() => { setActiveSection("endpoints"); setSearchQuery(""); setTimeout(() => { document.getElementById(`group-${g.group}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors text-left"
                >
                  <g.icon className="h-3 w-3 shrink-0" />
                  {g.group}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6 space-y-10">
          {/* Language selector */}
          <div className="hidden lg:flex items-center gap-3 flex-wrap">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search endpoints, resources..."
              className="flex-1 max-w-sm h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center gap-1 ml-auto flex-wrap">
              <span className="text-[10px] text-muted-foreground mr-1">Default language:</span>
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => setDefaultLang(l.id)}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded font-medium transition-colors",
                    defaultLang === l.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overview */}
          <div ref={el => { sectionRefs.current["overview"] = el; }} id="section-overview">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Key className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold text-foreground">1. Get API Key</h3></div>
                <p className="text-xs text-muted-foreground">Generate from <Link to="/api-keys" className="text-primary hover:underline">Settings → API Keys</Link> with desired scopes.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold text-foreground">2. Authenticate</h3></div>
                <p className="text-xs text-muted-foreground">Include <code className="bg-primary/5 px-1 rounded">X-API-Key: bst_...</code> in every request header.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Send className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold text-foreground">3. Make Requests</h3></div>
                <p className="text-xs text-muted-foreground">JSON in, JSON out. All list endpoints support pagination, filtering, and search.</p>
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div ref={el => { sectionRefs.current["auth"] = el; }} id="section-auth">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Authentication
            </h2>
            <div className="bg-card border border-border rounded-xl p-5 mb-4">
              <p className="text-sm text-muted-foreground mb-4">
                All requests require an API key. Keys are tenant-scoped and support granular permissions via scopes.
              </p>
          <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                <h3 className="text-[10px] font-bold text-foreground mb-3 uppercase tracking-widest">Available Scopes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
                  {SCOPES.map(s => (
                    <div key={s.scope} className="flex items-center gap-2 text-[11px]">
                      <code className="bg-primary/10 text-primary px-1 py-0.5 rounded font-mono shrink-0">{s.scope}</code>
                      <span className="text-muted-foreground truncate">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Playground */}
          <div ref={el => { sectionRefs.current["playground"] = el; }} id="section-playground">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" /> API Playground
            </h2>
            <ApiTester />
          </div>

          {/* Endpoints */}
          <div ref={el => { sectionRefs.current["endpoints"] = el; }} id="section-endpoints">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" /> Endpoints
            </h2>
            <div className="space-y-8">
              {filteredEndpoints.map(group => (
                <div key={group.group} id={`group-${group.group}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <group.icon className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">{group.group}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">{group.items.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{group.description}</p>
                  <div className="space-y-1.5">
                    {group.items.map((e, i) => (
                      <EndpointCard key={`${e.method}-${e.path}-${i}`} endpoint={e} defaultLang={defaultLang} />
                    ))}
                  </div>
                </div>
              ))}
              {filteredEndpoints.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Code className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No endpoints match "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Use Case Guides */}
          <div ref={el => { sectionRefs.current["use-cases"] = el; }} id="section-use-cases">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Use Case Guides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Sync CRM deals to Google Sheets", desc: "Use GET /deals with date filters to fetch recent deals and push them to a spreadsheet via Zapier or Google Sheets API.", steps: ["1. GET /deals?date_from=2026-02-01&order=desc", "2. Map fields: name, value, stage, contact", "3. Append rows to Google Sheet via API"] },
                { title: "Auto-create invoices from orders", desc: "Listen for order.created webhook events and use POST /invoices to auto-generate invoices for each new order.", steps: ["1. Configure webhook: order.created", "2. Parse order payload for customer & items", "3. POST /invoices with mapped data"] },
                { title: "Employee onboarding automation", desc: "When a new employee is hired, trigger a workflow that creates accounts, assigns training, and sends welcome emails.", steps: ["1. Webhook: employee.hired", "2. POST /projects/{id}/tasks for onboarding checklist", "3. Trigger email via Gmail/Slack integration"] },
                { title: "Daily attendance report to Slack", desc: "Schedule a daily cron job that fetches attendance and posts a summary to your Slack channel.", steps: ["1. GET /attendance?date_from=today", "2. Aggregate present/absent/late counts", "3. POST to Slack webhook with summary"] },
                { title: "Expense approval pipeline", desc: "Build an automated expense approval flow with notifications at each stage.", steps: ["1. Webhook: expense.created", "2. POST to Slack for manager approval", "3. PUT /expenses/{id} status=approved on confirmation"] },
                { title: "Product stock alerts", desc: "Monitor inventory levels and get notified when stock drops below threshold.", steps: ["1. GET /products?in_stock=true periodically", "2. Filter where stock < threshold", "3. Send alert via Slack/email/WhatsApp"] },
              ].map((uc, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-bold text-foreground">{uc.title}</h3>
                  <p className="text-xs text-muted-foreground">{uc.desc}</p>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    {uc.steps.map((s, j) => (
                      <p key={j} className="text-[11px] font-mono text-foreground">{s}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Postman Collection */}
          <div ref={el => { sectionRefs.current["postman"] = el; }} id="section-postman">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" /> Postman / Insomnia Collection
            </h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <p className="text-sm text-muted-foreground">Import our API collection into Postman or Insomnia for quick testing. Copy the JSON below and import as a collection.</p>
              <div className="relative">
                <pre className="text-[11px] bg-muted/30 rounded-lg p-3 font-mono text-foreground overflow-auto max-h-48">{JSON.stringify({
                  info: { name: "Dynime API v1", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
                  variable: [{ key: "base_url", value: BASE_URL }, { key: "api_key", value: "bst_your_key_here" }],
                  auth: { type: "apikey", apikey: [{ key: "key", value: "X-API-Key" }, { key: "value", value: "{{api_key}}" }, { key: "in", value: "header" }] },
                  item: ENDPOINTS.map(g => ({ name: g.group, item: g.items.map(e => ({ name: `${e.method} ${e.path}`, request: { method: e.method, url: `{{base_url}}${e.path}`, header: [{ key: "Content-Type", value: "application/json" }], body: e.body ? { mode: "raw", raw: JSON.stringify(e.body, null, 2) } : undefined } })) })),
                }, null, 2)}</pre>
                <div className="absolute top-2 right-2"><CopyButton text={JSON.stringify({
                  info: { name: "Dynime API v1", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
                  variable: [{ key: "base_url", value: BASE_URL }, { key: "api_key", value: "bst_your_key_here" }],
                  item: ENDPOINTS.map(g => ({ name: g.group, item: g.items.map(e => ({ name: `${e.method} ${e.path}`, request: { method: e.method, url: `{{base_url}}${e.path}` } })) })),
                }, null, 2)} size="sm" /></div>
              </div>
              <div className="flex gap-3 text-xs">
                <div className="bg-muted/30 rounded-lg p-3 flex-1">
                  <p className="font-bold text-foreground mb-1">Postman</p>
                  <p className="text-muted-foreground">File → Import → Paste Raw Text → Import</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 flex-1">
                  <p className="font-bold text-foreground mb-1">Insomnia</p>
                  <p className="text-muted-foreground">Application → Import/Export → Import Data → From Clipboard</p>
                </div>
              </div>
            </div>
          </div>
          {/* Pagination */}
          <div ref={el => { sectionRefs.current["pagination"] = el; }} id="section-pagination">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" /> Pagination & Filtering
            </h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-foreground mb-2">Pagination</h3>
                <p className="text-xs text-muted-foreground mb-3">All list endpoints return paginated results with a <code className="bg-primary/5 px-1 rounded">meta</code> object.</p>
                <pre className="text-[11px] bg-muted/30 rounded-lg p-3 font-mono text-foreground">{`GET /deals?limit=10&offset=20&order_by=created_at&order=desc

Response meta:
{
  "total": 156,
  "limit": 10,
  "offset": 20,
  "page": 3,
  "total_pages": 16,
  "has_more": true
}`}</pre>
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground mb-2">Filtering</h3>
                <p className="text-xs text-muted-foreground mb-2">Filter by status, category, department, and other fields as query parameters.</p>
                <pre className="text-[11px] bg-muted/30 rounded-lg p-3 font-mono text-foreground">{`GET /deals?stage=Proposal&priority=high
GET /employees?department=Engineering&status=active
GET /invoices?status=overdue&date_from=2026-01-01&date_to=2026-02-28
GET /expenses?category=Travel&search=flight`}</pre>
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground mb-2">Field Selection</h3>
                <p className="text-xs text-muted-foreground mb-2">Use the <code className="bg-primary/5 px-1 rounded">fields</code> parameter to return only specific columns.</p>
                <pre className="text-[11px] bg-muted/30 rounded-lg p-3 font-mono text-foreground">{`GET /deals?fields=id,name,value,stage`}</pre>
              </div>
            </div>
          </div>

          {/* Error Codes */}
          <div ref={el => { sectionRefs.current["errors"] = el; }} id="section-errors">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" /> Error Codes
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Desktop table */}
              <table className="w-full text-xs hidden sm:table">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                    <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Code</th>
                    <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_CODES.map(e => (
                    <tr key={e.code} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                          e.status < 500 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500"
                        )}>{e.status}</span>
                      </td>
                      <td className="px-4 py-2"><code className="font-mono text-foreground">{e.code}</code></td>
                      <td className="px-4 py-2 text-muted-foreground">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {ERROR_CODES.map(e => (
                  <div key={e.code} className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                        e.status < 500 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500"
                      )}>{e.status}</span>
                      <code className="font-mono text-foreground text-xs">{e.code}</code>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{e.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-foreground mb-2">Error Response Format</h3>
              <pre className="text-[11px] bg-muted/30 rounded-lg p-3 font-mono text-foreground">{`{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "required": ["read", "read:all", "read:deals"]  // Only for SCOPE_DENIED
}`}</pre>
            </div>
          </div>

          {/* Rate Limits */}
          <div ref={el => { sectionRefs.current["rate-limits"] = el; }} id="section-rate-limits">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Rate Limits
            </h2>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-4">
                Each API key has a configurable rate limit (default: <strong className="text-foreground">60 requests/minute</strong>). Exceeding returns <code className="bg-primary/5 px-1 rounded text-xs">429 Too Many Requests</code>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">60</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Requests / min</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">100</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max per page</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">∞</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No daily limit</p>
                </div>
              </div>
            </div>
          </div>

          {/* SDKs */}
          <div ref={el => { sectionRefs.current["sdks"] = el; }} id="section-sdks">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> SDKs & Quick Setup
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { lang: "Node.js / JavaScript", code: `// npm install axios
const axios = require('axios');

const api = axios.create({
  baseURL: '${BASE_URL}',
  headers: { 'X-API-Key': 'bst_your_key' },
});

// List deals
const { data } = await api.get('/deals?limit=10');
console.log(data);

// Create a deal
await api.post('/deals', {
  name: 'New Deal',
  value: 25000,
  stage: 'Lead',
});` },
                { lang: "Python", code: `# pip install requests
import requests

API_KEY = "bst_your_key"
BASE = "${BASE_URL}"
HEADERS = {"X-API-Key": API_KEY}

# List employees
r = requests.get(f"{BASE}/employees", headers=HEADERS)
print(r.json())

# Create expense
requests.post(f"{BASE}/expenses", headers=HEADERS, json={
    "description": "Travel",
    "amount": 500,
    "category": "Travel"
})` },
                { lang: "PHP", code: `<?php
$apiKey = 'bst_your_key';
$base = '${BASE_URL}';

function apiCall($method, $endpoint, $body = null) {
    global $apiKey, $base;
    $ch = curl_init("$base$endpoint");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-API-Key: $apiKey",
        "Content-Type: application/json"
    ]);
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    return json_decode(curl_exec($ch), true);
}

$deals = apiCall('GET', '/deals');` },
                { lang: "Ruby", code: `require "net/http"
require "json"

API_KEY = "bst_your_key"
BASE = URI("${BASE_URL}")

def api_get(path)
  uri = URI("#{BASE}#{path}")
  req = Net::HTTP::Get.new(uri)
  req["X-API-Key"] = API_KEY
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  JSON.parse(http.request(req).body)
end

deals = api_get("/deals?limit=10")
puts deals` },
              ].map(sdk => (
                <div key={sdk.lang} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{sdk.lang}</span>
                    <CopyButton text={sdk.code} size="xs" />
                  </div>
                  <pre className="text-[11px] p-4 overflow-auto max-h-56 font-mono text-foreground leading-relaxed">{sdk.code}</pre>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div ref={el => { sectionRefs.current["webhooks"] = el; }} id="section-webhooks">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" /> Webhooks
            </h2>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded">Coming Soon</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Webhook support is coming soon. You'll be able to register HTTP endpoints to receive real-time notifications for events like:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "deal.created", "deal.stage_changed", "deal.won", "deal.lost",
                  "invoice.created", "invoice.paid", "invoice.overdue",
                  "employee.created", "employee.updated",
                  "expense.submitted", "expense.approved",
                  "leave.requested", "leave.approved",
                ].map(e => (
                  <div key={e} className="flex items-center gap-2 text-xs">
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{e}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
