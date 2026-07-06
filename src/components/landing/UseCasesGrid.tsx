import { motion } from "framer-motion";
import {
  Building2,
  Store,
  Stethoscope,
  GraduationCap,
  Briefcase,
  Truck,
  Workflow,
  LineChart,
  Bot,
  Users,
  Lock,
  Plug,
} from "lucide-react";

interface GridItem {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
}

const useCases: GridItem[] = [
  {
    title: "Startups & SMBs",
    description:
      "Run sales, finance, and operations from one place without stitching together a dozen tools.",
    icon: Building2,
    accent: "bg-violet-500/10 text-violet-500",
  },
  {
    title: "Retail & Commerce",
    description:
      "Manage POS, inventory, and customer loyalty with real-time stock and sales sync.",
    icon: Store,
    accent: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Healthcare",
    description:
      "Schedule patients, manage records securely, and stay compliant with HIPAA-ready workflows.",
    icon: Stethoscope,
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "Education",
    description:
      "Handle admissions, attendance, and billing while keeping students and staff in sync.",
    icon: GraduationCap,
    accent: "bg-amber-500/10 text-amber-500",
  },
  {
    title: "Professional Services",
    description:
      "Track projects, log billable hours, and invoice clients without leaving the platform.",
    icon: Briefcase,
    accent: "bg-pink-500/10 text-pink-500",
  },
  {
    title: "Logistics & Field Ops",
    description:
      "Coordinate fleets, dispatch teams, and monitor deliveries from a single live map.",
    icon: Truck,
    accent: "bg-cyan-500/10 text-cyan-500",
  },
];

const features: GridItem[] = [
  {
    title: "Workflow Automation",
    description: "Trigger actions across modules with no-code rules and approvals.",
    icon: Workflow,
    accent: "bg-violet-500/10 text-violet-500",
  },
  {
    title: "Live Analytics",
    description: "Custom dashboards and reports that update in real time.",
    icon: LineChart,
    accent: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "AI Copilot",
    description: "Draft, summarize, and analyze with an assistant built into every module.",
    icon: Bot,
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "Team Collaboration",
    description: "Chat, tasks, and shared docs keep everyone aligned.",
    icon: Users,
    accent: "bg-amber-500/10 text-amber-500",
  },
  {
    title: "Granular Permissions",
    description: "Role-based access control down to the field level.",
    icon: Lock,
    accent: "bg-pink-500/10 text-pink-500",
  },
  {
    title: "200+ Integrations",
    description: "Connect the tools your team already relies on in a few clicks.",
    icon: Plug,
    accent: "bg-cyan-500/10 text-cyan-500",
  },
];

function Card({ item, index }: { item: GridItem; index: number }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.05 }}
      className="group rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover-glow transition-colors hover:border-primary/30"
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.accent}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        {item.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {item.description}
      </p>
    </motion.div>
  );
}

export function UseCasesGrid() {
  return (
    <section className="section-alt py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Use cases */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary">
            Built for every team
          </span>
          <h2 className="mt-5 text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            One platform, endless use cases
          </h2>
          <p className="mt-4 text-base lg:text-lg text-muted-foreground">
            From fast-growing startups to established enterprises, teams run their
            entire operation on a single connected system.
          </p>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {useCases.map((item, i) => (
            <Card key={item.title} item={item} index={i} />
          ))}
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mt-24"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary">
            Everything you need
          </span>
          <h2 className="mt-5 text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Powerful features, zero complexity
          </h2>
          <p className="mt-4 text-base lg:text-lg text-muted-foreground">
            Each module is packed with capabilities that work together out of the box.
          </p>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((item, i) => (
            <Card key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
