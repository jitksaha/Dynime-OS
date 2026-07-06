import { useState } from "react";
import { Link2, Copy, Check, ExternalLink, CalendarCheck } from "lucide-react";
import { useCompanySwitcher } from "@/hooks/useCompanySwitcher";
import { toast } from "sonner";

export default function BookingLink() {
  const { companies, currentTenantId } = useCompanySwitcher();
  const [copied, setCopied] = useState(false);

  const currentCompany = companies.find(c => c.tenant_id === currentTenantId);
  const slug = currentCompany?.slug || "your-company";

  const baseUrl = window.location.origin;
  const bookingUrl = `${baseUrl}/book/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success("Booking link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" /> Public Booking Link
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share this link with customers so they can book appointments directly
        </p>
      </div>

      <div className="max-w-xl space-y-4">
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarCheck className="h-4 w-4" />
            Your public booking page
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-muted/50 text-sm text-foreground font-mono truncate">
              {bookingUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-2">How it works</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Customers visit the link and select a service</li>
            <li>They pick a date & time from a real-time calendar</li>
            <li>Fill in their details and confirm the booking</li>
            <li>The booking automatically appears in your calendar and bookings dashboard</li>
            <li>You get notified of new bookings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
