'use client';

import { useEffect, useMemo, useState } from 'react';

const REFRESH_INTERVAL_MS = 30_000;

export function SaleTrackerClient({ saleSlug, initialCount }: { saleSlug: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => `/api/sales/${encodeURIComponent(saleSlug)}/tracker`, [saleSlug]);

  useEffect(() => {
    let isMounted = true;

    async function loadCount() {
      setLoading(true);
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Tracker request failed with status ${response.status}`);
        }
        const payload = (await response.json()) as { soldCount?: number };
        if (isMounted) {
          if (typeof payload?.soldCount === 'number' && Number.isFinite(payload.soldCount)) {
            setCount(payload.soldCount);
          }
          setError(null);
        }
      } catch (err) {
        console.warn('[sale-tracker] refresh failed', err);
        if (isMounted) {
          setError('Live updates unavailable');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCount();
    const interval = window.setInterval(loadCount, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [endpoint]);

  return (
    <span aria-live="polite" aria-busy={loading} data-error={error ?? undefined}>
      {count}
    </span>
  );
}
