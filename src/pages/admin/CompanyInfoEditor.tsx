import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Building2, MapPin, Globe, Mail, FileText, Hash } from "lucide-react";

interface CompanyConfig {
  company_name: string;
  registered_name: string;
  registration_number: string;
  registration_country: string;
  address: string;
  support_email: string;
  website: string;
}

const DEFAULT: CompanyConfig = {
  company_name: "Dynime",
  registered_name: "Dynime LLC",
  registration_number: "",
  registration_country: "England and Wales",
  address: "",
  support_email: "support@dynime.com",
  website: "",
};

export default function CompanyInfoEditor() {
  const [config, setConfig] = useState<CompanyConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "company_info")
        .maybeSingle();
      if (data?.value) setConfig({ ...DEFAULT, ...(data.value as unknown as CompanyConfig) });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        { key: "company_info", value: config as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Company information saved! Changes reflect in real-time across the platform.");
  };

  const update = (key: keyof CompanyConfig, value: string) =>
    setConfig((c) => ({ ...c, [key]: value }));

  if (loading)
    return (
      <div className="text-center py-10 text-muted-foreground">Loading...</div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Company Information
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage legal entity details displayed on invoices, footer, legal
            pages, and payment checkout. Updates apply in real-time.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Live Preview */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-card px-6 py-3 border-b border-border text-xs text-muted-foreground">
          Live Preview — How it appears in the website footer
        </div>
        <div className="bg-background p-6">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              © {new Date().getFullYear()} {config.company_name}
            </p>
            <p>
              {config.company_name} is a product of{" "}
              {config.registered_name}
            </p>
            {config.registration_country && (
              <p>Registered in {config.registration_country}</p>
            )}
            {config.registration_number && (
              <p>Company Number: {config.registration_number}</p>
            )}
            {config.address && <p>Address: {config.address}</p>}
            {config.support_email && (
              <p>Contact: {config.support_email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Brand Identity</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Company Name (Brand)</Label>
              <Input
                value={config.company_name}
                onChange={(e) => update("company_name", e.target.value)}
                placeholder="e.g. Dynime"
              />
              <p className="text-[11px] text-muted-foreground">
                The public-facing name shown on the website and emails.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Registered Legal Name</Label>
              <Input
                value={config.registered_name}
                onChange={(e) => update("registered_name", e.target.value)}
                placeholder="e.g. Dynime LLC"
              />
              <p className="text-[11px] text-muted-foreground">
                Full legal entity name for invoices and legal documents.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Registration</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Registration Country / Jurisdiction</Label>
              <Input
                value={config.registration_country}
                onChange={(e) =>
                  update("registration_country", e.target.value)
                }
                placeholder="e.g. England and Wales"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Registration Number</Label>
              <Input
                value={config.registration_number}
                onChange={(e) =>
                  update("registration_number", e.target.value)
                }
                placeholder="e.g. 12345678"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Address</h3>
          </div>
          <div className="space-y-1.5">
            <Label>Registered Office Address</Label>
            <Input
              value={config.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main St, City, Country"
            />
          </div>
        </div>

        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Contact & Web</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Support Email</Label>
              <Input
                value={config.support_email}
                onChange={(e) => update("support_email", e.target.value)}
                placeholder="support@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input
                value={config.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
