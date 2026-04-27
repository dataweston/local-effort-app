import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../lib/apiBase';

export function useBrainInbox({ accessToken, enabled = true }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const pollRef = useRef(null);

  const fetchInbox = useCallback(async () => {
    if (!accessToken || !enabled) return;
    try {
      const res = await fetch(`${API_BASE}/api/brain/inbox?status=pending&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      // silent — inbox is non-critical
    }
  }, [accessToken, enabled]);

  const capture = useCallback(async ({ rawContent, source = 'admin_ux' }) => {
    if (!accessToken) return null;
    setCapturing(true);
    try {
      const res = await fetch(`${API_BASE}/api/brain/inbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ rawContent, source }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchInbox();
        return data.id;
      }
      return null;
    } catch {
      return null;
    } finally {
      setCapturing(false);
    }
  }, [accessToken, fetchInbox]);

  const triage = useCallback(async (id, action, payload = {}) => {
    if (!accessToken) return false;
    try {
      const res = await fetch(`${API_BASE}/api/brain/inbox/${id}/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      if (data.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [accessToken]);

  useEffect(() => {
    if (!enabled || !accessToken) return;
    setLoading(true);
    fetchInbox().finally(() => setLoading(false));

    // Poll every 60s
    pollRef.current = setInterval(fetchInbox, 60_000);
    return () => clearInterval(pollRef.current);
  }, [enabled, accessToken, fetchInbox]);

  return { items, total, loading, capturing, capture, triage, refetch: fetchInbox };
}
