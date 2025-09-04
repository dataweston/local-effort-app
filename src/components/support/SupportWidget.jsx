import React, { useState } from 'react';
import sanityClient from '../../sanityClient';

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const useKbApi = import.meta?.env?.VITE_SUPPORT_KB_API !== 'false';
  const onSearch = async () => {
    setError(null);
    setAnswer(null);
    setResults([]);
    const q = (query || '').trim();
    if (!q) return;
    setSearching(true);
    try {
      if (useKbApi) {
        const resp = await fetch(`/api/support/search?q=${encodeURIComponent(q)}`);
        if (!resp.ok) throw new Error(await resp.text());
        const payload = await resp.json();
        if (payload.cached) {
          setResults([]);
          setAnswer(payload.answer);
        } else {
          const mapped = (payload.results || []).map((r) => ({ _id: r.id || r.chunk_id, question: r.heading || 'Result', answer: r.text }));
          setResults(mapped);
          if ((!mapped || mapped.length === 0) && /estimate|price|cost|calculator|budget/i.test(q)) {
            setAnswer('Try the Pricing estimator on the Pricing page for a tailored ballpark.');
          }
        }
      } else {
        // Fallback: query Sanity directly
        const pattern = `*${q}*`;
        const data = await sanityClient.fetch(
          `*[_type == "pricingFaq" && (question match $q || answer match $q)] | order(_updatedAt desc)[0...10]{ _id, question, answer }`,
          { q: pattern }
        );
        setResults(Array.isArray(data) ? data : []);
      }
      if (!results || results.length === 0) {
        setAnswer("We couldn't find an instant answer. Send us a note and we'll reply fast.");
      }
    } catch (e) {
      setError(e?.message || 'Search failed');
      setAnswer("Search is temporarily unavailable. Send us a note and we'll reply fast.");
    } finally {
      setSearching(false);
    }
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
              <button className="mt-1 px-3 py-1 bg-black text-white rounded" onClick={onSearch} disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
              {error && <p className="text-sm text-red-700 mt-1">{error}</p>}
              {results.length > 0 && (
                <ul className="mt-2 space-y-2 max-h-48 overflow-auto">
                  {results.map((r) => (
                    <li key={r._id} className="border rounded p-2">
                      <p className="font-medium text-sm">{r.question}</p>
                      {r.answer && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.answer}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {answer && results.length === 0 && <p className="text-sm text-gray-700 mt-1">{answer}</p>}
              {!answer && results.length === 0 && !searching && (
                <p className="text-xs text-gray-500 mt-1">Tip: try keywords like “meal prep”, “events”, or “pricing”.</p>
              )}
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
