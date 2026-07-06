import { useState, useEffect } from "react";
import { HardDrive, Plus, Search, Wrench, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormDialog from "@/components/FormDialog";

export default function AssetManagement() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState("assets");
  const [assets, setAssets] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assetDialog, setAssetDialog] = useState(false);
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);
  const [bookingDialog, setBookingDialog] = useState(false);

  const tid = profile?.tenant_id;
  const uid = user?.id;

  const fetchData = async () => {
    if (!tid) return;
    const [{ data: a }, { data: m }, { data: b }] = await Promise.all([
      supabase.from("company_assets").select("*").eq("tenant_id", tid).order("asset_name"),
      supabase.from("maintenance_requests").select("*").eq("tenant_id", tid).order("created_at", { ascending: false }),
      supabase.from("facility_bookings").select("*").eq("tenant_id", tid).order("start_time", { ascending: false }),
    ]);
    if (a) setAssets(a);
    if (m) setMaintenance(m);
    if (b) setBookings(b);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tid]);

  const handleSaveAsset = async (v: Record<string, string>) => {
    if (!tid) return;
    const payload = { tenant_id: tid, asset_name: v.asset_name, asset_type: v.asset_type || null, serial_number: v.serial_number || null, status: v.status || "Available", purchase_cost: Number(v.purchase_cost) || null, assigned_to_name: v.assigned_to_name || null };
    const { error } = await supabase.from("company_assets").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Asset added"); setAssetDialog(false); fetchData();
  };

  const handleSaveMaintenance = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, title: v.title, description: v.description || null, priority: v.priority || "Medium", asset_id: v.asset_id || null, scheduled_date: v.scheduled_date || null, created_by: uid };
    const { error } = await supabase.from("maintenance_requests").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Request created"); setMaintenanceDialog(false); fetchData();
  };

  const handleSaveBooking = async (v: Record<string, string>) => {
    if (!tid || !uid) return;
    const payload = { tenant_id: tid, facility_name: v.facility_name, facility_type: v.facility_type || "Meeting Room", booked_by: uid, booked_by_name: profile?.full_name || "", start_time: v.start_time, end_time: v.end_time, purpose: v.purpose || null };
    const { error } = await supabase.from("facility_bookings").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Booking confirmed"); setBookingDialog(false); fetchData();
  };

  const filteredAssets = assets.filter(a => a.asset_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><HardDrive className="h-6 w-6 text-primary" /> Assets & Facilities</h1>
          <p className="text-sm text-muted-foreground">{assets.length} assets · {maintenance.length} maintenance · {bookings.length} bookings</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="assets">Assets</TabsTrigger><TabsTrigger value="maintenance">Maintenance</TabsTrigger><TabsTrigger value="bookings">Facility Bookings</TabsTrigger></TabsList>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
            <Button onClick={() => setAssetDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Asset</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{a.asset_name}</span>
                  <Badge variant={a.status === "Available" ? "default" : "secondary"}>{a.status}</Badge>
                </div>
                {a.asset_type && <p className="text-xs text-muted-foreground">Type: {a.asset_type}</p>}
                {a.serial_number && <p className="text-xs text-muted-foreground font-mono">{a.serial_number}</p>}
                {a.assigned_to_name && <p className="text-xs text-primary">Assigned: {a.assigned_to_name}</p>}
                {a.purchase_cost && <p className="text-xs text-muted-foreground">Cost: ${Number(a.purchase_cost).toLocaleString()}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setMaintenanceDialog(true)}><Wrench className="h-4 w-4 mr-2" /> New Request</Button></div>
          <div className="space-y-3">
            {maintenance.map(m => (
              <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                  <p className="font-medium text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.scheduled_date || "Not scheduled"}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={m.priority === "High" ? "destructive" : "secondary"}>{m.priority}</Badge>
                  <Badge variant="outline">{m.status}</Badge>
                </div>
              </div>
            ))}
            {maintenance.length === 0 && <p className="text-center py-8 text-muted-foreground">No maintenance requests</p>}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setBookingDialog(true)}><CalendarDays className="h-4 w-4 mr-2" /> Book Facility</Button></div>
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                  <p className="font-medium text-foreground">{b.facility_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleString()} – {new Date(b.end_time).toLocaleTimeString()}</p>
                  {b.purpose && <p className="text-xs text-muted-foreground">{b.purpose}</p>}
                </div>
                <Badge variant="secondary">{b.facility_type}</Badge>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-center py-8 text-muted-foreground">No bookings yet</p>}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog open={assetDialog} onClose={() => setAssetDialog(false)} title="Add Asset"
        fields={[
          { name: "asset_name", label: "Asset Name", required: true },
          { name: "asset_type", label: "Type", type: "select", options: ["Laptop", "Desktop", "Monitor", "Phone", "Furniture", "Vehicle", "Software License", "Other"] },
          { name: "serial_number", label: "Serial Number" },
          { name: "status", label: "Status", type: "select", options: ["Available", "In Use", "Under Repair", "Retired"] },
          { name: "purchase_cost", label: "Purchase Cost", type: "number" },
          { name: "assigned_to_name", label: "Assigned To" },
        ]}
        onSubmit={handleSaveAsset}
      />
      <FormDialog open={maintenanceDialog} onClose={() => setMaintenanceDialog(false)} title="New Maintenance Request"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "description", label: "Description" },
          { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
          { name: "scheduled_date", label: "Scheduled Date", type: "date" },
        ]}
        onSubmit={handleSaveMaintenance}
      />
      <FormDialog open={bookingDialog} onClose={() => setBookingDialog(false)} title="Book Facility"
        fields={[
          { name: "facility_name", label: "Facility Name", required: true },
          { name: "facility_type", label: "Type", type: "select", options: ["Meeting Room", "Conference Hall", "Hot Desk", "Parking Spot", "Lab"] },
          { name: "start_time", label: "Start Time", type: "date" },
          { name: "end_time", label: "End Time", type: "date" },
          { name: "purpose", label: "Purpose" },
        ]}
        onSubmit={handleSaveBooking}
      />
    </div>
  );
}
