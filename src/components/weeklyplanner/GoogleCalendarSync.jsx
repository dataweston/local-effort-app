import React, { useState } from 'react';
import { Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';

export function GoogleCalendarSync({ accessToken, weekStart }) {
  const [status, setStatus] = useState('idle'); // idle | syncing | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSync = async () => {
    if (!accessToken) return;
    setStatus('syncing');
    setErrorMsg('');
    try {
      const res = await fetch('/api/planner/google-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ weekStart }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Sync failed');
      }
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Sync failed');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const icons = {
    idle: <Calendar size={14} />,
    syncing: <Loader2 size={14} className="animate-spin" />,
    success: <Check size={14} />,
    error: <AlertCircle size={14} />,
  };

  const labels = {
    idle: 'Sync to Google',
    syncing: 'Syncing...',
    success: 'Synced!',
    error: 'Failed',
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={status === 'syncing'}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors touch-target-ios disabled:opacity-50"
        style={{
          borderColor: status === 'error' ? 'var(--color-state-danger)' : 'var(--color-border-default)',
          color: status === 'success'
            ? 'var(--color-state-success)'
            : status === 'error'
            ? 'var(--color-state-danger)'
            : 'var(--color-text-secondary)',
        }}
        title={errorMsg || 'Push this week\'s schedule to Google Calendar'}
      >
        {icons[status]}
        <span className="hidden sm:inline">{labels[status]}</span>
      </button>
    </div>
  );
}
