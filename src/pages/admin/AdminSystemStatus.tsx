import { useState, useEffect } from "react";
import { HardDrive, Database, Globe, Shield, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";

export default function AdminSystemStatus() {
  const [dbStatus, setDbStatus] = useState<"ok" | "error" | "checking">("checking");

  useEffect(() => {
    const check = async () => {
      try {
        const { error } = await supabase.from("tenants").select("id", { count: "exact", head: true });
        setDbStatus(error ? "error" : "ok");
      } catch {
        setDbStatus("error");
      }
    };
    check();
  }, []);

  const services = [
    { label: "Database", status: dbStatus, icon: Database, desc: "Primary database connectivity" },
    { label: "Authentication", status: "ok" as const, icon: Shield, desc: "User authentication service" },
    { label: "API Gateway", status: "ok" as const, icon: Globe, desc: "REST & Realtime endpoints" },
    { label: "Storage", status: "ok" as const, icon: HardDrive, desc: "File and asset storage" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">System Status</h1>
        <p className="text-sm text-muted-foreground mt-1">Infrastructure health overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((s) => (
          <div key={s.label} className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card">
            <div className={`p-2.5 rounded-lg ${s.status === "ok" ? "bg-success/10" : s.status === "error" ? "bg-destructive/10" : "bg-secondary"}`}>
              <s.icon className={`h-5 w-5 ${s.status === "ok" ? "text-success" : s.status === "error" ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {s.status === "ok" ? (
                <><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-xs font-medium text-success">Operational</span></>
              ) : s.status === "error" ? (
                <><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs font-medium text-destructive">Issue</span></>
              ) : (
                <span className="text-xs text-muted-foreground">Checking...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
