import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const initialFormState = {
  name: '',
  email: '',
  phone: '',
  eventDate: '',
  cuisine: '',
  location: '',
  notes: '',
};

export const FoodTruckInquiryDialog = ({
  children,
  triggerClassName = '',
  triggerVariant = 'default',
  triggerSize = 'lg',
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setForm(initialFormState);
      setStatus('idle');
      setError('');
    }
  }, [open]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const requiredFieldsComplete = useMemo(
    () => (
      form.name.trim()
      && form.email.trim()
      && form.phone.trim()
      && form.eventDate
      && form.location.trim()
    ),
    [form.name, form.email, form.phone, form.eventDate, form.location],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    if (!requiredFieldsComplete) {
      setStatus('error');
      setError('Please complete the required fields before submitting.');
      return;
    }

    try {
      setStatus('loading');
      setError('');

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        eventDate: form.eventDate,
        cuisine: form.cuisine.trim(),
        location: form.location.trim(),
        notes: form.notes.trim(),
      };

      const response = await fetch('/api/food-truck/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorKey = data?.error;
        const fallbackMessage = 'We were unable to send your request. Please try again.';
        const message = errorKey === 'missing-required-fields'
          ? 'Please complete the required fields before submitting.'
          : errorKey || fallbackMessage;
        throw new Error(message);
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={triggerClassName}
          variant={triggerVariant}
          size={triggerSize}
        >
          {children || 'Book the Food Truck'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book the Local Effort Food Truck</DialogTitle>
          <DialogDescription>
            Our beta launch pricing sets the minimum for a food truck service at <strong>$1,000</strong>, either prepaid or guaranteed.
            The first three bookings also receive an additional $200 discount. Fill out the details below and we&rsquo;ll confirm availability within 24 hours.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="space-y-4 py-4" role="status" aria-live="polite">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="mt-4 text-xl font-semibold text-emerald-700">Thank you!</h3>
              <p className="text-sm text-emerald-700">
                We received your food truck inquiry and will get back to you within 24 hours.
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" className="w-full sm:w-auto">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="food-truck-name">Name / business name *</Label>
                <Input
                  id="food-truck-name"
                  name="name"
                  placeholder="Who should we contact?"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-email">Email *</Label>
                <Input
                  id="food-truck-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-phone">Phone *</Label>
                <Input
                  id="food-truck-phone"
                  type="tel"
                  name="phone"
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-date">Event date *</Label>
                <Input
                  id="food-truck-date"
                  type="date"
                  name="eventDate"
                  value={form.eventDate}
                  onChange={handleChange('eventDate')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-cuisine">Desired cuisine or menu focus</Label>
                <Input
                  id="food-truck-cuisine"
                  name="cuisine"
                  placeholder="Wood-fired pizza, tacos, brunch..."
                  value={form.cuisine}
                  onChange={handleChange('cuisine')}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="food-truck-location">Event location *</Label>
                <Textarea
                  id="food-truck-location"
                  name="location"
                  placeholder="Venue name, street address, city"
                  value={form.location}
                  onChange={handleChange('location')}
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="food-truck-notes">Anything else we should know?</Label>
              <Textarea
                id="food-truck-notes"
                name="notes"
                placeholder="Guest count, service window, power or parking notes..."
                value={form.notes}
                onChange={handleChange('notes')}
                rows={3}
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-700">
              <p className="font-semibold">Minimum guarantee</p>
              <p>The beta launch minimum for a food truck service is $1,000. Cover it up front or guarantee sales — either way, the first three bookings unlock an extra $200 off.</p>
            </div>

            {status === 'error' && error && (
              <p className="text-sm font-medium text-rose-600" role="alert" aria-live="polite">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? 'Sending…' : 'Submit inquiry'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FoodTruckInquiryDialog;
