import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

export default function Contact() {
  const { contact } = useContactInfo();
  const { companyInfo } = useCompanyInfo();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      return toast.error("All fields are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return toast.error("Please enter a valid email address");
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("contact-submit", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you within 24 hours.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Contact Us</h1>
          <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {[
            { label: "Email", value: contact.email || "support@dynime.com" },
            { label: "Phone", value: contact.phone },
            { label: "Office", value: contact.address },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Business entity info */}
        <div className="rounded-lg border border-border bg-card p-4 mb-10">
          <p className="text-sm font-semibold text-foreground">{companyInfo.registered_name}</p>
          {companyInfo.registration_country && (
            <p className="text-xs text-muted-foreground mt-1">Registered in {companyInfo.registration_country}</p>
          )}
          {companyInfo.registration_number && (
            <p className="text-xs text-muted-foreground">Company Number: {companyInfo.registration_number}</p>
          )}
          {companyInfo.address && (
            <p className="text-xs text-muted-foreground">Address: {companyInfo.address}</p>
          )}
          <p className="text-xs text-muted-foreground">Email: {companyInfo.support_email}</p>
        </div>

        {/* Form */}
        <div className="border border-border rounded-lg bg-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required maxLength={100} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required maxLength={255} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" required maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us more..." rows={5} required maxLength={5000} />
            </div>
            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
