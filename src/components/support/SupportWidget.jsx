import React, { useState } from 'react';

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);

  const onSearch = async () => {
    // Placeholder: in a follow-up, wire to Sanity FAQ index
    if (!query) return setAnswer(null);
    if (query.toLowerCase().includes('menu')) setAnswer('Menus rotate weekly. Ask us for the next week\'s options.');
    else setAnswer("We couldn't find an instant answer. Send us a note and we'll reply fast.");
  };

  const onSend = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch('/api/messages/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setAnswer('Thanks! We\'ll get back to you shortly.');
      e.target.reset();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="w-80 rounded-lg shadow-xl border bg-white p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Need help?</h3>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-500">Close</button>
          </div>
          <div className="space-y-2">
            <div>
              <input className="w-full border p-2" placeholder="Search FAQs" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="mt-1 px-3 py-1 bg-black text-white rounded" onClick={onSearch}>Search</button>
              {answer && <p className="text-sm text-gray-700 mt-1">{answer}</p>}
            </div>
            <form className="space-y-2" onSubmit={onSend}>
              <input name="name" className="w-full border p-2" placeholder="Your name" />
              <input name="email" type="email" required className="w-full border p-2" placeholder="Email" />
              <input name="subject" className="w-full border p-2" placeholder="Subject" />
              <textarea name="message" required className="w-full border p-2 h-24" placeholder="How can we help?" />
              <button className="px-3 py-2 bg-emerald-600 text-white rounded" type="submit">Send</button>
            </form>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="px-4 py-2 rounded-full bg-black text-white shadow">Support</button>
    </div>
  );
}
