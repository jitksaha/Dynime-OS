// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/db";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, Handshake } from "lucide-react";

const CATEGORIES = [
  { value: "technology", label: "Technology" },
  { value: "consulting", label: "Consulting" },
  { value: "reseller", label: "Reseller" },
  { value: "integration", label: "Integration" },
  { value: "agency", label: "Agency" },
  { value: "financial", label: "Financial" },
  { value: "logistics", label: "Logistics" },
  { value: "other", label: "Other" },
];

export default function PartnerApply() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    country: "",
    category: "technology",
    description: "",
    why_partner: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_name || !form.contact_email) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("partner_applications").insert(form);
    setLoading(false);
    if (error) {
      toast.error("Failed to submit application. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  const set = (key: string, val: string) => setForm({ ...form, [key]: val });

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {submitted ? (
          <div className="text-center py-20 space-y-4 animate-fade-in">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Application Submitted!</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for your interest in partnering with us. Our team will review your application and get back to you within 3-5 business days.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
                <Handshake className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Become a Partner</h1>
              <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                Join our partner ecosystem and grow your business with us. Fill out the form below and our partnership team will reach out.
              </p>
            </div>

            <Card>
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Company Name *</Label>
                      <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contact Name *</Label>
                      <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Partnership Category</Label>
                    <Select value={form.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>About Your Company</Label>
                    <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Tell us about your company and services..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Why Partner With Us?</Label>
                    <Textarea value={form.why_partner} onChange={(e) => set("why_partner", e.target.value)} rows={3} placeholder="How do you see this partnership benefiting both sides?" />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Application"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
