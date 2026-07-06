import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Monitor, Smartphone, Laptop, HardDrive, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const ASSET_ICONS: Record<string, React.ElementType> = {
  laptop: Laptop, phone: Smartphone, monitor: Monitor, storage: HardDrive, other: Package,
};

export default function EmployeeAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("company_assets")
        .select("*")
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });
      setAssets(data || []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Assets</h1>
        <p className="text-sm text-muted-foreground mt-1">Company assets assigned to you</p>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No assets assigned to you</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map(asset => {
            const Icon = ASSET_ICONS[asset.asset_type] || Package;
            return (
              <div key={asset.id} className="border border-border rounded-xl bg-card p-5 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{asset.asset_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{asset.asset_type}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {asset.serial_number && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Serial No.</span>
                      <span className="text-foreground font-medium">{asset.serial_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Status</span>
                    <span className={cn(
                      "font-medium capitalize",
                      asset.status === "in_use" ? "text-primary" : "text-muted-foreground"
                    )}>{asset.status?.replace("_", " ")}</span>
                  </div>
                  {asset.purchase_date && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Since</span>
                      <span className="text-foreground">{asset.purchase_date}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
