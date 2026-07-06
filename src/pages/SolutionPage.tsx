import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/db";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import {
  Heart, GraduationCap, Factory, ShoppingBag, Laptop, Landmark,
  Hotel, HardHat, Truck, HandHeart, Building2, Scale,
  CheckCircle2, ArrowRight,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Heart, GraduationCap, Factory, ShoppingBag, Laptop, Landmark,
  Hotel, HardHat, Truck, HandHeart, Building2, Scale,
};

interface Solution {
  slug: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const moduleHighlights: Record<string, string[]> = {
  healthcare: ["HRMS for staff scheduling & shifts", "Compliance & audit trail tracking", "Patient record workflows", "Payroll with allowances & deductions"],
  education: ["Student & faculty management", "Attendance & leave automation", "Fee invoicing & payment tracking", "Academic performance reports"],
  manufacturing: ["Production line workforce tracking", "Inventory & supply chain workflows", "Safety compliance & audits", "Shift-based payroll management"],
  retail: ["Point-of-sale CRM integration", "Marketing campaigns & promotions", "Employee scheduling & attendance", "Sales analytics & reporting"],
  technology: ["Agile project management boards", "Sprint tracking & team collaboration", "Subscription billing & invoicing", "Developer performance reviews"],
  finance: ["Multi-entity accounting & ledger", "Regulatory compliance workflows", "Client portfolio management", "Tax reporting & reconciliation"],
  hospitality: ["Staff rostering & shift management", "Guest feedback & helpdesk", "Housekeeping task workflows", "Tip & commission payroll"],
  construction: ["Project timeline & milestones", "Equipment & resource allocation", "Safety incident reporting", "Contractor payroll management"],
  logistics: ["Fleet & vehicle management", "Route optimization workflows", "Driver attendance & shifts", "Delivery performance analytics"],
  nonprofit: ["Donor CRM & relationship tracking", "Grant application workflows", "Volunteer scheduling & hours", "Fund allocation reporting"],
  realestate: ["Property listing management", "Client CRM & follow-ups", "Lease & document workflows", "Commission & payout tracking"],
  legal: ["Case management & deadlines", "Client billing & time tracking", "Document automation & templates", "Compliance audit trails"],
};

export default function SolutionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [solution, setSolution] = useState<Solution | null>(null);
  const [allSolutions, setAllSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "industry_solutions")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          const list = data.value as unknown as Solution[];
          setAllSolutions(list);
          setSolution(list.find((s) => s.slug === slug) || null);
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="flex justify-center py-32"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Solution Not Found</h1>
          <p className="text-muted-foreground mb-8">The industry solution you're looking for doesn't exist.</p>
          <Link to="/" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            Back to Home
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const Icon = iconMap[solution.icon] || Heart;
  const highlights = moduleHighlights[solution.slug] || [
    "Complete HRMS & payroll management",
    "CRM & customer relationship tools",
    "Accounting & invoicing workflows",
    "Custom reporting & analytics",
  ];
  const otherSolutions = allSolutions.filter((s) => s.slug !== slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 30% 50%, ${solution.color}, transparent 70%)` }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: solution.color + "15" }}>
              <Icon className="h-7 w-7" style={{ color: solution.color }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full" style={{ color: solution.color, backgroundColor: solution.color + "15" }}>
              Industry Solution
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-6">
            Dynime for <span style={{ color: solution.color }}>{solution.name}</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-8">
            {solution.description}. Streamline your operations with an all-in-one platform built for your industry.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className="px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted/50 transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Why {solution.name} teams choose Dynime</h2>
          <p className="text-muted-foreground mb-10 max-w-2xl">Purpose-built tools that understand your industry's unique challenges.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: solution.color }} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{h}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-16 sm:py-20 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">All-in-one platform modules</h2>
          <p className="text-muted-foreground mb-10">Every tool your {solution.name.toLowerCase()} business needs, in one place.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "HRMS", desc: "Employee management & payroll", path: "/features/hrms" },
              { name: "CRM", desc: "Customer relationships", path: "/features/crm" },
              { name: "Accounting", desc: "Invoicing & expenses", path: "/features/accounting" },
              { name: "Projects", desc: "Tasks & collaboration", path: "/features/projects" },
              { name: "Helpdesk", desc: "Tickets & support", path: "/features/helpdesk" },
              { name: "Reports", desc: "Analytics & insights", path: "/features/reports" },
            ].map((m) => (
              <Link key={m.name} to={m.path} className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all group">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{m.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to transform your {solution.name.toLowerCase()} operations?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of {solution.name.toLowerCase()} businesses using Dynime to streamline their workflows.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Other Solutions */}
      {otherSolutions.length > 0 && (
        <section className="py-16 border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-xl font-bold text-foreground mb-6">Explore other industries</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {otherSolutions.map((s) => {
                const OIcon = iconMap[s.icon] || Heart;
                return (
                  <Link key={s.slug} to={`/solutions/${s.slug}`} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + "15" }}>
                      <OIcon className="h-5 w-5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
