import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const DEV_FALLBACK = 'http://localhost:5411';

export default function WeddingsProxy() {
  const env = (import.meta && import.meta.env) ? import.meta.env : {};
  const configuredUrl = env.VITE_WEDDINGS_URL || env.VITE_TINY_WEDDINGS_URL;
  const targetUrl = configuredUrl || (env.DEV ? DEV_FALLBACK : '');
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
        <h2 className="text-3xl font-semibold">Weddings</h2>
        <p>
          The Weddings app runs as a standalone service.
        </p>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-neutral-700">
          <li>Start the service locally or deploy it.</li>
          <li>
            Set <code>VITE_WEDDINGS_URL</code> to the deployed URL (or use the dev port{' '}
            <code>{DEV_FALLBACK}</code>).
          </li>
          <li>Reload this page to embed the app.</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}>
      <div className="px-4 py-3 bg-white border-b border-neutral-200">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Local Effort
        </Link>
      </div>
      <div className="relative flex-1 min-h-[420px] overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-600 text-sm">
            <span className="animate-pulse">Loading Weddings…</span>
          </div>
        )}
        <iframe
          title="Weddings"
          src={targetUrl}
          className="absolute inset-0 h-full w-full"
          allow="payment"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
