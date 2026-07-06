import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Users, Receipt, FolderKanban } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

const tabs = [
{
  id: "crm",
  label: "CRM Dashboard",
  icon: Target,
  color: "hsl(142,71%,45%)",
  metrics: [
  { label: "Active Deals", value: "$2.4M", change: "+18%" },
  { label: "Win Rate", value: "68%", change: "+5%" },
  { label: "New Leads", value: "142", change: "+23%" },
  { label: "Revenue MTD", value: "$890K", change: "+12%" }],

  pipeline: [
  { stage: "Prospecting", count: 34, width: "85%" },
  { stage: "Qualified", count: 21, width: "65%" },
  { stage: "Proposal", count: 14, width: "45%" },
  { stage: "Negotiation", count: 8, width: "30%" },
  { stage: "Closed Won", count: 6, width: "20%" }]

},
{
  id: "projects",
  label: "Project Management",
  icon: FolderKanban,
  color: "hsl(200,80%,55%)",
  metrics: [
  { label: "Active Projects", value: "24", change: "+3" },
  { label: "On Track", value: "87%", change: "+4%" },
  { label: "Tasks Done", value: "312", change: "+45" },
  { label: "Team Members", value: "48", change: "+6" }],

  pipeline: [
  { stage: "Planning", count: 5, width: "25%" },
  { stage: "In Progress", count: 12, width: "60%" },
  { stage: "Review", count: 4, width: "20%" },
  { stage: "Testing", count: 2, width: "10%" },
  { stage: "Completed", count: 8, width: "40%" }]

},
{
  id: "finance",
  label: "Finance Analytics",
  icon: Receipt,
  color: "hsl(38,92%,50%)",
  metrics: [
  { label: "Total Revenue", value: "$1.2M", change: "+15%" },
  { label: "Expenses", value: "$340K", change: "-8%" },
  { label: "Net Profit", value: "$860K", change: "+22%" },
  { label: "Outstanding", value: "$45K", change: "-12%" }],

  pipeline: [
  { stage: "Paid Invoices", count: 89, width: "90%" },
  { stage: "Pending", count: 12, width: "35%" },
  { stage: "Overdue", count: 3, width: "10%" },
  { stage: "Draft", count: 7, width: "20%" },
  { stage: "Recurring", count: 15, width: "45%" }]

},
{
  id: "hr",
  label: "HR Management",
  icon: Users,
  color: "hsl(243,75%,58%)",
  metrics: [
  { label: "Employees", value: "156", change: "+12" },
  { label: "Attendance", value: "94%", change: "+2%" },
  { label: "Open Positions", value: "8", change: "-3" },
  { label: "Satisfaction", value: "4.6", change: "+0.3" }],

  pipeline: [
  { stage: "Engineering", count: 45, width: "70%" },
  { stage: "Marketing", count: 28, width: "45%" },
  { stage: "Sales", count: 35, width: "55%" },
  { stage: "Operations", count: 22, width: "35%" },
  { stage: "Support", count: 18, width: "30%" }]

}];


export function ProductPreviewSection() {
  const [activeTab, setActiveTab] = useState(0);
  const active = tabs[activeTab];
  const { appInfo } = useAppInfo();

  return (
    <section className="py-24 px-6 landing-dark">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            See {appInfo.app_name} in Action
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful dashboards for every department — all in one platform.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === i;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8"
          >
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {active.metrics.map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-muted/30 rounded-xl p-4 border border-border/30"
                >
                  <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: active.color }}>
                    {metric.change}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Pipeline / Breakdown */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground mb-3">
                {active.id === "crm" ? "Sales Pipeline" : active.id === "finance" ? "Invoice Status" : active.id === "hr" ? "Department Breakdown" : "Project Status"}
              </p>
              {active.pipeline.map((item, i) => (
                <motion.div
                  key={item.stage}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{item.stage}</span>
                  <div className="flex-1 h-7 bg-muted/30 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: item.width }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="h-full rounded-lg flex items-center px-2"
                      style={{ backgroundColor: active.color + "30" }}
                    >
                      <span className="text-[10px] font-semibold" style={{ color: active.color }}>
                        {item.count}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}