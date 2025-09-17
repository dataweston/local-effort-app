import React, { useMemo, useRef, useState } from 'react';
import sanityClient from '../../sanityClient';

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  // Single-mode widget: answers + chat in one place; no tabs
  // Ensure Brevo (Conversations) script is loaded only once at runtime
  const brevoReadyRef = useRef(false);
  const readyWaitersRef = useRef([]);
  const ensureBrevo = useMemo(() => {
    return () => {
      if (typeof window === 'undefined') return;
      if (brevoReadyRef.current) return;
      if (!window.BrevoConversations) {
        const id = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BREVO_CONVERSATIONS_ID) || (window && window.__BREVO_CONVERSATIONS_ID__) || '68b8c39faa42260ca10998a0';
        window.BrevoConversationsID = id;
        window.BrevoConversations = function() {
          (window.BrevoConversations.q = window.BrevoConversations.q || []).push(arguments);
        };
      }
      if (!document.querySelector('script[src*="brevo-conversations.js"]')) {
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://conversations-widget.brevo.com/brevo-conversations.js';
        s.addEventListener('error', (e) => { console.warn('Brevo script failed to load', e); });
        s.addEventListener('load', () => {
          brevoReadyRef.current = true;
          try { window.BrevoConversations && window.BrevoConversations('hide'); } catch (e) { /* noop */ }
          readyWaitersRef.current.splice(0).forEach((fn) => {
            try { fn(); } catch (e) { /* noop */ }
          });
        });
        document.head.appendChild(s);
      }
    };
  }, []);
  const whenBrevoReady = () => new Promise((resolve) => {
    if (brevoReadyRef.current) return resolve();
    readyWaitersRef.current.push(resolve);
  });
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
      let hadAny = false;
      if (useKbApi) {
        try {
          const resp = await fetch(`/api/support/search?q=${encodeURIComponent(q)}`);
          if (resp.ok) {
            const payload = await resp.json();
            if (payload.cached && payload.answer) {
              setResults([]);
              setAnswer(payload.answer);
              hadAny = true;
            } else {
              const mapped = (payload.results || []).map((r) => ({ _id: r.id || r.chunk_id, question: r.heading || 'Result', answer: r.text }));
              if (mapped.length > 0) {
                setResults(mapped);
                hadAny = true;
              }
            }
          }
        } catch (_) {
          // fall through to Sanity
        }
      }

      // Fallback to Sanity if KB API returned nothing
      if (!hadAny) {
        try {
          const pattern = `*${q}*`;
          const data = await sanityClient.fetch(
            `*[_type in ["pricingFaq","page","post"] && (defined(question) && question match $q || defined(answer) && answer match $q || defined(title) && title match $q || defined(body) && body match $q)] | order(_updatedAt desc)[0...10]{ _id, question, answer, title }`,
            { q: pattern }
          );
          const mapped = (Array.isArray(data) ? data : []).map((d) => ({ _id: d._id, question: d.question || d.title || 'Result', answer: d.answer }));
          setResults(mapped);
          hadAny = mapped.length > 0;
        } catch (e2) {
          // if even fallback fails, surface error but keep going
          setError(e2?.message || 'Search failed');
        }
      }

      if (!hadAny) {
        if (/estimate|price|cost|calculator|budget/i.test(q)) {
          setAnswer('Try the Pricing estimator on the Pricing page for a tailored ballpark.');
        } else {
          setAnswer("We couldn't find an instant answer. Send us a note and we'll reply fast.");
        }
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
            <div className="space-y-2">
              <p className="text-sm text-gray-700">Need to chat? Click below to open chat in this window.</p>
              <button
                className="px-3 py-2 bg-black text-white rounded"
                onClick={async () => {
                  ensureBrevo();
                  await whenBrevoReady();
                  try {
                    if (window.BrevoConversations) {
                      // Some versions support 'hide'/'show'; 'open' may not exist
                      try { window.BrevoConversations('hide'); } catch (e) { /* ignore */ }
                      try { window.BrevoConversations('show'); }
                      catch (e) { try { window.BrevoConversations('toggle'); } catch (e2) { /* ignore */ } }
                    }
                  } finally {
                    // Close our panel so the Brevo drawer isn’t obscured by our z-index
                    setOpen(false);
                  }
                }}
              >
                Open chat
              </button>
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
  <button onClick={() => { ensureBrevo(); setOpen(!open); }} className="px-4 py-2 rounded-full bg-black text-white shadow" aria-label="get help">get help</button>
    </div>
  );
}
