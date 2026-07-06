import { useState, useEffect } from "react";
import { Truck, Plus, Search, MapPin, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormDialog from "@/components/FormDialog";

const VEHICLE_STATUS: Record<string, string> = {
  Available: "bg-success/10 text-success",
  "On Route": "bg-primary/10 text-primary",
  "Under Maintenance": "bg-warning/10 text-warning",
  "Out of Service": "bg-destructive/10 text-destructive",
};

export default function FleetManagement() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState("vehicles");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [routeDialog, setRouteDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const tid = profile?.tenant_id;
  const uid = user?.id;

  const fetchData = async () => {
    if (!tid) return;
    const [{ data: v }, { data: r }] = await Promise.all([
      supabase.from("vehicles").select("*").eq("tenant_id", tid).order("registration"),
      supabase.from("delivery_routes").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }),
    ]);
    if (v) setVehicles(v);
    if (r) setRoutes(r);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tid]);

  const handleSaveVehicle = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, registration: v.registration, make: v.make || null, model: v.model || null, vehicle_type: v.vehicle_type || "Van", status: v.status || "Available", assigned_driver: v.assigned_driver || null, fuel_type: v.fuel_type || "Diesel", mileage: Number(v.mileage) || 0, created_by: uid };
    if (editItem) {
      await supabase.from("vehicles").update(payload).eq("id", editItem.id);
      toast.success("Updated");
    } else {
      await supabase.from("vehicles").insert(payload);
      toast.success("Vehicle added");
    }
    setEditItem(null); setVehicleDialog(false); fetchData();
  };

  const handleSaveRoute = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, route_name: v.route_name, driver_name: v.driver_name || null, status: v.status || "Planned", estimated_distance: Number(v.estimated_distance) || 0, notes: v.notes || null, created_by: uid };
    await supabase.from("delivery_routes").insert(payload);
    toast.success("Route created"); setRouteDialog(false); fetchData();
  };

  const handleDelete = async (table: string, id: string) => {
    await supabase.from(table as any).delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Logistics & Fleet</h1>
          <p className="text-sm text-muted-foreground">{vehicles.length} vehicles · {routes.length} routes</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="vehicles">Fleet</TabsTrigger><TabsTrigger value="routes">Routes</TabsTrigger></TabsList>

        <TabsContent value="vehicles" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
            <Button onClick={() => { setEditItem(null); setVehicleDialog(true); }}><Plus className="h-4 w-4 mr-2" /> Add Vehicle</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.filter(v => v.registration.toLowerCase().includes(search.toLowerCase())).map(v => (
              <div key={v.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground font-mono">{v.registration}</span>
                  <Badge className={VEHICLE_STATUS[v.status] || ""}>{v.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{v.vehicle_type} · {v.fuel_type}</span>
                  <span>{Number(v.mileage).toLocaleString()} km</span>
                </div>
                {v.assigned_driver && <p className="text-xs text-primary">Driver: {v.assigned_driver}</p>}
                <div className="flex gap-1 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditItem(v); setVehicleDialog(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete("vehicles", v.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setRouteDialog(true)}><MapPin className="h-4 w-4 mr-2" /> New Route</Button></div>
          <div className="space-y-3">
            {routes.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                  <p className="font-medium text-foreground">{r.route_name}</p>
                  <p className="text-xs text-muted-foreground">{r.driver_name || "Unassigned"} · {Number(r.estimated_distance).toLocaleString()} km</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={r.status === "Completed" ? "default" : "secondary"}>{r.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete("delivery_routes", r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {routes.length === 0 && <p className="text-center py-8 text-muted-foreground">No routes planned</p>}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog open={vehicleDialog} onClose={() => { setVehicleDialog(false); setEditItem(null); }} title={editItem ? "Edit Vehicle" : "Add Vehicle"}
        defaultValues={editItem ? { registration: editItem.registration, make: editItem.make || "", model: editItem.model || "", vehicle_type: editItem.vehicle_type, status: editItem.status, assigned_driver: editItem.assigned_driver || "", fuel_type: editItem.fuel_type, mileage: String(editItem.mileage || 0) } : undefined}
        fields={[
          { name: "registration", label: "Registration", required: true },
          { name: "make", label: "Make" },
          { name: "model", label: "Model" },
          { name: "vehicle_type", label: "Type", type: "select", options: ["Van", "Truck", "Car", "Motorcycle", "Bus"] },
          { name: "status", label: "Status", type: "select", options: ["Available", "On Route", "Under Maintenance", "Out of Service"] },
          { name: "assigned_driver", label: "Driver" },
          { name: "fuel_type", label: "Fuel", type: "select", options: ["Diesel", "Petrol", "Electric", "Hybrid", "CNG"] },
          { name: "mileage", label: "Mileage (km)", type: "number" },
        ]}
        onSubmit={handleSaveVehicle}
      />
      <FormDialog open={routeDialog} onClose={() => setRouteDialog(false)} title="New Route"
        fields={[
          { name: "route_name", label: "Route Name", required: true },
          { name: "driver_name", label: "Driver" },
          { name: "status", label: "Status", type: "select", options: ["Planned", "In Progress", "Completed", "Cancelled"] },
          { name: "estimated_distance", label: "Distance (km)", type: "number" },
          { name: "notes", label: "Notes" },
        ]}
        onSubmit={handleSaveRoute}
      />
    </div>
  );
}
