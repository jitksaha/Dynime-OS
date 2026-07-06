import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { invalidateContactInfoCache } from "@/hooks/useContactInfo";

interface ContactConfig {
  email: string;
  phone: string;
  address: string;
  business_hours: string;
  whatsapp: string;
  support_email: string;
  sales_email: string;
}

const DEFAULT: ContactConfig = {
  email: "support@dynime.com",
  phone: "+880 1700-000000",
  address: "Dhaka, Bangladesh",
  business_hours: "Sun-Thu, 9AM-6PM",
  whatsapp: "",
  support_email: "support@dynime.com",
  sales_email: "sales@dynime.com",
};

export default function ContactInfoEditor() {
  const [config, setConfig] = useState<ContactConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "contact_info").single();
      if (data?.value) setConfig({ ...DEFAULT, ...(data.value as unknown as ContactConfig) });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ value: config as any }).eq("key", "contact_info");
    setSaving(false);
    if (error) return toast.error(error.message);
    invalidateContactInfoCache();
    toast.success("Contact information saved! Changes will reflect across the website.");
  };

  const update = (key: keyof ContactConfig, value: string) => setConfig((c) => ({ ...c, [key]: value }));

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contact Information</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage contact details displayed across the entire website — footer, contact page, headers, and more.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Preview */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-card px-6 py-3 border-b border-border text-xs text-muted-foreground">
          Live Preview — How it appears on the Contact page
        </div>
        <div className="bg-background p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Email</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{config.email}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Phone</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{config.phone}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Office</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{config.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Email Addresses</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Primary Email</Label>
              <Input value={config.email} onChange={(e) => update("email", e.target.value)} placeholder="contact@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Support Email</Label>
              <Input value={config.support_email} onChange={(e) => update("support_email", e.target.value)} placeholder="support@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Sales Email</Label>
              <Input value={config.sales_email} onChange={(e) => update("sales_email", e.target.value)} placeholder="sales@example.com" />
            </div>
          </div>
        </div>

        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Phone & Messaging</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={config.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 234 567 8900" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp (optional)</Label>
              <Input value={config.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+1 234 567 8900" />
            </div>
          </div>
        </div>

        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Address</h3>
          </div>
          <div className="space-y-1.5">
            <Label>Office Address</Label>
            <Input value={config.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, City, Country" />
          </div>
        </div>

        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Business Hours</h3>
          </div>
          <div className="space-y-1.5">
            <Label>Working Hours</Label>
            <Input value={config.business_hours} onChange={(e) => update("business_hours", e.target.value)} placeholder="Mon-Fri, 9AM-5PM" />
          </div>
        </div>
      </div>
    </div>
  );
}
