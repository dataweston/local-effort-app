import React, { useEffect, useState } from 'react';

const DEV_FALLBACK = 'http://localhost:5410';

export default function TinyDinerProxy() {
  const configuredUrl = import.meta.env.VITE_TINY_DINER_URL;
  const targetUrl = configuredUrl || (import.meta.env.DEV ? DEV_FALLBACK : '');
  const [loaded, setLoaded] = useState(false);

  // Fix mobile viewport height (iOS Safari / Android URL bar collapse)
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  if (!targetUrl) {
    return (
      <div className="max-w-3xl space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-semibold">Tiny Diner Weddings</h2>
        <p>
          The Tiny Diner onboarding app runs as a standalone Next.js microservice located at
          <code className="ml-2 rounded bg-neutral-100 px-2 py-1">partner-tools/tiny-diner-app</code>.
        </p>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-neutral-700">
          <li>Start the service with <code>npm run dev</code> inside that folder.</li>
          <li>
            Set <code>VITE_TINY_DINER_URL</code> to the deployed URL (or use the dev port{' '}
            <code>{DEV_FALLBACK}</code>).
          </li>
          <li>Reload this page to embed the booking dashboard.</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="relative flex-1 min-h-[420px] rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-600 text-sm">
            <span className="animate-pulse">Loading Tiny Diner…</span>
          </div>
        )}
        <iframe
          title="Tiny Diner Wedding Onboarding"
          src={targetUrl}
          className="absolute inset-0 h-full w-full"
          allow="payment"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}