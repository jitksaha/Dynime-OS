// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/db";
import { CalendarCheck, Clock, ChevronLeft, ChevronRight, Check, MapPin, User, Mail, Phone } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isToday } from "date-fns";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  color: string;
  company_name: string;
  company_slug: string;
  company_logo: string | null;
}

const STEPS = ["Service", "Date & Time", "Details", "Confirm"];

export default function PublicBooking() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    if (!companySlug) return;
    supabase.rpc("get_public_booking_services", { _slug: companySlug } as any).then(({ data, error }) => {
      if (error) { toast.error("Failed to load services"); console.error(error); }
      else setServices((data as any) || []);
      setLoading(false);
    });
  }, [companySlug]);

  const companyName = services[0]?.company_name || companySlug;
  const companyLogo = services[0]?.company_logo;

  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 0 }), -1);
    return eachDayOfInterval({ start, end: addDays(end, 0) });
  }, [calendarMonth]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    if (!selectedService) return [];
    const slots: string[] = [];
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, [selectedService]);

  const handleSelectService = (s: Service) => {
    setSelectedService(s);
    setStep(1);
  };

  const handleSelectDate = (d: Date) => {
    if (isBefore(d, new Date()) && !isToday(d)) return;
    setSelectedDate(d);
    setSelectedTime(null);
  };

  const handleSelectTime = (t: string) => {
    setSelectedTime(t);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
    if (!selectedService || !selectedDate || !selectedTime || !companySlug) return;

    setSubmitting(true);
    const [hours, mins] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, mins, 0, 0);
    const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);

    const { error } = await supabase.rpc("create_public_booking", {
      _company_slug: companySlug,
      _service_id: selectedService.id,
      _title: `${selectedService.name} - ${form.name}`,
      _start_time: startTime.toISOString(),
      _end_time: endTime.toISOString(),
      _attendee_name: form.name,
      _attendee_email: form.email,
      _attendee_phone: form.phone || null,
      _notes: form.notes || null,
    } as any);

    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Booking Confirmed!</h1>
          <p className="text-muted-foreground">
            Your booking for <strong>{selectedService?.name}</strong> on{" "}
            <strong>{selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}</strong> at{" "}
            <strong>{selectedTime}</strong> has been submitted.
          </p>
          <p className="text-sm text-muted-foreground">You'll receive a confirmation email shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {companyLogo && <img src={companyLogo} alt="" className="h-8 w-8 rounded-lg object-cover" />}
          <div>
            <h1 className="font-bold text-foreground">{companyName}</h1>
            <p className="text-xs text-muted-foreground">Book an appointment</p>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                  i === step ? "bg-primary text-primary-foreground" :
                  i < step ? "bg-primary/20 text-primary cursor-pointer" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span className={`text-xs hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Select Service */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Select a Service</h2>
            {services.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No services available at this time.</p>
            ) : (
              <div className="grid gap-3">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectService(s)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left group"
                  >
                    <div className="h-12 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{s.name}</h3>
                      {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes} min</span>
                        {s.price > 0 && <span className="font-medium text-foreground">{s.currency} {s.price}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <div className="space-y-4">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="text-lg font-semibold text-foreground">Pick a Date & Time</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calendar */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} className="p-1 rounded hover:bg-secondary">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-foreground">{format(calendarMonth, "MMMM yyyy")}</span>
                  <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 rounded hover:bg-secondary">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                    <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                  {calendarDays.map((day, idx) => {
                    const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                    const isPast = isBefore(day, new Date()) && !isToday(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    return (
                      <button
                        key={idx}
                        onClick={() => !isPast && isCurrentMonth && handleSelectDate(day)}
                        disabled={isPast || !isCurrentMonth}
                        className={`h-9 w-9 rounded-lg text-sm transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground" :
                          isToday(day) ? "bg-accent text-accent-foreground" :
                          isPast || !isCurrentMonth ? "text-muted-foreground/30" :
                          "text-foreground hover:bg-secondary"
                        }`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date first"}
                </h3>
                {selectedDate ? (
                  <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                    {timeSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => handleSelectTime(t)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          selectedTime === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">Pick a date to see available times</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="text-lg font-semibold text-foreground">Your Details</h2>
            <div className="bg-card rounded-xl border border-border p-5 space-y-3 max-w-md">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  placeholder="Any additional details..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </div>
              <button onClick={() => setStep(3)} disabled={!form.name || !form.email} className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Review Booking
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="text-lg font-semibold text-foreground">Confirm Booking</h2>
            <div className="bg-card rounded-xl border border-border p-5 max-w-md space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedService?.color }} />
                  <span className="font-semibold text-foreground">{selectedService?.name}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {selectedTime} ({selectedService?.duration_minutes} min)</p>
                  {selectedService && selectedService.price > 0 && (
                    <p className="font-medium text-foreground">{selectedService.currency} {selectedService.price}</p>
                  )}
                </div>
              </div>
              <hr className="border-border" />
              <div className="text-sm space-y-1">
                <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {form.name}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {form.email}</p>
                {form.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {form.phone}</p>}
                {form.notes && <p className="text-muted-foreground mt-2">{form.notes}</p>}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
