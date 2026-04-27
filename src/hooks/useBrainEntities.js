import { useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useBrainEntities({ accessToken, enabled = true }) {
  const [entities, setEntities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: '', q: '', sort: 'updatedAt', order: 'desc' });

  const fetch = useCallback(async (overrides = {}) => {
    if (!accessToken || !enabled) return;
    const merged = { ...filters, ...overrides };
    const params = new URLSearchParams({ limit: '100', ...merged });
    // Remove empty params
    for (const [k, v] of [...params.entries()]) {
      if (!v) params.delete(k);
    }
    setLoading(true);
    try {
      const res = await window.fetch(`${API_BASE}/api/brain/entities?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setEntities(data.entities || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [accessToken, enabled, filters]);

  const tombstone = useCallback(async (id) => {
    if (!accessToken) return false;
    try {
      const res = await window.fetch(`${API_BASE}/api/brain/entities/${id}/tombstone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.ok) {
        setEntities(prev => prev.filter(e => e.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [accessToken]);

  useEffect(() => {
    if (enabled && accessToken) {
      fetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, accessToken]);

  return { entities, total, loading, filters, setFilters, refetch: fetch, tombstone };
}
