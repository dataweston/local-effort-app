import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';

const invitationDate = new Date('2024-12-12T19:30:00');

const WinterPizzaPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    guests: '1',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [rsvps, setRsvps] = useState([]);

  const locationLabel = useMemo(
    () => `Gibbs Farm • ${format(invitationDate, 'MMMM d, yyyy')} • ${format(invitationDate, 'h:mm aa')}`,
    []
  );

  useEffect(() => {
    const loadRsvps = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('winterpizza_rsvps')
        .select('id, name, guests, created_at')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Unable to load RSVPs', error);
        return;
      }

      setRsvps(data || []);
    };

    loadRsvps();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: 'idle', message: '' });

    if (!isSupabaseConfigured()) {
      setStatus({ type: 'error', message: 'Supabase is not configured for this environment.' });
      return;
    }

    if (!form.name || !form.email) {
      setStatus({ type: 'error', message: 'Please share your name and email so we can save your spot.' });
      return;
    }

    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      guests: Number(form.guests) || 1,
      message: form.message.trim()
    };

    const { error } = await supabase.from('winterpizza_rsvps').insert(payload);

    if (error) {
      console.error('Unable to save RSVP', error);
      setStatus({ type: 'error', message: 'We could not save your RSVP. Please try again in a moment.' });
      setSubmitting(false);
      return;
    }

    setStatus({
      type: 'success',
      message: 'Your RSVP is saved! We will see you for wood-fired pizzas at Gibbs Farm.'
    });
    setForm({ name: '', email: '', guests: '1', message: '' });
    setSubmitting(false);

    const { data } = await supabase
      .from('winterpizza_rsvps')
      .select('id, name, guests, created_at')
      .order('created_at', { ascending: false })
      .limit(12);

    setRsvps(data || []);
  };

  return (
    <>
      <Helmet>
        <title>Winter Pizza | Local Effort</title>
        <meta name="description" content="Winter Pizza" />
        <link rel="canonical" href="https://localeffortfood.com/winterpizza" />
      </Helmet>

      <div className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed opacity-40"
          style={{ backgroundImage: 'url(/images/IMG_4930.JPEG)' }}
        />
        <div className="absolute inset-0 bg-neutral-950/40" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-12 md:flex-row md:items-stretch md:px-8 lg:px-12">
          <div className="relative mb-10 flex-1 md:mb-0 md:pr-10 lg:pr-16">
            <div className="absolute -left-10 -top-8 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-10 -right-6 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] backdrop-blur">
              Inspired by Figma’s “Sunset Soirée” invite template
            </div>
            <h1 className="mt-6 text-4xl leading-tight md:text-5xl lg:text-6xl">
              Winter Pizza Night
              <span className="mt-2 block text-amber-200">Gibbs Farm, December 12 · 7:30 PM</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/80 md:text-xl">
              Join us for a wood-fired pizza celebration at Gibbs Farm. Expect crackling fires, cozy lights, and a menu that
              leans into the season—think local greens, blistered crusts, and a surprise dessert.
            </p>

            <div className="mt-8 grid gap-4 text-sm text-white/80 sm:grid-cols-3">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader className="text-amber-200">Where</CardHeader>
                <CardContent className="text-base text-white">Gibbs Farm</CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader className="text-amber-200">When</CardHeader>
                <CardContent className="text-base text-white">
                  {format(invitationDate, 'eeee, MMMM d')} at {format(invitationDate, 'h:mm aa')}
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader className="text-amber-200">Dress Code</CardHeader>
                <CardContent className="text-base text-white">Warm layers + appetite for pizza</CardContent>
              </Card>
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur md:p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-amber-100/80">Evening Flow</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-lg font-semibold text-white">Golden Hour Sips</p>
                  <p className="text-sm text-white/70">Mulled cider, bubbles, and a quick farm walk for anyone who arrives early.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-lg font-semibold text-white">Wood-Fired Feast</p>
                  <p className="text-sm text-white/70">Pizza stations with seasonal toppings, crisp salads, and something sweet by the fire.</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-white/70">{locationLabel}</div>
            </div>
          </div>

          <div className="relative w-full max-w-xl md:w-96">
            <div className="absolute inset-0 rounded-3xl bg-white/10 blur-3xl" />
            <Card className="relative z-10 border-white/15 bg-neutral-900/80 text-white shadow-2xl backdrop-blur">
              <CardHeader>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-100/80">RSVP</p>
                <h2 className="text-3xl leading-tight text-white">Save your seat</h2>
                <p className="text-sm text-white/70">
                  Seats are limited so we can pace each pie. Please share how many you’re bringing—kids welcome.
                </p>
              </CardHeader>
              <CardContent>
                {!isSupabaseConfigured() && (
                  <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                    Supabase is not configured in this environment. RSVPs will be available once it is set up.
                  </div>
                )}
                {status.type === 'success' && (
                  <div className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    {status.message}
                  </div>
                )}
                {status.type === 'error' && (
                  <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
                    {status.message}
                  </div>
                )}
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm text-white">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Alex Pizza-lover"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-amber-200 focus:ring-amber-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-white">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-amber-200 focus:ring-amber-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guests" className="text-sm text-white">
                      Number of guests (including you)
                    </Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max="12"
                      value={form.guests}
                      onChange={(e) => setForm((prev) => ({ ...prev, guests: e.target.value }))}
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-amber-200 focus:ring-amber-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm text-white">
                      Notes
                    </Label>
                    <Textarea
                      id="message"
                      value={form.message}
                      onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Allergies, favorite toppings, or a song request for the playlist"
                      className="min-h-[120px] border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-amber-200 focus:ring-amber-200"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || !isSupabaseConfigured()}
                    className="w-full bg-amber-400 text-black transition hover:-translate-y-[1px] hover:bg-amber-300"
                  >
                    {submitting ? 'Saving your RSVP...' : 'Count me in'}
                  </Button>
                </form>

                {rsvps.length > 0 && (
                  <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-amber-100/80">Recent RSVPs</p>
                    <div className="space-y-2">
                      {rsvps.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                          <span className="font-semibold text-white">{entry.name}</span>
                          <span className="text-white/70">{entry.guests} going</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default WinterPizzaPage;
