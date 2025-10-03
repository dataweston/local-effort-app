import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { cn } from "../../lib/utils";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  eventDate: "",
  cuisine: "",
  location: "",
  notes: ""
};

const FoodTruckDialog = ({ children, triggerClassName = "" }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const productSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Book a Food Truck",
    description: "Reserve the Local Effort food truck for private events in Minneapolis–St. Paul. Minimum food and beverage commitment of $1200.",
    provider: {
      "@type": "Organization",
      name: "Local Effort"
    },
    areaServed: {
      "@type": "Place",
      name: "Minneapolis – St. Paul"
    },
    offers: {
      "@type": "Offer",
      price: "1200",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: typeof window !== "undefined" ? window.location.href : "https://localeffort.app/book-food-truck",
      description: "Minimum $1200 food truck commitment per event."
    }
  }), []);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === "sending") return;

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.eventDate.trim() || !form.location.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setStatus("sending");
    setError("");

    const lines = [
      `Event Date: ${form.eventDate}`,
      `Desired Cuisine: ${form.cuisine || 'n/a'}`,
      `Location: ${form.location}`,
      "",
      form.notes.trim() ? `Notes: ${form.notes}` : ""
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/messages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: "Food Truck Inquiry",
          message: `Food Truck Inquiry\n\n${lines}\n\nMinimum acknowledged: $1200`,
          type: "food_truck"
        })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to send inquiry");
      }
      setStatus("sent");
      setTimeout(() => {
        setOpen(false);
        setForm(initialForm);
        setStatus("idle");
      }, 1800);
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Unable to send. Please try again.");
    }
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      </Helmet>
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setForm(initialForm); setStatus("idle"); setError(""); } }}>
        <DialogTrigger asChild>
          <button className={cn("btn btn-primary", triggerClassName)}>
            {children || "Book the food truck"}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Book the Local Effort Food Truck</DialogTitle>
            <DialogDescription>
              The minimum commitment for food truck service is $1200, either pre-paid or guaranteed. Tell us about your event and we will reply within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ft-name">Name / Business*</Label>
                <Input id="ft-name" value={form.name} onChange={updateField("name")} required placeholder="Your name or organization" />
              </div>
              <div>
                <Label htmlFor="ft-email">Email*</Label>
                <Input id="ft-email" type="email" value={form.email} onChange={updateField("email")} required placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="ft-phone">Phone*</Label>
                <Input id="ft-phone" value={form.phone} onChange={updateField("phone")} required placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="ft-date">Event date*</Label>
                <Input id="ft-date" type="date" value={form.eventDate} onChange={updateField("eventDate")} required />
              </div>
              <div>
                <Label htmlFor="ft-cuisine">Desired cuisine</Label>
                <Input id="ft-cuisine" value={form.cuisine} onChange={updateField("cuisine")} placeholder="Wood-fired pizza, tacos, etc." />
              </div>
              <div>
                <Label htmlFor="ft-location">Event location*</Label>
                <Input id="ft-location" value={form.location} onChange={updateField("location")} required placeholder="Venue or address" />
              </div>
            </div>
            <div>
              <Label htmlFor="ft-notes">Additional details</Label>
              <Textarea id="ft-notes" rows={4} value={form.notes} onChange={updateField("notes")} placeholder="Share guest count, service windows, power access, or anything else we should know." />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-slate-500">We will reply within 24 hours. Minimum commitment $1200.</p>
              <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : status === "sent" ? "Thanks!" : "Send inquiry"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FoodTruckDialog;
